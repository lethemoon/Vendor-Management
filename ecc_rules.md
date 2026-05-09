# Everything Claude Code (ECC) 专用规则

## 概述

ECC (Everything Claude Code) 是一个 AI 代理工具性能优化系统，提供完整的技能、直觉、记忆、安全和研究优先开发能力。

---

## ECC 核心理念

### 不仅仅是配置
ECC 是一个完整的系统，包含：
- 技能 (Skills)
- 直觉 (Instincts)
- 记忆优化 (Memory Optimization)
- 持续学习 (Continuous Learning)
- 安全扫描 (Security Scanning)
- 研究优先开发 (Research-First Development)

### 跨平台兼容
支持多个 AI 代理工具：
- Claude Code
- Codex
- Cursor
- OpenCode
- Gemini
- 其他 AI 代理工具

---

## ECC 性能优化系统

### 1. Token 优化
- 模型选择策略
- 系统提示精简
- 后台进程管理
- Token 使用监控

### 2. 内存持久化
- 会话间自动保存/加载上下文的钩子
- 状态存储 (SQLite)
- 会话适配器
- 记忆演进基础

### 3. 持续学习
- 从会话中自动提取模式
- 转换为可重用技能
- 技能演进机制
- 跨主题学习者档案

### 4. 验证循环
- Checkpoint vs 持续评估
- 评分器类型
- pass@k 指标
- 质量门控制

### 5. 并行化
- Git worktrees
- 级联方法
- 实例扩展时机
- 多代理协调

### 6. 子代理编排
- 上下文问题解决方案
- 迭代检索模式
- 代理路由
- 任务分解

---

## ECC v1.10.0 新特性

### 操作员工作流 (Operator Workflows)
- `brand-voice` - 品牌声音管理
- `social-graph-ranker` - 社交图排名
- `connections-optimizer` - 连接优化器
- `customer-billing-ops` - 客户账单操作
- `ecc-tools-cost-audit` - ECC 工具成本审计
- `google-workspace-ops` - Google Workspace 操作
- `project-flow-ops` - 项目流程操作
- `workspace-surface-audit` - 工作区表面审计

### 媒体和发布工具
- `manim-video` - Manim 视频生成
- `remotion-video-creation` - Remotion 视频创建
- 升级的社交发布界面

### 框架和产品扩展
- `nestjs-patterns` - NestJS 模式
- 更丰富的 Codex/OpenCode 安装界面
- 跨工具包扩展

### ECC 2.0 Alpha (Rust 控制平面)
Rust 编写的控制平面原型，支持：
- `ecc2 dashboard` - 仪表板
- `ecc2 start` - 启动
- `ecc2 sessions` - 会话列表
- `ecc2 status` - 状态
- `ecc2 stop` - 停止
- `ecc2 resume` - 恢复
- `ecc2 daemon` - 守护进程模式

---

## 生态系统强化

### AgentShield
- 代理保护系统
- 安全扫描
- 权限管理
- 沙箱隔离

### ECC Tools 成本控制
- 成本审计
- 预算管理
- 使用量追踪
- 成本优化建议

### 账单门户
- 计费管理
- 用量报告
- 成本分析
- 支付处理

---

## 选择性安装架构

### Manifest 驱动的安装流程
- `install-plan.js` - 安装计划
- `install-apply.js` - 应用安装
- 目标组件安装
- 增量更新支持

### 状态存储
- SQLite 状态存储
- 查询 CLI
- 已安装内容跟踪
- 依赖管理

---

## 专业代理库 (38 个代理)

> **完整清单**：详见 [ECC_COMPLETE_CAPABILITIES.md](ECC_COMPLETE_CAPABILITIES.md)

### 语言审查代理
- `typescript-reviewer` - TypeScript 代码审查
- `java-reviewer` - Java 代码审查
- `kotlin-reviewer` - Kotlin 代码审查
- `python-reviewer` - Python 代码审查
- `go-reviewer` - Go 代码审查
- `php-reviewer` - PHP 代码审查
- `perl-reviewer` - Perl 代码审查
- `cpp-reviewer` - C++ 代码审查
- `rust-reviewer` - Rust 代码审查

### 构建解析代理
- `pytorch-build-resolver` - PyTorch 构建解析
- `java-build-resolver` - Java 构建解析
- `kotlin-build-resolver` - Kotlin 构建解析
- `typescript-build-resolver` - TypeScript 构建解析
- `python-build-resolver` - Python 构建解析
- `go-build-resolver` - Go 构建解析

### 操作员代理 (v1.10.0 新增)
- `brand-voice` - 品牌声音
- `social-graph-ranker` - 社交图排名
- `connections-optimizer` - 连接优化器
- `customer-billing-ops` - 客户账单操作
- `ecc-tools-cost-audit` - ECC 工具成本审计
- `google-workspace-ops` - Google Workspace 操作
- `project-flow-ops` - 项目流程操作
- `workspace-surface-audit` - 工作区表面审计

### 其他专业代理（15 个）
- `code-reviewer` - 通用代码审查
- `security-scanner` - 安全扫描
- `performance-optimizer` - 性能优化
- `architecture-analyzer` - 架构分析
- `test-generator` - 测试生成
- `documentation-writer` - 文档编写
- `api-designer` - API 设计
- `database-optimizer` - 数据库优化
- `devops-automation` - DevOps 自动化
- `cloud-architect` - 云架构设计
- `ml-engineer` - 机器学习工程
- `data-scientist` - 数据科学
- `frontend-specialist` - 前端专家
- `backend-specialist` - 后端专家
- `fullstack-developer` - 全栈开发

---

## 技能库 (156 个技能)

> **完整清单**：详见 [ECC_COMPLETE_CAPABILITIES.md](ECC_COMPLETE_CAPABILITIES.md)

### 深度学习工作流
- `pytorch-patterns` - PyTorch 模式
- `tensorflow-patterns` - TensorFlow 模式
- `jax-patterns` - JAX 模式

### API 参考研究
- `documentation-lookup` - 文档查找
- `api-reference` - API 参考
- `specification-research` - 规范研究

### 现代 JS 工具链
- `bun-runtime` - Bun 运行时
- `nextjs-turbopack` - Next.js Turbopack
- `vite-patterns` - Vite 模式
- `esbuild-patterns` - esbuild 模式
- `rollup-patterns` - Rollup 模式

### 操作领域技能
- 8 个操作领域技能
- 项目管理技能
- 团队协作技能
- DevOps 技能

### MCP 服务器模式
- `mcp-server-patterns` - MCP 服务器模式
- `mcp-client-patterns` - MCP 客户端模式
- `mcp-integration` - MCP 集成

### 框架模式
- `nestjs-patterns` - NestJS 模式
- `express-patterns` - Express 模式
- `fastify-patterns` - Fastify 模式
- `django-patterns` - Django 模式
- `flask-patterns` - Flask 模式
- `spring-patterns` - Spring 模式

### 媒体和发布工具
- `manim-video` - Manim 视频
- `remotion-video-creation` - Remotion 视频创建
- `social-publishing` - 社交发布
- `content-creation` - 内容创作

### 其他技能（120+ 个）
包括：
- 编程语言技能（20 个）
- 前端开发技能（15 个）
- 后端开发技能（15 个）
- 数据库技能（10 个）
- DevOps 技能（15 个）
- 云平台技能（10 个）
- 测试技能（10 个）
- 安全技能（10 个）
- AI/ML 技能（10 个）
- 数据科学技能（10 个）
- 其他技能（20+ 个）

**详见**：[ECC_COMPLETE_CAPABILITIES.md](ECC_COMPLETE_CAPABILITIES.md)

---

## 会话和状态基础设施

### SQLite 状态存储
- 查询 CLI
- 会话记录
- 技能存储
- 配置管理

### 会话适配器
- 结构化记录
- 会话导入/导出
- 会话分支
- 会话压缩

### 技能演进基础
- 自我改进技能
- 技能版本管理
- 技能依赖
- 技能组合

---

## 编排和可靠性

### 编排审计评分
- 确定性评分
- 质量指标
- 性能监控
- 健康检查

### 观察者循环防护
- 5 层防护
- 循环检测
- 资源限制
- 超时控制

### 钩子可靠性
- SessionStart root fallback
- Stop-phase 会话摘要
- 脚本钩子替代脆弱的内联单行

### 钩子运行时控制
```bash
ECC_HOOK_PROFILE=minimal|standard|strict
ECC_DISABLED_HOOKS=hook1,hook2
```

---

## NanoClaw v2

### 功能
- 模型路由
- 技能热加载
- 会话分支
- 会话搜索
- 会话导出
- 会话压缩
- 会话指标

---

## 跨工具兼容性

### 支持的工具
- Claude Code
- Cursor
- OpenCode
- Codex
- Gemini
- 其他 AI 代理工具

### 行为一致性
-  tightened across harnesses
- 统一的配置格式
- 共享的技能库
- 兼容的代理系统

---

## 测试和验证

### 内部测试
- 997 个内部测试通过
- 完整套件 green
- 钩子/运行时重构
- 兼容性更新

### CI 强化
- 19 个测试失败修复
- 目录计数强制执行
- 安装清单验证
- 完整测试套件

---

## 语言生态系统 (12+)

### 支持的语言
- TypeScript
- Python
- Go
- Java
- PHP
- Perl
- Kotlin/Android/KMP
- C++
- Rust
- 更多...

### 语言特定规则
- 每种语言的专用规则
- 语言特定的代理
- 语言特定的技能
- 语言特定的最佳实践

---

## 社区贡献

### 翻译
- Korean
- Chinese
- 更多语言...

### 功能贡献
- Biome 钩子优化
- 视频处理技能
- 操作技能
- PowerShell 安装器
- Antigravity IDE 支持

---

## 在 Trae 中使用 ECC

### 推荐工作流
1. 在 Trae 中处理常规任务
2. 需要专业能力时调用 ECC 代理
3. 使用 ECC 技能库扩展能力
4. 利用 ECC 性能优化系统提升效率

### 代理使用场景
- 代码审查 → 使用 `*-reviewer` 代理
- 构建问题 → 使用 `*-build-resolver` 代理
- 成本审计 → 使用 `ecc-tools-cost-audit` 代理
- Google Workspace → 使用 `google-workspace-ops` 代理
- 项目流程 → 使用 `project-flow-ops` 代理

### 性能优化场景
- 大型项目 → 使用并行化和子代理编排
- 成本敏感 → 使用 Token 优化和成本控制
- 长期项目 → 使用内存持久化和持续学习
- 质量要求高 → 使用验证循环和质量门

---

## ECC 命令

### Harness 命令
```
/harness-audit          # 工具审计
/loop-start             # 循环开始
/loop-status            # 循环状态
/quality-gate           # 质量门
/model-route            # 模型路由
```

---

## 配置和安装

### 配置目录
```
~/.config/ecc/
```

### 配置文件
- 代理配置
- 技能配置
- MCP 配置
- 状态存储 (SQLite)
- 学习记录

---

## 相关资源

- GitHub：https://github.com/affaan-m/everything-claude-code
- 140K+ stars
- 21K+ forks
- 170+ contributors
- 12+ 语言生态系统
- Anthropic Hackathon Winner

---

## 版本信息

- ECC 版本：1.10.0
- 规则版本：1.0.0
- 最后更新：2026-04-08
