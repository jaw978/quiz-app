import { useEffect, useState } from 'react';
import api from '../api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, AlertTriangle, BookOpen, Target } from 'lucide-react';

interface Overview {
  totalQuestions: number;
  totalPractices: number;
  accuracy: number;
  todayPractices: number;
  streak: number;
}

interface TagStat {
  tag: string;
  total: number;
  correct: number;
  wrong: number;
  accuracy: number;
  isWeak: boolean;
}

interface WrongQuestion {
  questionId: string;
  stem: string;
  tags: string[];
  difficulty: string;
  wrongCount: number;
}

interface DailyTrend {
  date: string;
  total: number;
  correct: number;
  wrong: number;
  accuracy: number;
}

const COLORS = ['#0c93e7', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export default function Stats() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [tagStats, setTagStats] = useState<TagStat[]>([]);
  const [wrongQuestions, setWrongQuestions] = useState<WrongQuestion[]>([]);
  const [dailyTrend, setDailyTrend] = useState<DailyTrend[]>([]);
  const [tab, setTab] = useState<'overview' | 'tags' | 'wrong' | 'trend'>('overview');

  useEffect(() => {
    api.get('/stats/overview').then((r) => setOverview(r.data));
    api.get('/stats/tags').then((r) => setTagStats(r.data));
    api.get('/stats/wrong-questions').then((r) => setWrongQuestions(r.data));
    api.get('/stats/daily-trend', { params: { days: 30 } }).then((r) => setDailyTrend(r.data));
  }, []);

  if (!overview) return <div className="flex items-center justify-center h-64 text-gray-400">加载中...</div>;

  const tabs = [
    { key: 'overview' as const, label: '概览', icon: TrendingUp },
    { key: 'tags' as const, label: '知识点', icon: Target },
    { key: 'wrong' as const, label: '错题排行', icon: AlertTriangle },
    { key: 'trend' as const, label: '趋势', icon: BookOpen },
  ];

  const weakTags = tagStats.filter((t) => t.isWeak);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">数据统计</h1>

      {/* Tab 切换 */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${tab === t.key ? 'bg-white shadow text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}>
            <t.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* 概览 */}
      {tab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: '总题数', value: overview.totalQuestions, color: 'text-blue-600' },
              { label: '总练习', value: overview.totalPractices, color: 'text-green-600' },
              { label: '正确率', value: `${overview.accuracy}%`, color: 'text-primary-600' },
              { label: '连续打卡', value: `${overview.streak}天`, color: 'text-orange-600' },
            ].map((s) => (
              <div key={s.label} className="card text-center">
                <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-sm text-gray-500">{s.label}</div>
              </div>
            ))}
          </div>

          {/* 正确/错误饼图 */}
          <div className="card">
            <h2 className="font-semibold mb-4">答题分布</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={[
                    { name: '正确', value: overview.totalPractices > 0 ? Math.round(overview.totalPractices * overview.accuracy / 100) : 0 },
                    { name: '错误', value: overview.totalPractices > 0 ? overview.totalPractices - Math.round(overview.totalPractices * overview.accuracy / 100) : 0 },
                  ]} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    <Cell fill="#22c55e" />
                    <Cell fill="#ef4444" />
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* 知识点分析 */}
      {tab === 'tags' && (
        <div className="space-y-4">
          {/* 薄弱知识点警告 */}
          {weakTags.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="font-semibold text-red-700 flex items-center gap-2 mb-2"><AlertTriangle className="w-4 h-4" />薄弱知识点（正确率 &lt; 60%）</h3>
              <div className="flex flex-wrap gap-2">
                {weakTags.map((t) => (
                  <span key={t.tag} className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm">{t.tag} ({t.accuracy}%)</span>
                ))}
              </div>
            </div>
          )}

          {/* 知识点正确率柱状图 */}
          <div className="card">
            <h2 className="font-semibold mb-4">知识点正确率</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tagStats} layout="vertical" margin={{ left: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} />
                  <YAxis type="category" dataKey="tag" width={75} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: number) => `${value}%`} />
                  <Bar dataKey="accuracy" fill="#0c93e7" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 知识点详情表 */}
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b"><th className="text-left py-2 px-3">知识点</th><th className="text-right py-2 px-3">练习次数</th><th className="text-right py-2 px-3">正确</th><th className="text-right py-2 px-3">错误</th><th className="text-right py-2 px-3">正确率</th></tr></thead>
              <tbody>
                {tagStats.map((t) => (
                  <tr key={t.tag} className={`border-b ${t.isWeak ? 'bg-red-50' : ''}`}>
                    <td className="py-2 px-3 font-medium">{t.tag} {t.isWeak && <AlertTriangle className="inline w-3 h-3 text-red-500 ml-1" />}</td>
                    <td className="text-right py-2 px-3">{t.total}</td>
                    <td className="text-right py-2 px-3 text-green-600">{t.correct}</td>
                    <td className="text-right py-2 px-3 text-red-600">{t.wrong}</td>
                    <td className={`text-right py-2 px-3 font-medium ${t.accuracy >= 80 ? 'text-green-600' : t.accuracy >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>{t.accuracy}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 错题排行 */}
      {tab === 'wrong' && (
        <div className="space-y-3">
          {wrongQuestions.length === 0 ? (
            <div className="card text-center text-gray-400 py-12">暂无错题记录</div>
          ) : (
            wrongQuestions.map((q, i) => (
              <div key={q.questionId} className="card flex items-start gap-3">
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${i < 3 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{q.stem}</p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                    <span>错误 {q.wrongCount} 次</span>
                    {q.tags.map((t) => <span key={t} className="bg-gray-100 px-1.5 py-0.5 rounded">{t}</span>)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 趋势图 */}
      {tab === 'trend' && (
        <div className="card">
          <h2 className="font-semibold mb-4">最近 30 天练习趋势</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="total" stroke="#0c93e7" name="总题数" strokeWidth={2} />
                <Line type="monotone" dataKey="correct" stroke="#22c55e" name="正确" strokeWidth={2} />
                <Line type="monotone" dataKey="wrong" stroke="#ef4444" name="错误" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
