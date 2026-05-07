import { Router, Response } from 'express';
import { supabase, TABLES } from '../config/supabase';
import { authMiddleware, AuthRequest } from '../middleware/auth';

export const practiceRouter = Router();

// 获取刷题题目（随机/按知识点/错题重刷）
practiceRouter.get('/questions', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { mode = 'random', tags, difficulty, count = '10' } = req.query;
    const limit = Math.min(Number(count), 100);

    let query = supabase
      .from(TABLES.QUESTIONS)
      .select('id, stem, options, tags, difficulty, type')
      .eq('user_id', req.userId);

    if (difficulty) query = query.eq('difficulty', difficulty);
    if (tags) {
      const tagArr = String(tags).split(',').filter(Boolean);
      query = query.contains('tags', tagArr);
    }

    // 错题重刷模式：只取之前做错的题
    if (mode === 'wrong') {
      const { data: wrongRecords } = await supabase
        .from(TABLES.PRACTICE_RECORDS)
        .select('question_id')
        .eq('user_id', req.userId)
        .eq('is_correct', false);

      const wrongIds = wrongRecords?.map((r: any) => r.question_id) || [];
      if (wrongIds.length === 0) {
        return res.json([]);
      }
      query = query.in('id', wrongIds);
    }

    const { data: questions, error } = await query;

    if (error) throw error;

    // 随机打乱
    const shuffled = (questions || []).sort(() => Math.random() - 0.5).slice(0, limit);

    res.json(shuffled);
  } catch (err: any) {
    res.status(500).json({ message: '获取题目失败', error: err.message });
  }
});

// 提交单题答案
practiceRouter.post('/submit', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { questionId, userAnswer, timeSpent = 0 } = req.body;
    if (!questionId || !userAnswer) {
      return res.status(400).json({ message: '题目ID和答案为必填项' });
    }

    const { data: question, error } = await supabase
      .from(TABLES.QUESTIONS)
      .select('answer, explanation')
      .eq('id', questionId)
      .eq('user_id', req.userId)
      .single();

    if (error || !question) return res.status(404).json({ message: '题目不存在' });

    const correctAnswer = [...question.answer].sort().join(',');
    const submittedAnswer = (Array.isArray(userAnswer) ? userAnswer : [userAnswer]).map(String).sort().join(',');
    const isCorrect = correctAnswer === submittedAnswer;

    // 记录练习
    await supabase.from(TABLES.PRACTICE_RECORDS).insert({
      user_id: req.userId,
      question_id: questionId,
      is_correct: isCorrect,
      user_answer: Array.isArray(userAnswer) ? userAnswer : [userAnswer],
      time_spent: Number(timeSpent) || 0,
    });

    res.json({
      isCorrect,
      correctAnswer: question.answer,
      explanation: question.explanation,
      questionId,
    });
  } catch (err: any) {
    res.status(500).json({ message: '提交答案失败', error: err.message });
  }
});

// 批量提交答案
practiceRouter.post('/submit-batch', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { results } = req.body;
    if (!Array.isArray(results)) return res.status(400).json({ message: '请提供答题结果数组' });

    const records = [];
    for (const r of results) {
      const { data: question, error } = await supabase
        .from(TABLES.QUESTIONS)
        .select('answer, explanation')
        .eq('id', r.questionId)
        .eq('user_id', req.userId)
        .single();

      if (error || !question) continue;

      const correctAnswer = [...question.answer].sort().join(',');
      const submittedAnswer = (Array.isArray(r.userAnswer) ? r.userAnswer : [r.userAnswer]).map(String).sort().join(',');
      const isCorrect = correctAnswer === submittedAnswer;

      await supabase.from(TABLES.PRACTICE_RECORDS).insert({
        user_id: req.userId,
        question_id: r.questionId,
        is_correct: isCorrect,
        user_answer: Array.isArray(r.userAnswer) ? r.userAnswer : [r.userAnswer],
        time_spent: Number(r.timeSpent) || 0,
      });

      records.push({ questionId: r.questionId, isCorrect, correctAnswer: question.answer, explanation: question.explanation });
    }

    const correctCount = records.filter((r: any) => r.isCorrect).length;
    res.json({
      total: records.length,
      correct: correctCount,
      wrong: records.length - correctCount,
      accuracy: records.length > 0 ? Math.round((correctCount / records.length) * 100) : 0,
      records,
    });
  } catch (err: any) {
    res.status(500).json({ message: '批量提交失败', error: err.message });
  }
});

// 获取练习历史
practiceRouter.get('/history', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', pageSize = '20', startDate, endDate } = req.query;
    const from = (Number(page) - 1) * Number(pageSize);
    const to = from + Number(pageSize) - 1;

    let query = supabase
      .from(TABLES.PRACTICE_RECORDS)
      .select(`
        *,
        questions:question_id (stem, options, tags, difficulty, type)
      `, { count: 'exact' })
      .eq('user_id', req.userId)
      .order('practiced_at', { ascending: false })
      .range(from, to);

    if (startDate) query = query.gte('practiced_at', startDate);
    if (endDate) query = query.lte('practiced_at', endDate);

    const { data: records, error, count } = await query;

    if (error) throw error;

    res.json({ records: records || [], total: count || 0, page: Number(page), pageSize: Number(pageSize) });
  } catch (err: any) {
    res.status(500).json({ message: '获取历史记录失败', error: err.message });
  }
});
