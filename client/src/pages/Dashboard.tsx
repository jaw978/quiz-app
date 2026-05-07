import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { BookOpen, PlusCircle, BarChart3, Target, TrendingUp, Flame } from 'lucide-react';

interface Overview {
  totalQuestions: number;
  totalPractices: number;
  correctPractices: number;
  wrongPractices: number;
  accuracy: number;
  todayPractices: number;
  weekPractices: number;
  dailyAvg: number;
  streak: number;
}

export default function Dashboard() {
  const [overview, setOverview] = useState<Overview | null>(null);

  useEffect(() => {
    api.get('/stats/overview').then((res) => setOverview(res.data));
  }, []);

  if (!overview) {
    return <div className="flex items-center justify-center h-64 text-gray-400">加载中...</div>;
  }

  const stats = [
    { label: '总题数', value: overview.totalQuestions, icon: BookOpen, color: 'text-blue-600 bg-blue-50' },
    { label: '已练习', value: overview.totalPractices, icon: Target, color: 'text-green-600 bg-green-50' },
    { label: '正确率', value: `${overview.accuracy}%`, icon: TrendingUp, color: 'text-primary-600 bg-primary-50' },
    { label: '连续打卡', value: `${overview.streak}天`, icon: Flame, color: 'text-orange-600 bg-orange-50' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">欢迎回来 👋</h1>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="card flex items-center gap-3">
            <div className={`p-2.5 rounded-lg ${s.color}`}>
              <s.icon className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-bold">{s.value}</div>
              <div className="text-xs text-gray-500">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* 今日数据 */}
      <div className="card">
        <h2 className="font-semibold mb-3">今日概览</h2>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-xl font-bold text-primary-600">{overview.todayPractices}</div>
            <div className="text-xs text-gray-500">今日练习</div>
          </div>
          <div>
            <div className="text-xl font-bold text-green-600">{overview.weekPractices}</div>
            <div className="text-xs text-gray-500">本周练习</div>
          </div>
          <div>
            <div className="text-xl font-bold text-purple-600">{overview.dailyAvg}</div>
            <div className="text-xs text-gray-500">日均练习</div>
          </div>
        </div>
      </div>

      {/* 快捷操作 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link to="/questions" className="card hover:shadow-md transition-shadow flex items-center gap-3">
          <PlusCircle className="w-8 h-8 text-primary-600" />
          <div>
            <div className="font-semibold">上传错题</div>
            <div className="text-sm text-gray-500">Excel/CSV 或手动录入</div>
          </div>
        </Link>
        <Link to="/practice" className="card hover:shadow-md transition-shadow flex items-center gap-3">
          <BookOpen className="w-8 h-8 text-green-600" />
          <div>
            <div className="font-semibold">开始刷题</div>
            <div className="text-sm text-gray-500">随机/按知识点/错题重刷</div>
          </div>
        </Link>
        <Link to="/stats" className="card hover:shadow-md transition-shadow flex items-center gap-3">
          <BarChart3 className="w-8 h-8 text-purple-600" />
          <div>
            <div className="font-semibold">数据分析</div>
            <div className="text-sm text-gray-500">查看薄弱知识点</div>
          </div>
        </Link>
      </div>
    </div>
  );
}
