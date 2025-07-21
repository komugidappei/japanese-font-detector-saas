// フォント検出結果表示コンポーネント
import { useState } from 'react';
import { ClockIcon, DocumentTextIcon, CpuChipIcon } from '@heroicons/react/24/outline';

const FontResults = ({ results }) => {
  const [selectedTab, setSelectedTab] = useState('candidates');

  if (!results) return null;

  const { candidates, text_extracted, processing_time, method } = results;

  const tabs = [
    { id: 'candidates', name: 'フォント候補', icon: CpuChipIcon },
    { id: 'text', name: '抽出テキスト', icon: DocumentTextIcon },
  ];

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-50';
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getConfidenceLabel = (confidence) => {
    if (confidence >= 0.8) return '高';
    if (confidence >= 0.6) return '中';
    return '低';
  };

  return (
    <div className="mt-8 bg-gray-50 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-gray-900">検出結果</h3>
        <div className="flex items-center text-sm text-gray-500">
          <ClockIcon className="h-4 w-4 mr-1" />
          {processing_time.toFixed(2)}秒 ({method.toUpperCase()})
        </div>
      </div>

      {/* タブナビゲーション */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id)}
                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                  selectedTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {tab.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* タブコンテンツ */}
      {selectedTab === 'candidates' && (
        <div className="space-y-4">
          {candidates && candidates.length > 0 ? (
            <>
              <h4 className="font-medium text-gray-900 mb-3">
                最も類似したフォント (上位{candidates.length}件)
              </h4>
              <div className="space-y-3">
                {candidates.map((candidate, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full font-semibold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {candidate.font_name}
                        </p>
                        <p className="text-sm text-gray-500">
                          類似度: {(candidate.confidence * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${candidate.confidence * 100}%` }}
                        ></div>
                      </div>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${getConfidenceColor(
                          candidate.confidence
                        )}`}
                      >
                        {getConfidenceLabel(candidate.confidence)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <CpuChipIcon className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-2 text-sm text-gray-500">
                フォント候補が見つかりませんでした
              </p>
            </div>
          )}
        </div>
      )}

      {selectedTab === 'text' && (
        <div className="space-y-4">
          {text_extracted && text_extracted.length > 0 ? (
            <>
              <h4 className="font-medium text-gray-900 mb-3">
                画像から抽出されたテキスト
              </h4>
              <div className="space-y-2">
                {text_extracted.map((text, index) => (
                  <div
                    key={index}
                    className="p-3 bg-white rounded-lg border border-gray-200"
                  >
                    <span className="text-gray-900 font-medium">{text}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-2 text-sm text-gray-500">
                日本語テキストが見つかりませんでした
              </p>
              <p className="text-xs text-gray-400 mt-1">
                画像に日本語のテキストが含まれているか確認してください
              </p>
            </div>
          )}
        </div>
      )}

      {/* 使用のヒント */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h5 className="font-medium text-blue-900 mb-2">💡 検出精度を上げるコツ</h5>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• 文字がはっきりと見える高解像度の画像を使用する</li>
          <li>• 背景と文字のコントラストが高い画像を選ぶ</li>
          <li>• 複数の文字が含まれている画像の方が精度が向上します</li>
          <li>• SSIM方式は高速、CNN方式はより高精度です</li>
        </ul>
      </div>
    </div>
  );
};

export default FontResults;