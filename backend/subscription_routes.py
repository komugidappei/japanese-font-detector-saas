#!/usr/bin/env python3
"""
サブスクリプション関連のAPIルート
"""

from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import Optional
import json

from stripe_service import StripeService
from main import verify_firebase_token, get_user_by_firebase_uid

router = APIRouter(prefix="/subscription", tags=["subscription"])

# リクエストモデル
class CreateCheckoutRequest(BaseModel):
    plan_id: str
    success_url: str
    cancel_url: str

class CancelSubscriptionRequest(BaseModel):
    subscription_id: str

# レスポンスモデル
class SubscriptionStatusResponse(BaseModel):
    active: bool
    plan_id: Optional[str] = None
    status: Optional[str] = None
    current_period_end: Optional[str] = None
    cancel_at_period_end: Optional[bool] = None

@router.post("/create-checkout")
async def create_checkout_session(
    request: CreateCheckoutRequest,
    token_data: dict = Depends(verify_firebase_token)
):
    """Stripe Checkoutセッションを作成"""
    firebase_uid = token_data["uid"]
    user = await get_user_by_firebase_uid(firebase_uid)
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    try:
        checkout_url = await StripeService.create_checkout_session(
            user_id=user["id"],
            plan_id=request.plan_id,
            success_url=request.success_url,
            cancel_url=request.cancel_url
        )
        
        return {"checkout_url": checkout_url}
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/status", response_model=SubscriptionStatusResponse)
async def get_subscription_status(token_data: dict = Depends(verify_firebase_token)):
    """ユーザーのサブスクリプション状態を取得"""
    firebase_uid = token_data["uid"]
    user = await get_user_by_firebase_uid(firebase_uid)
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    try:
        from main import get_active_subscription, supabase
        
        # データベースからサブスクリプション情報を取得
        result = supabase.table("subscriptions")\
            .select("*")\
            .eq("user_id", user["id"])\
            .order("created_at", desc=True)\
            .limit(1)\
            .execute()
        
        if not result.data:
            return SubscriptionStatusResponse(active=False)
        
        subscription = result.data[0]
        
        # Stripeから最新状態を取得
        if subscription["stripe_subscription_id"]:
            stripe_status = await StripeService.get_subscription_status(
                subscription["stripe_subscription_id"]
            )
            
            if stripe_status:
                return SubscriptionStatusResponse(
                    active=stripe_status["status"] == "active",
                    plan_id=subscription["plan_id"],
                    status=stripe_status["status"],
                    current_period_end=stripe_status["current_period_end"].isoformat(),
                    cancel_at_period_end=stripe_status["cancel_at_period_end"]
                )
        
        # Stripe情報が取得できない場合はDB情報を返す
        return SubscriptionStatusResponse(
            active=subscription["status"] == "active",
            plan_id=subscription["plan_id"],
            status=subscription["status"],
            current_period_end=subscription["current_period_end"]
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get subscription status: {str(e)}")

@router.post("/cancel")
async def cancel_subscription(
    request: CancelSubscriptionRequest,
    token_data: dict = Depends(verify_firebase_token)
):
    """サブスクリプションをキャンセル"""
    firebase_uid = token_data["uid"]
    user = await get_user_by_firebase_uid(firebase_uid)
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    try:
        # ユーザーがこのサブスクリプションの所有者かチェック
        from main import supabase
        
        result = supabase.table("subscriptions")\
            .select("*")\
            .eq("user_id", user["id"])\
            .eq("stripe_subscription_id", request.subscription_id)\
            .execute()
        
        if not result.data:
            raise HTTPException(status_code=403, detail="Subscription not found or unauthorized")
        
        # キャンセル実行
        success = await StripeService.cancel_subscription(request.subscription_id)
        
        if success:
            return {"message": "Subscription canceled successfully"}
        else:
            raise HTTPException(status_code=400, detail="Failed to cancel subscription")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/customer-portal")
async def create_customer_portal_session(
    token_data: dict = Depends(verify_firebase_token)
):
    """Stripe Customer Portalセッションを作成"""
    firebase_uid = token_data["uid"]
    user = await get_user_by_firebase_uid(firebase_uid)
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    try:
        # カスタマーIDを取得または作成
        customer_id = await StripeService.get_or_create_customer(
            user["id"], 
            user["email"]
        )
        
        # Customer Portalセッション作成
        return_url = f"{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/dashboard"
        portal_url = await StripeService.create_customer_portal_session(
            customer_id, 
            return_url
        )
        
        return {"portal_url": portal_url}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create customer portal session: {str(e)}")

@router.get("/billing-info")
async def get_billing_info(token_data: dict = Depends(verify_firebase_token)):
    """課金情報を取得"""
    firebase_uid = token_data["uid"]
    user = await get_user_by_firebase_uid(firebase_uid)
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    try:
        from main import supabase
        
        # サブスクリプション情報を取得
        result = supabase.table("subscriptions")\
            .select("*")\
            .eq("user_id", user["id"])\
            .order("created_at", desc=True)\
            .limit(1)\
            .execute()
        
        if not result.data:
            return {
                "has_subscription": False,
                "customer_id": None
            }
        
        subscription = result.data[0]
        
        # Stripeから最新の課金情報を取得
        billing_info = {
            "has_subscription": True,
            "customer_id": subscription["stripe_customer_id"],
            "subscription_id": subscription["stripe_subscription_id"],
            "status": subscription["status"],
            "plan_id": subscription["plan_id"],
            "current_period_start": subscription["current_period_start"],
            "current_period_end": subscription["current_period_end"]
        }
        
        # Stripeから詳細情報を取得
        if subscription["stripe_subscription_id"]:
            stripe_status = await StripeService.get_subscription_status(
                subscription["stripe_subscription_id"]
            )
            if stripe_status:
                billing_info.update(stripe_status)
        
        return billing_info
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get billing info: {str(e)}")

@router.get("/plans")
async def get_available_plans():
    """利用可能な料金プランを取得"""
    from stripe_service import PLANS
    
    plans = []
    for plan_id, plan_info in PLANS.items():
        plans.append({
            "id": plan_id,
            "name": plan_info["name"],
            "amount": plan_info["amount"],
            "currency": plan_info["currency"],
            "interval": plan_info["interval"]
        })
    
    return {"plans": plans}

@router.post("/webhook")
async def stripe_webhook(request: Request):
    """Stripe Webhookエンドポイント"""
    try:
        payload = await request.body()
        signature = request.headers.get("Stripe-Signature")
        
        if not signature:
            raise HTTPException(status_code=400, detail="Missing Stripe signature")
        
        # Webhookイベント処理
        success = await StripeService.handle_webhook_event(
            payload.decode(), signature
        )
        
        if success:
            return {"status": "success"}
        else:
            raise HTTPException(status_code=400, detail="Webhook processing failed")
            
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Webhook error: {str(e)}")

# メインのFastAPIアプリにルーターを追加
# main.pyに以下を追加:
# from subscription_routes import router as subscription_router
# app.include_router(subscription_router)