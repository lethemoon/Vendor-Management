# 项目学习与记忆归档

> 版本：2.0.0  
> 更新日期：2026-05-06  
> 用途：记录项目开发过程中的关键学习和经验总结

---

## 📚 项目历程

### Phase 1: 架构重构 (已完成 ✅)

#### 学习要点

1. **双模型架构**
   - 领域模型：核心业务实体，不依赖任何框架
   - 视图模型：API响应格式，可灵活调整
   - 分离原则：领域模型纯净，视图模型适配

2. **清洁架构**
   - 领域层：核心业务逻辑
   - 应用层：用例编排
   - 基础设施层：技术实现
   - 依赖方向：外层依赖内层

3. **领域驱动设计**
   - 聚合根：BuddhaModel、Tenant
   - 值对象：Dimension、ViewDefinition
   - 领域服务：ContourExtractor、DimensionCalculator

---

### Phase 2: 核心功能开发 (已完成 ✅)

#### Sprint 1-2: Blender集成 + DXF导出

**学习要点**：
- Blender Python API使用
- GLB模型渲染流程
- ezdxf库使用
- DXF文件结构

#### Sprint 3: 向量搜索集成 ✅

**学习要点**：
- FAISS/Milvus向量数据库
- 384维向量嵌入
- 语义相似度搜索
- 分类过滤功能

**关键代码**：
```python
# 向量搜索服务
class VectorSearchService:
    def search(self, request: SearchRequest) -> SearchResponse:
        query_embedding = self._embedding_service.embed_single(request.query)
        results = self._backend.search(query_vector=query_embedding, top_k=request.top_k)
        return SearchResponse(query=request.query, results=results, ...)
```

#### Sprint 4: 前后端API分离 ✅

**学习要点**：
- RESTful API设计
- OpenAPI文档规范
- 前端SDK封装
- API网关配置

#### Sprint 5: 测试与优化 ✅

**学习要点**：
- pytest单元测试
- 集成测试设计
- 测试覆盖率统计

**测试统计**：
- 单元测试: 17个 ✅
- 集成测试: 11个 ✅
- 总通过率: 100%

#### Sprint 6: 租户系统 ✅

**学习要点**：
- 多租户数据隔离
- 租户上下文中间件
- 配额管理模型
- 统一配置管理
- Redis缓存集成

**关键代码**：
```python
# 租户上下文中间件
class TenantContextMiddleware:
    def before_request(self):
        tenant_id = self.extract_tenant_id()
        tenant = self.tenant_service.get_tenant(tenant_id)
        context = TenantContext(tenant_id=tenant_id, tenant=tenant, ...)
        set_current_context(context)

# 数据隔离层
class DataIsolationLayer:
    def check_access(self, resource_tenant_id: str) -> bool:
        context = get_current_context()
        return context.is_admin or context.tenant_id == resource_tenant_id
```

---

### Phase 3: 知识库建设 (已完成 ✅)

#### 知识库设计

**分类体系**：
```
佛具知识库 (100条)
├── 佛像类 (20条)
├── 菩萨类 (15条)
├── 罗汉类 (10条)
├── 护法类 (10条)
├── 法器类 (25条)
└── 供具类 (20条)
```

**数据模型**：
```python
@dataclass
class BuddhaKnowledge:
    knowledge_id: str
    name: str
    category: BuddhaCategory
    style_variants: List[Dict]
    material_types: List[str]
    dimensions: Dict
    tags: List[str]
```

---

### Phase 4: 多智能体系统 (已完成 ✅)

#### Agent架构

```
Agent分层：
├── 协调层：Orchestrator Agent ✅
├── 核心层：
│   ├── Intent Understanding Agent ✅
│   ├── Knowledge Retrieval Agent ✅ (已集成向量搜索)
│   ├── Prompt Optimization Agent ✅
│   └── Quality Evaluation Agent ✅
└── 支撑层：
    ├── 向量检索Agent ✅
    └── 反馈学习Agent ✅
```

---

## 🔧 技术栈学习

### 已掌握技术

| 技术 | 熟练度 | 应用场景 | 文件位置 |
|------|--------|---------|---------|
| Python | 高 | 后端开发、脚本 | 全项目 |
| Flask | 高 | API服务 | `web/api_server.py` |
| FAISS | 高 | 向量检索 | `infrastructure/vector_store_service.py` |
| JWT | 高 | 用户认证 | `infrastructure/auth_service.py` |
| dataclass | 高 | 数据建模 | `domain/models/` |
| asyncio | 中 | 异步处理 | `domain/models/agent.py` |
| Redis | 中 | 缓存系统 | `infrastructure/cache_service.py` |

### 新增技术能力 (Sprint 6)

| 技术 | 熟练度 | 应用场景 | 文件位置 |
|------|--------|---------|---------|
| 多租户架构 | 高 | 租户数据隔离 | `infrastructure/tenant_service.py` |
| 配置管理 | 高 | 统一配置 | `infrastructure/config.py` |
| 缓存服务 | 高 | Redis缓存 | `infrastructure/cache_service.py` |

---

## 📖 规则与规范

### 已实现功能清单

```
已完成功能 (避免重复开发):
├── 领域模型定义 ✅
├── JWT认证系统 ✅
├── 向量搜索服务 ✅
├── 嵌入服务 ✅
├── 认证API ✅
├── 搜索API ✅
├── API文档 ✅
├── 前端API客户端 ✅
├── 租户服务 ✅
├── 租户中间件 ✅
├── 数据隔离层 ✅
├── 配额管理 ✅
├── 配置管理 ✅
└── 缓存服务 ✅
```

---

## 🐛 问题与解决

### Sprint 6 解决的问题

| 问题 | 原因 | 解决方案 |
|------|------|---------|
| 装饰器命名冲突 | Flask使用函数名作为endpoint | 使用UUID生成唯一函数名 |
| 角色枚举处理 | str和Enum混用 | 统一处理 `.value` 属性 |
| 租户状态检查 | 枚举比较方式 | 统一转换为字符串比较 |

---

## 📊 项目指标

### 代码统计

| 指标 | 数值 |
|------|------|
| Python文件 | 25+ |
| 代码行数 | 5000+ |
| 测试用例 | 28个 |
| 文档页数 | 15+ |

### 功能完成度

| 模块 | 完成度 |
|------|--------|
| 领域模型 | 100% |
| 基础设施 | 95% |
| Web界面 | 80% |
| 知识库 | 100% (100条) |
| Agent系统 | 80% |
| 租户系统 | 100% |

---

## 🎯 下一步计划

### Sprint 7: 知识库管理后台

1. 知识条目CRUD API
2. 知识管理页面
3. 向量索引同步更新
4. 批量导入/导出功能

### 中期目标

1. 图片生成能力集成
2. 3D转换能力开发
3. CAD出图功能完善

---

## 📁 关键文件索引

| 文件 | 用途 | 状态 |
|------|------|------|
| `docs/PROJECT_OVERVIEW.md` | 项目全貌 | ✅ 已更新 |
| `docs/ROADMAP.md` | 产品路线图 | ✅ 已更新 |
| `FILE_INDEX.md` | 文件索引 | ✅ 已更新 |
| `infrastructure/tenant_service.py` | 租户服务 | ✅ 新增 |
| `infrastructure/tenant_middleware.py` | 租户中间件 | ✅ 新增 |
| `infrastructure/config.py` | 配置管理 | ✅ 新增 |
| `infrastructure/cache_service.py` | 缓存服务 | ✅ 新增 |
| `web/api/tenant_api.py` | 租户API | ✅ 新增 |

---

*本文档记录项目开发过程中的关键学习和经验，供后续参考*
