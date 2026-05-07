import { Router, Response } from 'express';
import { supabase, TABLES } from '../config/supabase';
import { authMiddleware, AuthRequest } from '../middleware/auth';

export const statsRouter = Router();

// 仪表盘概览
statsRouter.get('/overview', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    // 总题数
    const { count: totalQuestions } = await supabase
      .from(TABLES.QUESTIONS)
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.userId);

    // 总练习次数
    const { count: totalPractices } = await supabase
      .from(TABLES.PRACTICE_RECORDS)
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.userId);

    // 正确练习次数
    const { count: correctPractices } = await supabase
      .from(TABLES.PRACTICE_RECORDS)
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.userId)
      .eq('is_correct', true);

    // 今日练习
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count: todayPractices } = await supabase
      .from(TABLES.PRACTICE_RECORDS)
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.userId)
      .gte('practiced_at', today.toISOString());

    // 本周练习
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const { count: weekPractices } = await supabase
      .from(TABLES.PRACTICE_RECORDS)
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.userId)
      .gte('practiced_at', weekAgo.toISOString());

    // 计算连续打卡天数
    const { data: recentRecords } = await supabase
      .from(TABLES.PRACTICE_RECORDS)
      .select('practiced_at')
      .eq('user_id', req.userId)
      .gte('practiced_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    const uniqueDates = [...new Set(recentRecords?.map((r: any) => new Date(r.practiced_at).toDateString()))].sort().reverse();
    let streak = 0;
    const checkDate = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(checkDate);
      d.setDate(d.getDate() - i);
      if (uniqueDates.includes(d.toDateString())) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }

    const totalP = totalPractices || 0;
    const correctP = correctPractices || 0;

    res.json({
      totalQuestions: totalQuestions || 0,
      totalPractices: totalP,
      correctPractices: correctP,
      wrongPractices: totalP - correctP,
      accuracy: totalP > 0 ? Math.round((correctP / totalP) * 100) : 0,
      todayPractices: todayPractices || 0,
      weekPractices: weekPractices || 0,
      dailyAvg: totalP > 0 && uniqueDates.length > 0 ? Math.round(totalP / uniqueDates.length) : 0,
      streak,
    });
  } catch (err: any) {
    res.status(500).json({ message: '获取统计概览失败', error: err.message });
  }
});

// 知识点分析
statsRouter.get('/tags', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    // 获取用户的所有练习记录，关联题目
    const { data: records, error } = await supabase
      .from(TABLES.PRACTICE_RECORDS)
      .select(`
        is_correct,
        questions:question_id (tags)
      `)
      .eq('user_id', req.userId);

    if (error) throw error;

    // 按知识点聚合
    const tagMap = new Map<string, { total: number; correct: number }>();

    records?.forEach((record: any) => {
      const tags = record.questions?.tags || [];
      tags.forEach((tag: string) => {
        const current = tagMap.get(tag) || { total: 0, correct: 0 };
        current.total++;
        if (record.is_correct) current.correct++;
        tagMap.set(tag, current);
      });
    });

    const result = [...tagMap.entries()].map(([tag, stats]) => ({
      tag,
      total: stats.total,
      correct: stats.correct,
      wrong: stats.total - stats.correct,
      accuracy: Math.round((stats.correct / stats.total) * 100),
      isWeak: (stats.correct / stats.total) < 0.6,
    })).sort((a, b) => b.total - a.total);

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ message: '获取知识点分析失败', error: err.message });
  }
});

// 高频错题排行
statsRouter.get('/wrong-questions', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const limit = Number(req.query.limit) || 20;

    // 获取错题统计
    const { data: wrongCounts, error } = await supabase
      .from(TABLES.PRACTICE_RECORDS)
      .select('question_id, count')
      .eq('user_id', req.userId)
      .eq('is_correct', false)
      .order('count', { ascending: false })
      .limit(limit);

    if (error) throw error;

    // 获取题目详情
    const questionIds = wrongCounts?.map((w: any) => w.question_id) || [];
    const { data: questions } = await supabase
      .from(TABLES.QUESTIONS)
      .select('id, stem, tags, difficulty')
      .in('id', questionIds);

    const questionMap = new Map(questions?.map((q: any) => [q.id, q]));

    const result = wrongCounts?.map((w: any) => ({
      questionId: w.question_id,
      stem: questionMap.get(w.question_id)?.stem || '',
      tags: questionMap.get(w.question_id)?.tags || [],
      difficulty: questionMap.get(w.question_id)?.difficulty || '',
      wrongCount: w.count,
    })) || [];

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ message: '获取高频错题失败', error: err.message });
  }
});

// 每日练习趋势（最近30天）
statsRouter.get('/daily-trend', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const days = Number(req.query.days) || 30;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const { data: records, error } = await supabase
      .from(TABLES.PRACTICE_RECORDS)
      .select('practiced_at, is_correct')
      .eq('user_id', req.userId)
      .gte('practiced_at', startDate.toISOString());

    if (error) throw error;

    // 按日期聚合
    const dailyMap = new Map<string, { total: number; correct: number }>();

    records?.forEach((record: any) => {
      const date = new Date(record.practiced_at).toISOString().split('T')[0];
      const current = dailyMap.get(date) || { total: 0, correct: 0 };
      current.total++;
      if (record.is_correct) current.correct++;
      dailyMap.set(date, current);
    });

    // 填充没有记录的日期
    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const stats = dailyMap.get(dateStr) || { total: 0, correct: 0 };
      result.push({
        date: dateStr,
        total: stats.total,
        correct: stats.correct,
        wrong: stats.total - stats.correct,
        accuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
      });
    }

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ message: '获取每日趋势失败', error: err.message });
  }
});
