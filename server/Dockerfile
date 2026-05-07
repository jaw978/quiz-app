FROM node:20-alpine
WORKDIR /app

# 安装依赖
COPY package*.json ./
RUN npm ci

# 复制源码并编译
COPY . .
RUN npm run build

# 创建上传目录
RUN mkdir -p uploads

EXPOSE 3001

CMD ["npm", "start"]
