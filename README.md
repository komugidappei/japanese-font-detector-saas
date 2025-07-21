# 日本語フォント検出AI - SaaS版

AI技術を使用した日本語フォント自動検出サービスです。

## 機能

- 🔍 **フォント検出**: OCR + AI による日本語フォント推定
- 🤖 **双方向比較**: SSIM と CNN の2つの手法で高精度判定
- 💳 **サブスクリプション**: 月額300円で無制限利用
- 🔐 **OAuth認証**: Google, GitHub, Twitter ログイン対応
- 📊 **利用管理**: Stripe Customer Portal で自己管理

## 技術スタック

### フロントエンド
- Next.js 14
- React 18
- Tailwind CSS
- Firebase Authentication
- Stripe (決済)

### バックエンド
- FastAPI (Python)
- Supabase (データベース)
- Firebase Admin (認証)
- Tesseract (OCR)
- TensorFlow (CNN)

## デプロイ

### フロントエンド (Vercel)
```bash
cd frontend
npx vercel --prod
```

### バックエンド (Railway)
```bash
cd backend
railway up
```

## 環境変数設定

`.env.example` ファイルを参考に、必要な環境変数を設定してください。

## ライセンス

MIT License