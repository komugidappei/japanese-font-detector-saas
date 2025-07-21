// 認証フック
import { useState, useEffect, useContext, createContext } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  GithubAuthProvider,
  TwitterAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { registerUser, getCurrentUser } from '../lib/api';
import toast from 'react-hot-toast';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        
        try {
          // バックエンドからユーザー情報を取得
          const userData = await getCurrentUser();
          setUserInfo(userData);
        } catch (error) {
          console.error('Failed to get user info:', error);
          // ユーザーが未登録の場合は登録
          try {
            await registerUser();
            const userData = await getCurrentUser();
            setUserInfo(userData);
          } catch (registerError) {
            console.error('Failed to register user:', registerError);
          }
        }
      } else {
        setUser(null);
        setUserInfo(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email, password) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      return result.user;
    } catch (error) {
      throw error;
    }
  };

  const register = async (email, password) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      // バックエンドにユーザー登録
      await registerUser();
      
      return result.user;
    } catch (error) {
      throw error;
    }
  };

  const loginWithGoogle = async (useRedirect = false) => {
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
      
      let result;
      if (useRedirect) {
        await signInWithRedirect(auth, provider);
        return null; // リダイレクト後に処理される
      } else {
        result = await signInWithPopup(auth, provider);
      }
      
      // バックエンドにユーザー登録
      try {
        await registerUser();
        toast.success('Googleアカウントでログインしました');
      } catch (error) {
        // 既に登録済みの場合はエラーを無視
        console.log('User already registered or registration failed:', error);
      }
      
      return result.user;
    } catch (error) {
      console.error('Google login failed:', error);
      toast.error('Googleログインに失敗しました');
      throw error;
    }
  };

  const loginWithGitHub = async (useRedirect = false) => {
    try {
      const provider = new GithubAuthProvider();
      provider.addScope('user:email');
      
      let result;
      if (useRedirect) {
        await signInWithRedirect(auth, provider);
        return null;
      } else {
        result = await signInWithPopup(auth, provider);
      }
      
      // バックエンドにユーザー登録
      try {
        await registerUser();
        toast.success('GitHubアカウントでログインしました');
      } catch (error) {
        console.log('User already registered or registration failed:', error);
      }
      
      return result.user;
    } catch (error) {
      console.error('GitHub login failed:', error);
      toast.error('GitHubログインに失敗しました');
      throw error;
    }
  };

  const loginWithTwitter = async (useRedirect = false) => {
    try {
      const provider = new TwitterAuthProvider();
      
      let result;
      if (useRedirect) {
        await signInWithRedirect(auth, provider);
        return null;
      } else {
        result = await signInWithPopup(auth, provider);
      }
      
      // バックエンドにユーザー登録
      try {
        await registerUser();
        toast.success('Twitterアカウントでログインしました');
      } catch (error) {
        console.log('User already registered or registration failed:', error);
      }
      
      return result.user;
    } catch (error) {
      console.error('Twitter login failed:', error);
      toast.error('Twitterログインに失敗しました');
      throw error;
    }
  };

  // リダイレクト結果の処理
  useEffect(() => {
    const handleRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result && result.user) {
          await registerUser();
          toast.success('ログインが完了しました');
        }
      } catch (error) {
        console.error('Redirect login failed:', error);
        toast.error('ログインに失敗しました');
      }
    };

    handleRedirectResult();
  }, []);

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      throw error;
    }
  };

  const value = {
    user,
    userInfo,
    login,
    register,
    loginWithGoogle,
    loginWithGitHub,
    loginWithTwitter,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};