// メインのフォント検出コンポーネント
import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { CloudArrowUpIcon, PhotoIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { detectFont, checkUsageLimit, hasUsedTrial } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import UsageLimitModal from './UsageLimitModal';
import FontResults from './FontResults';

const FontDetector = () => {
  const { user, userInfo } = useAuth();
  const [file, setFile] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [usageInfo, setUsageInfo] = useState(null);

  // ドラッグ&ドロップ設定
  const onDrop = useCallback(async (acceptedFiles) => {
    const selectedFile = acceptedFiles[0];
    if (!selectedFile) return;

    // ファイル検証
    if (!selectedFile.type.startsWith('image/')) {
      toast.error('画像ファイルを選択してください');
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error('ファイルサイズは10MB以下にしてください');
      return;
    }

    setFile(selectedFile);
    
    // 使用制限チェック
    await checkUsage();
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp']
    },
    multiple: false
  });

  // 使用制限チェック
  const checkUsage = async () => {
    try {
      const usage = await checkUsageLimit();
      setUsageInfo(usage);
      
      if (!usage.can_use) {
        setShowLimitModal(true);
        return false;
      }
      return true;
    } catch (error) {
      toast.error('使用制限の確認に失敗しました');
      return false;
    }
  };

  // フォント検出実行
  const handleDetection = async (method = 'ssim') => {
    if (!file) {
      toast.error('画像を選択してください');
      return;
    }

    // 使用制限再チェック
    const canUse = await checkUsage();
    if (!canUse) return;

    setLoading(true);
    
    try {
      const result = await detectFont(file, method);
      setResults(result);
      toast.success('フォント検出が完了しました！');
    } catch (error) {
      console.error('Detection failed:', error);
      
      if (error.response?.status === 403) {
        setShowLimitModal(true);
        toast.error('利用制限に達しました');
      } else {
        toast.error('フォント検出に失敗しました');
      }
    } finally {
      setLoading(false);
    }
  };

  // 使用状況の表示
  const renderUsageStatus = () => {
    if (!usageInfo) return null;

    const { user_type, reason, usage_count } = usageInfo;

    if (user_type === 'authenticated') {
      const hasSubscription = userInfo?.subscription?.active;
      return (
        <div className={`p-3 rounded-md mb-4 ${hasSubscription ? 'bg-green-50 text-green-800' : 'bg-yellow-50 text-yellow-800'}`}>
          {hasSubscription ? (
            <span>✅ 無制限でご利用いただけます</span>
          ) : (
            <span>⚠️ サブスクリプションが必要です</span>
          )}
        </div>
      );
    } else {
      const trialUsed = hasUsedTrial();
      return (
        <div className={`p-3 rounded-md mb-4 ${trialUsed ? 'bg-red-50 text-red-800' : 'bg-blue-50 text-blue-800'}`}>
          {trialUsed ? (
            <span>❌ 無料体験は既に利用済みです</span>
          ) : (
            <span>🎉 無料体験をご利用いただけます（1回限り）</span>
          )}
        </div>
      );
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          日本語フォント検出
        </h2>

        {renderUsageStatus()}

        {/* ファイルアップロード */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
            ${isDragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
            ${file ? 'border-green-400 bg-green-50' : ''}
          `}
        >
          <input {...getInputProps()} />
          
          {file ? (
            <div className="space-y-4">
              <PhotoIcon className="mx-auto h-12 w-12 text-green-500" />
              <div>
                <p className="text-lg font-medium text-green-700">{file.name}</p>
                <p className="text-sm text-gray-500">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
              <div>
                <p className="text-lg font-medium text-gray-900">
                  画像をドラッグ&ドロップするか、クリックして選択
                </p>
                <p className="text-sm text-gray-500">
                  PNG, JPG, WEBP (最大10MB)
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 検出方法選択 */}
        {file && (
          <div className="mt-6 space-y-4">
            <h3 className="text-lg font-medium text-gray-900">検出方法を選択</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => handleDetection('ssim')}
                disabled={loading}
                className="flex flex-col items-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="font-medium text-gray-900">SSIM方式</span>
                <span className="text-sm text-gray-500 mt-1">高速・軽量</span>
              </button>
              
              <button
                onClick={() => handleDetection('cnn')}
                disabled={loading}
                className="flex flex-col items-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="font-medium text-gray-900">CNN方式</span>
                <span className="text-sm text-gray-500 mt-1">高精度・AI</span>
              </button>
            </div>
          </div>
        )}

        {/* ローディング */}
        {loading && (
          <div className="mt-6 text-center">
            <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-sm shadow rounded-md text-white bg-blue-500">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              フォント検出中...
            </div>
          </div>
        )}

        {/* 結果表示 */}
        {results && (
          <FontResults results={results} />
        )}
      </div>

      {/* 使用制限モーダル */}
      <UsageLimitModal 
        isOpen={showLimitModal}
        onClose={() => setShowLimitModal(false)}
        usageInfo={usageInfo}
      />
    </div>
  );
};

export default FontDetector;