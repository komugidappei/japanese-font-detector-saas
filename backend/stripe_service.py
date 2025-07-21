#!/usr/bin/env python3
"""
Stripe サブスクリプション サービス
"""

import stripe
import os
from datetime import datetime
from typing import Optional, Dict
from supabase import create_client, Client

# 設定
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

stripe.api_key = STRIPE_SECRET_KEY
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# 商品・価格設定
PLANS = {
    "basic_monthly": {
        "price_id": "price_1234567890",  # 実際のStripe価格IDに置き換え
        "amount": 300,
        "currency": "jpy",
        "interval": "month",
        "name": "ベーシックプラン（月額）"
    }
}

class StripeService:
    """Stripe操作を管理するサービスクラス"""
    
    @staticmethod
    async def create_customer(user_id: str, email: str) -> str:
        """Stripeカスタマーを作成"""
        try:
            customer = stripe.Customer.create(
                email=email,
                metadata={"user_id": user_id}
            )
            return customer.id
        except stripe.error.StripeError as e:
            raise Exception(f"Failed to create Stripe customer: {str(e)}")
    
    @staticmethod
    async def create_subscription(customer_id: str, price_id: str, user_id: str) -> Dict:
        """サブスクリプションを作成"""
        try:
            subscription = stripe.Subscription.create(
                customer=customer_id,
                items=[{"price": price_id}],
                payment_behavior="default_incomplete",
                payment_settings={"save_default_payment_method": "on_subscription"},
                expand=["latest_invoice.payment_intent"],
                metadata={"user_id": user_id}
            )
            
            # データベースに保存
            await StripeService._save_subscription_to_db(subscription, user_id)
            
            return {
                "subscription_id": subscription.id,
                "client_secret": subscription.latest_invoice.payment_intent.client_secret,
                "status": subscription.status
            }
            
        except stripe.error.StripeError as e:
            raise Exception(f"Failed to create subscription: {str(e)}")
    
    @staticmethod
    async def create_checkout_session(user_id: str, plan_id: str, success_url: str, cancel_url: str) -> str:
        """Stripe Checkoutセッションを作成（簡単な決済フロー）"""
        try:
            if plan_id not in PLANS:
                raise ValueError(f"Invalid plan ID: {plan_id}")
            
            plan = PLANS[plan_id]
            
            session = stripe.checkout.Session.create(
                payment_method_types=["card"],
                line_items=[{
                    "price": plan["price_id"],
                    "quantity": 1,
                }],
                mode="subscription",
                success_url=success_url,
                cancel_url=cancel_url,
                metadata={"user_id": user_id, "plan_id": plan_id}
            )
            
            return session.url
            
        except stripe.error.StripeError as e:
            raise Exception(f"Failed to create checkout session: {str(e)}")
    
    @staticmethod
    async def cancel_subscription(subscription_id: str) -> bool:
        """サブスクリプションをキャンセル"""
        try:
            subscription = stripe.Subscription.modify(
                subscription_id,
                cancel_at_period_end=True
            )
            
            # データベース更新
            supabase.table("subscriptions")\
                .update({"status": "canceled", "updated_at": datetime.now().isoformat()})\
                .eq("stripe_subscription_id", subscription_id)\
                .execute()
            
            return True
            
        except stripe.error.StripeError as e:
            raise Exception(f"Failed to cancel subscription: {str(e)}")
    
    @staticmethod
    async def get_subscription_status(subscription_id: str) -> Optional[Dict]:
        """Stripeからサブスクリプション状態を取得"""
        try:
            subscription = stripe.Subscription.retrieve(subscription_id)
            return {
                "id": subscription.id,
                "status": subscription.status,
                "current_period_start": datetime.fromtimestamp(subscription.current_period_start),
                "current_period_end": datetime.fromtimestamp(subscription.current_period_end),
                "cancel_at_period_end": subscription.cancel_at_period_end
            }
        except stripe.error.StripeError:
            return None
    
    @staticmethod
    async def create_customer_portal_session(customer_id: str, return_url: str) -> str:
        """Stripe Customer Portalセッションを作成"""
        try:
            session = stripe.billing_portal.Session.create(
                customer=customer_id,
                return_url=return_url,
            )
            return session.url
        except stripe.error.StripeError as e:
            raise Exception(f"Failed to create customer portal session: {str(e)}")
    
    @staticmethod
    async def get_or_create_customer(user_id: str, email: str) -> str:
        """既存カスタマーを取得または新規作成"""
        try:
            # データベースからカスタマーIDを取得
            result = supabase.table("subscriptions")\
                .select("stripe_customer_id")\
                .eq("user_id", user_id)\
                .limit(1)\
                .execute()
            
            if result.data and result.data[0]["stripe_customer_id"]:
                return result.data[0]["stripe_customer_id"]
            
            # カスタマーが存在しない場合は新規作成
            customer_id = await StripeService.create_customer(user_id, email)
            return customer_id
            
        except Exception as e:
            # 新規作成にフォールバック
            return await StripeService.create_customer(user_id, email)
    
    @staticmethod
    async def handle_webhook_event(event_data: Dict, signature: str) -> bool:
        """Stripe Webhookイベントを処理"""
        try:
            # Webhook署名検証
            event = stripe.Webhook.construct_event(
                event_data, signature, STRIPE_WEBHOOK_SECRET
            )
            
            event_type = event["type"]
            data_object = event["data"]["object"]
            
            if event_type == "checkout.session.completed":
                await StripeService._handle_checkout_completed(data_object)
            
            elif event_type == "invoice.payment_succeeded":
                await StripeService._handle_payment_succeeded(data_object)
            
            elif event_type == "invoice.payment_failed":
                await StripeService._handle_payment_failed(data_object)
            
            elif event_type == "customer.subscription.updated":
                await StripeService._handle_subscription_updated(data_object)
            
            elif event_type == "customer.subscription.deleted":
                await StripeService._handle_subscription_deleted(data_object)
            
            return True
            
        except Exception as e:
            print(f"Webhook error: {str(e)}")
            return False
    
    @staticmethod
    async def _save_subscription_to_db(subscription_data: Dict, user_id: str):
        """サブスクリプションをデータベースに保存"""
        subscription_record = {
            "user_id": user_id,
            "stripe_customer_id": subscription_data.customer,
            "stripe_subscription_id": subscription_data.id,
            "status": subscription_data.status,
            "plan_id": "basic_monthly",  # 現在は1プランのみ
            "current_period_start": datetime.fromtimestamp(subscription_data.current_period_start).isoformat(),
            "current_period_end": datetime.fromtimestamp(subscription_data.current_period_end).isoformat(),
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        
        supabase.table("subscriptions").insert(subscription_record).execute()
    
    @staticmethod
    async def _handle_checkout_completed(session):
        """Checkout完了時の処理"""
        user_id = session.metadata.get("user_id")
        subscription_id = session.subscription
        
        if user_id and subscription_id:
            # Stripeから最新のサブスクリプション情報を取得
            subscription = stripe.Subscription.retrieve(subscription_id)
            await StripeService._save_subscription_to_db(subscription, user_id)
    
    @staticmethod
    async def _handle_payment_succeeded(invoice):
        """支払い成功時の処理"""
        subscription_id = invoice.subscription
        
        if subscription_id:
            # サブスクリプション状態を'active'に更新
            supabase.table("subscriptions")\
                .update({"status": "active", "updated_at": datetime.now().isoformat()})\
                .eq("stripe_subscription_id", subscription_id)\
                .execute()
    
    @staticmethod
    async def _handle_payment_failed(invoice):
        """支払い失敗時の処理"""
        subscription_id = invoice.subscription
        
        if subscription_id:
            # サブスクリプション状態を'past_due'に更新
            supabase.table("subscriptions")\
                .update({"status": "past_due", "updated_at": datetime.now().isoformat()})\
                .eq("stripe_subscription_id", subscription_id)\
                .execute()
    
    @staticmethod
    async def _handle_subscription_updated(subscription):
        """サブスクリプション更新時の処理"""
        subscription_id = subscription.id
        
        # データベースの情報を更新
        update_data = {
            "status": subscription.status,
            "current_period_start": datetime.fromtimestamp(subscription.current_period_start).isoformat(),
            "current_period_end": datetime.fromtimestamp(subscription.current_period_end).isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        
        supabase.table("subscriptions")\
            .update(update_data)\
            .eq("stripe_subscription_id", subscription_id)\
            .execute()
    
    @staticmethod
    async def _handle_subscription_deleted(subscription):
        """サブスクリプション削除時の処理"""
        subscription_id = subscription.id
        
        # サブスクリプション状態を'canceled'に更新
        supabase.table("subscriptions")\
            .update({"status": "canceled", "updated_at": datetime.now().isoformat()})\
            .eq("stripe_subscription_id", subscription_id)\
            .execute()