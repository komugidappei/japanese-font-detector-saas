// API通信ユーティリティ
import axios from 'axios';
import { auth } from './firebase';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// APIクライアント設定
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// リクエストインターセプター（認証トークン追加）
apiClient.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // セッションIDを追加（匿名ユーザー用）
  const sessionId = getSessionId();
  if (sessionId) {
    config.headers['X-Session-ID'] = sessionId;
  }
  
  return config;
});

// セッションID管理
export const getSessionId = () => {
  if (typeof window !== 'undefined') {
    let sessionId = localStorage.getItem('font-detector-session-id');
    if (!sessionId) {
      sessionId = generateSessionId();
      localStorage.setItem('font-detector-session-id', sessionId);
    }
    return sessionId;
  }
  return null;
};

const generateSessionId = () => {
  return 'sess_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
};

// 使用制限チェック
export const checkUsageLimit = async () => {
  try {
    console.log('Checking usage limit...');
    const sessionId = getSessionId();
    console.log('Session ID:', sessionId);
    
    const response = await apiClient.get('/usage/check');
    console.log('Usage check response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Usage check failed:', error);
    console.error('Error response:', error.response?.data);
    return { can_use: false, reason: 'error' };
  }
};

// フォント検出
export const detectFont = async (file, method = 'ssim') => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('method', method);
    
    const response = await apiClient.post('/detect/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    // 使用回数をローカルストレージに記録（匿名ユーザー用）
    if (!auth.currentUser) {
      markTrialUsed();
    }
    
    return response.data;
  } catch (error) {
    throw error;
  }
};

// 無料体験使用済みマーク
export const markTrialUsed = () => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('font-detector-trial-used', 'true');
  }
};

// 無料体験使用済みチェック
export const hasUsedTrial = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('font-detector-trial-used') === 'true';
  }
  return false;
};

// ユーザー登録
export const registerUser = async () => {
  try {
    const response = await apiClient.post('/auth/register');
    return response.data;
  } catch (error) {
    throw error;
  }
};

// ユーザー情報取得
export const getCurrentUser = async () => {
  try {
    const response = await apiClient.get('/auth/me');
    return response.data;
  } catch (error) {
    throw error;
  }
};

// サブスクリプション作成
export const createCheckoutSession = async (planId, successUrl, cancelUrl) => {
  try {
    const response = await apiClient.post('/subscription/create-checkout', {
      plan_id: planId,
      success_url: successUrl,
      cancel_url: cancelUrl
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// サブスクリプション状態取得
export const getSubscriptionStatus = async () => {
  try {
    const response = await apiClient.get('/subscription/status');
    return response.data;
  } catch (error) {
    throw error;
  }
};

// 検出履歴取得
export const getDetectionHistory = async (limit = 10) => {
  try {
    const response = await apiClient.get(`/detect/history?limit=${limit}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// 料金プラン取得
export const getPlans = async () => {
  try {
    const response = await apiClient.get('/subscription/plans');
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Customer Portal セッション作成
export const createCustomerPortalSession = async () => {
  try {
    const response = await apiClient.post('/subscription/customer-portal');
    return response.data;
  } catch (error) {
    throw error;
  }
};

// 課金情報取得
export const getBillingInfo = async () => {
  try {
    const response = await apiClient.get('/subscription/billing-info');
    return response.data;
  } catch (error) {
    throw error;
  }
};

export default apiClient;