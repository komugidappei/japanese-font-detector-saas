#!/usr/bin/env python3
"""
日本語フォント検出 SaaS - FastAPI Backend
"""

from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import firebase_admin
from firebase_admin import credentials, auth
import stripe
from supabase import create_client, Client
from datetime import datetime, timedelta
import hashlib
import json
import os
from typing import Optional, List
import uuid
from pydantic import BaseModel
import tempfile
import asyncio

# 環境変数から設定を読み込み
FIREBASE_CREDENTIALS_PATH = os.getenv("FIREBASE_CREDENTIALS_PATH")
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# Firebase初期化
if FIREBASE_CREDENTIALS_PATH and os.path.exists(FIREBASE_CREDENTIALS_PATH):
    cred = credentials.Certificate(FIREBASE_CREDENTIALS_PATH)
    firebase_admin.initialize_app(cred)

# Stripe初期化
stripe.api_key = STRIPE_SECRET_KEY

# Supabase初期化
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# FastAPI初期化
app = FastAPI(title="Font Detection SaaS API", version="1.0.0")

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://your-domain.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# セキュリティ
security = HTTPBearer()

# モデル定義
class User(BaseModel):
    id: str
    firebase_uid: str
    email: str

class SubscriptionStatus(BaseModel):
    active: bool
    plan_id: Optional[str] = None
    current_period_end: Optional[datetime] = None

class FontDetectionRequest(BaseModel):
    method: str = "ssim"  # ssim or cnn

class FontDetectionResult(BaseModel):
    candidates: List[dict]
    text_extracted: List[str]
    processing_time: float
    method: str

# ユーティリティ関数
async def verify_firebase_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Firebase JWTトークンを検証"""
    try:
        token = credentials.credentials
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid authentication token")

async def get_user_by_firebase_uid(firebase_uid: str) -> Optional[dict]:
    """Firebase UIDからユーザー情報を取得"""
    try:
        result = supabase.table("users").select("*").eq("firebase_uid", firebase_uid).execute()
        return result.data[0] if result.data else None
    except Exception:
        return None

async def create_user(firebase_uid: str, email: str) -> dict:
    """新規ユーザーを作成"""
    user_data = {
        "firebase_uid": firebase_uid,
        "email": email,
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat()
    }
    
    result = supabase.table("users").insert(user_data).execute()
    return result.data[0]

async def get_active_subscription(user_id: str) -> Optional[dict]:
    """アクティブなサブスクリプションを取得"""
    try:
        result = supabase.table("subscriptions").select("*").eq("user_id", user_id).eq("status", "active").execute()
        return result.data[0] if result.data else None
    except Exception:
        return None

async def check_session_usage(session_id: str) -> int:
    """セッションの使用回数をチェック"""
    try:
        result = supabase.table("usage_logs").select("count").eq("session_id", session_id).execute()
        return len(result.data) if result.data else 0
    except Exception:
        return 0

async def log_usage(user_id: Optional[str], session_id: Optional[str], 
                   image_hash: str, method: str, results: dict):
    """使用ログを記録"""
    log_data = {
        "user_id": user_id,
        "session_id": session_id,
        "image_hash": image_hash,
        "detection_method": method,
        "results": json.dumps(results),
        "created_at": datetime.now().isoformat()
    }
    
    supabase.table("usage_logs").insert(log_data).execute()

def calculate_image_hash(image_data: bytes) -> str:
    """画像のハッシュを計算"""
    return hashlib.md5(image_data).hexdigest()

# API エンドポイント

@app.get("/")
async def root():
    return {"message": "Font Detection SaaS API", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

# 認証関連
@app.post("/auth/register")
async def register_user(token_data: dict = Depends(verify_firebase_token)):
    """ユーザー登録"""
    firebase_uid = token_data["uid"]
    email = token_data.get("email", "")
    
    # 既存ユーザーチェック
    existing_user = await get_user_by_firebase_uid(firebase_uid)
    if existing_user:
        return {"user": existing_user, "message": "User already exists"}
    
    # 新規ユーザー作成
    user = await create_user(firebase_uid, email)
    return {"user": user, "message": "User created successfully"}

@app.get("/auth/me")
async def get_current_user(token_data: dict = Depends(verify_firebase_token)):
    """現在のユーザー情報を取得"""
    firebase_uid = token_data["uid"]
    
    user = await get_user_by_firebase_uid(firebase_uid)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # サブスクリプション状態も含める
    subscription = await get_active_subscription(user["id"])
    
    return {
        "user": user,
        "subscription": {
            "active": subscription is not None,
            "plan_id": subscription["plan_id"] if subscription else None,
            "current_period_end": subscription["current_period_end"] if subscription else None
        }
    }

# 使用制限チェック
@app.get("/usage/check")
async def check_usage_limit(
    session_id: Optional[str] = Header(None, alias="X-Session-ID"),
    token_data: Optional[dict] = Depends(verify_firebase_token)
):
    """使用制限をチェック"""
    
    if token_data:
        # 認証ユーザー: サブスクリプション確認
        firebase_uid = token_data["uid"]
        user = await get_user_by_firebase_uid(firebase_uid)
        
        if user:
            subscription = await get_active_subscription(user["id"])
            return {
                "can_use": subscription is not None,
                "reason": "subscription_required" if not subscription else "unlimited",
                "user_type": "authenticated"
            }
    
    # 匿名ユーザー: セッション使用回数確認
    if session_id:
        usage_count = await check_session_usage(session_id)
        return {
            "can_use": usage_count < 3,
            "reason": "free_trial_used" if usage_count >= 3 else "free_trial_available",
            "user_type": "anonymous",
            "usage_count": usage_count
        }
    
    # セッションIDなし: 新規ユーザー
    return {
        "can_use": True,
        "reason": "first_time_user",
        "user_type": "anonymous"
    }

# フォント検出
@app.post("/detect/upload", response_model=FontDetectionResult)
async def detect_font_from_image(
    file: UploadFile = File(...),
    method: str = "ssim",
    session_id: Optional[str] = Header(None, alias="X-Session-ID"),
    token_data: Optional[dict] = Depends(verify_firebase_token)
):
    """画像からフォントを検出"""
    start_time = datetime.now()
    
    # ファイル検証
    if file.content_type not in ["image/jpeg", "image/png", "image/webp"]:
        raise HTTPException(status_code=400, detail="Invalid file type")
    
    # ファイルサイズ制限 (10MB)
    file_content = await file.read()
    if len(file_content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large")
    
    # 画像ハッシュ計算
    image_hash = calculate_image_hash(file_content)
    
    # 使用制限チェック
    user_id = None
    if token_data:
        firebase_uid = token_data["uid"]
        user = await get_user_by_firebase_uid(firebase_uid)
        if user:
            user_id = user["id"]
            subscription = await get_active_subscription(user_id)
            if not subscription:
                raise HTTPException(status_code=403, detail="Active subscription required")
    else:
        # 匿名ユーザーの場合
        if session_id:
            usage_count = await check_session_usage(session_id)
            if usage_count >= 3:
                raise HTTPException(status_code=403, detail="Free trial already used")
        else:
            raise HTTPException(status_code=400, detail="Session ID required")
    
    try:
        # 一時ファイルに保存してフォント検出実行
        with tempfile.NamedTemporaryFile(delete=False, suffix=".png") as temp_file:
            temp_file.write(file_content)
            temp_file.flush()
            
            # 一時的にモック結果を返す（デプロイ成功後に実装を完成させる）
            extracted_text = ["サンプルテキスト"]
            
            # モックフォント検出結果
            candidates = [
                {"font_name": "ヒラギノ角ゴシック", "confidence": 0.85},
                {"font_name": "游ゴシック", "confidence": 0.72},
                {"font_name": "Noto Sans JP", "confidence": 0.68}
            ]
            
        # 処理時間計算
        processing_time = (datetime.now() - start_time).total_seconds()
        
        # 結果
        result = {
            "candidates": candidates,
            "text_extracted": extracted_text,
            "processing_time": processing_time,
            "method": method
        }
        
        # 使用ログ記録
        await log_usage(user_id, session_id, image_hash, method, result)
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Font detection failed: {str(e)}")
    
    finally:
        # 一時ファイル削除
        if 'temp_file' in locals():
            os.unlink(temp_file.name)

# 検出履歴
@app.get("/detect/history")
async def get_detection_history(
    limit: int = 10,
    token_data: dict = Depends(verify_firebase_token)
):
    """検出履歴を取得（認証ユーザーのみ）"""
    firebase_uid = token_data["uid"]
    user = await get_user_by_firebase_uid(firebase_uid)
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    try:
        result = supabase.table("usage_logs")\
            .select("*")\
            .eq("user_id", user["id"])\
            .order("created_at", desc=True)\
            .limit(limit)\
            .execute()
        
        history = []
        for log in result.data:
            try:
                results = json.loads(log["results"])
                history.append({
                    "id": log["id"],
                    "created_at": log["created_at"],
                    "method": log["detection_method"],
                    "candidates": results.get("candidates", []),
                    "text_extracted": results.get("text_extracted", [])
                })
            except:
                continue
        
        return {"history": history}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch history: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)