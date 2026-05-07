import { createClient, SupabaseClient } from '@supabase/supabase-js';
import WebSocket from 'ws';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';

// 验证配置
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase configuration!');
  console.error('SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('SUPABASE_SERVICE_KEY:', supabaseServiceKey ? '✓' : '✗');
}

// 创建客户端，提供 WebSocket 支持
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
  realtime: {
    transport: WebSocket as any,
  },
});

// 数据库表名
export const TABLES = {
  USERS: 'users',
  QUESTIONS: 'questions',
  PRACTICE_RECORDS: 'practice_records',
} as const;

// Storage 存储桶名
export const BUCKETS = {
  QUESTION_IMAGES: 'question-images',
} as const;
