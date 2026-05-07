import { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { CheckCircle, XCircle, ArrowRight, Clock, BarChart3 } from 'lucide-react';

interface Question {
  _id: string;
  stem: string;
  options: string[];
  tags: string[];
  difficulty: string;
  type: 'single' | 'multiple';
  image_url?: string;
}

interface SubmitResult {
  questionId: string;
  isCorrect: boolean;
  correctAnswer: string[];
  explanation: string;
}

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];

export default function PracticeSession() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState<SubmitResult[]>([]);
  const [startTime, setStartTime] = useState(Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  // 加载题目
  useEffect(() => {
    const mode = searchParams.get('mode') || 'random';
    const params: any = { mode, count: searchParams.get('count') || '10' };
    if (searchParams.get('difficulty')) params.difficulty = searchParams.get('difficulty');
    if (searchParams.get('tags')) params.tags = searchParams.get('tags');

    api.get('/practice/questions', { params }).then((res) => {
      if (res.data.length === 0) {
        alert('没有符合条件的题目');
        navigate('/practice');
        return;
      }
      setQuestions(res.data);
      setLoading(false);
      setStartTime(Date.now());
    }).catch(() => {
      alert('获取题目失败');
      navigate('/practice');
    });
  }, [searchParams, navigate]);

  // 计时器
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [startTime]);

  const currentQ = questions[currentIndex];

  // 选择选项
  const toggleOption = (label: string) => {
    if (submitted) return;
    if (currentQ?.type === 'single') {
      setSelected([label]);
    } else {
      setSelected((prev) => prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]);
    }
  };

  // 提交答案
  const handleSubmit = useCallback(async () => {
    if (selected.length === 0) return;
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);

    try {
      const res = await api.post('/practice/submit', {
        questionId: currentQ._id,
        userAnswer: selected,
        timeSpent,
      });
      setResults((prev) => [...prev, res.data]);
      setSubmitted(true);
    } catch {
      alert('提交失败');
    }
  }, [currentQ, selected, startTime]);

  // 下一题
  const handleNext = () => {
    if (currentIndex >= questions.length - 1) {
      // 所有题目完成，显示结果
      return;
    }
    setCurrentIndex((i) => i + 1);
    setSelected([]);
    setSubmitted(false);
    setStartTime(Date.now());
    setElapsed(0);
  };

  // 格式化时间
  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-400">加载题目中...</div>;
  }

  // 全部完成
  const isFinished = submitted && currentIndex >= questions.length - 1;
  const correctCount = results.filter((r) => r.isCorrect).length;

  if (isFinished) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="card text-center">
          <h1 className="text-2xl font-bold mb-4">🎉 刷题完成！</h1>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div><div className="text-3xl font-bold text-primary-600">{correctCount}/{results.length}</div><div className="text-sm text-gray-500">正确/总题</div></div>
            <div><div className="text-3xl font-bold text-green-600">{results.length > 0 ? Math.round((correctCount / results.length) * 100) : 0}%</div><div className="text-sm text-gray-500">正确率</div></div>
            <div><div className="text-3xl font-bold text-purple-600">{formatTime(elapsed)}</div><div className="text-sm text-gray-500">总用时</div></div>
          </div>
          <div className="flex gap-3 justify-center">
            <button onClick={() => navigate('/practice')} className="btn-primary">继续刷题</button>
            <button onClick={() => navigate('/stats')} className="btn-secondary flex items-center gap-1"><BarChart3 className="w-4 h-4" />查看统计</button>
          </div>
        </div>

        {/* 答题详情 */}
        <div className="space-y-3">
          {results.map((r, i) => (
            <div key={i} className="card">
              <div className="flex items-center gap-2 mb-1">
                {r.isCorrect ? <CheckCircle className="w-5 h-5 text-green-500" /> : <XCircle className="w-5 h-5 text-red-500" />}
                <span className="font-medium">第 {i + 1} 题</span>
              </div>
              {!r.isCorrect && (
                <p className="text-sm text-gray-600">正确答案：{r.correctAnswer.join(', ')}</p>
              )}
              {r.explanation && <p className="text-sm text-gray-500 mt-1">{r.explanation}</p>}
            </div>
          ))}
        </div>
      </div>
    );
  }

  const currentResult = results[results.length - 1];

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* 进度条 */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-500">{currentIndex + 1} / {questions.length}</span>
        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }} />
        </div>
        <span className="text-sm text-gray-500 flex items-center gap-1"><Clock className="w-4 h-4" />{formatTime(elapsed)}</span>
      </div>

      {/* 题目卡片 */}
      <div className="card">
        <div className="flex items-center gap-2 mb-3 text-sm text-gray-500">
          <span className={`px-2 py-0.5 rounded ${currentQ.difficulty === 'easy' ? 'bg-green-50 text-green-600' : currentQ.difficulty === 'hard' ? 'bg-red-50 text-red-600' : 'bg-yellow-50 text-yellow-600'}`}>
            {currentQ.difficulty === 'easy' ? '简单' : currentQ.difficulty === 'hard' ? '困难' : '中等'}
          </span>
          <span>{currentQ.type === 'single' ? '单选题' : '多选题'}</span>
          {currentQ.tags.length > 0 && <span className="text-gray-400">| {currentQ.tags.join(', ')}</span>}
        </div>

        <p className="text-lg font-medium mb-4 whitespace-pre-wrap">{currentQ.stem}</p>
        
        {/* 题目图片 */}
        {currentQ.image_url && (
          <img 
            src={currentQ.image_url} 
            alt="题目图片" 
            className="max-h-64 rounded-lg border mb-4 cursor-pointer hover:opacity-90 transition-opacity" 
            onClick={() => window.open(currentQ.image_url, '_blank')} 
          />
        )}

        {/* 选项 */}
        <div className="space-y-2">
          {currentQ.options.map((opt, i) => {
            const label = OPTION_LABELS[i];
            const isSelected = selected.includes(label);
            let optionClass = 'border-gray-200 hover:border-primary-300 hover:bg-primary-50';
            if (submitted) {
              if (currentResult?.correctAnswer?.includes(label)) {
                optionClass = 'border-green-500 bg-green-50 text-green-700';
              } else if (isSelected && !currentResult?.correctAnswer?.includes(label)) {
                optionClass = 'border-red-500 bg-red-50 text-red-700';
              } else {
                optionClass = 'border-gray-200 opacity-60';
              }
            } else if (isSelected) {
              optionClass = 'border-primary-500 bg-primary-50 text-primary-700';
            }

            return (
              <button key={i} onClick={() => toggleOption(label)} disabled={submitted} className={`w-full text-left p-3 rounded-lg border-2 transition-all flex items-center gap-3 ${optionClass}`}>
                <span className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-sm font-medium shrink-0 ${isSelected ? 'border-primary-500 bg-primary-500 text-white' : 'border-gray-300'}`}>
                  {label}
                </span>
                <span className="flex-1">{opt}</span>
                {submitted && currentResult?.correctAnswer?.includes(label) && <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />}
                {submitted && isSelected && !currentResult?.correctAnswer?.includes(label) && <XCircle className="w-5 h-5 text-red-500 shrink-0" />}
              </button>
            );
          })}
        </div>

        {/* 提交/下一题按钮 */}
        <div className="mt-4 flex justify-end gap-2">
          {!submitted ? (
            <button onClick={handleSubmit} disabled={selected.length === 0} className="btn-primary">
              提交答案
            </button>
          ) : (
            <button onClick={handleNext} className="btn-primary flex items-center gap-1">
              {currentIndex >= questions.length - 1 ? '查看结果' : '下一题'}
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* 答案解析 */}
        {submitted && currentResult && (
          <div className={`mt-4 p-4 rounded-lg ${currentResult.isCorrect ? 'bg-green-50' : 'bg-red-50'}`}>
            <div className="flex items-center gap-2 mb-2">
              {currentResult.isCorrect ? (
                <><CheckCircle className="w-5 h-5 text-green-500" /><span className="font-medium text-green-700">回答正确！</span></>
              ) : (
                <><XCircle className="w-5 h-5 text-red-500" /><span className="font-medium text-red-700">回答错误</span></>
              )}
            </div>
            {!currentResult.isCorrect && (
              <p className="text-sm text-red-600 mb-1">正确答案：{currentResult.correctAnswer.join(', ')}</p>
            )}
            {currentResult.explanation && (
              <p className="text-sm text-gray-600">{currentResult.explanation}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
