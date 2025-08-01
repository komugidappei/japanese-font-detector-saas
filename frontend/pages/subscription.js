// サブスクリプション管理ページ
import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../hooks/useAuth';
import AuthModal from '../components/AuthModal';
import { 
  createCheckoutSession, 
  getPlans, 
  getBillingInfo,
  createCustomerPortalSession 
} from '../lib/api';
import { 
  CheckIcon, 
  CreditCardIcon,
  ArrowTopRightOnSquareIcon 
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function Subscription() {
  const { user, userInfo, loading } = useAuth();
  const router = useRouter();
  const [plans, setPlans] = useState([]);
  const [billingInfo, setBillingInfo] = useState(null);
  const [isCreatingCheckout, setIsCreatingCheckout] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    loadPlans();
    if (user) {
      loadBillingInfo();
    }
  }, [user]);

  const loadPlans = async () => {
    try {
      const { plans } = await getPlans();
      setPlans(plans || []);
    } catch (error) {
      console.error('Failed to load plans:', error);
      toast.error('料金プランの読み込みに失敗しました');
    }
  };

  const loadBillingInfo = async () => {
    try {
      const billing = await getBillingInfo();
      setBillingInfo(billing);
    } catch (error) {
      console.error('Failed to load billing info:', error);
    }
  };

  const handleSubscribe = async (planId) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    setIsCreatingCheckout(true);
    try {
      const successUrl = `${window.location.origin}/dashboard?subscription=success`;
      const cancelUrl = `${window.location.origin}/subscription?subscription=canceled`;
      
      const { checkout_url } = await createCheckoutSession(planId, successUrl, cancelUrl);
      window.location.href = checkout_url;
    } catch (error) {
      console.error('Failed to create checkout session:', error);
      toast.error('決済画面の作成に失敗しました');
    } finally {
      setIsCreatingCheckout(false);
    }
  };

  const handleManageBilling = async () => {
    try {
      const { portal_url } = await createCustomerPortalSession();
      window.location.href = portal_url;
    } catch (error) {
      console.error('Failed to create customer portal session:', error);
      toast.error('課金管理画面の作成に失敗しました');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>サブスクリプション - 日本語フォント検出 AI</title>
      </Head>

      {/* ヘッダー */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link href="/" className="text-xl font-bold text-gray-900">
              日本語フォント検出 AI
            </Link>
            
            <div className="flex items-center space-x-4">
              {user ? (
                <>
                  <span className="text-sm text-gray-700">{user.email}</span>
                  <Link
                    href="/dashboard"
                    className="text-sm text-gray-700 hover:text-gray-900"
                  >
                    ダッシュボード
                  </Link>
                </>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="text-sm text-gray-700 hover:text-gray-900"
                >
                  ログイン
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* ページヘッダー */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            料金プラン
          </h1>
          <p className="text-xl text-gray-600">
            日本語フォント検出AIを無制限でご利用いただけます
          </p>
        </div>

        {/* 現在のサブスクリプション状況 */}
        {user && billingInfo && (
          <div className="mb-8 p-6 bg-white rounded-lg shadow">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">現在のプラン</h2>
            
            {billingInfo.has_subscription ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full">
                    <CheckIcon className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">ベーシックプラン</p>
                    <p className="text-sm text-gray-500">月額300円 - 無制限利用</p>
                    <p className="text-sm text-gray-500">
                      次回請求日: {billingInfo.current_period_end 
                        ? new Date(billingInfo.current_period_end).toLocaleDateString('ja-JP')
                        : '--'
                      }
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleManageBilling}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <CreditCardIcon className="w-4 h-4 mr-2" />
                  課金設定を管理
                  <ArrowTopRightOnSquareIcon className="w-4 h-4 ml-2" />
                </button>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-600">現在サブスクリプションに登録されていません</p>
              </div>
            )}
          </div>
        )}

        {/* 料金プランカード */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* 無料体験 */}
          <div className="bg-white rounded-lg shadow-lg p-8 border-2 border-gray-200">
            <div className="text-center">
              <h3 className="text-2xl font-semibold text-gray-900 mb-2">無料体験</h3>
              <div className="mb-4">
                <span className="text-4xl font-bold text-gray-900">¥0</span>
              </div>
              <p className="text-gray-600 mb-6">3回まで無料でお試し</p>
              
              <ul className="text-left space-y-3 mb-8">
                <li className="flex items-center">
                  <CheckIcon className="h-5 w-5 text-green-500 mr-3" />
                  <span className="text-gray-700">フォント検出 3回</span>
                </li>
                <li className="flex items-center">
                  <CheckIcon className="h-5 w-5 text-green-500 mr-3" />
                  <span className="text-gray-700">SSIM & CNN方式</span>
                </li>
                <li className="flex items-center">
                  <CheckIcon className="h-5 w-5 text-green-500 mr-3" />
                  <span className="text-gray-700">結果の表示</span>
                </li>
              </ul>
              
              <Link
                href="/"
                className="w-full inline-flex justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                無料で試す
              </Link>
            </div>
          </div>

          {/* ベーシックプラン */}
          <div className="bg-white rounded-lg shadow-lg p-8 border-2 border-blue-500 relative">
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
              <span className="bg-blue-500 text-white px-4 py-1 text-sm font-medium rounded-full">
                おすすめ
              </span>
            </div>
            
            <div className="text-center">
              <h3 className="text-2xl font-semibold text-gray-900 mb-2">ベーシックプラン</h3>
              <div className="mb-4">
                <span className="text-4xl font-bold text-gray-900">¥300</span>
                <span className="text-gray-600 ml-2">/月</span>
              </div>
              <p className="text-gray-600 mb-6">フォント検出を無制限で利用</p>
              
              <ul className="text-left space-y-3 mb-8">
                <li className="flex items-center">
                  <CheckIcon className="h-5 w-5 text-green-500 mr-3" />
                  <span className="text-gray-700">無制限のフォント検出</span>
                </li>
                <li className="flex items-center">
                  <CheckIcon className="h-5 w-5 text-green-500 mr-3" />
                  <span className="text-gray-700">SSIM & CNN方式</span>
                </li>
                <li className="flex items-center">
                  <CheckIcon className="h-5 w-5 text-green-500 mr-3" />
                  <span className="text-gray-700">利用履歴の保存</span>
                </li>
                <li className="flex items-center">
                  <CheckIcon className="h-5 w-5 text-green-500 mr-3" />
                  <span className="text-gray-700">高速処理</span>
                </li>
                <li className="flex items-center">
                  <CheckIcon className="h-5 w-5 text-green-500 mr-3" />
                  <span className="text-gray-700">いつでもキャンセル可能</span>
                </li>
              </ul>
              
              {user && billingInfo?.has_subscription ? (
                <button
                  disabled
                  className="w-full inline-flex justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-400 cursor-not-allowed"
                >
                  登録済み
                </button>
              ) : (
                <button
                  onClick={() => handleSubscribe('basic_monthly')}
                  disabled={isCreatingCheckout}
                  className="w-full inline-flex justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  {isCreatingCheckout ? (
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : null}
                  今すぐ始める
                </button>
              )}
            </div>
          </div>

          {/* エンタープライズ */}
          <div className="bg-white rounded-lg shadow-lg p-8 border-2 border-gray-200">
            <div className="text-center">
              <h3 className="text-2xl font-semibold text-gray-900 mb-2">エンタープライズ</h3>
              <div className="mb-4">
                <span className="text-2xl font-bold text-gray-900">お問い合わせ</span>
              </div>
              <p className="text-gray-600 mb-6">大量処理・カスタマイズ対応</p>
              
              <ul className="text-left space-y-3 mb-8">
                <li className="flex items-center">
                  <CheckIcon className="h-5 w-5 text-green-500 mr-3" />
                  <span className="text-gray-700">API アクセス</span>
                </li>
                <li className="flex items-center">
                  <CheckIcon className="h-5 w-5 text-green-500 mr-3" />
                  <span className="text-gray-700">バッチ処理</span>
                </li>
                <li className="flex items-center">
                  <CheckIcon className="h-5 w-5 text-green-500 mr-3" />
                  <span className="text-gray-700">カスタムモデル</span>
                </li>
                <li className="flex items-center">
                  <CheckIcon className="h-5 w-5 text-green-500 mr-3" />
                  <span className="text-gray-700">専用サポート</span>
                </li>
                <li className="flex items-center">
                  <CheckIcon className="h-5 w-5 text-green-500 mr-3" />
                  <span className="text-gray-700">SLA保証</span>
                </li>
              </ul>
              
              <a
                href="mailto:contact@font-detector.com"
                className="w-full inline-flex justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                お問い合わせ
              </a>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">よくある質問</h2>
          
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold text-gray-900 mb-2">いつでもキャンセルできますか？</h3>
              <p className="text-gray-600">
                はい、いつでもキャンセル可能です。課金管理画面からワンクリックでキャンセルでき、
                現在の請求期間の終了まではサービスをご利用いただけます。
              </p>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold text-gray-900 mb-2">無料体験後に自動課金されますか？</h3>
              <p className="text-gray-600">
                いいえ、無料体験は完全に無料で、自動的に課金されることはありません。
                継続利用をご希望の場合は、明示的にサブスクリプションにご登録いただく必要があります。
              </p>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold text-gray-900 mb-2">どのような支払い方法が利用できますか？</h3>
              <p className="text-gray-600">
                クレジットカード（Visa、Mastercard、American Express、JCB）での
                お支払いに対応しています。Stripeの安全な決済システムを使用しているため、
                カード情報は暗号化されて保護されます。
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* OAuth認証モーダル */}
      <AuthModal 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        mode="register"
      />
    </div>
  );
}