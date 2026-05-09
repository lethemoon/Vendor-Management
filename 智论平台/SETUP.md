# 智论平台 - 开发环境设置指南

## 🚀 快速开始

### 1. 安装依赖

```bash
# 安装前端依赖
cd frontend
npm install

# 安装后端依赖
cd ../backend
npm install
```

### 2. 配置环境变量

```bash
# 复制后端环境变量模板
cd backend
cp .env.example .env

# 编辑 .env 文件，填入您的API密钥
vim .env

# 复制前端环境变量模板
cd ../frontend
cp .env.example .env
```

### 3. 启动Docker容器

```bash
# 在项目根目录
docker-compose up -d

# 查看容器状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

### 4. 初始化数据库

```bash
cd backend

# 生成Prisma客户端
npm run db:generate

# 运行数据库迁移
npm run db:migrate

# (可选) 查看数据库
npm run db:studio
```

### 5. 启动开发服务

```bash
# 终端1: 启动后端
cd backend
npm run dev

# 终端2: 启动前端
cd frontend
npm run dev
```

## 📊 服务访问地址

| 服务 | 地址 | 说明 |
|-----|------|------|
| 前端应用 | http://localhost:3000 | Next.js开发服务器 |
| 后端API | http://localhost:5000 | Fastify API服务 |
| API文档 | http://localhost:5000/docs | Swagger UI |
| 数据库管理 | http://localhost:5050 | pgAdmin |
| Redis | localhost:6379 | Redis服务 |

## 🔧 开发工具

### 数据库管理

```bash
# 打开Prisma Studio
cd backend
npm run db:studio
```

访问 http://localhost:5555 查看和编辑数据库

### pgAdmin访问

- 地址: http://localhost:5050
- 邮箱: admin@zhilun.com
- 密码: admin123

连接数据库:
- 主机: postgres
- 端口: 5432
- 用户: zhilun
- 密码: zhilun_dev_2026
- 数据库: zhilun_db

## 🧪 测试

```bash
# 运行后端测试
cd backend
npm run test

# 运行前端测试
cd frontend
npm run test
```

## 🐛 常见问题

### Docker容器无法启动

```bash
# 查看容器日志
docker-compose logs postgres
docker-compose logs redis

# 重启容器
docker-compose restart
```

### 数据库连接失败

```bash
# 检查数据库是否运行
docker-compose ps

# 检查连接字符串
cat backend/.env | grep DATABASE_URL
```

### 端口被占用

```bash
# 查看端口占用
lsof -i :3000
lsof -i :5000
lsof -i :5432

# 停止占用端口的进程
kill -9 <PID>
```

## 📝 下一步

1. 完成**用户系统**开发（P0）
2. 完成**论文降重**功能开发（P0）
3. 完成**AIGC检测**功能开发（P0）

详细开发流程请查看 `.trae/rules/WORKFLOW.md`
