// ユーザーダッシュボード
import dynamic from 'next/dynamic';
import { useState } from 'react';

// ダッシュボードコンポーネントを動的インポート（SSRを無効化）
const DashboardContent = dynamic(() => import('../components/DashboardContent'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  )
});

export default function Dashboard() {
  return <DashboardContent />;
}