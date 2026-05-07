import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../api';

interface User {
  _id: string;
  email: string;
  nickname: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, nickname: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // 添加超时处理
      const timeoutId = setTimeout(() => {
        console.log('Auth check timeout');
        localStorage.removeItem('token');
        setLoading(false);
      }, 5000);

      api.get('/auth/me')
        .then((res) => {
          clearTimeout(timeoutId);
          setUser(res.data);
        })
        .catch((err) => {
          clearTimeout(timeoutId);
          console.error('Auth check failed:', err);
          localStorage.removeItem('token');
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', res.data.token);
      setUser(res.data.user);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || '登录失败');
      throw err;
    }
  };

  const register = async (email: string, password: string, nickname: string) => {
    try {
      const res = await api.post('/auth/register', { email, password, nickname });
      localStorage.setItem('token', res.data.token);
      setUser(res.data.user);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || '注册失败');
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  // 如果还在加载，显示加载状态
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        flexDirection: 'column'
      }}>
        <div style={{ fontSize: '18px', marginBottom: '10px' }}>加载中...</div>
        <div style={{ fontSize: '14px', color: '#666' }}>正在连接服务器</div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
