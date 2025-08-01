// メインページ
import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '../hooks/useAuth';
import FontDetector from '../components/FontDetector';
import AuthModal from '../components/AuthModal';
import { checkUsageLimit, hasUsedTrial } from '../lib/api';

export default function Home() {
  const { user, userInfo, loading } = useAuth();
  const [canUse, setCanUse] = useState(false);
  const [usageInfo, setUsageInfo] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    const checkUsage = async () => {
      try {
        const usage = await checkUsageLimit();
        setUsageInfo(usage);
        setCanUse(usage.can_use);
      } catch (error) {
        console.error('Failed to check usage:', error);
      }
    };

    if (!loading) {
      checkUsage();
    }
  }, [loading, user, userInfo]);

  const renderHeader = () => {
    return (
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">
                日本語フォント検出 AI
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              {user ? (
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-700">
                    {user.email}
                  </span>
                  {userInfo?.subscription?.active ? (
                    <span className="px-2 py-1 text-xs font-medium text-green-800 bg-green-100 rounded-full">
                      サブスク有効
                    </span>
                  ) : (
                    <Link
                      href="/subscription"
                      className="px-3 py-1 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                    >
                      サブスク登録
                    </Link>
                  )}
                  <Link
                    href="/dashboard"
                    className="text-sm text-gray-700 hover:text-gray-900"
                  >
                    ダッシュボード
                  </Link>
                </div>
              ) : (
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="text-sm text-gray-700 hover:text-gray-900"
                  >
                    ログイン
                  </button>
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="px-3 py-1 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                  >
                    新規登録
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
    );
  };

  const renderHero = () => {
    if (user && userInfo?.subscription?.active) {
      // 有料ユーザー
      return (
        <div className="bg-gradient-to-b from-blue-50 to-white py-12">
          <div className="max-w-4xl mx-auto text-center px-4">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              AIが画像からフォントを識別
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              日本語のフォントを高精度で判別します。無制限でご利用いただけます。
            </p>
          </div>
        </div>
      );
    } else if (user && !userInfo?.subscription?.active) {
      // ログイン済み・未課金ユーザー
      return (
        <div className="bg-gradient-to-b from-yellow-50 to-white py-12">
          <div className="max-w-4xl mx-auto text-center px-4">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              サブスクリプションが必要です
            </h2>
            <p className="text-xl text-gray-600 mb-6">
              このサービスを利用するには、月額300円のサブスクリプションが必要です。
            </p>
            <Link
              href="/subscription"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              サブスクリプションを開始
            </Link>
          </div>
        </div>
      );
    } else {
      // 未ログインユーザー
      const trialUsed = hasUsedTrial();
      return (
        <div className="bg-gradient-to-b from-blue-50 to-white py-12">
          <div className="max-w-4xl mx-auto text-center px-4">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              AIが画像からフォントを識別
            </h2>
            <p className="text-xl text-gray-600 mb-6">
              日本語のフォントを高精度で判別します。
            </p>
            {trialUsed ? (
              <div className="space-y-4">
                <p className="text-lg text-red-600">
                  無料体験は既に利用済みです
                </p>
                <div className="flex justify-center space-x-4">
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    アカウント登録
                  </button>
                  <Link
                    href="/pricing"
                    className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    料金プラン
                  </Link>
                </div>
              </div>
            ) : (
              <p className="text-lg text-green-600">
                🎉 無料体験をお試しください（3回まで）
              </p>
            )}
          </div>
        </div>
      );
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
        <title>日本語フォント検出 AI</title>
        <meta name="description" content="AIを使用して画像から日本語フォントを高精度で識別するサービス" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {renderHeader()}
      {renderHero()}

      <main className="py-12">
        <FontDetector />
      </main>

      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">
              © 2024 日本語フォント検出 AI. All rights reserved.
            </p>
            <div className="flex space-x-6">
              <Link href="/pricing" className="text-sm text-gray-500 hover:text-gray-700">
                料金プラン
              </Link>
              <Link href="/privacy" className="text-sm text-gray-500 hover:text-gray-700">
                プライバシーポリシー
              </Link>
              <Link href="/terms" className="text-sm text-gray-500 hover:text-gray-700">
                利用規約
              </Link>
            </div>
          </div>
        </div>
      </footer>

      {/* OAuth認証モーダル */}
      <AuthModal 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        mode="login"
      />
    </div>
  );
}