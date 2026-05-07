import { Router, Response } from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';
import { supabase, TABLES, BUCKETS } from '../config/supabase';
import { authMiddleware, AuthRequest } from '../middleware/auth';

export const questionRouter = Router();
const upload = multer({ dest: 'uploads/', limits: { fileSize: 10 * 1024 * 1024 } });
const uploadImage = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// 获取题目列表（分页、筛选）
questionRouter.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', pageSize = '20', tag, difficulty, type, keyword } = req.query;
    const from = (Number(page) - 1) * Number(pageSize);
    const to = from + Number(pageSize) - 1;

    let query = supabase
      .from(TABLES.QUESTIONS)
      .select('*', { count: 'exact' })
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (tag) query = query.contains('tags', [tag]);
    if (difficulty) query = query.eq('difficulty', difficulty);
    if (type) query = query.eq('type', type);
    if (keyword) query = query.ilike('stem', `%${keyword}%`);

    const { data: questions, error, count } = await query;

    if (error) throw error;

    res.json({ questions: questions || [], total: count || 0, page: Number(page), pageSize: Number(pageSize) });
  } catch (err: any) {
    res.status(500).json({ message: '获取题目失败', error: err.message });
  }
});

// 获取所有标签（去重）
questionRouter.get('/tags', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { data: questions, error } = await supabase
      .from(TABLES.QUESTIONS)
      .select('tags')
      .eq('user_id', req.userId);

    if (error) throw error;

    const allTags = new Set<string>();
    questions?.forEach((q: any) => {
      q.tags?.forEach((tag: string) => allTags.add(tag));
    });

    res.json([...allTags].sort());
  } catch (err: any) {
    res.status(500).json({ message: '获取标签失败', error: err.message });
  }
});

// 获取单个题目
questionRouter.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { data: question, error } = await supabase
      .from(TABLES.QUESTIONS)
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.userId)
      .single();

    if (error || !question) return res.status(404).json({ message: '题目不存在' });
    res.json(question);
  } catch (err: any) {
    res.status(500).json({ message: '获取题目失败', error: err.message });
  }
});

// 上传图片到 Supabase Storage
questionRouter.post('/upload-image', authMiddleware, uploadImage.single('image'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: '请上传图片' });
    }

    const file = req.file;
    const fileExt = file.originalname.split('.').pop();
    const fileName = `${req.userId}/${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from(BUCKETS.QUESTION_IMAGES)
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) throw error;

    // 获取公开 URL
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKETS.QUESTION_IMAGES)
      .getPublicUrl(fileName);

    res.json({ url: publicUrl, path: fileName });
  } catch (err: any) {
    res.status(500).json({ message: '图片上传失败', error: err.message });
  }
});

// 删除图片
questionRouter.delete('/image/:path', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const path = decodeURIComponent(req.params.path);
    const { error } = await supabase.storage
      .from(BUCKETS.QUESTION_IMAGES)
      .remove([path]);

    if (error) throw error;
    res.json({ message: '图片删除成功' });
  } catch (err: any) {
    res.status(500).json({ message: '删除图片失败', error: err.message });
  }
});

// 手动添加题目
questionRouter.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { stem, options, answer, explanation, tags, difficulty, type, image_url } = req.body;
    if (!stem || !options || !answer) {
      return res.status(400).json({ message: '题干、选项和答案为必填项' });
    }

    // 自动去重：检查相同题干
    const { data: existing } = await supabase
      .from(TABLES.QUESTIONS)
      .select('id')
      .eq('user_id', req.userId)
      .ilike('stem', stem.trim())
      .single();

    if (existing) {
      return res.status(409).json({ message: '该题目已存在（题干重复）', questionId: existing.id });
    }

    const { data: question, error } = await supabase
      .from(TABLES.QUESTIONS)
      .insert({
        user_id: req.userId,
        stem: stem.trim(),
        options,
        answer: Array.isArray(answer) ? answer : [answer],
        explanation: explanation || '',
        tags: tags || [],
        difficulty: difficulty || 'medium',
        type: type || 'single',
        image_url: image_url || null,
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(question);
  } catch (err: any) {
    res.status(500).json({ message: '添加题目失败', error: err.message });
  }
});

// 批量添加题目
questionRouter.post('/batch', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { questions } = req.body;
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ message: '请提供题目数组' });
    }

    let added = 0, skipped = 0;
    for (const q of questions) {
      if (!q.stem || !q.options || !q.answer) { skipped++; continue; }
      
      const { data: existing } = await supabase
        .from(TABLES.QUESTIONS)
        .select('id')
        .eq('user_id', req.userId)
        .ilike('stem', q.stem.trim())
        .single();

      if (existing) { skipped++; continue; }

      await supabase.from(TABLES.QUESTIONS).insert({
        user_id: req.userId,
        stem: q.stem.trim(),
        options: q.options,
        answer: Array.isArray(q.answer) ? q.answer : [q.answer],
        explanation: q.explanation || '',
        tags: q.tags || [],
        difficulty: q.difficulty || 'medium',
        type: q.type || 'single',
      });
      added++;
    }

    res.status(201).json({ message: `成功添加 ${added} 题，跳过 ${skipped} 题（重复）`, added, skipped });
  } catch (err: any) {
    res.status(500).json({ message: '批量添加失败', error: err.message });
  }
});

// 上传 Excel/CSV 文件
questionRouter.post('/upload', authMiddleware, upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: '请上传文件' });
    }

    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<any>(sheet);

    let added = 0, skipped = 0, errors = 0;

    for (const row of rows) {
      try {
        const stem = String(row['题干'] || row['stem'] || '').trim();
        if (!stem) { errors++; continue; }

        // 解析选项
        let options: string[] = [];
        if (row['options']) {
          options = typeof row['options'] === 'string' ? JSON.parse(row['options']) : row['options'];
        } else {
          for (const key of ['A', 'B', 'C', 'D', 'E', 'F']) {
            if (row[key] !== undefined && String(row[key]).trim()) {
              options.push(String(row[key]).trim());
            }
          }
        }
        if (options.length < 2) { errors++; continue; }

        // 解析答案
        const answerStr = String(row['答案'] || row['answer'] || '').toUpperCase().trim();
        if (!answerStr) { errors++; continue; }
        const answer = answerStr.split(/[,，、\s]+/).filter(Boolean);

        // 解析知识点标签
        let tags: string[] = [];
        const tagStr = String(row['知识点'] || row['tags'] || '').trim();
        if (tagStr) {
          tags = tagStr.split(/[,，、;；]+/).map((t: string) => t.trim()).filter(Boolean);
        }

        // 解析难度
        const diffStr = String(row['难度'] || row['difficulty'] || 'medium').trim().toLowerCase();
        let difficulty: 'easy' | 'medium' | 'hard' = 'medium';
        if (diffStr.includes('简单') || diffStr === 'easy') difficulty = 'easy';
        else if (diffStr.includes('困难') || diffStr.includes('难') || diffStr === 'hard') difficulty = 'hard';

        // 解析题型
        const typeStr = String(row['题型'] || row['type'] || 'single').trim().toLowerCase();
        const type = typeStr.includes('多选') || typeStr === 'multiple' ? 'multiple' : 'single';

        // 去重检查
        const { data: existing } = await supabase
          .from(TABLES.QUESTIONS)
          .select('id')
          .eq('user_id', req.userId)
          .ilike('stem', stem)
          .single();

        if (existing) { skipped++; continue; }

        await supabase.from(TABLES.QUESTIONS).insert({
          user_id: req.userId,
          stem,
          options,
          answer,
          explanation: String(row['解析'] || row['explanation'] || ''),
          tags,
          difficulty,
          type,
        });
        added++;
      } catch {
        errors++;
      }
    }

    res.status(201).json({
      message: `上传完成：成功 ${added} 题，跳过 ${skipped} 题（重复），失败 ${errors} 题`,
      added, skipped, errors,
    });
  } catch (err: any) {
    res.status(500).json({ message: '文件上传失败', error: err.message });
  }
});

// 更新题目
questionRouter.put('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { stem, options, answer, explanation, tags, difficulty, type } = req.body;
    
    const { data: question, error } = await supabase
      .from(TABLES.QUESTIONS)
      .update({ stem, options, answer, explanation, tags, difficulty, type })
      .eq('id', req.params.id)
      .eq('user_id', req.userId)
      .select()
      .single();

    if (error || !question) return res.status(404).json({ message: '题目不存在' });
    res.json(question);
  } catch (err: any) {
    res.status(500).json({ message: '更新失败', error: err.message });
  }
});

// 删除题目
questionRouter.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { error } = await supabase
      .from(TABLES.QUESTIONS)
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.userId);

    if (error) throw error;
    res.json({ message: '删除成功' });
  } catch (err: any) {
    res.status(500).json({ message: '删除失败', error: err.message });
  }
});

// 批量删除
questionRouter.post('/batch-delete', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids)) return res.status(400).json({ message: '请提供题目ID数组' });
    
    const { error, count } = await supabase
      .from(TABLES.QUESTIONS)
      .delete()
      .eq('user_id', req.userId)
      .in('id', ids);

    if (error) throw error;
    res.json({ message: `已删除 ${count} 题` });
  } catch (err: any) {
    res.status(500).json({ message: '批量删除失败', error: err.message });
  }
});
