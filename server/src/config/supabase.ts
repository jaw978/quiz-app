import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
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
