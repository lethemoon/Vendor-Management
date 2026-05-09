# 佛具AI智能设计制造平台 - 核心规则

> 版本：2.0.0  
> 更新日期：2026-05-06  
> 适用范围：佛具及跨行业AI设计制造平台

---

## 📋 项目概述

### 项目定位

佛具AI智能设计制造平台是一个从图片生成到3D设计再到CAD出图的完整工作流平台，采用多智能体架构，支持多租户管理，可扩展至珠宝、工艺品、玩具、家具等多个垂直行业。

### 核心价值

- **知识驱动**：基于行业知识库的智能设计
- **AI赋能**：AI辅助图片生成、3D转换、CAD出图
- **多租户**：支持多企业/工厂独立运营
- **标准化**：输出符合制造标准的CAD图纸

---

## 🏗️ 项目架构

### 目录结构

```
src_buddha/
├── .trae/rules/              # 核心规则和CCB能力
│   ├── project_rules.md      # 项目核心规则
│   ├── ecc_rules.md          # ECC规则
│   └── ECC_COMPLETE_CAPABILITIES.md
│
├── domain/                   # 领域层
│   ├── models/              # 领域模型
│   │   ├── agent.py         # 多智能体模型
│   │   ├── buddha_knowledge.py  # 知识库模型
│   │   ├── tenant.py        # 租户模型
│   │   └── ...
│   └── services/            # 领域服务
│
├── application/              # 应用层
│   ├── workflow.py          # 工作流编排
│   └── commands.py          # 命令处理
│
├── infrastructure/           # 基础设施层
│   ├── blender_renderer.py  # Blender渲染
│   ├── dxf_exporter.py      # DXF导出
│   ├── hunyuan_api.py       # 混元3D API
│   └── ...
│
├── docs/                     # 项目文档
│   ├── ROADMAP.md           # 产品路线图
│   ├── ARCHITECTURE.md      # 架构文档
│   └── ...
│
├── knowledge_data/           # 知识库数据
│   └── buddha_knowledge_init.json
│
├── scripts/                  # 脚本工具
│   └── init_knowledge_base.py
│
└── web/                      # Web界面
    ├── index.html           # 前台工作台
    ├── admin.html           # 后台管理
    └── api_server.py        # API服务
```

### 架构分层

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          表现层 (Presentation)                           │
│  ┌─────────────────────┐  ┌─────────────────────┐                      │
│  │     前台工作台       │  │     后台管理        │                      │
│  │  • 项目管理          │  │  • 租户管理         │                      │
│  │  • 渲染配置          │  │  • 知识库管理       │                      │
│  │  • 结果预览          │  │  • 系统配置         │                      │
│  └─────────────────────┘  └─────────────────────┘                      │
├─────────────────────────────────────────────────────────────────────────┤
│                          应用层 (Application)                            │
│  ┌─────────────────────┐  ┌─────────────────────┐                      │
│  │    工作流编排        │  │    命令处理         │                      │
│  │  • 任务分解          │  │  • 请求验证         │                      │
│  │  • Agent协调         │  │  • 响应构建         │                      │
│  └─────────────────────┘  └─────────────────────┘                      │
├─────────────────────────────────────────────────────────────────────────┤
│                          领域层 (Domain)                                 │
│  ┌─────────────────────┐  ┌─────────────────────┐                      │
│  │     领域模型         │  │     领域服务        │                      │
│  │  • Agent模型         │  │  • 轮廓提取         │                      │
│  │  • 知识库模型        │  │  • 尺寸计算         │                      │
│  │  • 租户模型          │  │  • 模型转换         │                      │
│  └─────────────────────┘  └─────────────────────┘                      │
├─────────────────────────────────────────────────────────────────────────┤
│                       基础设施层 (Infrastructure)                        │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐              │
│  │ Blender   │ │ DXF导出   │ │ 混元API   │ │ 文件存储  │              │
│  └───────────┘ └───────────┘ └───────────┘ └───────────┘              │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🤖 多智能体系统

### Agent分层架构

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              Agent协调层                                 │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                   Orchestrator Agent (编排Agent)                  │   │
│  │  • 任务分解与分配  • Agent间协调  • 结果汇总                       │   │
│  └─────────────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────────────┤
│                              核心Agent层                                 │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐              │
│  │ 意图理解  │ │ 知识检索  │ │ 提示词优化│ │ 质量评估  │              │
│  │ Agent     │ │ Agent     │ │ Agent     │ │ Agent     │              │
│  └───────────┘ └───────────┘ └───────────┘ └───────────┘              │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐              │
│  │ 图片生成  │ │ 3D转换    │ │ CAD出图   │ │ 反馈学习  │              │
│  │ Agent     │ │ Agent     │ │ Agent     │ │ Agent     │              │
│  └───────────┘ └───────────┘ └───────────┘ └───────────┘              │
├─────────────────────────────────────────────────────────────────────────┤
│                              支撑Agent层                                 │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐              │
│  │ 知识图谱  │ │ 向量检索  │ │ 规则引擎  │ │ 日志监控  │              │
│  │ Agent     │ │ Agent     │ │ Agent     │ │ Agent     │              │
│  └───────────┘ └───────────┘ └───────────┘ └───────────┘              │
└─────────────────────────────────────────────────────────────────────────┘
```

### Agent能力映射

| 本项目Agent | ECC对应代理 | Trae Solo技能 |
|------------|------------|--------------|
| Orchestrator Agent | `project-flow-ops` | `brainstorming` |
| Intent Understanding Agent | `ml-engineer` | `consulting-analysis` |
| Knowledge Retrieval Agent | `data-scientist` | `data-analysis` |
| Prompt Optimization Agent | `frontend-specialist` | `writing-plans` |
| Quality Evaluation Agent | `code-reviewer` | `test-driven-development` |
| Feedback Learning Agent | `ml-engineer` | `executing-plans` |

---

## 🔄 核心工作流

### 图片→3D→CAD工作流

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│ 阶段1    │     │ 阶段2    │     │ 阶段3    │     │ 阶段4    │
│ 图片生成 │ ──▶ │ 3D设计   │ ──▶ │ CAD出图  │ ──▶ │ 制造输出 │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
     │                │                │                │
     ▼                ▼                ▼                ▼
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│ 图片知识库│     │ 3D知识库 │     │ CAD知识库│     │ 工艺知识库│
│ • 风格模板│     │ • 模型库 │     │ • 工艺标准│     │ • 加工参数│
│ • 提示词库│     │ • 材质库 │     │ • 尺寸公差│     │ • 材料规范│
└──────────┘     └──────────┘     └──────────┘     └──────────┘
```

### 提示词优化工作流

```
用户输入: "一个佛像"
    │
    ▼ 意图理解Agent
识别: 类别=佛像类, 风格=中国传统(推荐), 材质=青铜(推荐)
    │
    ▼ 知识检索Agent
检索: 佛像知识 + 风格模板 + 材质描述
    │
    ▼ 提示词优化Agent
优化后: "一尊庄严的释迦牟尼佛像，中国传统明清风格，青铜材质..."
    │
    ▼ 质量评估Agent
评分: 完整性0.9 | 专业性0.85 | 风格一致性0.88 | 综合0.88 ✓
```

---

## 📚 知识库体系

### 三阶段知识库

| 阶段 | 知识库 | 核心内容 | 数据文件 |
|------|--------|---------|---------|
| 阶段1 | 图片生成知识库 | 风格模板、提示词工程、图像参考 | `buddha_knowledge_init.json` |
| 阶段2 | 3D设计知识库 | 模型模板、比例规范、材质纹理 | 待建设 |
| 阶段3 | CAD出图知识库 | 工艺标准、尺寸公差、加工参数 | 待建设 |

### 知识库分类

```
佛具知识库
├── 佛像类 (BUDDHA)
│   ├── 释迦牟尼佛
│   ├── 阿弥陀佛
│   ├── 药师佛
│   └── 弥勒佛
├── 菩萨类 (BODHISATTVA)
│   ├── 观音菩萨
│   ├── 文殊菩萨
│   ├── 普贤菩萨
│   └── 地藏菩萨
├── 罗汉类 (ARHAT)
├── 护法类 (DHARMA_PROTECTOR)
├── 法器类 (RITUAL_VESSEL)
└── 供具类 (OFFERING_VESSEL)
```

---

## 🏢 租户系统

### 前后台数据管理

| 模块 | 前台功能 | 后台功能 | 数据隔离 |
|------|---------|---------|---------|
| **工作台** | 项目管理、渲染配置、结果预览 | - | 租户级 |
| **知识库** | 浏览、搜索、收藏、使用 | 录入、审核、管理、统计 | 全局+租户定制 |
| **租户管理** | 个人设置、配额查看 | 租户CRUD、配额配置 | 租户级 |
| **用户管理** | 个人资料 | 用户CRUD、权限配置 | 租户级 |
| **系统配置** | - | AI模型配置、系统参数 | 全局 |

### 数据隔离策略

```
数据隔离层级：

1. Schema隔离（强隔离）
   └── 每个租户独立数据库Schema

2. 行级隔离（共享表）
   └── 所有租户共享表，通过tenant_id过滤

3. 存储隔离
   └── MinIO按租户分Bucket

4. 缓存隔离
   └── Redis Key前缀隔离
```

---

## 🛠️ Trae Solo技能集成

### 核心技能映射

| 项目需求 | Trae Solo技能 | 使用场景 |
|---------|--------------|---------|
| 需求分析 | `brainstorming` | 新功能规划、需求研讨 |
| 方案设计 | `writing-plans` | 技术方案、架构设计 |
| 代码实现 | `test-driven-development` | 功能开发、Bug修复 |
| 计划执行 | `executing-plans` | 任务执行、进度跟踪 |
| 数据分析 | `data-analysis` | 知识库分析、使用统计 |
| 咨询报告 | `consulting-analysis` | 行业研讨、产品报告 |
| 前端开发 | `frontend-design` | Web界面开发 |
| 安全审查 | `security-best-practices` | 代码安全检查 |

### 技能使用规则

```yaml
skill_usage_rules:
  brainstorming:
    trigger: "新功能规划、需求研讨、创意探索"
    action: "在开始任何创造性工作前调用"
    
  writing-plans:
    trigger: "多步骤任务、技术方案、架构设计"
    action: "在实现前先规划，生成详细计划"
    
  test-driven-development:
    trigger: "功能开发、Bug修复"
    action: "先写测试，再实现功能"
    
  executing-plans:
    trigger: "有明确的实施计划"
    action: "按计划执行，设置检查点"
    
  data-analysis:
    trigger: "数据分析、统计报告"
    action: "处理Excel/CSV数据，生成分析报告"
    
  consulting-analysis:
    trigger: "行业研讨、市场分析、产品报告"
    action: "生成专业咨询报告"
```

---

## 📖 ECC能力集成

### 专业代理使用

| 场景 | ECC代理 | 命令示例 |
|------|--------|---------|
| Python代码审查 | `python-reviewer` | `ccb --agent python-reviewer` |
| 架构分析 | `architecture-analyzer` | `ccb --agent architecture-analyzer` |
| 性能优化 | `performance-optimizer` | `ccb --agent performance-optimizer` |
| 安全扫描 | `security-scanner` | `ccb --agent security-scanner` |
| 成本审计 | `ecc-tools-cost-audit` | `ccb --agent ecc-tools-cost-audit` |

### 技能库使用

| 场景 | ECC技能 | 说明 |
|------|--------|------|
| Flask开发 | `flask-patterns` | Flask最佳实践 |
| API设计 | `rest-api-design` | REST API设计模式 |
| 数据库设计 | `database-design` | 数据库设计模式 |
| 测试 | `unit-testing` | 单元测试模式 |
| Docker | `docker-patterns` | Docker模式 |

---

## 📝 文档规范

### 文档分类

```
docs/
├── ROADMAP.md                    # 产品路线图
├── ARCHITECTURE.md               # 架构文档
├── KNOWLEDGE_PROMPT_AGENT_DESIGN.md  # Agent设计文档
├── PROMPT_TEMPLATES_INIT.md      # 提示词模板
├── CROSS_INDUSTRY_PRODUCT_RESEARCH.md  # 跨行业研讨
└── KNOWLEDGE_BASE_INIT_PLAN.md   # 知识库初始化方案
```

### 文档命名规范

- `ROADMAP.md` - 产品路线图
- `ARCHITECTURE.md` - 架构文档
- `*_DESIGN.md` - 设计文档
- `*_INIT.md` - 初始化文档
- `*_RESEARCH.md` - 研讨报告
- `*_PLAN.md` - 方案文档

---

## 🔧 开发规范

### 代码规范

1. **Python代码**
   - 使用类型注解
   - 遵循PEP 8规范
   - 使用dataclass定义数据模型

2. **文档规范**
   - 使用中文注释
   - Markdown格式
   - 清晰的标题层级

3. **Git提交规范**
   - feat: 新功能
   - fix: Bug修复
   - docs: 文档更新
   - refactor: 代码重构
   - test: 测试相关

### 测试规范

```python
# 使用pytest进行测试
# 测试文件命名: test_*.py
# 测试类命名: Test*
# 测试方法命名: test_*

def test_intent_understanding():
    """测试意图理解Agent"""
    agent = IntentUnderstandingAgent()
    result = await agent.process(message)
    assert result.payload["intent_result"]["category"] == "佛像类"
```

---

## 🚀 快速开始

### 环境准备

```bash
# 安装依赖
cd src_buddha/web
pip install -r requirements.txt

# 启动API服务
python api_server.py

# 访问前台
open http://localhost:5000/index.html

# 访问后台
open http://localhost:5000/admin.html
```

### 初始化知识库

```bash
# 运行知识库初始化脚本
cd src_buddha
python scripts/init_knowledge_base.py

# 查看生成的数据
cat knowledge_data/buddha_knowledge_init.json
```

### 使用CCB/ECC

```bash
# 启动CCB交互式会话
ccb

# 使用特定代理
ccb --agent python-reviewer

# Web搜索
/web-search "AI 3D生成 最新技术"

# 记忆整理
/dream

# 学习模式
/teach-me 多智能体系统
```

---

## 📊 版本信息

| 组件 | 版本 |
|------|------|
| 项目版本 | 2.0.0 |
| Sprint完成 | Sprint 1-6 ✅ |
| 里程碑 | M1-M4 ✅ |
| 规则版本 | 2.0.0 |
| 更新日期 | 2026-05-06 |

---

## 📋 快速导航

| 文档 | 用途 | 路径 |
|------|------|------|
| **PROJECT_OVERVIEW.md** | 项目全貌 | `docs/PROJECT_OVERVIEW.md` |
| **ROADMAP.md** | 产品路线图 | `docs/ROADMAP.md` |
| **FILE_INDEX.md** | 文件索引 | `FILE_INDEX.md` |
| **project_rules.md** | 核心规则 | `.trae/rules/project_rules.md` |
| **LEARNING_MEMORY.md** | 学习记忆 | `.trae/rules/LEARNING_MEMORY.md` |
| **WORKFLOW_SKILL_MAPPING.md** | 工作流映射 | `.trae/rules/WORKFLOW_SKILL_MAPPING.md` |

---

## ✅ 已完成功能 (避免重复开发)

```
Sprint 1-6 已完成:
├── 知识库扩充 (100条) ✅
├── JWT认证系统 ✅
├── 向量搜索集成 ✅
├── 前后端API分离 ✅
├── 测试覆盖 (28个) ✅
├── 租户注册/登录 ✅
├── 数据隔离层 ✅
├── 配额管理 ✅
├── 配置管理统一 ✅
└── Redis缓存集成 ✅
```

---

*本文档整合了CCB、ECC和Trae Solo的核心能力，作为项目开发的核心规则参考*
