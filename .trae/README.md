# Trae IDE 智能体军团配置

## 目录结构

```
.trae/
├── rules/                # 全局规则文件
├── skills/               # 智能体技能定义
│   ├── product-owner/    # 产品负责人
│   ├── tech-lead/        # 技术负责人
│   ├── verifier/         # 验证者
│   ├── architect/        # 架构师
│   ├── ui-designer/      # UI/UX 设计师
│   ├── data-architect/   # 数据架构师
│   ├── planner/          # 计划师
│   ├── devops/           # DevOps/SRE
│   ├── coder/            # TDD 开发者
│   ├── tester/           # 测试工程师
│   ├── frontend-agent/   # 前端开发
│   ├── backend-agent/    # 后端开发
│   ├── debugger/         # 调试工程师
│   ├── ci-diagnost/      # CI 诊断师
│   ├── docker-doctor/    # Docker 医生
│   ├── test-healer/      # 测试治愈师
│   ├── security-scan/    # 安全扫描器
│   ├── performance-audit/ # 性能审计师
│   ├── memory-keeper/    # 记忆管理员
│   ├── release-manager/  # 发布经理
│   └── incident-responder/ # 故障响应专家
└── memory/               # 记忆系统
    └── events/           # 事件总线
```

## 智能体分工

### 决策层
- **Product Owner**: 需求分析、User Story、AC、优先级 (RICE/MoSCoW)、PRD 输出
- **Tech Lead**: 可行性审查、ADR、技术债务、编码标准
- **Verifier**: 独立验证、5 维评分、质量否决权

### 专家层
- **Architect**: 系统架构设计、技术选型、ADR 生成、微服务拆分评审
- **UI/UX Designer**: 用户研究、Design Token、A11y (WCAG AA)、组件库文档
- **Data Architect**: Schema 设计、索引优化、RAG 向量库、ETL、慢查询诊断
- **Planner**: WBS 拆解、DAG 依赖图、Story Point 估算、Sprint 规划
- **DevOps/SRE**: CI/CD 流水线、监控告警、容器编排、IaC

### 执行层
- **Coder (TDD)**: RED-GREEN-REFACTOR、不可变数据、覆盖率≥80%、函数<50 行
- **Tester**: 集成/E2E 测试、GATE 门禁、Flaky 治理
- **Frontend Agent**: React/Vue 组件、状态管理、Lighthouse≥90、响应式
- **Backend Agent**: RESTful API、数据库模型、缓存策略、业务逻辑

### 急救层
- **Debugger**: 4 阶段法 (复现→隔离→5 Whys→最小修复)、读写全部记忆

### 操作员层
- **CI Diagnostic**: CI 日志降噪、失败分类、自动修复尝试
- **Docker Doctor**: 镜像优化 (Multi-stage)、CrashLoop 修复、Volume 权限
- **Test Healer**: Flaky 治理、data-testid 补全、Mock 修复
- **Security Scanner**: Secret 检测、CVE 扫描、A-F 评分
- **Performance Audit**: Token 分析、P95 延迟、资源利用率、成本追踪
- **Memory Keeper**: Session 归档、Topic 整理、Stale 清理、仪表盘聚合
- **Release Manager**: SemVer、Changelog、灰度发布 (5%→100%)、回滚预案
- **Incident Responder**: SEV 分级、War Room、止损、Post-Mortem (5 Whys)

## 核心规则

1. **双脑协同**: PO 定义价值，TL 评估可行性，双边签字后开发
2. **左移原则**: 问题发现越早，修复成本越低
3. **SSOT 单一真相源**: 每个知识点只在一个地方维护
4. **记忆分层**: L3 长期记忆、L2 日志记忆、L1 工作记忆
5. **强制输出“下一步行动”**: 每个 Agent 完成任务后必须提供下一步建议
6. **事件上报规范**: 所有关键动作必须上报至 Memory Keeper 事件总线
7. **质量门禁体系**: GATE-1 健康检查、GATE-2 API 测试、GATE-3 集成测试、GATE-4 性能基准

## 使用方法

1. 将全局规则文件放置于 `.trae/rules/` 目录下
2. 在 Trae 设置中加载全局规则
3. 根据项目需求调用相应的智能体
4. 确保每个智能体在完成任务后提供“下一步行动建议”
5. 遵循双脑签字机制和质量门禁体系

## 技能关联

每个智能体都关联了相应的 Solo Trae 技能，确保在实施开发中能自动使用对应的技能：

- **Product Owner**: brainstorming, writing-plans
- **Tech Lead**: brainstorming, writing-plans, security-best-practices
- **Verifier**: webapp-testing, test-driven-development
- **Architect**: brainstorming, writing-plans, vercel-composition-patterns
- **UI/UX Designer**: frontend-design, web-design-guidelines, brainstorming
- **Data Architect**: redis-development, brainstorming
- **Planner**: writing-plans, brainstorming
- **DevOps/SRE**: gh-cli, brainstorming
- **Coder (TDD)**: test-driven-development, brainstorming
- **Tester**: test-driven-development, webapp-testing
- **Frontend Agent**: frontend-design, frontend-skill, vercel-react-best-practices, shadcn
- **Backend Agent**: test-driven-development, redis-development, brainstorming
- **Debugger**: test-driven-development, webapp-testing
- **CI Diagnostic**: gh-cli
- **Docker Doctor**: brainstorming
- **Test Healer**: test-driven-development, webapp-testing
- **Security Scanner**: security-best-practices
- **Performance Audit**: vercel-react-best-practices
- **Memory Keeper**: brainstorming
- **Release Manager**: gh-cli, git-commit
- **Incident Responder**: brainstorming
