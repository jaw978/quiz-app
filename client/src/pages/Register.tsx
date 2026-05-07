import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { BookOpen, Eye, EyeOff } from 'lucide-react';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(email, password, nickname);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || '注册失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-blue-50 px-4">
      <div className="card w-full max-w-md">
        <div className="text-center mb-6">
          <BookOpen className="w-12 h-12 text-primary-600 mx-auto mb-2" />
          <h1 className="text-2xl font-bold">注册错题本</h1>
          <p className="text-gray-500 text-sm mt-1">创建账号，开始你的刷题之旅</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">昵称</label>
            <input type="text" value={nickname} onChange={(e) => setNickname(e.target.value)} className="input" placeholder="你的昵称" />
          </div>
          <div>
            <label className="label">邮箱</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder="your@email.com" required />
          </div>
          <div>
            <label className="label">密码（至少6位）</label>
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} className="input pr-10" placeholder="设置密码" required minLength={6} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? '注册中...' : '注册'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          已有账号？<Link to="/login" className="text-primary-600 hover:underline">去登录</Link>
        </p>
      </div>
    </div>
  );
}
