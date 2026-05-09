# 智论平台 - 文件索引

> 版本：1.0.0  
> 更新日期：2026-05-09  
> 用途：记录项目所有文件的用途和状态，避免重复开发

---

## 📁 项目文件结构

```
智论平台/
├── .trae/rules/              # 核心规则和智能体配置
├── docs/                     # 项目文档
├── frontend/                 # Next.js前端
├── backend/                  # Fastify后端
├── shared/                   # 共享类型定义
└── README.md                 # 项目说明
```

---

## 📋 核心规则文件

| 文件路径 | 用途 | 状态 | 创建日期 |
|---------|------|------|---------|
| `.trae/rules/PROJECT_RULES.md` | 项目核心规则 | ✅ 已创建 | 2026-05-09 |
| `.trae/rules/AGENT_CONFIG.md` | 双核智能体配置 | ✅ 已创建 | 2026-05-09 |
| `.trae/rules/WORKFLOW.md` | 开发工作流 | 🔄 待创建 | - |
| `.trae/rules/FILE_INDEX.md` | 文件索引（本文件） | ✅ 已创建 | 2026-05-09 |

---

## 📄 项目文档

| 文件路径 | 用途 | 状态 | 来源 |
|---------|------|------|------|
| `docs/智论平台_产品方案_V1.0.md` | 产品方案文档 | ✅ 已存在 | 外部提供 |
| `docs/智论平台_技术方案_V1.0.md` | 技术方案文档 | ✅ 已存在 | 外部提供 |
| `docs/ROADMAP.md` | 产品路线图 | 🔄 待创建 | - |

---

## 🎨 前端文件（frontend/）

### 页面路由（frontend/app/）

| 文件路径 | 用途 | 状态 | 优先级 |
|---------|------|------|--------|
| `app/page.tsx` | 首页 | 🔄 待创建 | P0 |
| `app/layout.tsx` | 根布局 | 🔄 待创建 | P0 |
| `app/login/page.tsx` | 登录页 | 🔄 待创建 | P0 |
| `app/register/page.tsx` | 注册页 | 🔄 待创建 | P0 |
| `app/dashboard/page.tsx` | 用户工作台 | 🔄 待创建 | P0 |
| `app/paper/editor/page.tsx` | 论文编辑器 | 🔄 待创建 | P0 |
| `app/paper/deduplicate/page.tsx` | 论文降重 | 🔄 待创建 | P0 |
| `app/paper/aigc-detect/page.tsx` | AIGC检测 | 🔄 待创建 | P0 |
| `app/knowledge/page.tsx` | 知识库 | 🔄 待创建 | P1 |
| `app/citation/page.tsx` | 引用管理 | 🔄 待创建 | P1 |
| `app/chart/page.tsx` | 图表生成 | 🔄 待创建 | P1 |
| `app/profile/page.tsx` | 个人中心 | 🔄 待创建 | P1 |

### 基础组件（frontend/components/base/）

| 文件路径 | 用途 | 状态 | 优先级 |
|---------|------|------|--------|
| `components/base/Button.tsx` | 按钮组件 | 🔄 待创建 | P0 |
| `components/base/Input.tsx` | 输入框组件 | 🔄 待创建 | P0 |
| `components/base/Select.tsx` | 选择器组件 | 🔄 待创建 | P0 |
| `components/base/Modal.tsx` | 模态框组件 | 🔄 待创建 | P0 |
| `components/base/Toast.tsx` | 提示组件 | 🔄 待创建 | P0 |
| `components/base/Loading.tsx` | 加载组件 | 🔄 待创建 | P0 |
| `components/base/ErrorBoundary.tsx` | 错误边界 | 🔄 待创建 | P0 |

### 业务组件（frontend/components/business/）

| 文件路径 | 用途 | 状态 | 优先级 |
|---------|------|------|--------|
| `components/business/PaperEditor.tsx` | 论文编辑器 | 🔄 待创建 | P0 |
| `components/business/CitationPanel.tsx` | 引用面板 | 🔄 待创建 | P1 |
| `components/business/KnowledgeCard.tsx` | 文献卡片 | 🔄 待创建 | P1 |
| `components/business/AICopilotSidebar.tsx` | AI助手侧栏 | 🔄 待创建 | P0 |
| `components/business/PlagiarismReport.tsx` | 查重报告 | 🔄 待创建 | P0 |
| `components/business/WritingAssistant.tsx` | 写作助手 | 🔄 待创建 | P1 |
| `components/business/ChartGenerator.tsx` | 图表生成器 | 🔄 待创建 | P1 |
| `components/business/ReferenceManager.tsx` | 参考文献管理器 | 🔄 待创建 | P1 |
| `components/business/AIGCDetector.tsx` | AIGC检测器 | 🔄 待创建 | P0 |
| `components/business/ExportDialog.tsx` | 导出对话框 | 🔄 待创建 | P1 |

### 工具函数（frontend/lib/）

| 文件路径 | 用途 | 状态 | 优先级 |
|---------|------|------|--------|
| `lib/api.ts` | API客户端 | 🔄 待创建 | P0 |
| `lib/auth.ts` | 认证工具 | 🔄 待创建 | P0 |
| `lib/storage.ts` | 本地存储 | 🔄 待创建 | P0 |
| `lib/utils.ts` | 通用工具 | 🔄 待创建 | P0 |
| `lib/hooks/` | 自定义Hooks | 🔄 待创建 | P0 |

---

## ⚙️ 后端文件（backend/）

### API路由（backend/src/routes/）

| 文件路径 | 用途 | 状态 | 优先级 |
|---------|------|------|--------|
| `routes/auth.ts` | 认证路由 | 🔄 待创建 | P0 |
| `routes/papers.ts` | 论文处理路由 | 🔄 待创建 | P0 |
| `routes/knowledge.ts` | 知识库路由 | 🔄 待创建 | P1 |
| `routes/citations.ts` | 引用管理路由 | 🔄 待创建 | P1 |
| `routes/charts.ts` | 图表生成路由 | 🔄 待创建 | P1 |
| `routes/user.ts` | 用户管理路由 | 🔄 待创建 | P0 |
| `routes/payment.ts` | 支付路由 | 🔄 待创建 | P1 |

### 业务服务（backend/src/services/）

| 文件路径 | 用途 | 状态 | 优先级 |
|---------|------|------|--------|
| `services/deduplicateService.ts` | 降重服务 | 🔄 待创建 | P0 |
| `services/aigcDetectService.ts` | AIGC检测服务 | 🔄 待创建 | P0 |
| `services/knowledgeService.ts` | 知识库服务 | 🔄 待创建 | P1 |
| `services/citationService.ts` | 引用生成服务 | 🔄 待创建 | P1 |
| `services/chartService.ts` | 图表生成服务 | 🔄 待创建 | P1 |
| `services/authService.ts` | 认证服务 | 🔄 待创建 | P0 |
| `services/paymentService.ts` | 支付服务 | 🔄 待创建 | P1 |
| `services/aiService.ts` | AI模型调用服务 | 🔄 待创建 | P0 |
| `services/ragService.ts` | RAG检索服务 | 🔄 待创建 | P1 |

### 数据模型（backend/src/models/）

| 文件路径 | 用途 | 状态 | 优先级 |
|---------|------|------|--------|
| `models/user.ts` | 用户模型 | 🔄 待创建 | P0 |
| `models/paper.ts` | 论文模型 | 🔄 待创建 | P0 |
| `models/document.ts` | 文献模型 | 🔄 待创建 | P1 |
| `models/citation.ts` | 引用模型 | 🔄 待创建 | P1 |
| `models/subscription.ts` | 订阅模型 | 🔄 待创建 | P1 |

### 工具函数（backend/src/utils/）

| 文件路径 | 用途 | 状态 | 优先级 |
|---------|------|------|--------|
| `utils/database.ts` | 数据库工具 | 🔄 待创建 | P0 |
| `utils/redis.ts` | Redis工具 | 🔄 待创建 | P0 |
| `utils/logger.ts` | 日志工具 | 🔄 待创建 | P0 |
| `utils/error.ts` | 错误处理 | 🔄 待创建 | P0 |
| `utils/validation.ts` | 参数校验 | 🔄 待创建 | P0 |

---

## 🔗 共享类型（shared/）

### TypeScript类型（shared/types/）

| 文件路径 | 用途 | 状态 | 优先级 |
|---------|------|------|--------|
| `types/user.ts` | 用户类型定义 | 🔄 待创建 | P0 |
| `types/paper.ts` | 论文类型定义 | 🔄 待创建 | P0 |
| `types/api.ts` | API类型定义 | 🔄 待创建 | P0 |
| `types/citation.ts` | 引用类型定义 | 🔄 待创建 | P1 |
| `types/chart.ts` | 图表类型定义 | 🔄 待创建 | P1 |

### 常量定义（shared/constants/）

| 文件路径 | 用途 | 状态 | 优先级 |
|---------|------|------|--------|
| `constants/api.ts` | API常量 | 🔄 待创建 | P0 |
| `constants/errors.ts` | 错误码常量 | 🔄 待创建 | P0 |
| `constants/config.ts` | 配置常量 | 🔄 待创建 | P0 |

---

## 🗄️ 数据库Schema

### PostgreSQL表结构

| 表名 | 用途 | 状态 | 优先级 |
|-----|------|------|--------|
| `users` | 用户表 | 🔄 待创建 | P0 |
| `papers` | 论文表 | 🔄 待创建 | P0 |
| `documents` | 文献表 | 🔄 待创建 | P1 |
| `citations` | 引用表 | 🔄 待创建 | P1 |
| `subscriptions` | 订阅表 | 🔄 待创建 | P1 |
| `usage_logs` | 使用日志表 | 🔄 待创建 | P1 |

---

## 🔌 API接口清单

### P0接口（MVP必需）

| 接口路径 | 方法 | 功能 | 状态 |
|---------|------|------|------|
| `/api/v1/auth/register` | POST | 用户注册 | 🔄 待开发 |
| `/api/v1/auth/login` | POST | 用户登录 | 🔄 待开发 |
| `/api/v1/papers/deduplicate` | POST | 论文降重 | 🔄 待开发 |
| `/api/v1/papers/aigc-detect` | POST | AIGC检测 | 🔄 待开发 |

### P1接口（核心功能）

| 接口路径 | 方法 | 功能 | 状态 |
|---------|------|------|------|
| `/api/v1/knowledge/upload` | POST | 知识库上传 | 🔄 待开发 |
| `/api/v1/knowledge/search` | GET | 知识库检索 | 🔄 待开发 |
| `/api/v1/citations/generate` | POST | 引用生成 | 🔄 待开发 |
| `/api/v1/charts/generate` | POST | 图表生成 | 🔄 待开发 |

---

## 📊 开发进度统计

### 文件统计

| 类别 | 总数 | 已完成 | 进行中 | 待开发 |
|-----|------|--------|--------|--------|
| 核心规则 | 4 | 3 | 0 | 1 |
| 项目文档 | 3 | 2 | 0 | 1 |
| 前端页面 | 12 | 0 | 0 | 12 |
| 前端组件 | 17 | 0 | 0 | 17 |
| 后端路由 | 7 | 0 | 0 | 7 |
| 后端服务 | 9 | 0 | 0 | 9 |
| 数据模型 | 6 | 0 | 0 | 6 |
| API接口 | 8 | 0 | 0 | 8 |

### 功能模块进度

| 模块 | 优先级 | 完成度 | 负责智能体 |
|-----|--------|--------|-----------|
| 用户系统 | P0 | 0% | ProductAgent |
| 论文降重 | P0 | 0% | ArchitectAgent |
| AIGC检测 | P0 | 0% | ArchitectAgent |
| 知识库 | P1 | 0% | ArchitectAgent |
| 引用管理 | P1 | 0% | ArchitectAgent |
| 图表生成 | P1 | 0% | ArchitectAgent |

---

## 📝 更新日志

### 2026-05-09
- ✅ 创建项目目录结构
- ✅ 创建核心规则文档（PROJECT_RULES.md）
- ✅ 创建智能体配置文档（AGENT_CONFIG.md）
- ✅ 创建文件索引文档（FILE_INDEX.md）
- 🔄 待创建开发工作流文档（WORKFLOW.md）

---

## 🎯 下一步任务

### MVP阶段（P0功能）

1. **用户系统** - ProductAgent主责
   - [ ] 创建登录注册页面
   - [ ] 实现认证API
   - [ ] 集成JWT认证

2. **论文降重** - ArchitectAgent主责
   - [ ] 设计降重算法
   - [ ] 实现降重API
   - [ ] 创建降重界面

3. **AIGC检测** - ArchitectAgent主责
   - [ ] 设计检测算法
   - [ ] 实现检测API
   - [ ] 创建检测界面

---

*本文档记录智论平台所有文件的状态，开发前请先查阅避免重复开发*
