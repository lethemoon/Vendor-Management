# Trae Solo 默认系统配置

> 版本：2.0.0  
> 更新日期：2026-05-06  
> 用途：Trae Solo 自动加载的完整系统配置

---

## 📋 项目概述

**佛具CAD智能设计制造平台** - 从图片生成到3D设计再到CAD出图的完整工作流平台。

---

## 🚀 开发前必读

```
1. 了解项目全貌 → docs/PROJECT_OVERVIEW.md
2. 避免重复开发 → FILE_INDEX.md
3. 规划后续开发 → docs/ROADMAP.md
4. 学习项目经验 → .trae/rules/LEARNING_MEMORY.md
5. ECC能力参考 → .trae/rules/ECC_COMPLETE_CAPABILITIES.md
```

---

## ✅ 已完成功能 (Sprint 1-6)

| Sprint | 功能 | 状态 |
|--------|------|------|
| Sprint 1 | 知识库扩充 (100条) | ✅ |
| Sprint 2 | JWT认证系统 | ✅ |
| Sprint 3 | 向量搜索集成 | ✅ |
| Sprint 4 | 前后端API分离 | ✅ |
| Sprint 5 | 测试覆盖 (28个) | ✅ |
| Sprint 6 | 租户系统 | ✅ |

---

## 🔧 ECC 能力集成

### 专业代理 (38个)

#### 语言审查代理
| 代理 | 用途 | 使用场景 |
|------|------|---------|
| `python-reviewer` | Python代码审查 | 本项目主要使用 |
| `typescript-reviewer` | TypeScript代码审查 | 前端代码 |
| `go-reviewer` | Go代码审查 | 后端服务 |
| `rust-reviewer` | Rust代码审查 | 性能关键模块 |

#### 操作员代理
| 代理 | 用途 | 使用场景 |
|------|------|---------|
| `project-flow-ops` | 项目流程操作 | 项目管理 |
| `ecc-tools-cost-audit` | 成本审计 | API成本控制 |
| `workspace-surface-audit` | 工作区审计 | 代码质量 |

#### 通用代理
| 代理 | 用途 | 使用场景 |
|------|------|---------|
| `code-reviewer` | 通用代码审查 | 所有代码 |
| `security-scanner` | 安全扫描 | 安全检查 |
| `test-generator` | 测试生成 | 测试编写 |
| `api-designer` | API设计 | API开发 |

### 技能库 (156个)

#### 本项目常用技能
| 技能 | 用途 | 使用场景 |
|------|------|---------|
| `flask-patterns` | Flask模式 | 后端API开发 |
| `python-advanced` | Python高级特性 | 后端开发 |
| `rest-api-design` | REST API设计 | API设计 |
| `jwt-patterns` | JWT认证模式 | 认证系统 |
| `redis-patterns` | Redis模式 | 缓存系统 |
| `postgresql-advanced` | PostgreSQL高级特性 | 数据库 |
| `unit-testing` | 单元测试 | 测试开发 |
| `integration-testing` | 集成测试 | 测试开发 |
| `docker-patterns` | Docker模式 | 容器化 |
| `clean-architecture` | 清洁架构 | 架构设计 |

---

## 📁 关键文件索引

### 领域模型 (domain/models/)
- `agent.py` - 多智能体模型
- `auth.py` - 认证模型
- `tenant.py` - 租户模型
- `vector.py` - 向量模型
- `buddha_knowledge.py` - 知识库模型

### 基础设施 (infrastructure/)
- `tenant_service.py` - 租户服务
- `vector_store_service.py` - 向量搜索
- `config.py` - 配置管理
- `cache_service.py` - 缓存服务
- `auth_service.py` - JWT服务

### API端点 (web/api/)
- `auth_api.py` - `/api/v1/auth/*`
- `search_api.py` - `/api/v1/search/*`
- `tenant_api.py` - `/api/v1/tenant/*`

---

## 🔄 开发工作流

### 新功能开发流程

```
1. 查看 PROJECT_OVERVIEW.md → 了解项目全貌
2. 查看 FILE_INDEX.md → 检查已有功能
3. 查看 ROADMAP.md → 确认开发计划
4. 编写测试用例 → test-driven-development
5. 实现功能代码
6. 运行测试验证 → pytest tests/
7. 代码审查 → python-reviewer
8. 安全检查 → security-scanner
9. 更新文档 → FILE_INDEX.md, LEARNING_MEMORY.md
```

### ECC代理使用示例

```python
# 代码审查
使用 python-reviewer 代理审查Python代码

# 安全扫描
使用 security-scanner 代理检查安全漏洞

# 测试生成
使用 test-generator 代理生成测试用例

# API设计
使用 api-designer 代理设计RESTful API
```

---

## 🛠️ 技术栈

| 技术 | 用途 | ECC技能 |
|------|------|---------|
| Python 3.8+ | 后端开发 | `python-advanced` |
| Flask 2.0+ | API服务 | `flask-patterns` |
| FAISS | 向量搜索 | - |
| PyJWT 2.0+ | 认证 | `authentication-patterns` |
| Redis | 缓存 | `redis-patterns` |
| PostgreSQL | 数据库 | `postgresql-advanced` |
| Docker | 容器化 | `docker-patterns` |

---

## 📊 项目状态

| 指标 | 数值 |
|------|------|
| 版本 | 2.0.0 |
| Sprint完成 | 6/14 |
| 里程碑 | M1-M4 ✅ |
| 测试用例 | 28个 |
| 知识条目 | 100条 |
| API端点 | 15+ |

---

## 🎯 下一步计划

### Sprint 7: 知识库管理后台
- 知识条目CRUD API
- 知识管理页面
- 向量索引同步更新
- 批量导入/导出功能

---

## 🔗 快速链接

| 文档 | 路径 |
|------|------|
| 项目全貌 | `docs/PROJECT_OVERVIEW.md` |
| 产品路线图 | `docs/ROADMAP.md` |
| 文件索引 | `FILE_INDEX.md` |
| 核心规则 | `.trae/rules/project_rules.md` |
| ECC规则 | `.trae/rules/ecc_rules.md` |
| ECC能力清单 | `.trae/rules/ECC_COMPLETE_CAPABILITIES.md` |
| 学习记忆 | `.trae/rules/LEARNING_MEMORY.md` |
| 工作流映射 | `.trae/rules/WORKFLOW_SKILL_MAPPING.md` |

---

## 📝 代码规范

### Python代码
```python
# 使用类型注解
def process_data(data: Dict[str, Any]) -> Optional[Result]:
    """处理数据"""
    if not data:
        return None
    return Result(**data)

# 使用dataclass
@dataclass
class KnowledgeItem:
    id: str
    name: str
    category: str
```

### Git提交规范
```
feat: 新功能
fix: Bug修复
docs: 文档更新
refactor: 代码重构
test: 测试相关
```

---

## 🔧 常用命令

### 启动服务
```bash
cd /workspace/src_buddha
python web/api_server.py
```

### 运行测试
```bash
python -m pytest tests/ -v
python -m pytest tests/test_unit.py -v
python -m pytest tests/test_integration.py -v
```

### API测试
```bash
# 租户注册
curl -X POST http://localhost:5000/api/v1/tenant/register \
  -H "Content-Type: application/json" \
  -d '{"name":"测试公司","slug":"test","email":"admin@test.com","password":"test123456"}'

# 知识搜索
curl -X POST http://localhost:5000/api/v1/search \
  -H "Content-Type: application/json" \
  -d '{"query":"释迦牟尼佛","top_k":5}'
```

---

## 📋 ECC 集成配置

### 推荐代理
- **代码审查**: `python-reviewer`, `code-reviewer`
- **安全检查**: `security-scanner`
- **测试生成**: `test-generator`
- **API设计**: `api-designer`
- **项目管理**: `project-flow-ops`

### 推荐技能
- **后端开发**: `flask-patterns`, `python-advanced`, `rest-api-design`
- **数据库**: `postgresql-advanced`, `redis-patterns`
- **测试**: `unit-testing`, `integration-testing`
- **架构**: `clean-architecture`, `domain-driven-design`
- **安全**: `authentication-patterns`, `owasp-top-10`

---

*此配置文件由Trae Solo自动加载，整合了项目规则和ECC能力*
