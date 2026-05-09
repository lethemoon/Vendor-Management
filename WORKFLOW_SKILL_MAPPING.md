# 工作流与技能映射

> 版本：2.0.0  
> 更新日期：2026-05-06  
> 用途：将项目工作流与Trae Solo技能、ECC能力关联

---

## 🔄 核心工作流映射

### 1. 需求分析工作流

```
用户需求 → 需求分析 → 方案设计 → 实现计划 → 执行开发

技能映射：
├── brainstorming     # 需求研讨、创意探索
├── writing-plans     # 方案设计、计划编写
├── consulting-analysis # 行业分析、市场研究
└── executing-plans   # 计划执行、进度跟踪
```

### 2. 开发工作流

```
设计 → 编码 → 测试 → 审查 → 部署

技能映射：
├── test-driven-development  # 测试驱动开发
├── security-best-practices  # 安全审查
└── frontend-design          # 前端开发
```

### 3. 租户系统工作流 (新增)

```
租户注册 → 登录认证 → 上下文建立 → 数据隔离 → 配额检查

组件映射：
├── TenantService           # 租户管理
├── TenantUserService       # 用户管理
├── TenantContextMiddleware # 上下文中间件
├── DataIsolationLayer      # 数据隔离层
└── QuotaService            # 配额管理
```

### 4. 图片→3D→CAD工作流

```
图片生成 → 3D转换 → CAD出图 → 制造输出

Agent映射：
├── Intent Understanding Agent  → brainstorming
├── Knowledge Retrieval Agent   → data-analysis
├── Prompt Optimization Agent   → writing-plans
├── Quality Evaluation Agent    → test-driven-development
└── Feedback Learning Agent     → executing-plans
```

---

## 📋 场景化技能使用指南

### 场景1: 新功能规划

```yaml
场景: 规划新的知识库模块
步骤:
  1. 调用 brainstorming 技能
     - 探索需求
     - 收集想法
     - 确定方向
  
  2. 调用 writing-plans 技能
     - 编写详细计划
     - 分解任务
     - 设定里程碑
  
  3. 查看 PROJECT_OVERVIEW.md
     - 了解项目全貌
     - 避免重复开发
  
  4. 查看 FILE_INDEX.md
     - 检查已有功能
     - 确认文件位置
```

### 场景2: 租户系统开发 (新增)

```yaml
场景: 开发租户相关功能
步骤:
  1. 查看已有租户模型
     - domain/models/tenant.py
     - infrastructure/tenant_service.py
  
  2. 使用租户中间件
     - @require_tenant 装饰器
     - @require_active_tenant 装饰器
     - @require_quota 装饰器
  
  3. 数据隔离检查
     - DataIsolationLayer.check_access()
     - get_current_context()
  
  4. 配额管理
     - QuotaService.check_quota()
     - QuotaService.consume_quota()
```

### 场景3: 功能开发

```yaml
场景: 开发API接口
步骤:
  1. 调用 test-driven-development 技能
     - 编写测试用例
     - 实现功能代码
     - 运行测试验证
  
  2. 调用 security-best-practices 技能
     - 安全检查
     - 漏洞扫描
     - 修复建议
  
  3. 查看已有API
     - web/api/auth_api.py
     - web/api/search_api.py
     - web/api/tenant_api.py
```

---

## 🔗 已实现功能映射

### 认证与授权

| 功能 | 文件 | 技能/模式 |
|------|------|---------|
| JWT认证 | `infrastructure/auth_service.py` | security-best-practices |
| 认证中间件 | `infrastructure/auth_middleware.py` | decorator pattern |
| 用户API | `web/api/auth_api.py` | rest-api-design |

### 租户系统 (新增)

| 功能 | 文件 | 技能/模式 |
|------|------|---------|
| 租户服务 | `infrastructure/tenant_service.py` | multi-tenant pattern |
| 租户中间件 | `infrastructure/tenant_middleware.py` | middleware pattern |
| 数据隔离 | `infrastructure/tenant_middleware.py` | isolation pattern |
| 配额管理 | `infrastructure/tenant_service.py` | quota pattern |
| 租户API | `web/api/tenant_api.py` | rest-api-design |

### 向量搜索

| 功能 | 文件 | 技能/模式 |
|------|------|---------|
| 嵌入服务 | `infrastructure/embedding_service.py` | embedding pattern |
| 向量存储 | `infrastructure/vector_store_service.py` | repository pattern |
| 搜索API | `web/api/search_api.py` | rest-api-design |

### 配置与缓存 (新增)

| 功能 | 文件 | 技能/模式 |
|------|------|---------|
| 配置管理 | `infrastructure/config.py` | config pattern |
| 缓存服务 | `infrastructure/cache_service.py` | cache-aside pattern |

---

## 📊 技能效果评估

### 技能使用统计

| 技能 | 使用次数 | 效果评分 | 应用场景 |
|------|---------|---------|---------|
| brainstorming | 5+ | 4.5/5 | 需求研讨 |
| writing-plans | 10+ | 4.8/5 | 计划编写 |
| test-driven-development | 8+ | 4.2/5 | 功能开发 |
| data-analysis | 3+ | 4.0/5 | 数据分析 |
| consulting-analysis | 2+ | 4.6/5 | 行业报告 |

### Sprint 6 新增能力

| 能力 | 实现文件 | 效果 |
|------|---------|------|
| 租户注册/登录 | `web/api/tenant_api.py` | ✅ 测试通过 |
| 数据隔离 | `infrastructure/tenant_middleware.py` | ✅ 测试通过 |
| 配额管理 | `infrastructure/tenant_service.py` | ✅ 测试通过 |
| 配置管理 | `infrastructure/config.py` | ✅ 测试通过 |
| 缓存服务 | `infrastructure/cache_service.py` | ✅ 测试通过 |

---

## 🚀 最佳实践

### 开发前检查清单

```yaml
开发前必做:
  1. 查看 PROJECT_OVERVIEW.md
     - 了解项目全貌
     - 确认功能演进
  
  2. 查看 FILE_INDEX.md
     - 检查已有功能
     - 避免重复开发
  
  3. 查看 ROADMAP.md
     - 了解里程碑
     - 确认开发计划
  
  4. 查看 LEARNING_MEMORY.md
     - 了解已解决问题
     - 学习关键经验
```

### 代码提交前检查

```yaml
提交前必做:
  1. 运行测试
     - pytest tests/test_unit.py
     - pytest tests/test_integration.py
  
  2. 更新文档
     - FILE_INDEX.md
     - LEARNING_MEMORY.md
  
  3. 检查代码规范
     - 类型注解
     - 文档注释
```

---

## 📁 关键文件快速索引

| 文件 | 用途 | 查看场景 |
|------|------|---------|
| `docs/PROJECT_OVERVIEW.md` | 项目全貌 | 了解项目整体 |
| `docs/ROADMAP.md` | 产品路线图 | 规划后续开发 |
| `FILE_INDEX.md` | 文件索引 | 避免重复开发 |
| `.trae/rules/project_rules.md` | 核心规则 | 开发规范 |
| `.trae/rules/LEARNING_MEMORY.md` | 学习记忆 | 经验参考 |
| `.trae/rules/WORKFLOW_SKILL_MAPPING.md` | 工作流映射 | 技能使用 |

---

*本文档定义项目工作流与技能的映射关系，指导开发过程中的技能使用*
