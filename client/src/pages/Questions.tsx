import { useEffect, useState, useRef, FormEvent } from 'react';
import api from '../api';
import { Upload, Plus, Edit3, Trash2, Search, X, FileSpreadsheet, Tag, Image as ImageIcon, Loader2 } from 'lucide-react';

interface Question {
  _id: string;
  stem: string;
  options: string[];
  answer: string[];
  explanation: string;
  tags: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  type: 'single' | 'multiple';
  image_url?: string;
  createdAt: string;
}

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];
const DIFFICULTY_MAP = { easy: '简单', medium: '中等', hard: '困难' };

export default function Questions() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploadMsg, setUploadMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);

  // 表单状态
  const [form, setForm] = useState({
    stem: '', options: ['', '', '', ''], answer: [] as string[],
    explanation: '', tags: '', difficulty: 'medium' as 'easy' | 'medium' | 'hard',
    type: 'single' as 'single' | 'multiple', image_url: '' as string | undefined,
  });
  const [uploadingImage, setUploadingImage] = useState(false);

  const pageSize = 20;

  // 加载题目
  const loadQuestions = () => {
    const params: any = { page, pageSize };
    if (keyword) params.keyword = keyword;
    if (tagFilter) params.tag = tagFilter;
    api.get('/questions', { params }).then((res) => {
      setQuestions(res.data.questions);
      setTotal(res.data.total);
    });
  };

  // 加载标签
  useEffect(() => {
    api.get('/questions/tags').then((res) => setTags(res.data));
  }, []);

  useEffect(() => { loadQuestions(); }, [page, tagFilter]);

  const handleSearch = (e: FormEvent) => { e.preventDefault(); setPage(1); loadQuestions(); };

  // 重置表单
  const resetForm = () => {
    setForm({ stem: '', options: ['', '', '', ''], answer: [], explanation: '', tags: '', difficulty: 'medium', type: 'single', image_url: undefined });
    setEditingId(null);
    setShowForm(false);
  };

  // 打开编辑
  const openEdit = (q: Question) => {
    setForm({
      stem: q.stem, options: [...q.options], answer: [...q.answer],
      explanation: q.explanation, tags: q.tags.join(', '), difficulty: q.difficulty, type: q.type, image_url: q.image_url,
    });
    setEditingId(q._id);
    setShowForm(true);
  };

  // 上传图片
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      alert('请上传图片文件');
      return;
    }

    setUploadingImage(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await api.post('/questions/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setForm((prev) => ({ ...prev, image_url: res.data.url }));
    } catch (err: any) {
      alert('图片上传失败：' + (err.response?.data?.message || err.message));
    } finally {
      setUploadingImage(false);
      if (imageRef.current) imageRef.current.value = '';
    }
  };

  // 删除图片
  const handleRemoveImage = async () => {
    if (!form.image_url) return;
    
    // 从 URL 中提取路径
    const url = new URL(form.image_url);
    const pathMatch = url.pathname.match(/question-images\/(.+)/);
    if (pathMatch) {
      try {
        await api.delete(`/questions/image/${encodeURIComponent(pathMatch[1])}`);
      } catch {
        // 忽略删除失败
      }
    }
    setForm((prev) => ({ ...prev, image_url: undefined }));
  };

  // 提交表单
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const data = {
      ...form,
      tags: form.tags ? form.tags.split(/[,，、]+/).map(t => t.trim()).filter(Boolean) : [],
    };
    try {
      if (editingId) {
        await api.put(`/questions/${editingId}`, data);
      } else {
        await api.post('/questions', data);
      }
      resetForm();
      loadQuestions();
    } catch (err: any) {
      alert(err.response?.data?.message || '操作失败');
    }
  };

  // 删除题目
  const handleDelete = async (id: string) => {
    if (!confirm('确定删除此题？')) return;
    await api.delete(`/questions/${id}`);
    loadQuestions();
  };

  // 文件上传
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await api.post('/questions/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setUploadMsg(res.data.message);
      loadQuestions();
      api.get('/questions/tags').then((r) => setTags(r.data));
    } catch (err: any) {
      setUploadMsg('上传失败：' + (err.response?.data?.message || err.message));
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  // 切换选项选中
  const toggleAnswer = (label: string) => {
    setForm((prev) => {
      const answers = prev.type === 'single' ? [label] : prev.answer.includes(label) ? prev.answer.filter((a) => a !== label) : [...prev.answer, label];
      return { ...prev, answer: answers };
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">题库管理</h1>
        <div className="flex gap-2">
          <label className="btn-secondary flex items-center gap-1.5 cursor-pointer">
            <FileSpreadsheet className="w-4 h-4" />
            上传文件
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleUpload} />
          </label>
          <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary flex items-center gap-1.5">
            <Plus className="w-4 h-4" />
            添加题目
          </button>
        </div>
      </div>

      {uploadMsg && (
        <div className="bg-blue-50 text-blue-700 text-sm p-3 rounded-lg flex items-center justify-between">
          {uploadMsg}
          <button onClick={() => setUploadMsg('')}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* 搜索和筛选 */}
      <form onSubmit={handleSearch} className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={keyword} onChange={(e) => setKeyword(e.target.value)} className="input pl-9" placeholder="搜索题干..." />
        </div>
        <select value={tagFilter} onChange={(e) => { setTagFilter(e.target.value); setPage(1); }} className="input w-auto">
          <option value="">全部知识点</option>
          {tags.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </form>

      {/* 添加/编辑表单 */}
      {showForm && (
        <div className="card border-primary-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">{editingId ? '编辑题目' : '添加题目'}</h2>
            <button onClick={resetForm}><X className="w-5 h-5 text-gray-400" /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">题干 *</label>
              <textarea value={form.stem} onChange={(e) => setForm({ ...form, stem: e.target.value })} className="input min-h-[80px]" placeholder="输入题目内容" required />
            </div>
            <div>
              <label className="label">选项 *</label>
              <div className="space-y-2">
                {form.options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium">{OPTION_LABELS[i]}</span>
                    <input value={opt} onChange={(e) => { const opts = [...form.options]; opts[i] = e.target.value; setForm({ ...form, options: opts }); }} className="input flex-1" placeholder={`选项 ${OPTION_LABELS[i]}`} required />
                    <button type="button" onClick={() => toggleAnswer(OPTION_LABELS[i])} className={`w-6 h-6 rounded border-2 flex items-center justify-center text-xs ${form.answer.includes(OPTION_LABELS[i]) ? 'bg-primary-600 border-primary-600 text-white' : 'border-gray-300'}`}>
                      ✓
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1">点击 ✓ 标记正确答案（{form.type === 'single' ? '单选' : '多选'}）</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="label">题型</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as any, answer: [] })} className="input">
                  <option value="single">单选题</option>
                  <option value="multiple">多选题</option>
                </select>
              </div>
              <div>
                <label className="label">难度</label>
                <select value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value as any })} className="input">
                  <option value="easy">简单</option>
                  <option value="medium">中等</option>
                  <option value="hard">困难</option>
                </select>
              </div>
              <div>
                <label className="label">知识点标签</label>
                <input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} className="input" placeholder="用逗号分隔" />
              </div>
            </div>
            <div>
              <label className="label">解析</label>
              <textarea value={form.explanation} onChange={(e) => setForm({ ...form, explanation: e.target.value })} className="input min-h-[60px]" placeholder="答案解析（可选）" />
            </div>
            
            {/* 图片上传 */}
            <div>
              <label className="label">题目图片（可选）</label>
              {form.image_url ? (
                <div className="relative inline-block">
                  <img src={form.image_url} alt="题目图片" className="max-h-48 rounded-lg border" />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-colors">
                  {uploadingImage ? (
                    <><Loader2 className="w-5 h-5 text-primary-600 animate-spin" /><span className="text-gray-600">上传中...</span></>
                  ) : (
                    <><ImageIcon className="w-5 h-5 text-gray-400" /><span className="text-gray-600">点击上传图片</span></>
                  )}
                  <input
                    ref={imageRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                  />
                </label>
              )}
              <p className="text-xs text-gray-400 mt-1">支持 JPG、PNG、GIF 格式，最大 5MB</p>
            </div>
            
            <div className="flex gap-2">
              <button type="submit" className="btn-primary">{editingId ? '保存修改' : '添加题目'}</button>
              <button type="button" onClick={resetForm} className="btn-secondary">取消</button>
            </div>
          </form>
        </div>
      )}

      {/* 题目列表 */}
      <div className="space-y-3">
        {questions.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Upload className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>暂无题目，上传文件或手动添加</p>
          </div>
        ) : (
          questions.map((q) => (
            <div key={q._id} className="card">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium mb-2 whitespace-pre-wrap">{q.stem}</p>
                  {q.image_url && (
                    <img src={q.image_url} alt="题目图片" className="max-h-32 rounded-lg border mb-2 cursor-pointer hover:opacity-90 transition-opacity" onClick={() => window.open(q.image_url, '_blank')} />
                  )}
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {q.options.map((opt, i) => (
                      <span key={i} className={`text-sm px-2 py-0.5 rounded ${q.answer.includes(OPTION_LABELS[i]) ? 'bg-green-50 text-green-700 font-medium' : 'bg-gray-50 text-gray-600'}`}>
                        {OPTION_LABELS[i]}. {opt}
                      </span>
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                    <span className={`px-1.5 py-0.5 rounded ${q.difficulty === 'easy' ? 'bg-green-50 text-green-600' : q.difficulty === 'hard' ? 'bg-red-50 text-red-600' : 'bg-yellow-50 text-yellow-600'}`}>
                      {DIFFICULTY_MAP[q.difficulty]}
                    </span>
                    {q.tags.map((t) => (
                      <span key={t} className="flex items-center gap-0.5"><Tag className="w-3 h-3" />{t}</span>
                    ))}
                    <span>{q.type === 'single' ? '单选' : '多选'}</span>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => openEdit(q)} className="p-1.5 text-gray-400 hover:text-primary-600"><Edit3 className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(q._id)} className="p-1.5 text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 分页 */}
      {total > pageSize && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary">上一页</button>
          <span className="text-sm text-gray-500">{page} / {Math.ceil(total / pageSize)}</span>
          <button onClick={() => setPage((p) => p + 1)} disabled={page >= Math.ceil(total / pageSize)} className="btn-secondary">下一页</button>
        </div>
      )}
    </div>
  );
}
