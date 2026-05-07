import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase, TABLES } from '../config/supabase';
import { authMiddleware, AuthRequest } from '../middleware/auth';

export const authRouter = Router();

// 注册
authRouter.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, nickname } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: '邮箱和密码为必填项' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: '密码至少6位' });
    }

    // 检查邮箱是否已存在
    const { data: existingUser } = await supabase
      .from(TABLES.USERS)
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(409).json({ message: '该邮箱已注册' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    // 创建用户
    const { data: user, error } = await supabase
      .from(TABLES.USERS)
      .insert({
        email,
        password: hashedPassword,
        nickname: nickname || email.split('@')[0],
      })
      .select()
      .single();

    if (error) throw error;

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'default_secret',
      { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any }
    );

    res.status(201).json({
      token,
      user: { id: user.id, email: user.email, nickname: user.nickname },
    });
  } catch (err: any) {
    res.status(500).json({ message: '注册失败', error: err.message });
  }
});

// 登录
authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: '邮箱和密码为必填项' });
    }

    const { data: user, error } = await supabase
      .from(TABLES.USERS)
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) {
      return res.status(401).json({ message: '邮箱或密码错误' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: '邮箱或密码错误' });
    }

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'default_secret',
      { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any }
    );

    res.json({
      token,
      user: { id: user.id, email: user.email, nickname: user.nickname },
    });
  } catch (err: any) {
    res.status(500).json({ message: '登录失败', error: err.message });
  }
});

// 获取当前用户信息
authRouter.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { data: user, error } = await supabase
      .from(TABLES.USERS)
      .select('id, email, nickname, created_at')
      .eq('id', req.userId)
      .single();

    if (error || !user) {
      return res.status(404).json({ message: '用户不存在' });
    }
    res.json(user);
  } catch (err: any) {
    res.status(500).json({ message: '获取用户信息失败', error: err.message });
  }
});

// 更新用户信息
authRouter.put('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { nickname } = req.body;
    const { data: user, error } = await supabase
      .from(TABLES.USERS)
      .update({ nickname })
      .eq('id', req.userId)
      .select('id, email, nickname, created_at')
      .single();

    if (error) throw error;
    res.json(user);
  } catch (err: any) {
    res.status(500).json({ message: '更新失败', error: err.message });
  }
});
