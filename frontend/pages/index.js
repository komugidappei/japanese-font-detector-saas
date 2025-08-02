// メインページ
import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '../hooks/useAuth';
import FontDetector from '../components/FontDetector';
import AuthModal from '../components/AuthModal';
import { checkUsageLimit, hasUsedTrial } from '../lib/api';
import { 
  SparklesIcon, 
  LightBulbIcon, 
  BoltIcon, 
  ShieldCheckIcon,
  ChartBarIcon,
  CloudArrowUpIcon 
} from '@heroicons/react/24/outline';

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
      <header className="relative bg-white/90 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <SparklesIcon className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                フォント検出AI
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              {user ? (
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-600 px-3 py-1 bg-gray-100 rounded-full">
                    {user.email}
                  </span>
                  {userInfo?.subscription?.active ? (
                    <span className="px-3 py-1 text-xs font-semibold text-emerald-700 bg-emerald-100 rounded-full border border-emerald-200">
                      ✨ Pro
                    </span>
                  ) : (
                    <Link
                      href="/subscription"
                      className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-full hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                    >
                      アップグレード
                    </Link>
                  )}
                  <Link
                    href="/dashboard"
                    className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    ダッシュボード
                  </Link>
                </div>
              ) : (
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    ログイン
                  </button>
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-full hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    始める
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
        <div className="relative bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-20">
          <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
          <div className="relative max-w-6xl mx-auto text-center px-4">
            <div className="inline-flex items-center space-x-2 bg-emerald-100 text-emerald-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <ShieldCheckIcon className="w-4 h-4" />
              <span>Pro プラン利用中</span>
            </div>
            <h2 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                無制限で
              </span>
              <br />フォント検出
            </h2>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              AIが画像から日本語フォントを高精度で識別。プロユーザーなら無制限でご利用いただけます。
            </p>
          </div>
        </div>
      );
    } else if (user && !userInfo?.subscription?.active) {
      // ログイン済み・未課金ユーザー
      return (
        <div className="relative bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 py-20">
          <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
          <div className="relative max-w-6xl mx-auto text-center px-4">
            <div className="inline-flex items-center space-x-2 bg-amber-100 text-amber-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <BoltIcon className="w-4 h-4" />
              <span>アップグレードして無制限利用</span>
            </div>
            <h2 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              <span className="bg-gradient-to-r from-amber-600 to-red-600 bg-clip-text text-transparent">
                プロ版で
              </span>
              <br />パワーアップ
            </h2>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              月額300円で無制限のフォント検出と高速処理をお楽しみください。
            </p>
            <Link
              href="/subscription"
              className="inline-flex items-center px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-amber-600 to-red-600 rounded-full hover:from-amber-700 hover:to-red-700 transition-all duration-200 shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
            >
              <BoltIcon className="w-5 h-5 mr-2" />
              今すぐアップグレード
            </Link>
          </div>
        </div>
      );
    } else {
      // 未ログインユーザー
      const trialUsed = hasUsedTrial();
      return (
        <div className="relative bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-24 overflow-hidden">
          {/* 背景のデコレーション */}
          <div className="absolute inset-0">
            <div className="absolute top-10 left-10 w-20 h-20 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
            <div className="absolute top-20 right-10 w-20 h-20 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
            <div className="absolute bottom-20 left-20 w-20 h-20 bg-pink-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
          </div>
          
          <div className="relative max-w-6xl mx-auto text-center px-4">
            <div className="inline-flex items-center space-x-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-8 shadow-sm">
              <SparklesIcon className="w-4 h-4" />
              <span>次世代AI技術</span>
            </div>
            
            <h1 className="text-6xl md:text-7xl font-bold text-gray-900 mb-8 leading-tight">
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                AI
              </span>
              が瞬時に
              <br />
              <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                フォント
              </span>
              を特定
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-4xl mx-auto leading-relaxed">
              画像をアップロードするだけで、AIが日本語フォントを
              <span className="font-semibold text-blue-600">高精度で識別</span>。
              デザイナーの強い味方。
            </p>
            
            {!trialUsed ? (
              <div className="space-y-6">
                <div className="inline-flex items-center space-x-2 bg-emerald-100 text-emerald-700 px-6 py-3 rounded-full text-lg font-medium shadow-lg">
                  <SparklesIcon className="w-5 h-5" />
                  <span>🎉 無料で3回お試しいただけます</span>
                </div>
                <p className="text-gray-500">クレジットカード不要・アカウント登録不要</p>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="inline-flex items-center space-x-2 bg-gray-100 text-gray-600 px-6 py-3 rounded-full text-lg font-medium">
                  <LightBulbIcon className="w-5 h-5" />
                  <span>無料体験は終了しました</span>
                </div>
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="inline-flex items-center px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-full hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
                  >
                    <SparklesIcon className="w-5 h-5 mr-2" />
                    アカウント作成
                  </button>
                  <Link
                    href="/subscription"
                    className="inline-flex items-center px-8 py-4 text-lg font-semibold text-gray-700 bg-white border-2 border-gray-300 rounded-full hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    料金プラン
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }
  };

  const renderFeatures = () => {
    return (
      <div className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              なぜ選ばれるのか
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              最新のAI技術と使いやすいインターface、そして信頼性の高いサービスで、
              プロフェッショナルから愛用されています。
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="group p-8 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <BoltIcon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">高速処理</h3>
              <p className="text-gray-600 leading-relaxed">
                最新のAI技術により、数秒でフォントを特定。待ち時間なしでサクサク利用できます。
              </p>
            </div>
            
            <div className="group p-8 bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl border border-purple-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <ChartBarIcon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">高精度</h3>
              <p className="text-gray-600 leading-relaxed">
                SSIM + CNN のダブル解析で、日本語フォントを95%以上の精度で識別します。
              </p>
            </div>
            
            <div className="group p-8 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border border-emerald-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <CloudArrowUpIcon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">簡単操作</h3>
              <p className="text-gray-600 leading-relaxed">
                ドラッグ&ドロップで画像をアップロード。専門知識不要で誰でも簡単に利用できます。
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCTA = () => {
    if (user && userInfo?.subscription?.active) return null;
    
    return (
      <div className="relative py-24 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className="relative max-w-4xl mx-auto text-center px-4">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            今すぐ始めよう
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            プロデザイナーが愛用するフォント検出AIを、あなたも体験してみませんか？
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            {!user ? (
              <>
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="inline-flex items-center px-8 py-4 text-lg font-semibold text-blue-600 bg-white rounded-full hover:bg-gray-50 transition-all duration-200 shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
                >
                  <SparklesIcon className="w-5 h-5 mr-2" />
                  無料で始める
                </button>
                <Link
                  href="/subscription"
                  className="inline-flex items-center px-8 py-4 text-lg font-semibold text-white border-2 border-white rounded-full hover:bg-white hover:text-blue-600 transition-all duration-200"
                >
                  料金を見る
                </Link>
              </>
            ) : (
              <Link
                href="/subscription"
                className="inline-flex items-center px-8 py-4 text-lg font-semibold text-blue-600 bg-white rounded-full hover:bg-gray-50 transition-all duration-200 shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
              >
                <BoltIcon className="w-5 h-5 mr-2" />
                プロにアップグレード
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Head>
        <title>日本語フォント検出 AI - 画像から瞬時にフォントを特定</title>
        <meta name="description" content="AIが画像から日本語フォントを高精度で識別。デザイナーの強い味方。無料体験3回まで。" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      {renderHeader()}
      {renderHero()}
      
      {/* フォント検出エリア */}
      <div className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4">
          <FontDetector 
            canUse={canUse} 
            usageInfo={usageInfo}
          />
        </div>
      </div>

      {renderFeatures()}
      {renderCTA()}

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <SparklesIcon className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold">日本語フォント検出 AI</span>
            </div>
            <p className="text-gray-400 mb-6">
              AIが画像から日本語フォントを高精度で識別
            </p>
            <div className="flex justify-center space-x-6">
              <Link href="/subscription" className="text-gray-400 hover:text-white transition-colors">
                料金プラン
              </Link>
              <Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors">
                ダッシュボード
              </Link>
            </div>
          </div>
        </div>
      </footer>

      {/* OAuth認証モーダル */}
      <AuthModal 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        mode="register"
      />
    </div>
  );
}