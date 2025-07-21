// ユーザーダッシュボード
import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../hooks/useAuth';
import { 
  getBillingInfo, 
  createCustomerPortalSession, 
  getDetectionHistory 
} from '../lib/api';
import { 
  CreditCardIcon, 
  ChartBarIcon, 
  ClockIcon,
  CogIcon,
  ArrowTopRightOnSquareIcon 
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const { user, userInfo, logout, loading } = useAuth();
  const router = useRouter();
  const [billingInfo, setBillingInfo] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
      return;
    }

    if (user) {
      loadDashboardData();
    }
  }, [user, loading]);

  const loadDashboardData = async () => {
    try {
      // 課金情報と履歴を並行して取得
      const [billing, historyData] = await Promise.all([
        getBillingInfo(),
        getDetectionHistory(20)
      ]);
      
      setBillingInfo(billing);
      setHistory(historyData.history || []);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      toast.error('ダッシュボードデータの読み込みに失敗しました');
    }
  };

  const handleCustomerPortal = async () => {
    setLoadingPortal(true);
    try {
      const { portal_url } = await createCustomerPortalSession();
      window.location.href = portal_url;
    } catch (error) {
      console.error('Failed to create customer portal session:', error);
      toast.error('課金管理画面の作成に失敗しました');
    } finally {
      setLoadingPortal(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { color: 'bg-green-100 text-green-800', text: '有効' },
      canceled: { color: 'bg-red-100 text-red-800', text: 'キャンセル済み' },
      past_due: { color: 'bg-yellow-100 text-yellow-800', text: '支払い遅延' },
      incomplete: { color: 'bg-gray-100 text-gray-800', text: '未完了' },
      trialing: { color: 'bg-blue-100 text-blue-800', text: 'お試し期間' }
    };

    const config = statusConfig[status] || statusConfig.incomplete;
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
        {config.text}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const tabs = [
    { id: 'overview', name: '概要', icon: ChartBarIcon },
    { id: 'billing', name: '課金管理', icon: CreditCardIcon },
    { id: 'history', name: '利用履歴', icon: ClockIcon },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>ダッシュボード - 日本語フォント検出 AI</title>
      </Head>

      {/* ヘッダー */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link href="/" className="text-xl font-bold text-gray-900">
              日本語フォント検出 AI
            </Link>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">{user.email}</span>
              <button
                onClick={logout}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                ログアウト
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* タブナビゲーション */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-5 w-5 mr-2" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* 概要タブ */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* サブスクリプション状況 */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <CreditCardIcon className="h-8 w-8 text-blue-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">サブスクリプション</p>
                    <div className="mt-1">
                      {billingInfo?.has_subscription ? (
                        getStatusBadge(billingInfo.status)
                      ) : (
                        <span className="text-lg font-semibold text-gray-400">未登録</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 利用回数 */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <ChartBarIcon className="h-8 w-8 text-green-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">今月の利用回数</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {history.length} 回
                    </p>
                  </div>
                </div>
              </div>

              {/* 次回請求日 */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <ClockIcon className="h-8 w-8 text-purple-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">次回請求日</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {billingInfo?.current_period_end 
                        ? formatDate(billingInfo.current_period_end).split(' ')[0]
                        : '--'
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* クイックアクション */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">クイックアクション</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Link
                  href="/"
                  className="flex items-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <ChartBarIcon className="h-6 w-6 text-blue-500 mr-3" />
                  <span className="font-medium">フォント検出を開始</span>
                </Link>
                
                {billingInfo?.has_subscription ? (
                  <button
                    onClick={handleCustomerPortal}
                    disabled={loadingPortal}
                    className="flex items-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    <CogIcon className="h-6 w-6 text-green-500 mr-3" />
                    <span className="font-medium">課金設定を管理</span>
                    <ArrowTopRightOnSquareIcon className="h-4 w-4 ml-auto" />
                  </button>
                ) : (
                  <Link
                    href="/subscription"
                    className="flex items-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    <CreditCardIcon className="h-6 w-6 text-purple-500 mr-3" />
                    <span className="font-medium">サブスクリプション登録</span>
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 課金管理タブ */}
        {activeTab === 'billing' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">課金情報</h3>
              
              {billingInfo?.has_subscription ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">プラン</label>
                      <p className="mt-1 text-sm text-gray-900">ベーシックプラン（月額300円）</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">ステータス</label>
                      <div className="mt-1">
                        {getStatusBadge(billingInfo.status)}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">現在の請求期間</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {billingInfo.current_period_start && billingInfo.current_period_end
                          ? `${formatDate(billingInfo.current_period_start).split(' ')[0]} - ${formatDate(billingInfo.current_period_end).split(' ')[0]}`
                          : '--'
                        }
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">次回請求日</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {billingInfo.current_period_end 
                          ? formatDate(billingInfo.current_period_end).split(' ')[0]
                          : '--'
                        }
                      </p>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-gray-200">
                    <button
                      onClick={handleCustomerPortal}
                      disabled={loadingPortal}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                    >
                      {loadingPortal ? (
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <CogIcon className="h-5 w-5 mr-2" />
                      )}
                      課金設定を管理
                      <ArrowTopRightOnSquareIcon className="h-4 w-4 ml-2" />
                    </button>
                    <p className="mt-2 text-sm text-gray-500">
                      支払い方法の変更、請求書のダウンロード、サブスクリプションのキャンセルなどはStripeの管理画面で行えます。
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <CreditCardIcon className="mx-auto h-12 w-12 text-gray-300" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">サブスクリプション未登録</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    サービスを利用するにはサブスクリプションが必要です
                  </p>
                  <div className="mt-6">
                    <Link
                      href="/subscription"
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      サブスクリプションを開始
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 利用履歴タブ */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">フォント検出履歴</h3>
            </div>
            
            {history.length > 0 ? (
              <div className="divide-y divide-gray-200">
                {history.map((item, index) => (
                  <div key={item.id || index} className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <span className="text-sm font-medium text-gray-900">
                            検出方法: {item.method?.toUpperCase() || 'SSIM'}
                          </span>
                          <span className="text-sm text-gray-500">
                            {formatDate(item.created_at)}
                          </span>
                        </div>
                        
                        {item.text_extracted && item.text_extracted.length > 0 && (
                          <div className="mt-2">
                            <p className="text-sm text-gray-700">
                              抽出テキスト: {item.text_extracted.join(', ')}
                            </p>
                          </div>
                        )}
                        
                        {item.candidates && item.candidates.length > 0 && (
                          <div className="mt-2">
                            <p className="text-sm text-gray-700">
                              検出フォント: {item.candidates[0]?.font_name} 
                              ({(item.candidates[0]?.confidence * 100).toFixed(1)}%)
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <ClockIcon className="mx-auto h-12 w-12 text-gray-300" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">利用履歴なし</h3>
                <p className="mt-1 text-sm text-gray-500">
                  まだフォント検出を利用していません
                </p>
                <div className="mt-6">
                  <Link
                    href="/"
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    フォント検出を開始
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}