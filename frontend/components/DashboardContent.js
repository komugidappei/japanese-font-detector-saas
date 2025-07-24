// ダッシュボードコンテンツ
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

export default function DashboardContent() {
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
      // エラーが発生してもUIは表示する
    }
  };

  const handleManageBilling = async () => {
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

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/');
    } catch (error) {
      console.error('Logout failed:', error);
      toast.error('ログアウトに失敗しました');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return null; // ルーターがリダイレクトするまで何も表示しない
  }

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
              <span className="text-sm text-gray-700">{user?.email}</span>
              <button
                onClick={handleLogout}
                className="text-sm text-gray-700 hover:text-gray-900"
              >
                ログアウト
              </button>
            </div>
          </div>

          {/* タブナビゲーション */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'overview'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <ChartBarIcon className="w-5 h-5 inline mr-2" />
                概要
              </button>
              
              <button
                onClick={() => setActiveTab('history')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'history'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <ClockIcon className="w-5 h-5 inline mr-2" />
                利用履歴
              </button>
              
              <button
                onClick={() => setActiveTab('settings')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'settings'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <CogIcon className="w-5 h-5 inline mr-2" />
                設定
              </button>
            </nav>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* 概要タブ */}
        {activeTab === 'overview' && (
          <div className="px-4 py-6 sm:px-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {/* サブスクリプション状況 */}
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <CreditCardIcon className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          サブスクリプション
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {billingInfo?.has_subscription ? 'ベーシックプラン' : '未加入'}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              {/* 利用回数 */}
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <ChartBarIcon className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          今月の利用回数
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {userInfo?.usage_count || 0} 回
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              {/* 残り利用回数 (無料ユーザーのみ) */}
              {!billingInfo?.has_subscription && (
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <ClockIcon className="h-6 w-6 text-gray-400" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            残り無料回数
                          </dt>
                          <dd className="text-lg font-medium text-gray-900">
                            {Math.max(0, 1 - (userInfo?.usage_count || 0))} 回
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* アクションボタン */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link
                href="/"
                className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                フォント検出を開始
              </Link>

              {billingInfo?.has_subscription ? (
                <button
                  onClick={handleManageBilling}
                  disabled={loadingPortal}
                  className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  {loadingPortal ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      読み込み中...
                    </>
                  ) : (
                    <>
                      <CreditCardIcon className="w-5 h-5 mr-2" />
                      課金設定を管理
                      <ArrowTopRightOnSquareIcon className="w-4 h-4 ml-2" />
                    </>
                  )}
                </button>
              ) : (
                <Link
                  href="/subscription"
                  className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  サブスクリプションを開始
                </Link>
              )}
            </div>
          </div>
        )}

        {/* 利用履歴タブ */}
        {activeTab === 'history' && (
          <div className="px-4 py-6 sm:px-0">
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  利用履歴
                </h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                  最近のフォント検出履歴を表示しています
                </p>
              </div>
              
              {history.length === 0 ? (
                <div className="px-4 py-5 sm:px-6 text-center">
                  <p className="text-gray-500">まだ利用履歴がありません</p>
                  <Link
                    href="/"
                    className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-600 bg-blue-100 hover:bg-blue-200"
                  >
                    フォント検出を開始
                  </Link>
                </div>
              ) : (
                <ul className="divide-y divide-gray-200">
                  {history.map((item, index) => (
                    <li key={index} className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <span className="text-sm font-medium text-blue-600">
                                {index + 1}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              検出結果: {item.detected_font || '不明'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {item.created_at ? new Date(item.created_at).toLocaleString('ja-JP') : '日時不明'}
                            </div>
                          </div>
                        </div>
                        <div className="text-sm text-gray-500">
                          信頼度: {item.confidence ? `${Math.round(item.confidence * 100)}%` : '不明'}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* 設定タブ */}
        {activeTab === 'settings' && (
          <div className="px-4 py-6 sm:px-0">
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  アカウント設定
                </h3>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      メールアドレス
                    </label>
                    <div className="mt-1">
                      <input
                        type="email"
                        value={user?.email || ''}
                        disabled
                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md bg-gray-50"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      アカウント作成日
                    </label>
                    <div className="mt-1">
                      <input
                        type="text"
                        value={userInfo?.created_at ? new Date(userInfo.created_at).toLocaleDateString('ja-JP') : '不明'}
                        disabled
                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md bg-gray-50"
                      />
                    </div>
                  </div>

                  <div className="pt-5">
                    <div className="flex justify-end">
                      <button
                        onClick={handleLogout}
                        className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        ログアウト
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}