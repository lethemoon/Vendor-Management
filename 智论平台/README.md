# 智论平台

**AI论文写作助手** - 面向大学生、研究生的智能论文辅助工具

---

## 📋 项目简介

智论平台是一款AI论文写作助手，提供以下核心功能：

- **智能降重** - 基于语义理解的文本改写，降低论文重复率
- **AIGC降痕** - 对抗AI检测，确保论文通过AIGC检测
- **知识管理** - RAG增强的文献管理与引用生成
- **图表生成** - 支持流程图、架构图、CAD图、统计图等多种类型

### 目标用户

- 本科生、研究生、青年学者
- 需要论文查重预检和AIGC降痕的用户
- 需要文献管理和引用生成的学术工作者

---

## 🚀 快速开始

### 环境要求

- Node.js >= 18.0.0
- PostgreSQL >= 14.0
- Redis >= 6.0
- npm >= 9.0.0

### 安装依赖

```bash
# 安装前端依赖
cd frontend
npm install

# 安装后端依赖
cd ../backend
npm install
```

### 配置环境变量

```bash
# 复制环境变量模板
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# 编辑环境变量
vim backend/.env
vim frontend/.env
```

### 启动开发服务

```bash
# 启动前端（端口3000）
cd frontend
npm run dev

# 启动后端（端口5000）
cd backend
npm run dev
```

### 数据库初始化

```bash
# 运行数据库迁移
cd backend
npm run db:migrate

# 初始化种子数据
npm run db:seed
```

---

## 🏗️ 项目结构

```
智论平台/
├── .trae/rules/              # 核心规则和智能体配置
│   ├── PROJECT_RULES.md      # 项目核心规则
│   ├── AGENT_CONFIG.md       # 双核智能体配置
│   ├── WORKFLOW.md           # 开发工作流
│   └── FILE_INDEX.md         # 文件索引
│
├── docs/                     # 项目文档
│   ├── 智论平台_产品方案_V1.0.md
│   ├── 智论平台_技术方案_V1.0.md
│   └── ROADMAP.md            # 产品路线图
│
├── frontend/                 # Next.js前端
│   ├── app/                  # 页面路由
│   ├── components/           # 组件库
│   └── lib/                  # 工具函数
│
├── backend/                  # Fastify后端
│   └── src/
│       ├── routes/           # API路由
│       ├── services/         # 业务逻辑
│       ├── models/           # 数据模型
│       └── utils/            # 工具函数
│
├── shared/                   # 共享类型定义
│   ├── types/               # TypeScript类型
│   └── constants/           # 常量定义
│
└── README.md                 # 项目说明
```

---

## 🛠️ 技术栈

### 前端

- **框架**: Next.js 14 + React 18
- **语言**: TypeScript 5
- **UI组件库**: shadcn/ui + Tailwind CSS
- **状态管理**: Zustand / React Query
- **图表库**: ECharts / AntV

### 后端

- **框架**: Fastify 4 + TypeScript 5
- **数据库**: PostgreSQL 14 + pgvector
- **缓存**: Redis 6
- **ORM**: Prisma 5
- **认证**: JWT

### AI能力

- **LLM**: DeepSeek / 硅基流动 / Azure OpenAI
- **嵌入模型**: BGE-M3
- **向量检索**: pgvector

---

## 📚 文档导航

### 核心规则文档

| 文档 | 用途 | 路径 |
|------|------|------|
| PROJECT_RULES.md | 项目核心规则 | `.trae/rules/PROJECT_RULES.md` |
| AGENT_CONFIG.md | 双核智能体配置 | `.trae/rules/AGENT_CONFIG.md` |
| WORKFLOW.md | 开发工作流 | `.trae/rules/WORKFLOW.md` |
| FILE_INDEX.md | 文件索引 | `.trae/rules/FILE_INDEX.md` |

### 产品技术文档

| 文档 | 用途 | 路径 |
|------|------|------|
| 智论平台_产品方案_V1.0.md | 产品方案 | `docs/智论平台_产品方案_V1.0.md` |
| 智论平台_技术方案_V1.0.md | 技术方案 | `docs/智论平台_技术方案_V1.0.md` |

---

## 🤖 双核智能体系统

智论平台采用**双核智能体架构**，您作为"总监"直接对接两个核心智能体：

### 技术架构负责人（ArchitectAgent）

**主责范围：**
- 技术架构设计与选型
- 后端开发（Fastify + TypeScript）
- AI工程（Prompt工程、RAG系统）
- 测试（自动化测试、质量保证）
- 运维（部署、监控、CI/CD）

### 项目产品负责人（ProductAgent）

**主责范围：**
- 需求分析与PRD撰写
- 用户体验设计
- 前端开发（Next.js + React）
- 产品运营（定价、推广）
- 用户反馈收集与分析

详细配置请查看 [AGENT_CONFIG.md](.trae/rules/AGENT_CONFIG.md)

---

## 🔄 开发流程

智论平台采用**分级开发流程**：

### P0功能（完整五步流程）
- 涉及核心算法变更或用户付费功能或数据模型变更
- 流程：需求准入 → 技术对齐 → 并行开发 → 集成验证 → 审查交付

### P1功能（四步流程）
- 涉及新增接口或新页面组件，但不影响核心算法与数据模型
- 流程：技术规格 → 并行开发 → 测试验证 → 审查部署

### P2功能（三步流程）
- 纯展示层变更、文案修改、已有接口的非破坏性调整
- 流程：直接开发 → 基础测试 → 直接部署

详细流程请查看 [WORKFLOW.md](.trae/rules/WORKFLOW.md)

---

## 📊 开发进度

### MVP阶段（P0功能）

- [ ] 用户系统
- [ ] 论文降重
- [ ] AIGC检测

### 核心功能阶段（P1功能）

- [ ] 知识库
- [ ] 引用管理
- [ ] 图表生成

详细进度请查看 [FILE_INDEX.md](.trae/rules/FILE_INDEX.md)

---

## 🧪 测试

```bash
# 运行前端测试
cd frontend
npm run test

# 运行后端测试
cd backend
npm run test

# 运行E2E测试
npm run test:e2e
```

---

## 📦 部署

```bash
# 构建前端
cd frontend
npm run build

# 构建后端
cd backend
npm run build

# 部署到生产环境
npm run deploy
```

---

## 📝 Git提交规范

```
feat: 新功能
fix: Bug修复
docs: 文档更新
refactor: 代码重构
test: 测试相关
style: 代码格式调整
perf: 性能优化
chore: 构建/工具链更新
```

---

## 📄 许可证

MIT License

---

## 👥 联系方式

- 项目负责人：[您的名字]
- 邮箱：[您的邮箱]
- GitHub：[项目地址]

---

*智论平台 - 让学术写作更智能*
