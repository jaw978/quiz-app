import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { BookOpen, Shuffle, Tag, AlertTriangle, Settings } from 'lucide-react';

export default function Practice() {
  const navigate = useNavigate();
  const [tags, setTags] = useState<string[]>([]);
  const [mode, setMode] = useState<'random' | 'tag' | 'wrong'>('random');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState('');
  const [count, setCount] = useState(10);

  useEffect(() => {
    api.get('/questions/tags').then((res) => setTags(res.data));
  }, []);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
  };

  const startPractice = () => {
    const params = new URLSearchParams({ mode, count: String(count) });
    if (difficulty) params.set('difficulty', difficulty);
    if (selectedTags.length > 0) params.set('tags', selectedTags.join(','));
    navigate(`/practice/session?${params.toString()}`);
  };

  const modes = [
    { key: 'random' as const, label: '随机刷题', desc: '从题库随机抽取', icon: Shuffle, color: 'text-primary-600 bg-primary-50' },
    { key: 'tag' as const, label: '按知识点', desc: '选择知识点专项练习', icon: Tag, color: 'text-green-600 bg-green-50' },
    { key: 'wrong' as const, label: '错题重刷', desc: '只练之前做错的题', icon: AlertTriangle, color: 'text-red-600 bg-red-50' },
  ];

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold">开始刷题</h1>

      {/* 模式选择 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {modes.map((m) => (
          <button key={m.key} onClick={() => setMode(m.key)} className={`card text-left transition-all ${mode === m.key ? 'ring-2 ring-primary-500 border-primary-200' : 'hover:shadow-sm'}`}>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-2 ${m.color}`}>
              <m.icon className="w-5 h-5" />
            </div>
            <div className="font-semibold">{m.label}</div>
            <div className="text-sm text-gray-500">{m.desc}</div>
          </button>
        ))}
      </div>

      {/* 知识点选择（仅按知识点模式） */}
      {mode === 'tag' && (
        <div className="card">
          <h2 className="font-semibold mb-3 flex items-center gap-2"><Tag className="w-4 h-4" />选择知识点</h2>
          {tags.length === 0 ? (
            <p className="text-gray-400 text-sm">暂无知识点标签，请先添加题目</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {tags.map((t) => (
                <button key={t} onClick={() => toggleTag(t)} className={`px-3 py-1 rounded-full text-sm transition-colors ${selectedTags.includes(t) ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 设置 */}
      <div className="card">
        <h2 className="font-semibold mb-3 flex items-center gap-2"><Settings className="w-4 h-4" />刷题设置</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">题目数量</label>
            <select value={count} onChange={(e) => setCount(Number(e.target.value))} className="input">
              {[5, 10, 15, 20, 30, 50].map((n) => <option key={n} value={n}>{n} 题</option>)}
            </select>
          </div>
          <div>
            <label className="label">难度筛选</label>
            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="input">
              <option value="">全部难度</option>
              <option value="easy">简单</option>
              <option value="medium">中等</option>
              <option value="hard">困难</option>
            </select>
          </div>
        </div>
      </div>

      <button onClick={startPractice} className="btn-primary w-full text-lg py-3 flex items-center justify-center gap-2">
        <BookOpen className="w-5 h-5" />
        开始刷题
      </button>
    </div>
  );
}
