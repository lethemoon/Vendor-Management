# 智论AI平台 - 项目状态交接文档

> 生成时间：2026-05-12
> 用途：在本地 Trae IDE 中快速恢复项目上下文

---

## 一、项目概览

### 1.1 基本信息

| 项目 | 值 |
|------|-----|
| **项目名称** | 智论AI平台 (Zhilun AI Platform) |
| **定位** | AI论文写作助手 |
| **技术栈** | Next.js 14 + Fastify + PostgreSQL + Redis + Prisma |
| **当前阶段** | P1 图表生成功能开发完成，部署中 |
| **代码行数** | 后端 ~15,000行 / 前端 ~8,000行 |

### 1.2 核心功能模块

| 模块 | 状态 | 说明 |
|------|------|------|
| **用户系统** | ✅ P0完成 | 注册/登录/JWT认证/个人中心 |
| **AIGC检测** | ✅ P0完成 | AI内容检测 + 多轮改写优化 |
| **论文查重** | ✅ P0完成 | 文本相似度检测 |
| **知识库引用** | ✅ P1完成 | 文献管理 + 引用生成(GBT7714/APA/MLA) |
| **图表生成** | ✅ P1完成 | 8个图表组件 + 8个API端点 |
| **会员系统** | ⏳ P1待开发 | 订阅/支付/配额管理 |

---

## 二、当前部署状态

### 2.1 腾讯云服务器

| 项目 | 值 |
|------|-----|
| **IP** | 140.143.208.22 |
| **系统** | Ubuntu (2核4G) |
| **状态** | ✅ 环境已初始化 |

### 2.2 已安装软件

| 软件 | 版本 | 状态 |
|------|------|------|
| Node.js | v20.20.2 | ✅ |
| PostgreSQL | 16.13 | ✅ 数据库: zhilun_prod |
| Redis | 7.0.15 | ✅ 密码保护 |
| Nginx | 1.24.0 | ✅ 反向代理配置完成 |
| PM2 | 最新 | ✅ 进程管理器 |

### 2.3 服务运行状态

| 服务 | 端口 | 状态 | 验证命令 |
|------|------|------|---------|
| PostgreSQL | 5432 | ✅ 运行中 | `systemctl status postgresql` |
| Redis | 6379 | ✅ 运行中 | `redis-cli ping` |
| Nginx | 80 | ✅ 运行中 | `systemctl status nginx` |
| **后端API** | 5001 | ✅ 运行中 | `curl http://140.143.208.22/health` |
| **前端** | 3000 | ❌ 未启动 | 需要执行 `pm2 start` |

### 2.4 验证结果

```bash
# 后端API - 已通
curl http://140.143.208.22/health
# 返回: {"status":"ok","timestamp":"2026-05-12T13:00:38.596Z"}

# 前端 - 502错误（服务未启动）
curl http://140.143.208.22/
# 返回: 502 Bad Gateway
```

---

## 三、待完成任务

### 🔴 紧急：启动前端服务

在服务器 OrcaTerm 中执行：

```bash
pm2 delete zhilun-frontend 2>/dev/null
cd /home/ubuntu/apps/zhilun-platform/frontend
pm2 start npm --name zhilun-frontend -- start
pm2 save
```

### 🟡 后续任务

1. **SSL证书配置** - 启用HTTPS
2. **域名绑定** - 如有域名，配置DNS解析
3. **监控告警** - 设置PM2监控 + 日志收集
4. **数据库备份** - 定时备份脚本

---

## 四、关键文件位置

### 4.1 项目目录结构

```
智论平台/
├── backend/                    # 后端 (Fastify + Prisma)
│   ├── src/
│   │   ├── index.ts           # 入口文件
│   │   ├── routes/            # API路由
│   │   │   ├── aigc.ts        # AIGC检测 + 图表端点
│   │   │   ├── library.ts     # 知识库 + 图表端点
│   │   │   ├── papers.ts      # 论文管理
│   │   │   └── auth.ts        # 用户认证
│   │   ├── services/          # 业务逻辑
│   │   │   ├── chartService.ts    # 图表数据聚合 (新增)
│   │   │   ├── citationEngine.ts  # 引用生成引擎
│   │   │   └── ruleEngine.ts      # AIGC规则引擎
│   │   ├── types/
│   │   │   └── chart.ts       # 图表类型定义 (新增)
│   │   └── __tests__/         # 测试文件
│   │       ├── chartService.test.ts  # 图表单元测试 (新增)
│   │       └── chartRoutes.test.ts   # 图表集成测试 (新增)
│   ├── prisma/
│   │   └── schema.prisma      # 数据库模型
│   ├── .env                   # 环境变量 (需配置)
│   └── package.json
│
├── frontend/                   # 前端 (Next.js 14)
│   ├── app/                   # App Router页面
│   │   ├── aigc/              # AIGC检测页面
│   │   ├── library/           # 知识库页面
│   │   │   └── stats/         # 统计面板 (新增)
│   │   ├── paper/             # 论文编辑页面
│   │   └── ...
│   ├── components/
│   │   ├── charts/            # 图表组件 (新增)
│   │   │   ├── ChartProvider.tsx      # 主题Provider
│   │   │   ├── ChartContainer.tsx     # 统一容器
│   │   │   ├── RiskPieChart.tsx       # 风险饼图
│   │   │   ├── CitationBarChart.tsx   # 引用柱状图
│   │   │   ├── GrowthAreaChart.tsx    # 增长面积图
│   │   │   ├── TypeTreemapChart.tsx   # 类型树图
│   │   │   ├── SegmentTimelineChart.tsx  # 段落时间线
│   │   │   ├── KeywordRadarChart.tsx     # 关键词雷达图
│   │   │   ├── RiskHeatmapChart.tsx      # 风险热力图
│   │   │   └── ActivityGaugeChart.tsx    # 活动仪表盘
│   │   └── library/           # 知识库组件
│   ├── lib/
│   │   ├── api.ts             # API客户端
│   │   ├── chartApi.ts        # 图表API (新增)
│   │   └── stores/            # Zustand状态管理
│   └── package.json
│
├── docs/                       # 文档
│   ├── PRD-图表生成-MVP.md     # 图表功能PRD
│   └── TECH_SPEC-图表生成-MVP.md  # 图表技术规范
│
└── deploy/                     # 部署脚本
    ├── init-server.sh         # 服务器环境初始化
    ├── deploy-app.sh          # 应用部署脚本
    ├── .env.production.template  # 生产环境变量模板
    └── DEPLOY_GUIDE.md        # 部署指南
```

### 4.2 服务器上的路径

```
/home/ubuntu/apps/zhilun-platform/    # 项目目录
/home/ubuntu/logs/                     # 日志目录
/home/ubuntu/.ssh/                     # SSH密钥
```

---

## 五、数据库配置

### 5.1 连接信息

| 项目 | 值 |
|------|-----|
| **Host** | 127.0.0.1:5432 |
| **Database** | zhilun_prod |
| **User** | zhilun_app |
| **Password** | ZhilunApp2026! |
| **连接串** | `postgresql://zhilun_app:ZhilunApp2026!@127.0.0.1:5432/zhilun_prod` |

### 5.2 Redis配置

| 项目 | 值 |
|------|-----|
| **Host** | 127.0.0.1:6379 |
| **Password** | ZhilunRedis2026! |
| **连接串** | `redis://:ZhilunRedis2026!@127.0.0.1:6379/0` |

---

## 六、环境变量模板

后端 `.env` 文件内容：

```env
PORT=5001
NODE_ENV=production
LOG_LEVEL=warn

# JWT认证 (生产环境请更换为强随机密钥)
JWT_SECRET=ZhilunProd2026SecretKeyRandom123456789ABC
JWT_EXPIRES_IN=7d

# PostgreSQL
DATABASE_URL=postgresql://zhilun_app:ZhilunApp2026!@127.0.0.1:5432/zhilun_prod

# Redis
REDIS_URL=redis://:ZhilunRedis2026!@127.0.0.1:6379/0

# CORS
CORS_ORIGIN=http://140.143.208.22
```

---

## 七、API端点清单

### 7.1 用户认证

```
POST /api/v1/auth/register    # 注册
POST /api/v1/auth/login       # 登录
GET  /api/v1/auth/me          # 获取当前用户
```

### 7.2 AIGC检测

```
POST /api/v1/aigc/detect              # 执行检测
GET  /api/v1/aigc/detections          # 检测历史
GET  /api/v1/aigc/:id                 # 检测详情
POST /api/v1/aigc/:id/rewrite         # 执行改写

# 图表端点 (新增)
GET  /api/v1/aigc/:id/chart/risk-distribution   # 风险分布饼图
GET  /api/v1/aigc/:id/chart/segments-timeline   # 段落时间线
GET  /api/v1/aigc/:id/chart/risk-gauge          # 风险仪表盘
GET  /api/v1/aigc/:id/chart/detail-table        # 详细数据表
```

### 7.3 知识库

```
GET  /api/v1/library                 # 文献列表
POST /api/v1/library                 # 新增文献
GET  /api/v1/library/:id             # 文献详情
PUT  /api/v1/library/:id             # 更新文献
DELETE /api/v1/library/:id           # 删除文献

# 图表端点 (新增)
GET  /api/v1/library/stats/overview          # 统计概览
GET  /api/v1/library/stats/type-distribution # 类型分布
GET  /api/v1/library/stats/citation-trend    # 引用趋势
GET  /api/v1/library/stats/monthly-growth    # 月度增长
```

### 7.4 论文管理

```
GET  /api/v1/papers          # 论文列表
POST /api/v1/papers          # 创建论文
GET  /api/v1/papers/:id      # 论文详情
PUT  /api/v1/papers/:id      # 更新论文
```

---

## 八、测试状态

| 测试套件 | 用例数 | 通过率 | 说明 |
|---------|--------|--------|------|
| chartService.test.ts | 73 | **100%** | 图表服务单元测试 |
| chartRoutes.test.ts | 36 | **100%** | 图表API集成测试 |
| ruleEngine.test.ts | 71 | **100%** | AIGC规则引擎测试 |
| citationEngine.test.ts | 75 | 74.7% | 引用引擎测试(预存问题) |

---

## 九、给本地 Trae IDE 智能体的提示词

在本地 Trae IDE 中，粘贴以下内容让智能体快速理解项目：

```
我正在开发「智论AI平台」- 一个AI论文写作助手项目。

## 当前进度
- P0功能(用户系统/AIGC检测/论文查重)已完成
- P1功能(知识库引用/图表生成)代码开发完成
- 腾讯云服务器(140.143.208.22)环境已初始化
- 后端API已部署成功(health检查返回ok)
- 前端服务未启动(返回502)

## 技术栈
- 前端: Next.js 14 + Tailwind + Zustand + Recharts + ECharts
- 后端: Fastify + Prisma + PostgreSQL + Redis
- 部署: PM2 + Nginx + 腾讯云轻量服务器

## 待完成
1. 启动前端服务(pm2 start)
2. SSL证书配置
3. 会员系统开发(P1)

## 关键文件
- 后端入口: backend/src/index.ts
- 前端入口: frontend/app/
- 部署脚本: deploy/
- 文档: docs/

请帮我继续完成部署和后续开发。
```

---

## 十、常用命令速查

### 本地开发

```bash
# 后端
cd backend && npm run dev

# 前端
cd frontend && npm run dev

# 数据库
npx prisma studio
npx prisma db push
```

### 服务器运维

```bash
# SSH连接
ssh -i test.pem ubuntu@140.143.208.22

# PM2管理
pm2 status
pm2 logs
pm2 restart all
pm2 monit

# Nginx
sudo nginx -t
sudo systemctl reload nginx

# 数据库
sudo -u postgres psql -d zhilun_prod
```

### 验证命令

```bash
# 后端健康检查
curl http://140.143.208.22/health

# 前端页面
curl http://140.143.208.22/

# API测试
curl http://140.143.208.22/api/v1/
```

---

## 附录：本次会话完成的工作

1. ✅ P1图表生成功能完整开发(~3,850行代码)
2. ✅ 8个图表组件 + 8个API端点
3. ✅ 109个测试用例全部通过
4. ✅ 腾讯云环境初始化脚本
5. ✅ 部署文档和脚本
6. ✅ 后端服务部署成功

---

**文档结束** - 在本地 Trae IDE 中打开项目后，智能体会自动读取此文档了解上下文。
