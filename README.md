# 错题本刷题网站

一个简洁高效的个人错题本刷题工具，支持上传错题、随机刷题、数据统计与薄弱知识点分析。

## 技术栈

- **前端**：React 18 + TypeScript + Vite + Tailwind CSS + Recharts
- **后端**：Node.js + Express + Supabase (PostgreSQL) + JWT
- **部署**：Vercel（前端）+ Railway（后端），零成本

## 项目结构

```
quiz-app/
├── server/                    # 后端
│   ├── src/
│   │   ├── index.ts          # 服务器入口
│   │   ├── config/supabase.ts # Supabase 配置
│   │   ├── routes/           # API 路由
│   │   └── middleware/       # 中间件（JWT 认证）
│   ├── Dockerfile            # Railway 部署
│   └── .env                  # 环境变量配置
├── client/                    # 前端
│   ├── src/
│   │   ├── api/              # API 封装
│   │   ├── contexts/         # 认证上下文
│   │   ├── components/       # 公共组件
│   │   └── pages/            # 页面组件
│   └── .env.example          # 环境变量示例
└── README.md
```

---

## 🚀 在线部署（Vercel + Railway）

### 第一步：部署后端到 Railway

1. 注册 [Railway](https://railway.app) 账号
2. 点击 **New Project** → **Deploy from GitHub repo**
3. 选择你的 GitHub 仓库，设置：
   - **Root Directory**: `server`
   - **Environment Variables** 添加：
     ```
     SUPABASE_URL = https://你的项目.supabase.co
     SUPABASE_SERVICE_KEY = 你的service-role-key
     JWT_SECRET = 随机生成一个密钥
     JWT_EXPIRES_IN = 7d
     PORT = 3001
     ```
4. Railway 会自动检测 Dockerfile 并构建
5. 部署完成后，点击 **Settings** → **Networking** → **Generate Public Domain**
6. 记下后端地址，例如：`https://quiz-app-backend.up.railway.app`

### 第二步：部署前端到 Vercel

1. 注册 [Vercel](https://vercel.com) 账号
2. 点击 **Add New Project** → **Import Git Repository**
3. 选择你的 GitHub 仓库，设置：
   - **Root Directory**: `client`
   - **Framework Preset**: Vite
   - **Environment Variables** 添加：
     ```
     VITE_API_URL = https://quiz-app-backend.up.railway.app/api
     ```
     > ⚠️ 把地址替换为你第一步得到的 Railway 后端地址
4. 点击 **Deploy**
5. 部署完成后，你会得到一个类似 `https://quiz-app.vercel.app` 的地址

### 第三步：配置 Supabase

1. 登录 [Supabase Dashboard](https://supabase.com/dashboard)
2. 进入 **SQL Editor**，执行以下 SQL 创建表：

```sql
-- 用户表
create table users (
  id uuid default gen_random_uuid() primary key,
  email text unique not null,
  password text not null,
  nickname text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 题目表
create table questions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete cascade not null,
  stem text not null,
  options text[] not null,
  answer text[] not null,
  explanation text default '',
  tags text[] default '{}',
  difficulty text default 'medium',
  type text default 'single',
  image_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 练习记录表
create table practice_records (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete cascade not null,
  question_id uuid references questions(id) on delete cascade not null,
  is_correct boolean not null,
  user_answer text[] not null,
  time_spent integer default 0,
  practiced_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 创建索引
create index idx_questions_user_id on questions(user_id);
create index idx_practice_records_user_id on practice_records(user_id);
create index idx_practice_records_question_id on practice_records(question_id);
```

3. 进入 **Storage** → 创建名为 `question-images` 的 Bucket，设为 **Public**

### 完成！

手机和电脑都可以通过 Vercel 地址随时访问网站了 🎉

---

## 💻 本地开发

### 环境要求

- Node.js >= 18
- Supabase 账号（免费）

### 1. 安装依赖

```bash
cd server && npm install
cd ../client && npm install
```

### 2. 配置环境变量

`server/.env`：
```env
PORT=3001
SUPABASE_URL=https://你的项目.supabase.co
SUPABASE_SERVICE_KEY=你的service-role-key
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d
```

### 3. 启动

```bash
# 终端1：启动后端
cd server && npm run dev

# 终端2：启动前端
cd client && npm run dev
```

访问 `http://localhost:5173`

---

## 使用指南

### 上传错题

#### Excel/CSV 文件上传

| 题干 | A | B | C | D | 答案 | 解析 | 知识点 | 难度 | 题型 |
|------|---|---|---|---|------|------|--------|------|------|
| 题目内容 | 选项A | 选项B | 选项C | 选项D | A | 解析 | 数学 | 中等 | 单选 |

#### 手动录入 / 图片上传

在「题库」页面点击「添加题目」，支持上传题目配图（JPG/PNG/GIF，最大5MB）。

### 刷题模式

- **随机刷题**：从题库随机抽取
- **按知识点**：选择特定知识点专项练习
- **错题重刷**：只练之前做错的题

### 数据统计

- 概览：总题数、正确率、连续打卡
- 知识点分析：自动标红薄弱知识点（正确率 < 60%）
- 错题排行、30天趋势图

## License

MIT
