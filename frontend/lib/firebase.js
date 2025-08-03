// Firebase認証を一時的に無効化（デモ用）
// 本番環境では適切なFirebase設定を行ってください

console.log('Firebase temporarily disabled for demo');

// モック認証オブジェクト
const mockAuth = {
  currentUser: null,
  onAuthStateChanged: (callback) => {
    // 常に未認証状態を返す
    if (callback) callback(null);
    return () => {}; // unsubscribe function
  }
};

let app = null;
let auth = mockAuth;

export { auth };
export default app;