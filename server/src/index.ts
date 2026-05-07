import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { authRouter } from './routes/auth';
import { questionRouter } from './routes/questions';
import { practiceRouter } from './routes/practice';
import { statsRouter } from './routes/stats';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// CORS 配置 - 允许所有来源
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false
}));

// 中间件
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 静态文件 - 提供前端页面
app.use(express.static(path.join(__dirname, '../public')));

// API 路由
app.use('/api/auth', authRouter);
app.use('/api/questions', questionRouter);
app.use('/api/practice', practiceRouter);
app.use('/api/stats', statsRouter);

// 健康检查
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// SPA 路由 - 所有非 API 路由返回 index.html
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
  console.log(`📦 使用 Supabase 作为数据库`);
});

export default app;
