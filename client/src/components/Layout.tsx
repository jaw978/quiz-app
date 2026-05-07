import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { BookOpen, BarChart3, PlusCircle, User, LogOut, Home } from 'lucide-react';

const navItems = [
  { to: '/', label: '首页', icon: Home },
  { to: '/questions', label: '题库', icon: PlusCircle },
  { to: '/practice', label: '刷题', icon: BookOpen },
  { to: '/stats', label: '统计', icon: BarChart3 },
  { to: '/profile', label: '我的', icon: User },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* 顶部导航 */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-primary-600" />
            <span className="font-bold text-lg">错题本</span>
          </div>
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-100'
                  }`
                }
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </NavLink>
            ))}
          </div>
          <button onClick={handleLogout} className="text-gray-500 hover:text-red-500 transition-colors" title="退出登录">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* 主内容 */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        <Outlet />
      </main>

      {/* 底部导航（移动端） */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <div className="flex items-center justify-around h-14">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 text-xs ${
                  isActive ? 'text-primary-600' : 'text-gray-400'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* 移动端底部留白 */}
      <div className="md:hidden h-14" />
    </div>
  );
}
