# 智论平台 - 核心规则

> 版本：1.0.0  
> 更新日期：2026-05-09  
> 适用范围：智论平台（AI论文写作助手）

---

## 📋 项目概述

### 项目定位

智论平台是一款面向大学生、研究生的AI论文写作助手，提供论文去重、AIGC降痕、知识库管理、多学科图表生成等核心功能。

### 核心价值

- **智能降重**：基于语义理解的文本改写，降低重复率
- **AIGC降痕**：对抗AI检测，确保论文通过AIGC检测
- **知识管理**：RAG增强的文献管理与引用生成
- **图表生成**：支持流程图、架构图、CAD图、统计图等多种类型

### 目标用户

- 本科生、研究生、青年学者
- 需要论文查重预检和AIGC降痕的用户
- 需要文献管理和引用生成的学术工作者

---

## 🏗️ 项目架构

### 目录结构

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
│   │   ├── base/            # 基础组件
│   │   └── business/        # 业务组件
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

### 技术栈

| 层级 | 技术选型 | 云服务 | 说明 |
|-----|---------|-------|------|
| 前端 | Next.js 14 + TypeScript | Vercel | SSR支持SEO |
| 后端 | Node.js + Fastify | 阿里云函数计算 | 轻量高效 |
| 数据库 | PostgreSQL + Redis | 阿里云RDS | 托管免运维 |
| 向量库 | pgvector | RDS插件 | 无需额外服务 |
| 对象存储 | MinIO API | 阿里云OSS | 文档图片存储 |
| AI模型 | 多API聚合 | DeepSeek/硅基流动/Azure | 按token计费 |

---

## 🤖 双核智能体系统

### 核心架构

智论平台采用**双核智能体**架构，您作为"总监"直接对接两个核心智能体：

```
┌─────────────────────────────────────────────────────────┐
│                    人类总监（您）                          │
│              终审权 | 任务指派 | 决策                      │
└────────────────┬──────────────────┬─────────────────────┘
                 │                  │
        ┌────────▼────────┐  ┌──────▼──────────┐
        │  技术架构负责人   │  │  项目产品负责人  │
        │  ArchitectAgent │  │  ProductAgent   │
        └────────┬────────┘  └────────┬────────┘
                 │                     │
        ┌────────▼─────────────────────▼────────┐
        │         下级智能体（按需召唤）            │
        │  BackendAgent | FrontendAgent          │
        │  AIEngineerAgent | TestAgent           │
        │  DevOpsAgent | CitationAgent           │
        └────────────────────────────────────────┘
```

### 职责划分

#### 技术架构负责人（ArchitectAgent）

**主责范围：**
- 技术架构设计与选型
- 后端开发（Fastify + TypeScript）
- AI工程（Prompt工程、RAG系统）
- 测试（自动化测试、质量保证）
- 运维（部署、监控、CI/CD）

**核心能力：**
- 技术选型决策与架构设计
- 代码审查与质量把控
- API设计与实现
- 数据库设计与优化
- AI模型集成与优化

#### 项目产品负责人（ProductAgent）

**主责范围：**
- 需求分析与PRD撰写
- 用户体验设计
- 前端开发（Next.js + React）
- 产品运营（定价、推广）
- 用户反馈收集与分析

**核心能力：**
- 需求分析与用户故事编写
- 用户体验优化
- 前端界面设计与实现
- 产品功能规划
- 数据分析与运营策略

---

## 🔄 主从协作模式

### 核心规则

#### 规则一：谁主导，看任务性质

| 任务类型 | 主责Agent | 逻辑 |
|---------|----------|------|
| 新功能、用户可见变更 | ProductAgent | 需求为起点，技术服务于需求 |
| 架构重构、性能优化、Bug修复 | ArchitectAgent | 技术为起点，需评估对已有功能的影响 |
| 探索性研究（如新检测算法） | ArchitectAgent | 技术可行性先于产品化 |

#### 规则二：主责Agent必须主动"召唤"对方

主责Agent产出草稿后，必须主动@另一个Agent要求审查或评估。您的角色只是终审。

**需求驱动场景示例：**

```
你：@ProductAgent 用户反馈降重后的文本"读起来不像人写的"，请分析问题并输出改进方案。

ProductAgent（产出PRD后）：这份PRD已完成，功能设计为"增加人类写作特征注入选项"。
现在 @ArchitectAgent 请从技术实现角度审查：
1. 这个方案对现有降重流水线的影响是什么？
2. "人类特征注入"是否需要新增模型调用？成本估算？
3. 是否存在性能风险？

ArchitectAgent：收到。技术审查结果：1) 需在降重流水线中增加一个后处理步骤...
你（终审）：批准。@ArchitectAgent 根据你的审查结论，输出最终技术规格...
```

#### 规则三：终审权永远在你手里

即使两个Agent达成共识，你的一句话仍然可以推翻。你是唯一对整体项目负责的人。

---

## 📊 功能分级与开发流程

### 功能分级标准

| 级别 | 判断标准 | 典型例子 |
|-----|---------|---------|
| P0 | 涉及核心算法变更或用户付费功能或数据模型变更 | 降重算法升级、AIGC检测逻辑修改、支付流程、数据库Schema变更 |
| P1 | 涉及新增接口或新页面组件，但不影响核心算法与数据模型 | 新增文献导入源适配器、个人中心新页面、图表模板新增 |
| P2 | 纯展示层变更、文案修改、已有接口的非破坏性调整 | 文案优化、样式调整、新增图表配色方案 |

### 开发流程

#### P0功能：完整五步流程

```
ProductAgent PRD → 你批准
    ↓
ArchitectAgent 技术规格 → 你批准
    ↓
并行开发（BackendAgent/FrontendAgent/AIEngineerAgent）
    ↓
TestAgent 测试 → 你验收指标
    ↓
ArchitectAgent 审查 → DevOpsAgent 部署
```

#### P1功能：四步流程

```
ArchitectAgent 直接输出"技术规格+验收标准"
（跳过单独PRD，但技术规格中须包含功能说明）
    ↓ 你批准
并行开发
    ↓
TestAgent 测试 → 你验收
    ↓
ArchitectAgent 审查 → DevOpsAgent 部署
```

#### P2功能：三步流程

```
FrontendAgent/BackendAgent 直接实现
（你口头描述需求即可）
    ↓
TestAgent 基础测试（只测不崩溃+核心路径）
    ↓
DevOpsAgent 部署
```

### P1升级规则

在P1流程中，如果ArchitectAgent在出技术规格时发现：
- 需要修改数据库Schema
- 需要新增第三方API调用
- 会影响已有核心功能的行为

则自动升级为P0，补上ProductAgent的PRD环节。

**一句话执行原则：**
"数据不动随便改，数据一动走全套。"
- Schema不变 → P1起步
- Schema要变 → 一律P0

---

## 📝 代码规范

### TypeScript代码规范

```typescript
// 使用类型注解
interface UserData {
  id: string;
  email: string;
  name: string;
}

// 使用async/await
async function fetchUser(id: string): Promise<UserData> {
  const response = await fetch(`/api/users/${id}`);
  return response.json();
}

// 使用const enum
const enum UserRole {
  Student = 'student',
  Graduate = 'graduate',
  Scholar = 'scholar'
}
```

### API设计规范

```typescript
// RESTful API设计
POST   /api/v1/papers/deduplicate     // 论文降重
POST   /api/v1/papers/aigc-detect     // AIGC检测
POST   /api/v1/knowledge/upload       // 知识库上传
GET    /api/v1/knowledge/search       // 知识库检索
POST   /api/v1/citations/generate     // 引用生成
POST   /api/v1/charts/generate        // 图表生成
```

### Git提交规范

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

## 🚀 快速开始

### 环境准备

```bash
# 克隆项目
git clone <repository-url>
cd 智论平台

# 安装前端依赖
cd frontend
npm install

# 安装后端依赖
cd ../backend
npm install

# 配置环境变量
cp .env.example .env
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

## 📁 关键文件索引

| 文件 | 用途 | 查看场景 |
|------|------|---------|
| `.trae/rules/PROJECT_RULES.md` | 核心规则 | 开发规范 |
| `.trae/rules/AGENT_CONFIG.md` | 智能体配置 | 智能体协作 |
| `.trae/rules/WORKFLOW.md` | 开发工作流 | 任务执行 |
| `.trae/rules/FILE_INDEX.md` | 文件索引 | 避免重复开发 |
| `docs/智论平台_产品方案_V1.0.md` | 产品方案 | 需求参考 |
| `docs/智论平台_技术方案_V1.0.md` | 技术方案 | 技术参考 |

---

## 📊 项目状态

| 指标 | 数值 |
|------|------|
| 版本 | 1.0.0 |
| 阶段 | MVP开发 |
| 核心功能 | 论文降重、AIGC降痕、知识库、图表生成 |
| 技术栈 | Next.js 14 + Fastify + PostgreSQL |

---

*本文档定义智论平台的核心规则，作为项目开发的核心参考*
