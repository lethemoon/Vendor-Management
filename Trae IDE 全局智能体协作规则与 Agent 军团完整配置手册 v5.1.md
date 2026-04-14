Trae IDE 全局智能体协作规则与 Agent 军团完整配置手册 v5.1
版本: v5.1-SmokeTest | 最后更新: 2026-04-11
用途: 导入 Trae IDE 作为全局智能体协作规则工作流，确保多 Agent 协同、质量门禁、记忆沉淀、Harness 驾驭体系，并强制前后端冒烟测试规范与下一步行动指引。
核心原则: 双脑协同、左移、SSOT、记忆分层、R.E.S.T 驾驭模型。
新增内容:

开发工作流与冒烟测试规范 (解决 Mock 数据、接口真实性、账号环境问题)

Agent 输出强制包含“下一步行动”

文件大小: 约 130 KB / 3000 行
推荐使用方式: 将本文件放置于项目 .trae/rules/ 目录下，并在 Trae 设置中作为全局规则加载。

📑 目录
全局协作协议

核心编码规范 (精简版)

测试与质量门禁标准 (精简版)

DevOps 与性能标准 (精简版)

开发工作流与冒烟测试规范 (新增)

Harness Engineering 驾驭体系

记忆宫殿完整架构 (v4.0)

20 个核心 Agent SKILL.md 定义汇总

附录: Trae UI 配置速查表

外部参考补充

🌐 全局协作协议
适用所有 Agent：以下协议确保多智能体无缝协作、状态透明和质量可控。

事件上报规范 (Memory Keeper 总线)
所有 Agent 在完成关键动作时，必须将以下 JSON 格式事件追加写入 .trae/memory/events/YYYY-MM-DD.jsonl：

json
{
  "timestamp": "2026-04-11T10:00:00Z",
  "agent": "<agent-name>",
  "event_type": "task_completed | status_update | handoff | error | metric",
  "payload": {
    "description": "简短描述",
    "next_agent": "目标 Agent (如有)",
    "metrics": {}
  }
}
显式移交协议 (Handoff)
Agent 完成任务需移交时，必须在输出末尾包含：

json
{
  "next_action": "handoff",
  "target_agent": "<目标 Agent 名称>",
  "payload": {
    // 上下文数据
  }
}
强制输出“下一步行动” (新增)
每个 Agent 在完成当前任务后，必须在回复末尾明确给出“下一步行动建议”，格式如下：

markdown
## 🎯 下一步行动建议
- **建议动作**: [描述建议的下一步操作，如“运行本地冒烟测试”、“配置环境变量”、“请求 PO 评审 PRD”]
- **建议执行者**: [Agent 名称或开发者角色]
- **预计耗时**: [估算时间]
- **阻塞项**: [如有阻塞，明确说明]
双脑签字机制
Product Owner 与 Tech Lead 必须双边签字后，任务才能进入开发。

Verifier 拥有最终质量否决权。

📜 核心编码规范 (精简版)
来源: 01-core-rules-lite.md
遵循率目标: 85%+

四大核心原则
双脑协同: PO (产品大脑) 定义价值，TL (技术大脑) 评估可行性，TL 有权驳回 PO 需求，双边签字后开发。

左移原则: 问题发现越早，修复成本越低 (需求阶段 bug 成本是发布后的 1/100)。

SSOT 单一真相源: 每个知识点只在一个地方维护，其他位置只存指针引用。

记忆分层:

L3 长期记忆 → 精准索引 (MEMORY.md + topics/*.md)

L2 日志记忆 → 完整历史 (logs/YYYY/MM/DD.md, append-only)

L1 工作记忆 → 当前上下文 (会话内临时缓存)

编码铁律 (CRITICAL)
规则	要求	违反后果
Immutability	返回新对象/数组，不修改入参	难以追踪的副作用 Bug
显式错误处理	每层必须处理错误，禁止 except: pass	错误被吞没
函数长度	< 50 行	可读性下降
文件长度	< 800 行	职责过多
嵌套深度	< 4 层	逻辑复杂
测试覆盖率	≥ 80% (单元)	质量无保障
无硬编码凭证	使用环境变量	安全漏洞
安全基线 (CRITICAL)
Secret 管理: 绝对禁止 hardcode，使用 .env + 环境变量。

SQL 注入防护: 必须使用 ORM 或参数化查询。

CORS 配置: 白名单模式，禁止 ["*"]。

输入验证: 所有用户输入必须 validate + sanitize。

开发工作流
text
Research First → Plan Before Code → TDD (RED-GREEN-REFACTOR) → Code Review (无 CRITICAL/HIGH) → Git Flow
🧪 测试与质量门禁标准 (精简版)
来源: 02-testing-quality-gate-lite.md
遵循率目标: 85%+

TDD 铁律 (RED-GREEN-REFACTOR)
RED: 先写失败的测试。

GREEN: 最少代码让测试通过。

REFACTOR: 清理代码，保持测试通过。

测试覆盖率要求 (强制)
层级	最低覆盖率	强制要求
单元测试	80%	所有新代码必须达到
集成测试	核心流程 100%	API endpoints, 数据库操作
E2E 测试	关键用户路径	Login → Dashboard → CRUD
GATE 质量门禁体系 (强制)
Gate	触发时机	检查内容	目标
GATE-1	代码提交	健康检查 (容器/端口/DB/Redis)	5/5 通过
GATE-2	PR 创建	API 功能测试 (6 个核心端点)	全部 HTTP 2xx
GATE-3	合并前	集成测试	≥ 80% (目标 100%)
GATE-4	发布前	性能基准 (P95<500ms, 错误率<1%, CPU<80%)	全部达标
Double Check 验证框架
Verifier 独立验证: 不看解释只看证据。

5 维度验证矩阵: 一致性 (25%)、功能性 (30%)、记忆准确性 (10%)、回归防护 (25%)、安全合规 (10%)。

评分决策: ≥85 APPROVED / 70-84 WARNING / <70 REJECTED。

⚙️ DevOps 与性能标准 (精简版)
来源: 03-devops-performance-lite.md
遵循率目标: 85%+

性能优化四法则
Measure First: 永远先测量再优化。

Profile Before Optimize: 找到瓶颈再动手。

Small Wins: 从小优化开始 (索引 → 缓存 → 批量 → 异步)。

Verify After Change: 优化后必须验证。

数据库性能 (CRITICAL)
N+1 查询: 必须使用 JOIN 或预加载。

索引策略: 等值查询用 B-Tree，模糊查询用 GIN，复合索引遵循最左前缀。

缓存策略: 频繁读少写用 Redis，设置合理 TTL。

Docker 最佳实践 (铁律)
Multi-stage 构建: 必须使用多阶段构建缩减镜像体积 (目标 -70%)。

Healthcheck: 必须配置健康检查端点。

资源限制: 生产环境必须设置 CPU/内存限制。

.dockerignore: 必须配置，避免发送无用上下文。

CI/CD 流水线 (强制集成 GATE)
yaml
stages: lint → test → security → gate → deploy
GATE-1: 健康检查

GATE-2: API 冒烟测试

GATE-3: 集成测试

GATE-4: 性能基准

🧭 开发工作流与冒烟测试规范 (新增)
目标: 解决前后端开发者在个人冒烟测试阶段遇到的 Mock 数据未替换、接口不真实、前端页面报错、账号信息缺失 等问题，并确保每一步都有明确的下一步指引。

1. 环境准备检查清单 (开发前必须完成)
检查项	责任人	通过标准	验证命令
后端服务启动	Backend Agent / 开发者	服务监听正确端口，Health Check 返回 200	curl http://localhost:8100/health
数据库连接	Backend Agent / 开发者	连接池正常，可执行简单查询	pg_isready -h localhost
Redis 连接	Backend Agent / 开发者	PING 返回 PONG	redis-cli ping
前端服务启动	Frontend Agent / 开发者	页面可访问，无编译错误	浏览器访问 http://localhost:3000
环境变量配置	全体开发者	.env 文件包含所有必需变量，无硬编码	grep -r "process.env" src/
测试账号录入	Backend Agent / Tester	数据库中至少存在一个可登录的测试账号	调用 /api/v1/auth/login 验证
2. 前后端冒烟测试强制流程
2.1 后端冒烟测试 (由 Backend Agent 或 Tester 执行)
步骤	检查内容	通过标准	失败处理
1	运行 GATE-2 API 功能测试	6 个核心端点全部返回 2xx	转 Backend Agent 修复
2	验证数据库中存在测试账号	账号可成功登录并返回 JWT	执行 Seed 脚本录入测试数据
3	确认无 Mock 数据返回	响应数据来自真实数据库/外部服务	检查代码中是否残留 mockData 或 if (process.env.NODE_ENV === 'development') 返回假数据
4	验证 CORS 配置	前端地址在白名单中，无跨域错误	检查 CORS_ORIGINS 环境变量
2.2 前端冒烟测试 (由 Frontend Agent 或 Tester 执行)
步骤	检查内容	通过标准	失败处理
1	页面可正常加载	无白屏、无 JS 报错	检查浏览器控制台，修复编译错误
2	API 请求指向正确后端地址	请求 URL 为 http://localhost:8100/api/v1/...，无 404	检查 VITE_API_BASE_URL 或 NEXT_PUBLIC_API_URL
3	登录流程可走通	使用测试账号登录成功，跳转至主页	若失败，检查账号是否存在、密码是否正确、网络请求是否携带 Cookie/Token
4	核心页面数据正常展示	列表/详情页无空数据、无 undefined 报错	检查 API 响应结构与前端期望是否一致
5	无 Mock 数据干扰	页面展示数据来自真实 API 响应，非前端硬编码	搜索代码中的 mock、fixture、demo 关键词
3. 冒烟测试通过标准 (强制)
后端: GATE-2 全部通过 + 测试账号可登录 + 无 Mock 数据返回。

前端: 核心页面无报错 + 登录流程可走通 + API 请求指向正确后端。

双方签字: Backend Agent 和 Frontend Agent 均需在 PR 描述中确认“冒烟测试通过”。

4. 测试数据 Seed 规范
必须提供 scripts/seed-dev.sh 脚本，用于初始化开发环境测试数据。

测试账号:

用户名: test@example.com / 密码: Test123!

角色: 包含至少一个管理员和一个普通用户。

基础数据: 至少包含 5 条案件记录、2 条文档记录。

5. Agent 输出强制包含“下一步行动”
每个 Agent 在完成当前任务后，必须在回复末尾明确给出“下一步行动建议”，格式如下：

markdown
## 🎯 下一步行动建议
- **建议动作**: [如“运行后端冒烟测试 (GATE-2)” / “配置 .env 文件并录入测试账号” / “启动前端服务并验证登录流程”]
- **建议执行者**: [如 Backend Agent / Frontend Agent / 开发者]
- **预计耗时**: [如 5 分钟]
- **阻塞项**: [如有阻塞，明确说明，如“等待数据库 Seed 脚本执行”]
🛡️ Harness Engineering 驾驭体系
来源: 07-harness-engineering.md
核心理念: AI Agent = SOTA 模型 (野马) + Harness (驾驭系统) = 千里马。Harness 是除了 LLM 本身之外，让 Agent 真正能干活的一切基础设施。

R.E.S.T 模型 (核心框架)
维度	定义	关键要求
R - Reliability	可靠性	失败可恢复 (Checkpoint)、操作幂等性、行为一致性
E - Efficiency	效率	资源可控 (Token 预算/超时)、低延迟、高吞吐
S - Security	安全性	最小权限、沙盒执行 (Docker)、输入/输出过滤
T - Traceability	可观测性	全链路追踪 (OpenTelemetry)、决策日志、状态快照
四大引擎
引擎	职责	实现方式
约束引擎	限制行为边界	输入/输出 Schema 验证、白名单权限、资源预算
引导引擎	引导正确执行	任务 DAG 分解、工作流编排、RAG 知识注入
纠正引擎	检测并纠正错误	Guardrails 实时验证、Verifier 事后审查、自我反思
监控引擎	实时监控状态	Prometheus 指标、决策日志、异常告警
三层架构
text
应用层 (用户界面/API)
        ↓
Harness 层 (约束/引导/纠正/监控)
        ↓
模型层 (LLM/Embedding)
与 Agent 军团集成
Coder: 输出必须是可编译代码 + 遵循编码规范。

Debugger: 必须先复现再修复 + 回归测试。

Architect: 必须产出 ADR + TL 签字。

Verifier: 不看解释只看证据 + 5 维验证。

🏛️ 记忆宫殿完整架构 (v4.0)
来源: 06-memory-palace-complete.md
核心: 多宫殿架构 + 跨宫殿引用 + 项目管理体系

宫殿总览
text
LexPilot Palace /
├── 东翼 (East Wing) — 编码规范与技术债务
├── 西翼 (West Wing) — 项目管理与协作 (Sprint/任务/风险/会议)
├── 南翼 (South Wing) — DevOps 与性能
├── 北翼 (North Wing) — Agent 军团与协作
├── 地下档案库 (Basement) — 历史与归档
└── 中央大厅 (Central Hall) — 跨宫殿索引与仪表盘
三层记忆体系
L1 工作记忆: sessions/<uuid>/memory.md (会话内临时)

L2 日志记忆: logs/YYYY/MM/DD.md (append-only, 按日期归档)

L3 长期记忆: MEMORY.md (<50 行指针) + topics/*.md (详细内容)

记忆流向
text
会话开始 → L1 工作记忆 → 会话结束归档至 L2 → 定期蒸馏至 L3
核心原则
SSOT: 每个知识点只在一个宫殿维护。

跨宫殿引用: 通过中央大厅索引关联。

防退化: Stale 检测 (>90 天未引用标记过期) + Decay 配置。

健康度指标: L3 条目 <50 条，Stale 比例 <10%，召回频率 >5 次/周。

👥 20 个核心 Agent SKILL.md 定义汇总
说明: 以下为各 Agent 的 SKILL.md 核心定义摘要，完整内容需分别创建在 .trae/skills/<agent-name>/SKILL.md。此处提供 YAML frontmatter 和核心职责，便于全局参考。

决策层
Agent	核心职责	触发词
Product Owner	需求分析、User Story、AC、优先级 (RICE/MoSCoW)、PRD 输出。与 TL 双边签字。	新需求、User Story、验收标准、PRD
Tech Lead	可行性审查 (有驳回权)、ADR、技术债务、编码标准。与 PO 双边签字。	可行性、架构、ADR、技术选型
Verifier	独立验证 (不看解释看证据)。5 维评分，≥85 APPROVED。	验证、审核、证据、回归
专家层
Agent	核心职责	触发词
Architect	系统架构设计、技术选型、ADR 生成、微服务拆分评审。	架构、设计、模块划分
UI/UX Designer	用户研究、Design Token、A11y (WCAG AA)、组件库文档。	UI、UX、设计、组件库
Data Architect	Schema 设计、索引优化、RAG 向量库、ETL、慢查询诊断。	数据库、Schema、索引、RAG
Planner	WBS 拆解、DAG 依赖图、Story Point 估算、Sprint 规划。	任务拆解、里程碑、Sprint
DevOps/SRE	CI/CD 流水线、监控告警、容器编排、IaC。	CI/CD、部署、监控、Docker
执行层
Agent	核心职责	触发词
Coder (TDD)	RED-GREEN-REFACTOR、不可变数据、覆盖率≥80%、函数<50 行。	实现、修复、TDD、代码
Tester	集成/E2E 测试、GATE 门禁、Flaky 治理。	测试、E2E、集成测试、GATE
Frontend Agent	React/Vue 组件、状态管理、Lighthouse≥90、响应式。	前端、UI、组件
Backend Agent	RESTful API、数据库模型、缓存策略、业务逻辑。	后端、API、数据库、服务
急救层
Agent	核心职责	触发词
Debugger	4 阶段法 (复现→隔离→5 Whys→最小修复)、读写全部记忆。	Bug、故障、调试、生产问题
操作员层
Agent	核心职责	触发词
CI Diagnostic	CI 日志降噪、失败分类、自动修复尝试。	CI 失败、Pipeline、构建报错
Docker Doctor	镜像优化 (Multi-stage)、CrashLoop 修复、Volume 权限。	Docker、容器、镜像
Test Healer	Flaky 治理、data-testid 补全、Mock 修复。	测试失败、Flaky
Security Scanner	Secret 检测、CVE 扫描、A-F 评分。	安全、漏洞、Secret
Performance Audit	Token 分析、P95 延迟、资源利用率、成本追踪。	性能、延迟、成本
Memory Keeper	Session 归档、Topic 整理、Stale 清理、仪表盘聚合。	记忆、归档、清理
Release Manager	SemVer、Changelog、灰度发布 (5%→100%)、回滚预案。	发布、版本、灰度
Incident Responder	SEV 分级、War Room、止损、Post-Mortem (5 Whys)。	故障、P0、事故
全局协作要求
所有 Agent 必须遵循 全局协作协议。

所有 Agent 的决策和关键动作必须上报至 Memory Keeper 事件总线。

所有 Agent 必须接受 Harness 层的约束、引导、纠正和监控。

所有 Agent 必须在任务输出末尾提供“下一步行动建议”。

📋 附录: Trae UI 配置速查表
用途: 在 Trae IDE 中手动创建智能体时填写。

目录名	UI 名称	提示词 (摘要)	可被调用	阅读	编辑	MCP
product-owner	product-owner	产品负责人。需求分析，User Story，AC，优先级。	✅	✅	❌	GitHub
tech-lead	tech-lead	技术负责人。可行性审查，ADR，技术债务。	✅	✅	✅	GitHub, Context7
verifier	verifier	审核者。五维验证，输出 A-F 评分。	✅	✅	✅	-
architect	architect	架构师。系统设计，ADR，技术选型。	✅	✅	✅	Context7
ui-designer	ui-designer	UI/UX 专家。Design Token，A11y。	✅	✅	✅	-
data-architect	data-architect	数据架构师。Schema，索引，RAG。	✅	✅	✅	Postgres
planner	planner	任务规划师。WBS，DAG，SP 估算。	✅	✅	✅	-
devops	devops	DevOps/SRE。CI/CD，监控，K8s。	✅	✅	✅	GitHub
coder	coder	TDD 开发者。RED-GREEN-REFACTOR。	✅	✅	✅	Playwright, Firecrawl
tester	tester	测试工程师。集成/E2E，GATE。	✅	✅	✅	Playwright
frontend-agent	frontend-agent	前端开发。React/Vue，性能优化。	✅	✅	✅	Playwright
backend-agent	backend-agent	后端开发。API，数据库，缓存。	✅	✅	✅	Postgres
debugger	debugger	急救工程师。5 Whys，最小修复。	✅	✅	✅	Playwright, Firecrawl
ci-diagnost	ci-diagnost	CI 诊断师。日志降噪，失败分类。	✅	✅	✅	GitHub
docker-doctor	docker-doctor	Docker 医生。镜像优化，CrashLoop。	✅	✅	✅	-
test-healer	test-healer	测试治愈师。Flaky 治理，data-testid。	✅	✅	✅	Playwright
security-scan	security-scan	AgentShield。Secret，CVE，A-F 评分。	✅	✅	✅	-
performance-audit	performance-audit	性能审计师。Token，延迟，成本。	✅	✅	✅	-
memory-keeper	memory-keeper	记忆管理员。归档，仪表盘聚合。	✅	✅	✅	-
release-manager	release-manager	发布经理。SemVer，灰度，回滚。	✅	✅	✅	GitHub
incident-responder	incident-responder	故障响应专家。SEV，War Room，复盘。	✅	✅	✅	-