import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { User, Save, LogOut } from 'lucide-react';

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [nickname, setNickname] = useState(user?.nickname || '');
  const [msg, setMsg] = useState('');

  const handleSave = async () => {
    try {
      const res = await api.put('/auth/me', { nickname });
      setMsg('保存成功');
      // 更新本地用户信息
      localStorage.setItem('user', JSON.stringify(res.data));
      setTimeout(() => window.location.reload(), 500);
    } catch {
      setMsg('保存失败');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-bold">个人设置</h1>

      <div className="card">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center">
            <User className="w-8 h-8 text-primary-600" />
          </div>
          <div>
            <div className="font-semibold text-lg">{user?.nickname}</div>
            <div className="text-sm text-gray-500">{user?.email}</div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="label">昵称</label>
            <input value={nickname} onChange={(e) => setNickname(e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">邮箱</label>
            <input value={user?.email || ''} className="input bg-gray-50" disabled />
          </div>
          <button onClick={handleSave} className="btn-primary flex items-center gap-1.5">
            <Save className="w-4 h-4" />
            保存修改
          </button>
          {msg && <p className="text-sm text-green-600">{msg}</p>}
        </div>
      </div>

      <div className="card">
        <h2 className="font-semibold mb-3">账号操作</h2>
        <button onClick={handleLogout} className="btn-danger flex items-center gap-1.5">
          <LogOut className="w-4 h-4" />
          退出登录
        </button>
      </div>
    </div>
  );
}
