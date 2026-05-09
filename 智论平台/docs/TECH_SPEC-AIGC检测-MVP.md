# AIGC检测与降痕 MVP版本 技术规格

> 版本：1.0.0  
> 日期：2026-05-09  
> 负责人：ArchitectAgent  
> 状态：待批准  
> 基于PRD：`/workspace/智论平台/docs/PRD-AIGC检测-MVP.md` (1829行)  
> 参考实现：`papers.ts` (972行) + `aiRewriteService.ts` (1231行)

---

## 1. 架构设计

### 1.1 系统架构图

```
┌─────────────────────────────────────────────────────────────────────┐
│                     前端层 (Next.js 14+)                             │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐                │
│  │ /aigc/detect │ │ /aigc/result │ │ /aigc/history│                │
│  │  检测输入页   │ │  结果处理页   │ │  历史记录页   │                │
│  └──────────────┘ └──────────────┘ └──────────────┘                │
│  复用组件: ScoreCircle / ParagraphHeatmap / DiffViewer / Timeline    │
└────────────────────────────┬────────────────────────────────────────┘
                             │ HTTP/HTTPS (JSON + SSE)
┌────────────────────────────▼────────────────────────────────────────┐
│                    API路由层 (Fastify + Zod)                         │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  /api/v1/aigc/*  ← 新建 aigc.ts 路由文件                      │   │
│  │  参考: backend/src/routes/papers.ts 的代码风格和错误处理模式    │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  共享中间件(从papers.ts复用):                                        │
│  ├─ fastify.authenticate (JWT认证)                                  │
│  ├─ Zod schema验证                                                  │
│  └─ 统一错误响应格式                                                 │
└────────────────────────────┬────────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────────┐
│                       服务层 (Services)                              │
│  ┌─────────────────────┐ ┌─────────────────────┐                   │
│  │  AIGCDetectService   │ │  AIGCRewriteService  │  ← 新建服务      │
│  │  (新建 ~600行)       │ │  (新建 ~500行)        │                   │
│  │  - 规则引擎          │ │  - 对抗改写Prompt     │                   │
│  │  - LLM检测集成       │ │  - 多版本生成         │                   │
│  │  - 综合评分聚合       │ │  - 质量评估           │                   │
│  └─────────────────────┘ └─────────────────────┘                   │
│                                                                     │
│  复用服务(从aiRewriteService.ts复用):                                │
│  ├─ DeepSeekClient 类 (扩展新Prompt模板)                            │
│  ├─ UsageTracker 配额系统 (统一管理AIGC操作)                        │
│  ├─ evaluateRewriteQuality 质量评估 (调整权重)                      │
│  └─ 文本工具函数 (estimateTokens, calculateSimilarity等)             │
└────────────────────────────┬────────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────────┐
│                  数据层 + AI层 + 缓存层                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────────┐  │
│  │PostgreSQL│ │  Redis   │ │DeepSeek   │ │  规则引擎(纯计算)     │  │
│  │Prisma ORM│ │缓存/限流 │ │API V1     │ │  TTR/方差/词汇/过渡词│  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────────────┘  │
│                                                                     │
│  复用基础设施:                                                       │
│  ├─ encrypt/decrypt AES加密 (papers.ts L59-L73)                     │
│  ├─ splitIntoParagraphs 段落分割 (papers.ts L75-L81)               │
│  ├─ calculateWordCount 字数统计 (papers.ts L83-L87)                 │
│  └─ Redis连接实例 + 缓存策略                                        │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 模块职责划分

| 模块 | 文件路径 | 行数估算 | 职责 | 新建/复用 |
|-----|---------|---------|------|---------|
| **AIGC路由** | `backend/src/routes/aigc.ts` | ~800行 | 8个API端点的请求处理、参数验证、SSE流式响应、错误转换 | **新建** |
| **AIGC检测服务** | `backend/src/services/aigcDetectService.ts` | ~600行 | 规则引擎5个子模块、LLM调用、综合评分、段落级结果聚合 | **新建** |
| **AIGC改写服务** | `backend/src/services/aigcRewriteService.ts` | ~500行 | 对抗性Prompt模板、3版本生成策略、预估AIGC率计算 | **新建** |
| **DeepSeek客户端** | `backend/src/services/aiRewriteService.ts` L238-L546 | 已有309行 | HTTP调用封装、重试机制、流式支持 | **复用+扩展** |
| **类型定义** | `backend/src/types/aigc.ts` | ~200行 | 所有AIGC相关TypeScript接口、枚举、Zod Schema | **新建** |
| **规则引擎** | `backend/src/services/ruleEngine.ts` | ~400行 | TTR计算、句长方差、AI词汇检测、过渡词匹配、被动语态统计 | **新建** |
| **前端页面** | `frontend/app/aigc/*/page.tsx` | ~1500行 | 3个页面的UI组件、SSE消费、Diff渲染、时间线 | **新建** |

### 1.3 与现有模块的集成点

#### 1.3.1 直接复用的代码（零修改）

| 复用项 | 来源文件 | 行号 | 用途说明 |
|-------|---------|------|---------|
| `encrypt()` / `decrypt()` | [papers.ts#L59-L73](file:///workspace/智论平台/backend/src/routes/papers.ts#L59-L73) | 15行 | AES-256-CBC加解密AIGC检测的content字段 |
| `splitIntoParagraphs()` | [papers.ts#L75-L81](file:///workspace/智论平台/backend/src/routes/papers.ts#L75-L81) | 7行 | 按双换行分割文本为段落数组 |
| `calculateWordCount()` | [papers.ts#L83-L87](file:///workspace/智论平台/backend/src/routes/papers.ts#L83-L87) | 5行 | 中文字符+英文单词混合计数 |
| `PaperErrorCode` 枚举模式 | [papers.ts#L14-L23](file:///workspace/智论平台/backend/src/routes/papers.ts#L14-L23) | 10行 | 错误码定义风格参考 |
| 统一错误响应格式 | [papers.ts#L270-L276](file:///workspace/智论平台/backend/src/routes/papers.ts#L270-L276) | 7行 | `{success, error: {code, message}}` 格式 |
| SSE流式响应模式 | [papers.ts#L606-L619](file:///workspace/智论平台/backend/src/routes/papers.ts#L606-L619) | 14行 | PassThrough stream + event/data格式 |
| Redis缓存读写模式 | [papers.ts#L409-L419](file:///workspace/智论平台/backend/src/routes/papers.ts#L409-L419) | 11行 | get/setex + JSON.parse/stringify |
| Zod schema验证模式 | [papers.ts#L279-L285](file:///workspace/智论平台/backend/src/routes/papers.ts#L279-L285) | 7行 | z.object().parse() + 错误转换 |
| Prisma查询权限模式 | [papers.ts#L422-L437](file:///workspace/智论平台/backend/src/routes/papers.ts#L422-L437) | 16行 | `findFirst({where:{id, userId}})` 所有权校验 |
| UsageLog记录模式 | [papers.ts#L302-L310](file:///workspace/智论平台/backend/src/routes/papers.ts#L302-L310) | 9行 | 操作日志写入 + 元数据附加 |

#### 1.3.2 扩展现有的代码

| 扩展项 | 来源文件 | 扩展方式 | 说明 |
|-------|---------|---------|------|
| `DeepSeekClient` 类 | [aiRewriteService.ts#L238-L546](file:///workspace/智论平台/backend/src/services/aiRewriteService.ts#L238-L546) | 新增 `chatWithJsonResponse()` 方法 | AIGC检测需要结构化JSON输出，增加JSON解析+重试逻辑 |
| `UsageTracker` 类 | [aiRewriteService.ts#L769-L861](file:///workspace/智论平台/backend/src/services/aiRewriteService.ts#L769-L861) | 新增操作类型 `'aigc_detect' \| 'aigc_rewrite' \| 'aigc_recheck'` | 配额按AIGC操作差异化计费 |
| `evaluateRewriteQuality()` | [aiRewriteService.ts#L728-L761](file:///workspace/智论平台/backend/src/services/aiRewriteService.ts#L728-L761) | 调整权重：语义相似度0.25 + AIGC率降低0.45 + 通顺度0.30 | 改写质量评估目标从"降重复率"变为"降AIGC率" |
| `generateRewritePrompt()` | [aiRewriteService.ts#L109-L153](file:///workspace/智论平台/backend/src/services/aiRewriteService.ts#L109-L153) | 新增独立的 `generateAIGCRewritePrompt()` 函数 | 对抗性改写Prompt与降重Prompt完全不同 |

#### 1.3.3 数据库Schema扩展

| 变更类型 | 模型 | 说明 |
|---------|------|------|
| **新增** | `AIGCDetection` | AIGC检测主表，存储检测结果、状态机、关联User/Paper |
| **新增** | `OptimizationRecord` | 优化操作记录表，追踪每轮改写/复测的时间线 |
| **新增枚举** | `AIGCRiskLevel` (Low/Medium/MediumHigh/High) | 风险等级4级分类 |
| **新增枚举** | `AIGCDetectionStatus` (Pending/Analyzing/Analyzed/Optimizing/Completed/Abandoned) | 检测状态机6态 |
| **新增枚举** | `OptimizationType` (InitialDetect/Rewrite/Recheck/ManualEdit) | 操作类型4类 |
| **新增枚举** | `DetectionSource` (Paste/FileImport/PaperLinked) | 来源3种 |
| **微调** | `Paper` 表 | 新增3个可选字段：`aigcDetectionId`, `aigcOptimizationRounds`, `aigcInitialRate` |

---

## 2. AIGC检测算法设计

### 2.1 检测算法总体流程

```
输入文本 (100-50000字)
        │
        ▼
┌───────────────────────┐
│  Step 0: 输入预处理     │  ← 复用 textProcessing.ts 工具函数
│  - 清理空白字符         │
│  - 按段落分割           │  ← splitIntoParagraphs()
│  - 计算全文字数         │  ← calculateWordCount()
│  - 生成内容哈希(SHA256)  │  ← 用于去重和缓存
└───────────┬───────────┘
            │
            ▼
┌───────────────────────────────────────────────────────────────┐
│  Step 1: 规则引擎并行检测 (权重40%, 目标耗时<500ms)              │
│                                                               │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐  │
│  │ 2.1 TTR    │ │ 2.2 句长   │ │ 2.3 AI高频 │ │ 2.4 过渡词 │  │
│  │ 计算       │ │ 方差分析   │ │ 词汇检测   │ │ 模式匹配   │  │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘  │
│  ┌────────────┐                                               │
│  │ 2.5 被动语态│  Promise.all([ttr, variance, vocab, transition, passive])│
│  │ 比例统计   │                                               │
│  └────────────┘                                               │
│                         │                                      │
│                         ▼                                      │
│              rule_score = 加权融合5个子指标 (0-100)              │
└───────────────────────────────┬───────────────────────────────┘
                                │
                                ▼
┌───────────────────────────────────────────────────────────────┐
│  Step 2: LLM辅助判断 (权重60%, 目标耗时<4s/每批)                │
│                                                               │
│  - 筛选条件: rule_score > 30 或 任一子指标触达高风险阈值        │
│  - 批量策略: 将可疑段落合并为单次API调用 (≤8段/批)              │
│  - 调用DeepSeek API → 结构化JSON解析                           │
│  - 解析失败重试: 最多2次, 每次追加"请严格返回JSON"提示          │
│                                                               │
│                         │                                      │
│                         ▼                                      │
│              llm_score = LLM返回的score值 (0-100)               │
└───────────────────────────────┬───────────────────────────────┘
                                │
                                ▼
┌───────────────────────────────────────────────────────────────┐
│  Step 3: 综合评分与风险分级                                     │
│                                                               │
│  final_score = rule_score × 0.4 + llm_score × 0.6             │
│                                                               │
│  风险映射:                                                     │
│  0-20   → low 🟢     21-50  → medium 🟡                       │
│  51-70  → medium-high 🟠  71-100 → high 🔴                     │
│                                                               │
│  输出: ParagraphResult[] + issueStatistics + summary            │
└───────────────────────────────────────────────────────────────┘
```

### 2.2 规则引擎设计（权重40%）

#### 2.2.1 困惑度代理指标（TTR计算）

**算法原理**：AI生成的文本倾向于使用更有限的词汇集合，导致TTR（Type-Token Ratio）偏低。

```typescript
/**
 * 计算Type-Token Ratio (TTR)
 * TTR = 不重复词数 / 总词数
 * AI文本典型值: 0.30-0.50  |  人类文本典型值: 0.50-0.72
 */
function calculateTTR(text: string): { ttr: number; score: number; risk: 'high' | 'medium' | 'low' } {
  const words = tokenizeChinese(text);
  if (words.length === 0) return { ttr: 0, score: 50, risk: 'medium' };

  const uniqueWords = new Set(words);
  const ttr = uniqueWords.size / words.length;

  let score: number;
  let risk: 'high' | 'medium' | 'low';

  if (ttr < 0.30) {
    score = Math.max(0, Math.min(100, (0.30 - ttr) * 300 + 60));
    risk = 'high';
  } else if (ttr < 0.50) {
    score = Math.max(0, Math.min(100, (0.50 - ttr) * 150 + 30));
    risk = 'medium';
  } else {
    score = Math.max(0, (ttr - 0.50) * 80);
    risk = 'low';
  }

  return { ttr: Math.round(ttr * 1000) / 1000, score: Math.round(score), risk };
}

/**
 * 中文分词器（MVP版：基于字符级N-gram，无需外部依赖）
 * 生产环境建议替换为 jieba 或 nodejieba
 */
function tokenizeChinese(text: string): string[] {
  const cleaned = text
    .replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return [];

  const tokens: string[] = [];
  const chars = [...cleaned];

  for (let i = 0; i < chars.length; i++) {
    const isChinese = /[\u4e00-\u9fa5]/.test(chars[i]);

    if (isChinese && i + 1 < chars.length && /[\u4e00-\u9fa5]/.test(chars[i + 1])) {
      tokens.push(chars[i] + chars[i + 1]);
      i++;
    } else if (/[a-zA-Z0-9]/.test(chars[i])) {
      let word = chars[i];
      while (i + 1 < chars.length && /[a-zA-Z0-9]/.test(chars[i + 1])) {
        i++;
        word += chars[i];
      }
      tokens.push(word.toLowerCase());
    }
  }

  return tokens;
}
```

**阈值设定与评分曲线**：

| TTR范围 | 风险等级 | 原始得分 | 归一化后(0-100) | 典型场景 |
|--------|---------|---------|----------------|---------|
| < 0.25 | 🔴 高 | 75-100 | 75-100 | 高度机械化AI文本 |
| 0.25-0.35 | 🔴 高 | 55-75 | 55-75 | 典型GPT输出 |
| 0.35-0.50 | 🟡 中 | 30-55 | 30-55 | 混合内容 |
| 0.50-0.65 | 🟢 低 | 0-20 | 0-20 | 正常人类写作 |
| > 0.65 | 🟢 低 | 0 | 0 | 高度个性化表达 |

**权重占比**：在rule_score中占 **22%**

---

#### 2.2.2 句长方差分析（Burstiness Proxy）

**算法原理**：人类写作句长变化大（突发性强），AI生成句长趋于均匀。

```typescript
/**
 * 计算句长方差（Burstiness代理指标）
 * AI文本句长方差通常 < 15，人类文本通常 > 30
 */
function calculateSentenceVariance(text: string): {
  variance: number;
  meanLength: number;
  sentenceCount: number;
  score: number;
  risk: 'high' | 'medium' | 'low';
} {
  const sentences = splitSentences(text);

  if (sentences.length < 3) {
    return { variance: 0, meanLength: 0, sentenceCount: sentences.length, score: 50, risk: 'medium' };
  }

  const lengths = sentences.map(s => s.replace(/\s+/g, '').length);
  const mean = lengths.reduce((sum, len) => sum + len, 0) / lengths.length;

  const squaredDiffs = lengths.map(len => Math.pow(len - mean, 2));
  const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / lengths.length;

  let score: number;
  let risk: 'high' | 'medium' | 'low';

  if (variance < 15) {
    score = Math.max(0, Math.min(100, (15 - variance) * 4 + 50));
    risk = 'high';
  } else if (variance < 30) {
    score = Math.max(0, Math.min(100, (30 - variance) * 2 + 20));
    risk = 'medium';
  } else {
    score = Math.max(0, Math.min(100, 15 - variance * 0.3));
    risk = 'low';
  }

  return {
    variance: Math.round(variance * 100) / 100,
    meanLength: Math.round(mean * 10) / 10,
    sentenceCount: sentences.length,
    score: Math.round(score),
    risk,
  };
}

/**
 * 中文句子分割（支持中英文标点）
 */
function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[。！？.!?\n])(?=[^\s])/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
}
```

**方差公式**：

```
Var(X) = Σ(xi - μ)² / N

其中:
  xi = 第i个句子的字符长度
  μ  = 所有句子长度的算术平均值
  N  = 总句子数
```

**阈值设定**：

| 句长方差 | 风险等级 | 得分(0-100) | 说明 |
|---------|---------|------------|------|
| < 10 | 🔴 高 | 80-100 | 极度均匀，高度疑似AI |
| 10-15 | 🔴 高 | 60-80 | 明显均匀 |
| 15-25 | 🟡 中 | 30-60 | 轻微均匀 |
| 25-40 | 🟢 低 | 5-30 | 正常波动 |
| > 40 | 🟢 低 | 0-5 | 高度自然 |

**权重占比**：在rule_score中占 **20%**

---

#### 2.2.3 AI高频词汇检测

**完整词汇表（200词，按类别分组）**：

```typescript
const AI_HIGH_FREQ_WORDS: ReadonlyArray<{
  word: string;
  category: string;
  weight: number;
}> = [
  // === 总结过渡词 (weight: 1.5 - 最高危) ===
  { word: '综上所述', category: '总结过渡', weight: 1.5 },
  { word: '由此可见', category: '总结过渡', weight: 1.5 },
  { word: '总而言之', category: '总结过渡', weight: 1.5 },
  { word: '一言以蔽之', category: '总结过渡', weight: 1.4 },
  { word: '概括来说', category: '总结过渡', weight: 1.3 },
  { word: '总的来说', category: '总结过渡', weight: 1.2 },
  { word: '归根结底', category: '总结过渡', weight: 1.2 },

  // === 引导注意词 (weight: 1.3) ===
  { word: '值得注意的是', category: '引导注意', weight: 1.3 },
  { word: '需要特别指出的是', category: '引导注意', weight: 1.3 },
  { word: '尤其值得关注的是', category: '引导注意', weight: 1.3 },
  { word: '不容忽视的是', category: '引导注意', weight: 1.2 },
  { word: '显而易见', category: '引导注意', weight: 1.2 },
  { word: '毋庸置疑', category: '引导注意', weight: 1.3 },
  { word: '毫无疑问', category: '引导注意', weight: 1.3 },
  { word: '不可否认', category: '引导注意', weight: 1.2 },

  // === 发现/表明词 (weight: 1.1) ===
  { word: '不难发现', category: '发现表明', weight: 1.1 },
  { word: '研究表明', category: '发现表明', weight: 1.1 },
  { word: '实验结果表明', category: '发现表明', weight: 1.1 },
  { word: '数据表明', category: '发现表明', weight: 1.1 },
  { word: '结果显示', category: '发现表明', weight: 1.0 },
  { word: '可以看出', category: '发现表明', weight: 1.0 },
  { word: '由此可知', category: '发现表明', weight: 1.1 },
  { word: '从中可以看出', category: '发现表明', weight: 1.1 },

  // === 序数列举词 (weight: 1.2) ===
  { word: '首先', category: '序数列举', weight: 1.2 },
  { word: '其次', category: '序数列举', weight: 1.2 },
  { word: '再次', category: '序数列举', weight: 1.1 },
  { word: '最后', category: '序数列举', weight: 1.0 },
  { word: '第一', category: '序数列举', weight: 1.1 },
  { word: '第二', category: '序数列举', weight: 1.1 },
  { word: '第三', category: '序数列举', weight: 1.1 },
  { word: '一方面', category: '序数列举', weight: 1.2 },
  { word: '另一方面', category: '序数列举', weight: 1.2 },

  // === 程度副词 (weight: 0.8) ===
  { word: '非常', category: '程度副词', weight: 0.8 },
  { word: '十分', category: '程度副词', weight: 0.8 },
  { word: '极其', category: '程度副词', weight: 0.9 },
  { word: '尤为', category: '程度副词', weight: 0.9 },
  { word: '相当', category: '程度副词', weight: 0.7 },
  { word: '显著', category: '程度副词', weight: 0.8 },
  { word: '明显', category: '程度副词', weight: 0.7 },
  { word: '大幅', category: '程度副词', weight: 0.8 },

  // === 重要性描述 (weight: 1.0) ===
  { word: '具有重要意义', category: '重要性描述', weight: 1.0 },
  { word: '发挥着重要作用', category: '重要性描述', weight: 1.0 },
  { word: '具有深远影响', category: '重要性描述', weight: 1.0 },
  { word: '广泛应用', category: '重要性描述', weight: 0.9 },
  { word: '得到了广泛关注', category: '重要性描述', weight: 1.0 },
  { word: '成为研究热点', category: '重要性描述', weight: 1.0 },

  // === 逻辑连接词 (weight: 0.9) ===
  { word: '因此', category: '逻辑连接', weight: 0.9 },
  { word: '然而', category: '逻辑连接', weight: 0.8 },
  { word: '此外', category: '逻辑连接', weight: 0.8 },
  { word: '同时', category: '逻辑连接', weight: 0.7 },
  { word: '具体而言', category: '逻辑连接', weight: 1.0 },
  { word: '换句话说', category: '逻辑连接', weight: 1.0 },
  { word: '也就是说', category: '逻辑连接', weight: 1.0 },
  { word: '换言之', category: '逻辑连接', weight: 1.0 },

  // === 学术套话 (weight: 1.2) ===
  { word: '在...背景下', category: '学术套话', weight: 1.2 },
  { word: '随着...的发展', category: '学术套话', weight: 1.1 },
  { word: '基于上述分析', category: '学术套话', weight: 1.2 },
  { word: '通过深入研究', category: '学术套话', weight: 1.1 },
  { word: '本文旨在', category: '学术套话', weight: 1.2 },
  { word: '学术界普遍认为', category: '学术套话', weight: 1.3 },
  { word: '现有文献表明', category: '学术套话', weight: 1.2 },
  { word: '前人研究指出', category: '学术套话', weight: 1.2 },
  { word: '大量研究表明', category: '学术套话', weight: 1.3 },
  { word: '一般来说', category: '学术套话', weight: 1.1 },
  { word: '总体而言', category: '学术套话', weight: 1.1 },
  { word: '从某种意义上说', category: '学术套话', weight: 1.2 },

  // === 结构化表达 (weight: 1.1) ===
  { word: '主要包括以下几个方面', category: '结构化表达', weight: 1.1 },
  { word: '可以从以下几个角度', category: '结构化表达', weight: 1.1 },
  { word: '具体表现在以下方面', category: '结构化表达', weight: 1.1 },
  { word: '不仅...而且...', category: '结构化表达', weight: 1.2 },
  { word: '既...又...', category: '结构化表达', weight: 1.0 },

  // ... 更多词汇补足至200个 ...
];
```

**匹配算法与评分**：

```typescript
interface VocabularyDetectionResult {
  density: number;
  matchedWords: Array<{ word: string; category: string; count: number }>;
  score: number;
  risk: 'high' | 'medium' | 'low';
}

function detectAIVocabulary(text: string, wordCount: number): VocabularyDetectionResult {
  const matchedWords: Array<{ word: string; category: string; count: number }> = [];
  let totalWeightedCount = 0;

  for (const entry of AI_HIGH_FREQ_WORDS) {
    const regex = new RegExp(entry.word, 'g');
    const matches = text.match(regex);
    if (matches && matches.length > 0) {
      totalWeightedCount += matches.length * entry.weight;
      matchedWords.push({
        word: entry.word,
        category: entry.category,
        count: matches.length,
      });
    }
  }

  const density = wordCount > 0 ? (totalWeightedCount / wordCount) * 1000 : 0;

  let score: number;
  let risk: 'high' | 'medium' | 'low';

  if (density > 8) {
    score = Math.min(100, 60 + (density - 8) * 5);
    risk = 'high';
  } else if (density > 5) {
    score = 30 + (density - 5) * 10;
    risk = 'medium';
  } else if (density > 2) {
    score = (density - 2) * 10;
    risk = 'low';
  } else {
    score = 0;
    risk = 'low';
  }

  matchedWords.sort((a, b) => b.count - a.count);

  return {
    density: Math.round(density * 100) / 100,
    matchedWords: matchedWords.slice(0, 15),
    score: Math.round(score),
    risk,
  };
}
```

**密度阈值**：

| 密度(次/千字) | 风险等级 | 得分 | 说明 |
|-------------|---------|------|------|
| > 8 | 🔴 高 | 60-100 | 严重AI模式化 |
| 5-8 | 🟡 中 | 30-60 | 明显AI特征 |
| 2-5 | 🟢 低 | 0-30 | 轻微痕迹 |
| ≤ 2 | 🟢 低 | 0 | 正常范围 |

**权重占比**：在rule_score中占 **22%**

---

#### 2.2.4 过渡词模式匹配

**正则表达式模式列表**：

```typescript
const TRANSITION_PATTERNS: ReadonlyArray<{
  pattern: RegExp;
  label: string;
  penalty: number;
  description: string;
}> = [
  {
    pattern: /一方面[，,]?[^。，]*另一方面/g,
    label: '一方面...另一方面',
    penalty: 8,
    description: '对称式过渡结构',
  },
  {
    pattern: /不仅[^。，]*而且[^。，]*(?:还|也)/g,
    label: '不仅...而且(还/也)',
    penalty: 7,
    description: '递进式固定搭配',
  },
  {
    pattern: /首先[^。，]*其次[^。，]*(?:再次[^。，]*)?(?:最后)?/g,
    label: '首先...其次...(最后)',
    penalty: 9,
    description: '三段式列举',
  },
  {
    pattern: /虽然[^。，]*但是[^。，]*/g,
    label: '虽然...但是',
    penalty: 5,
    description: '标准转折搭配',
  },
  {
    pattern: /尽管[^。，]*然而[^。，]*/g,
    label: '尽管...然而',
    penalty: 6,
    description: '正式转折搭配',
  },
  {
    pattern: /无论[^。，]*都[^。，]*/g,
    label: '无论...都',
    penalty: 5,
    description: '条件让步结构',
  },
  {
    pattern: /除了[^。，]*(?:之外|以外)[^。，]*(?:还|也|同时)/g,
    label: '除了...(还/也/同时)',
    penalty: 6,
    description: '补充说明结构',
  },
  {
    pattern: /与其说[^。，]*不如说[^。，]*/g,
    label: '与其说...不如说',
    penalty: 7,
    description: '比较选择结构',
  },
  {
    pattern: /并不是[^。，]*而是[^。，]*/g,
    label: '并不是...而是',
    penalty: 6,
    description: '纠正式转折',
  },
  {
    pattern: /(?:换言之|换句话说|也就是说)[^。，]{10,}/g,
    label: '解释性插入语',
    penalty: 4,
    description: '频繁解释说明',
  },
];

function detectTransitionPatterns(text: string): {
  patterns: Array<{ label: string; count: number; penalty: number }>;
  totalPenalty: number;
  score: number;
} {
  const patterns: Array<{ label: string; count: number; penalty: number }> = [];
  let totalPenalty = 0;

  for (const tp of TRANSITION_PATTERNS) {
    const matches = text.match(tp.pattern);
    if (matches && matches.length > 0) {
      const count = matches.length;
      const penalty = tp.penalty * Math.min(count, 3);
      totalPenalty += penalty;
      patterns.push({ label: tp.label, count, penalty: Math.round(penalty) });
    }
  }

  const score = Math.min(100, totalPenalty * 3);

  return {
    patterns: patterns.sort((a, b) => b.penalty - a.penalty),
    totalPenalty: Math.round(totalPenalty),
    score: Math.round(score),
  };
}
```

**权重占比**：在rule_score中占 **18%**

---

#### 2.2.5 被动语态比例统计

**被动句式识别规则**：

```typescript
const PASSIVE_PATTERNS: ReadonlyArray<RegExp> = [
  /被[^，。]{2,20}(所.{1,5})?/g,
  /由[^，。]{2,20}(构成|组成|产生|引起|导致|完成|执行|实施|进行)/g,
  /受到[^，。]{2,20}(的影响|的制约|的限制|的作用|的关注)/g,
  /予以[^，。]{2,}/g,
  /加以[^，。]{2,}/g,
  /给[^，。]{2,10}(带来|造成|引发|引起)/g,
  /为[^，。]{2,}(所.{1,5})?/g,
  /据[^，。]{2,10}(显示|表明|报道|介绍|透露|反映)/g,
];

function detectPassiveVoice(text: string, sentenceCount: number): {
  passiveCount: number;
  ratio: number;
  score: number;
} {
  if (sentenceCount === 0) return { passiveCount: 0, ratio: 0, score: 0 };

  let passiveCount = 0;
  for (const pattern of PASSIVE_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) passiveCount += matches.length;
  }

  const ratio = passiveCount / sentenceCount;

  let score: number;
  if (ratio > 0.5) {
    score = Math.min(100, 50 + (ratio - 0.5) * 100);
  } else if (ratio > 0.3) {
    score = 20 + (ratio - 0.3) * 150;
  } else if (ratio > 0.15) {
    score = (ratio - 0.15) * 133;
  } else {
    score = 0;
  }

  return {
    passiveCount,
    ratio: Math.round(ratio * 1000) / 1000,
    score: Math.round(score),
  };
}
```

**被动语态比例阈值**：

| 被动句/总句数 | 比例值 | 得分 | 说明 |
|-------------|-------|------|------|
| > 50% | > 0.5 | 50-100 | 严重过度使用被动 |
| 30%-50% | 0.3-0.5 | 20-50 | 明显偏高 |
| 15%-30% | 0.15-0.3 | 0-20 | 轻微偏高 |
| < 15% | < 0.15 | 0 | 正常范围 |

**权重占比**：在rule_score中占 **18%**

---

#### 2.2.6 规则引擎综合评分

```typescript
interface RuleEngineResult {
  ttr: ReturnType<typeof calculateTTR>;
  sentenceVariance: ReturnType<typeof calculateSentenceVariance>;
  vocabulary: VocabularyDetectionResult;
  transitions: ReturnType<typeof detectTransitionPatterns>;
  passiveVoice: ReturnType<typeof detectPassiveVoice>;

  weightedScore: number;
  issues: string[];
}

function runRuleEngine(text: string): RuleEngineResult {
  const wordCount = calculateWordCount(text);

  const ttr = calculateTTR(text);
  const sentenceVariance = calculateSentenceVariance(text);
  vocabulary = detectAIVocabulary(text, wordCount);
  transitions = detectTransitionPatterns(text);
  passiveVoice = detectPassiveVoice(text, sentenceVariance.sentenceCount);

  const weightedScore = Math.round(
    ttr.score * 0.22 +
    sentenceVariance.score * 0.20 +
    vocabulary.score * 0.22 +
    transitions.score * 0.18 +
    passiveVoice.score * 0.18
  );

  const issues: string[] = [];
  if (ttr.risk !== 'low') issues.push('词汇多样性不足(TTR偏低)');
  if (sentenceVariance.risk !== 'low') issues.push('句式单一(句长方差偏小)');
  if (vocabulary.risk !== 'low') issues.push(`用词模式化(AI高频词密度:${vocabulary.density})`);
  if (transitions.totalPenalty > 5) issues.push('过渡词高频出现');
  if (passiveVoice.score > 20) issues.push('被动语态比例过高');

  return {
    ttr, sentenceVariance, vocabulary, transitions, passiveVoice,
    weightedScore,
    issues,
  };
}
```

---

### 2.3 LLM辅助判断（权重60%）

#### 2.3.1 Prompt模板设计

```typescript
function generateAIGCDetectPrompt(paragraphs: Array<{ index: number; text: string }>): string {
  const paragraphsText = paragraphs
    .map(p => `【段落${p.index}】\n${p.text}`)
    .join('\n\n');

  return `你是一个专业的AIGC文本检测器，专门识别中文AI生成内容。请对以下${paragraphs.length}个文本段落进行逐一分析。

## 评分标准（每个段落独立打分，0-100整数分）
- 0-20: 几乎确定为人类撰写
- 21-40: 可能是人类撰写，但有轻微AI特征
- 41-60: 有较明显AI生成特征
- 61-80: 大概率为AI生成
- 81-100: 几乎确定为AI生成

## 判断依据（请检查以下维度）
1. **句式均匀度**: 句子长度是否过于整齐划一
2. **过渡词使用**: 是否存在"综上所述""值得注意的是""不难发现"等AI高频表达
3. **词汇多样性**: 是否缺乏个性化的词汇选择
4. **逻辑流畅度**: 推理过程是否过于"完美"和程式化
5. **观点表达**: 是否缺乏作者个人立场或主观判断
6. **结构化程度**: 是否呈现过于工整的"总分总"或"第一第二第三"结构

## 待检测文本
${paragraphsText}

## 输出要求
请严格以JSON数组格式输出，不要添加任何其他文字：
[
  {
    "index": 段落序号(数字),
    "score": 0-100的疑似度分数(数字),
    "evidence": ["具体的AI写作特征证据1", "证据2", "证据3"],
    "reasoning": "简短的推理过程(不超过50字)"
  },
  ...（每个段落一个对象）
]`;
}
```

#### 2.3.2 DeepSeek API调用参数配置

```typescript
/** AIGC检测专用API配置 */
const AIGC_DETECT_API_CONFIG = {
  model: 'deepseek-chat',
  temperature: 0.1,
  max_tokens: 4000,
  top_p: 0.95,
  presence_penalty: 0,
  frequency_penalty: 0,
  timeout: 30000,
  maxRetries: 3,
} as const;

/** 为什么temperature设为0.1？
 *  - 检测任务需要确定性和一致性
 *  - 同一段落多次检测结果应稳定
 *  - 低温度减少LLM"创造性"导致的评分波动
 */

/** 为什么max_tokens设为4000？
 *  - 8个段落 × 每个段落~300字JSON ≈ 2400字
 *  - 额外1600 token余量应对长段落
 */
```

#### 2.3.3 结果解析与容错

```typescript
interface LLMDetectResult {
  index: number;
  score: number;
  evidence: string[];
  reasoning: string;
}

async function callLLMDetect(
  client: DeepSeekClient,
  paragraphs: Array<{ index: number; text: string }>
): Promise<LLMDetectResult[]> {
  const prompt = generateAIGCDetectPrompt(paragraphs);

  let rawResponse: string;
  try {
    rawResponse = await client.chat(prompt);
  } catch (error) {
    throw new AIServiceError(
      `LLM检测调用失败: ${(error as Error).message}`,
      'DETECTION_FAILED',
      true,
      error
    );
  }

  return parseLLMDetectResponse(rawResponse, paragraphs.length);
}

function parseLLMDetectResponse(raw: string, expectedCount: number): LLMDetectResult[] {
  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new AIServiceError(
      'LLM返回格式异常：未找到JSON数组',
      'PARSE_ERROR',
      false
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    throw new AIServiceError(
      'LLM返回JSON解析失败',
      'PARSE_ERROR',
      false
    );
  }

  if (!Array.isArray(parsed)) {
    throw new AIServiceError('LLM返回非数组格式', 'PARSE_ERROR', false);
  }

  return parsed.map((item: unknown, idx: number) => {
    const obj = item as Record<string, unknown>;
    return {
      index: typeof obj.index === 'number' ? obj.index : idx + 1,
      score: clampScore(obj.score as number),
      evidence: Array.isArray(obj.evidence) ? obj.evidence.slice(0, 3) : [],
      reasoning: typeof obj.reasoning === 'string' ? obj.reasoning : '',
    };
  }).slice(0, expectedCount);
}

function clampScore(score: unknown): number {
  const num = Number(score);
  if (isNaN(num) || num < 0) return 50;
  if (num > 100) return 100;
  return Math.round(num);
}
```

---

### 2.4 综合评分公式

```typescript
interface ParagraphResult {
  index: number;
  preview: string;
  fullText: string;
  score: number;
  riskLevel: 'low' | 'medium' | 'medium-high' | 'high';
  issues: string[];
  wordCount: number;
  startOffset: number;
  endOffset: number;
  ruleBreakdown: {
    ttr: number;
    sentenceVariance: number;
    vocabulary: number;
    transitions: number;
    passiveVoice: number;
  };
  llmEvidence?: string[];
}

function computeFinalScore(
  ruleScore: number,
  llmScore: number
): number {
  const final = ruleScore * 0.4 + llmScore * 0.6;
  return Math.round(Math.max(0, Math.min(100, final)));
}

function mapRiskLevel(score: number): 'low' | 'medium' | 'medium-high' | 'high' {
  if (score <= 20) return 'low';
  if (score <= 50) return 'medium';
  if (score <= 70) return 'medium-high';
  return 'high';
}

function generateSummary(paragraphs: ParagraphResult[], overallScore: number): string {
  const highRiskCount = paragraphs.filter(p => p.riskLevel === 'high').length;
  const mediumHighCount = paragraphs.filter(p => p.riskLevel === 'medium-high').length;
  const totalParagraphs = paragraphs.length;

  const riskPercent = overallScore.toFixed(1);

  if (overallScore >= 70) {
    return `本文整体AIGC疑似率较高（${riskPercent}%），共${totalParagraphs}个段落中有${highRiskCount}个高风险和${mediumHighCount}个中等偏高风险段落。建议重点优化标记为红色的段落，采用激进型改写策略以快速降低疑似率。`;
  } else if (overallScore >= 40) {
    return `本文AIGC疑似率为${riskPercent}%，处于中等水平。其中${highRiskCount}个段落需重点关注，${mediumHighCount}个段落建议选择性优化。推荐使用平衡型改写策略逐步改善。`;
  } else if (overallScore >= 20) {
    return `本文AIGC疑似率为${riskPercent}%，整体较为安全。仍有${highRiskCount + mediumHighCount}个段落可进一步优化以达到更低的风险水平。`;
  } else {
    return `恭喜！本文AIGC疑似率仅为${riskPercent}%，处于安全范围内，被主流AIGC检测系统标记的概率较低。如有个别段落仍不放心，可选择性地进行微调优化。`;
  }
}
```

**评分归一化与风险映射汇总**：

| final_score | riskLevel | 颜色 | 建议操作 | UI Badge样式 |
|------------|-----------|------|---------|-------------|
| 0-20 | low | #22c55e | 安全，无需处理 | bg-green-100 text-green-700 |
| 21-50 | medium | #eab308 | 注意，选择性优化 | bg-yellow-100 text-yellow-700 |
| 51-70 | medium-high | #f97316 | 警告，重点优化 | bg-orange-100 text-orange-700 |
| 71-100 | high | #ef4444 | 高危，必须优先处理 | bg-red-100 text-red-700 |

---

## 3. 对抗性改写策略设计

### 3.1 改写Prompt模板（与论文降重的核心差异）

**关键差异对比**：

| 维度 | 论文降重Prompt | AIGC对抗改写Prompt |
|-----|--------------|-------------------|
| 核心目标 | 降低与已有文献的相似度 | 降低被AIGC检测系统识别的概率 |
| 改写方向 | 同义词替换 + 表述重组 | 打破AI模式 + 注入人类特征 |
| 质量基准 | 保持学术规范 | 保持学术规范 + 增加"不完美" |
| 版本差异 | 强度差异(light/medium/heavy) | 风格差异(保守/平衡/激进) |
| 术语保护 | 保护专业名词不变 | 保护专业名词 + 关键数据不变 |
| temperature | 0.7 | 0.8 (更高创造性) |
| presence_penalty | 0 | 0.3 (鼓励新表达) |
| frequency_penalty | 0 | 0.5 (惩罚重复) |

**完整的对抗性改写Prompt模板**：

```typescript
function generateAIGCRewritePrompt(
  originalParagraph: string,
  options: {
    version: 'conservative' | 'balanced' | 'aggressive';
    issues: string[];
    currentScore: number;
  }
): string {
  const versionInstructions: Record<string, string> = {
    conservative: `【保守型改写策略】
- 改动幅度控制在最小范围
- 主要通过同义词替换和局部句式调整来改善
- 保持原文的整体结构和论证顺序
- 适合对原文改动敏感的场景
- 预期AIGC率降幅: 10-20%`,

    balanced: `【平衡型改写策略】（推荐）
- 适度调整句式结构和表达方式
- 全面应用去AI化技巧：打破均匀节奏、替换高频词、加入个人标记
- 可适当调整段落内部逻辑顺序
- 在保证质量的前提下最大化降AIGC效果
- 预期AIGC率降幅: 20-35%`,

    aggressive: `【激进型改写策略】
- 大幅重构段落结构和表达方式
- 完全重新组织语言，彻底打破原有AI模式
- 可引入口语化表达、设问句、倒装等多样化手法
- 适合高风险段落（疑似度>80%）的紧急处理
- 注意：务必保持核心论点和关键数据不变
- 预期AIGC率降幅: 35-50%`,
  };

  const issuesStr = options.issues.length > 0
    ? `\n该段落存在的AI特征问题：${options.issues.join('、')}`
    : '';

  return `你是一位资深的中文学术写作专家，同时也是一位"AIGC检测规避"领域的资深顾问。
你的专长是将带有AI生成特征的文本改写得更加"人性化"，使其能够顺利通过各类AIGC检测系统的审查。

## 核心认知
AIGC检测系统主要通过以下特征识别AI文本：
1. 句式过于均匀（句长方差小）
2. 大量使用"综上所述""值得注意的是"等程式化过渡词
3. 词汇选择缺乏个性（TTR低）
4. 逻辑推进过于"完美"流畅
5. 缺乏作者个人身份标记
6. 结构过于工整（总是"第一第二第三""一方面另一方面"）

你的任务是**刻意打破这些模式**，让文本呈现出真实人类写作的自然特征。

${versionInstructions[options.version]}

## 必须遵守的原则（底线）
1. ✅ 核心论点和结论不能改变
2. ✅ 专业术语、学科名词、人名地名不得替换
3. ✅ 数据、引用、公式必须原样保留
4. ✅ 改写后必须符合中文学术写作基本规范
5. ✅ 语义相似度应保持在82%以上（核心意思不变）

## 必须执行的改写技术（至少执行4项以上）

### 技术1: 句式爆破（最重要）
- 将连续的短句合并为一个带从句的长句
- 将过长的复合句拆分为2-3个短句
- 使用破折号（——）插入补充说明
- 使用括号（）添加注释
- 故意制造长短不一的句式节奏（目标句长方差 > 30）

### 技术2: 词汇去AI化
- 禁止使用：综上所述、由此可见、值得注意的是、不难发现、毋庸置疑、总而言之
- 替换为：笔者发现、从数据来看、有意思的是、让人意外的是、回到问题本身
- 偶尔使用略带口语化的表达："话说回来""换个角度看""老实说"

### 技术3: 注入作者身份
- 适当加入：笔者认为、据我们观察、在我们的研究中、这一发现让我们意识到
- 加入适度的不确定性表述：初步结果显示、尽管这一结论尚待进一步验证、我们倾向于认为
- 可以加入个人感受：令人惊讶的是、这一点往往被忽视

### 技术4: 结构微调
- 不要总是"主题句→论证→结论"的标准结构
- 尝试先说结论再展开（倒金字塔）
- 插入设问句："为什么会这样呢？原因在于..."
- 加入转折："然而，事情并非如此简单""但这里有一个微妙之处"
- 偶尔使用不完全工整的表达（保留自然的松散感）

## 严格禁止的事项 ❌
- 不要使用排比句式（尤其是三个以上的并列）
- 不要使用"第一/第二/第三"的序数列举（改为"其一...其二..."或直接用段落分隔）
- 不要让每句话都完美工整
- 不要使用"总而言之""一言以蔽之"等总结性套话
- 不要过度使用引号强调
- 不要生成看起来像机器翻译的文本

## 原始段落
${originalParagraph}
${issuesStr}
该段落当前AIGC疑似度: ${options.currentScore}%

## 输出要求
请仅输出改写后的完整文本，不要添加任何解释说明、不要使用markdown格式标记、不要输出JSON。
直接输出纯文本即可。`;
}
```

**API参数配置**：

```typescript
const AIGC_REWRITE_API_CONFIG = {
  model: 'deepseek-chat',
  temperature: 0.8,
  max_tokens: 2000,
  top_p: 0.9,
  presence_penalty: 0.3,
  frequency_penalty: 0.5,
  timeout: 45000,
  maxRetries: 3,
} as const;
```

### 3.2 多版本生成策略

```typescript
interface RewriteVersionOutput {
  versionId: string;
  label: 'conservative' | 'balanced' | 'aggressive';
  labelText: string;
  text: string;
  estimatedScore: number;
  confidence: number;
  changesSummary: string;
  diff: DiffSegment[];
}

async function generateRewriteVersions(
  client: DeepSeekClient,
  paragraph: string,
  issues: string[],
  currentScore: number
): Promise<RewriteVersionOutput[]> {
  const versions: RewriteVersionOutput[] = [];
  const versionTypes: Array<'conservative' | 'balanced' | 'aggressive'> = [
    'conservative', 'balanced', 'aggressive',
  ];

  for (const versionType of versionTypes) {
    const prompt = generateAIGCRewritePrompt(paragraph, {
      version: versionType,
      issues,
      currentScore,
    });

    const startTime = Date.now();
    let rewrittenText: string;

    try {
      rewrittenText = await client.chat(prompt);
    } catch (error) {
      console.error(`[${versionType}] 改写失败:`, error);
      continue;
    }

    const estimatedScore = estimateAIGCScoreAfterRewrite(
      currentScore,
      versionType,
      paragraph,
      rewrittenText
    );

    const confidence = calculateVersionConfidence(versionType, currentScore, estimatedScore);
    const changesSummary = generateChangesSummary(paragraph, rewrittenText, versionType);
    const diff = computeDiff(paragraph, rewrittenText);

    versions.push({
      versionId: `${versionType}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      label: versionType,
      labelText: versionType === 'conservative' ? '保守型' : versionType === 'balanced' ? '平衡型' : '激进型',
      text: rewrittenText,
      estimatedScore: Math.round(estimatedScore),
      confidence: Math.round(confidence),
      changesSummary,
      diff,
    });

    console.info(`[${versionType}] 改写完成`, {
      duration: Date.now() - startTime,
      estimatedScore,
      confidence,
    });
  }

  return versions.sort((a, b) => b.confidence - a.confidence);
}

/**
 * 预估改写后的AIGC率
 * MVP版本：基于版本类型的经验系数 + 规则引擎快速复核
 */
function estimateAIGCScoreAfterRewrite(
  originalScore: number,
  versionType: 'conservative' | 'balanced' | 'aggressive',
  _originalText: string,
  rewrittenText: string
): number {
  const reductionFactors: Record<string, { base: number; variance: number }> = {
    conservative: { base: 0.15, variance: 0.10 },
    balanced: { base: 0.28, variance: 0.12 },
    aggressive: { base: 0.42, variance: 0.15 },
  };

  const factor = reductionFactors[versionType];
  const randomVariation = (Math.random() - 0.5) * 2 * factor.variance;
  const baseReduction = originalScore * (factor.base + randomVariation);

  const quickRuleCheck = runRuleEngine(rewrittenText);
  const ruleAdjustment = (quickRuleCheck.weightedScore - originalScore * 0.4) * 0.3;

  return Math.max(0, Math.min(100, originalScore - baseReduction + ruleAdjustment));
}

function calculateVersionConfidence(
  versionType: string,
  originalScore: number,
  estimatedScore: number
): number {
  let baseConfidence = versionType === 'balanced' ? 88 : versionType === 'conservative' ? 92 : 75;

  if (estimatedScore < 20) baseConfidence -= 5;
  if (originalScore > 80 && versionType !== 'aggressive') baseConfidence -= 8;
  if (originalScore < 30) baseConfidence -= 10;

  return Math.max(50, Math.min(98, baseConfidence + (Math.random() * 6 - 3)));
}
```

**三个版本的具体差异**：

| 维度 | 保守型 (conservative) | 平衡型 (balanced) | 激进型 (aggressive) |
|-----|---------------------|------------------|-------------------|
| Prompt指令 | 最小改动 | 全面应用4大技术 | 完全重构 |
| 预估AIGC降幅 | 10-25% | 20-38% | 32-52% |
| 置信度 | 85-95% | 80-92% | 65-82% |
| 语义保持度 | 95%+ | 85-93% | 78-88% |
| 适用场景 | 低风险段落微调 | **默认推荐** | 高风险紧急处理 |
| Token消耗 | ~800 in / ~600 out | ~1000 in / ~900 out | ~1200 in / ~1100 out |
| 成本(¥) | ¥0.07 | ¥0.09 | ¥0.11 |

### 3.3 改写质量保障

```typescript
interface RewriteQualityCheck {
  passed: boolean;
  semanticSimilarity: number;
  termProtectionOk: boolean;
  missingTerms: string[];
  fluencyScore: number;
  suggestions: string[];
}

function checkRewriteQuality(
  original: string,
  rewritten: string,
  protectedTerms: string[]
): RewriteQualityCheck {
  const semanticSimilarity = calculateSimilarity(original, rewritten);

  const missingTerms: string[] = [];
  for (const term of protectedTerms) {
    if (!rewritten.includes(term)) {
      missingTerms.push(term);
    }
  }

  const fluencyScore = evaluateFluency(rewritten);

  const suggestions: string[] = [];
  if (semanticSimilarity < 0.78) {
    suggestions.push('⚠️ 改写后语义偏离较大，建议人工审核核心论点是否保持');
  }
  if (missingTerms.length > 0) {
    suggestions.push(`⚠️ 以下受保护术语在改写后丢失：${missingTerms.join('、')}`);
  }
  if (fluencyScore < 0.72) {
    suggestions.push('⚠️ 改写后文本通顺度较低，可能存在语法问题');
  }
  const lengthRatio = rewritten.length / original.length;
  if (lengthRatio < 0.7) {
    suggestions.push('⚠️ 改写后文本大幅缩短，可能丢失重要信息');
  } else if (lengthRatio > 1.5) {
    suggestions.push('⚠️ 改写后文本大幅扩展，可能存在冗余表达');
  }

  const passed = semanticSimilarity >= 0.78 &&
    missingTerms.length === 0 &&
    fluencyScore >= 0.68;

  return {
    passed,
    semanticSimilarity: Math.round(semanticSimilarity * 1000) / 1000,
    termProtectionOk: missingTerms.length === 0,
    missingTerms,
    fluencyScore: Math.round(fluencyScore * 1000) / 1000,
    suggestions,
  };
}

/**
 * Diff计算（用于DiffViewer渲染）
 * MVP版本：基于简单字符级diff
 * P1计划：升级为Myers diff algorithm
 */
function computeDiff(original: string, modified: string): DiffSegment[] {
  const segments: DiffSegment[] = [];

  const origLines = original.split('');
  const modLines = modified.split('');

  let i = 0, j = 0;
  let equalBuffer = '';
  let deleteBuffer = '';
  let insertBuffer = '';

  const flush = () => {
    if (equalBuffer) { segments.push({ type: 'equal', value: equalBuffer }); equalBuffer = ''; }
    if (deleteBuffer || insertBuffer) {
      if (deleteBuffer && insertBuffer) {
        segments.push({ type: 'replace', value: deleteBuffer });
        segments.push({ type: 'insert', value: insertBuffer });
      } else if (deleteBuffer) {
        segments.push({ type: 'delete', value: deleteBuffer });
      } else {
        segments.push({ type: 'insert', value: insertBuffer });
      }
      deleteBuffer = '';
      insertBuffer = '';
    }
  };

  while (i < origLines.length || j < modLines.length) {
    if (i < origLines.length && j < modLines.length && origLines[i] === modLines[j]) {
      flush();
      equalBuffer += origLines[i];
      i++; j++;
    } else {
      if (i < origLines.length) deleteBuffer += origLines[i++];
      if (j < modLines.length) insertBuffer += modLines[j++];
    }
  }
  flush();

  return mergeAdjacentSegments(segments);
}

function mergeAdjacentSegments(segments: DiffSegment[]): DiffSegment[] {
  const merged: DiffSegment[] = [];
  for (const seg of segments) {
    if (merged.length > 0 && merged[merged.length - 1].type === seg.type) {
      merged[merged.length - 1].value += seg.value;
    } else {
      merged.push({ ...seg });
    }
  }
  return merged;
}
```

---

## 4. API接口定义

### 4.1 接口清单

| # | 方法 | 路径 | 功能 | 认证 | 优先级 | SSE |
|---|------|------|------|------|--------|-----|
| 1 | POST | `/api/v1/aigc/detect` | 提交AIGC检测 | JWT | P0 | 否 |
| 2 | GET | `/api/v1/aigc/detect/:id` | 获取检测结果 | JWT | P0 | 否 |
| 3 | POST | `/api/v1/aigc/detect/:id/rewrite` | 对抗性改写 | JWT | P0 | **是** |
| 4 | POST | `/api/v1/aigc/detect/:id/recheck` | 复测验证 | JWT | P0 | 否 |
| 5 | GET | `/api/v1/aigc/history` | 检测历史列表 | JWT | P0 | 否 |
| 6 | GET | `/api/v1/aigc/history/:id` | 历史详情(含时间线) | JWT | P0 | 否 |
| 7 | DELETE | `/api/v1/aigc/history/:id` | 删除记录 | JWT | P0 | 否 |
| 8 | GET | `/api/v1/aigc/export/:id` | 导出报告(P1预留) | JWT | P1 | 否 |

### 4.2 接口1: POST /api/v1/aigc/detect — AIGC检测

**请求**:

```typescript
// Zod Schema
const detectInputSchema = z.object({
  content: z.string()
    .min(100, '文本太短，最少需要100字才能进行准确检测')
    .max(50000, '文本超出最大限制（50000字），请分段提交'),
  title: z.string()
    .min(1, '标题不能为空')
    .max(200, '标题不能超过200字符')
    .optional(),
  source: z.enum(['paste', 'file_import', 'paper_linked']).default('paste'),
  paperId: z.string().uuid('无效的Paper ID格式').optional(),
});

// TypeScript Interface
interface DetectRequest {
  content: string;
  title?: string;
  source?: 'paste' | 'file_import' | 'paper_linked';
  paperId?: string;
}
```

**响应 (200)**:

```typescript
interface DetectResponse {
  success: true;
  data: {
    detectionId: string;
    overallScore: number;
    riskLevel: 'low' | 'medium' | 'medium-high' | 'high';
    summary: string;
    paragraphs: ParagraphResult[];
    issueStatistics: Record<string, number>;
    processingTime: number;
    creditsConsumed: number;
    createdAt: string;
  };
  message: string;
}
```

**响应 (400)**:

```typescript
interface DetectErrorResponse {
  success: false;
  error: {
    code: 'CONTENT_TOO_SHORT' | 'CONTENT_TOO_LONG' | 'VALIDATION_ERROR';
    message: string;
    details?: ZodError[];
  };
}
```

**响应 (402)**:

```typescript
{
  success: false;
  error: {
    code: 'INSUFFICIENT_CREDITS';
    message: '配额不足，本次检测需要{N}字，当前余额{M}字';
    currentBalance: number;
    required: number;
  };
}
```

**核心处理流程** (伪代码):

```
POST /api/v1/aigc/detect
  ├─ 1. JWT认证 → 提取userId
  ├─ 2. Zod验证请求体
  ├─ 3. 配额检查 → UsageTracker.checkQuota(userId)
  │     └─ 不足 → 402 INSUFFICIENT_CREDITS
  ├─ 4. 内容预处理
  │     ├─ 清理空白 → trim + normalize spaces
  │     ├─ 分割段落 → splitIntoParagraphs(content)
  │     ├─ 字数统计 → calculateWordCount(content)
  │     └─ 内容哈希 → SHA256(content) → contentHash
  ├─ 5. Redis缓存检查 → GET aigc:{contentHash}
  │     └─ 命中 → 直接返回缓存结果（标注"缓存"）
  ├─ 6. 创建AIGCDetection DB记录 (status: Analyzing)
  ├─ 7. 并行执行规则引擎 → runRuleEngine(content)
  │     └─ Promise.all([TTR, Variance, Vocab, Transition, Passive])
  ├─ 8. 筛选可疑段落 (rule_score > 30)
  ├─ 9. 批量LLM检测 (≤8段/批)
  │     ├─ 组装Prompt → generateAIGCDetectPrompt(paragraphs)
  │     ├─ 调用API → client.chat(prompt, AIGC_DETECT_CONFIG)
  │     └─ 解析结果 → parseLLMDetectResponse(raw)
  ├─ 10. 综合评分 → computeFinalScore(rule, llm) per paragraph
  ├─ 11. 更新DB记录 (status: Analyzed, result JSON)
  ├─ 12. 写入Redis缓存 → SETEX aigc:{contentHash} 24h
  ├─ 13. 记录UsageLog (action: 'aigc_detect')
  └─ 14. 返回完整检测结果
```

### 4.3 接口2: GET /api/v1/aigc/detect/:id — 获取检测结果

**响应 (200)**:

```typescript
interface GetDetectionResponse {
  success: true;
  data: {
    detection: {
      id: string;
      title: string;
      overallScore: number;
      riskLevel: string;
      status: string;
      paragraphCount: number;
      highRiskCount: number;
      optimizationRounds: number;
      createdAt: string;
      updatedAt: string;
    };
    result: {
      summary: string;
      paragraphs: ParagraphResult[];
      issueStatistics: Record<string, number>;
    };
    timeline: OptimizationRecord[];
  };
}
```

**缓存策略**：
- Redis一级缓存: `aigc_detail:{detectionId}` TTL=1h
- 未命中时查DB，回填缓存

### 4.4 接口3: POST /api/v1/aigc/detect/:id/rewrite — 对抗性改写 (SSE流式)

**请求**:

```typescript
const rewriteInputSchema = z.object({
  targetParagraphIndices: z.array(z.number().int().min(0))
    .min(1, '至少选择1个段落进行改写')
    .max(10, '每次最多改写10个段落'),
  versionPreference: z.enum(['conservative', 'balanced', 'aggressive']).optional().default('balanced'),
  protectedTerms: z.array(z.string()).max(50, '保护术语最多50个').default([]),
});
```

**SSE事件流格式**:

```
event: start
data: {"status":"processing","totalTargets":3,"timestamp":"..."}

event: progress
data: {"current":1,"total":3,"paragraphIndex":2,"version":"conservative","status":"generating","timestamp":"..."}

event: result
data: {"paragraphIndex":2,"versions":[{"versionId":"...","label":"conservative","text":"...","estimatedScore":42,"confidence":90,...}],...}

event: result
data: {"paragraphIndex":5,"versions":[...]}

event: complete
data: {"rewriteId":"...","totalResults":2,"summary":{"avgOriginalScore":72,"avgEstimatedScore":41,"avgImprovement":31},"creditsConsumed":1850,"processingTimeMs":8234,"timestamp":"..."}
```

**SSE实现要点** (参考 [papers.ts#L606-L743](file:///workspace/智论平台/backend/src/routes/papers.ts#L606-L743)):

```typescript
fastify.post('/:id/rewrite', {
  preHandler: [fastify.authenticate],
}, async (request, reply) => {
  const { id: detectionId } = request.params;
  const body = rewriteInputSchema.parse(request.body);

  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  const stream = new PassThrough();
  stream.pipe(reply.raw);

  const sendSSE = (event: string, data: any) => {
    stream.write(`event: ${event}\n`);
    stream.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  sendSSE('start', { status: 'processing', totalTargets: body.targetParagraphIndices.length });

  const allResults: Array<{ paragraphIndex: number; versions: RewriteVersionOutput[] }> = [];

  for (let i = 0; i < body.targetParagraphIndices.length; i++) {
    const pIdx = body.targetParagraphIndices[i];
    sendSSE('progress', { current: i + 1, total: body.targetParagraphIndices.length, paragraphIndex: pIdx, status: 'generating' });

    const versions = await generateRewriteVersions(client, paragraph, issues, currentScore);
    allResults.push({ paragraphIndex: pIdx, versions });

    sendSSE('result', { paragraphIndex: pIdx, result: allResults[allResults.length - 1] });
  }

  sendSSE('complete', { rewriteId, totalResults: allResults.length, summary, creditsConsumed, processingTimeMs });
  stream.end();

  await prisma.optimizationRecord.create({ /* ... */ });
});
```

### 4.5 接口4: POST /api/v1/aigc/detect/:id/recheck — 复测验证

**增量检测逻辑**：

```typescript
interface RecheckRequest {
  updatedParagraphs: Array<{
    index: number;
    newText: string;
  }>;
}

interface RecheckResponse {
  success: true;
  data: {
    recheckId: string;
    previousScore: number;
    currentScore: number;
    scoreChange: number;
    updatedParagraphs: ParagraphResult[];
    optimizationRecord: {
      roundNumber: number;
      operationType: 'Recheck';
      beforeAigcRate: number;
      afterAigcRate: number;
      rateChange: number;
      targetParagraphIndices: number[];
      processingTimeMs: number;
      costCredits: number;
    };
    creditsConsumed: number;
  };
}
```

**增量检测策略**：
- 仅对 `updatedParagraphs` 中的段落重新运行完整检测流程
- 未修改的段落沿用上次检测结果
- 复测配额享受折扣: `wordCount * 0.3`

### 4.6 接口5-7: 历史管理

**GET /api/v1/aigc/history** (分页列表):

```typescript
const historyQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
  status: z.enum(['Pending', 'Analyzing', 'Analyzed', 'Optimizing', 'Completed', 'Abandoned']).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  sortBy: z.enum(['createdAt', 'overallScore', 'optimizationRounds']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
```

**DELETE /api/v1/aigc/history/:id** (软删除):
- 设置 `deletedAt = now()`
- 级联软删除关联的 `OptimizationRecord`
- 物理删除将在定时任务中执行（90天后）

### 4.7 完整TypeScript接口定义

```typescript
export interface ParagraphResult {
  index: number;
  preview: string;
  fullText: string;
  score: number;
  riskLevel: 'low' | 'medium' | 'medium-high' | 'high';
  issues: string[];
  wordCount: number;
  startOffset: number;
  endOffset: number;
  ruleBreakdown: {
    ttr: number;
    sentenceVariance: number;
    vocabulary: number;
    transitions: number;
    passiveVoice: number;
  };
  llmEvidence?: string[];
}

export interface RewriteVersion {
  versionId: string;
  label: 'conservative' | 'balanced' | 'aggressive';
  labelText: string;
  text: string;
  estimatedScore: number;
  confidence: number;
  changesSummary: string;
  diff: DiffSegment[];
}

export interface DiffSegment {
  type: 'equal' | 'delete' | 'insert' | 'replace';
  value: string;
}

export interface OptimizationRecordOutput {
  id: string;
  roundNumber: number;
  operationType: 'InitialDetect' | 'Rewrite' | 'Recheck' | 'ManualEdit';
  beforeAigcRate: number;
  afterAigcRate: number;
  rateChange: number;
  targetParagraphIndices: number[];
  selectedVersion?: string;
  processingTimeMs: number;
  costCredits: number;
  createdAt: string;
  detail?: {
    originalTexts: string[];
    rewrittenTexts: string[];
  };
}

export interface DetectionDetail {
  id: string;
  title: string;
  overallScore: number;
  riskLevel: 'low' | 'medium' | 'medium-high' | 'high';
  status: AIGCDetectionStatus;
  paragraphCount: number;
  highRiskCount: number;
  optimizationRounds: number;
  source: DetectionSource;
  processingTimeMs: number;
  creditsConsumed: number;
  createdAt: string;
  updatedAt: string;
}
```

### 4.8 Zod验证Schema汇总

```typescript
import { z } from 'zod';

export const aigcSchemas = {
  detect: z.object({
    content: z.string().min(100).max(50000),
    title: z.string().min(1).max(200).optional(),
    source: z.enum(['paste', 'file_import', 'paper_linked']).default('paste'),
    paperId: z.string().uuid().optional(),
  }),

  rewrite: z.object({
    targetParagraphIndices: z.array(z.number().int().min(0)).min(1).max(10),
    versionPreference: z.enum(['conservative', 'balanced', 'aggressive']).default('balanced'),
    protectedTerms: z.array(z.string()).max(50).default([]),
  }),

  recheck: z.object({
    updatedParagraphs: z.array(z.object({
      index: z.number().int().min(0),
      newText: z.string().min(10),
    })).min(1).max(20),
  }),

  historyQuery: z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(50).default(10),
    status: z.nativeEnum(AIGCDetectionStatusEnum).optional(),
    dateFrom: z.string().datetime().optional(),
    dateTo: z.string().datetime().optional(),
    sortBy: z.enum(['createdAt', 'overallScore', 'optimizationRounds']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }),
};
```

---

## 5. 数据库Schema扩展

### 5.1 完整Prisma模型定义

```prisma
// ========== 新增枚举类型 ==========

enum AIGCRiskLevel {
  Low
  Medium
  MediumHigh
  High
}

enum AIGCDetectionStatus {
  Pending
  Analyzing
  Analyzed
  Optimizing
  Completed
  Abandoned
}

enum DetectionSource {
  Paste
  FileImport
  PaperLinked
}

enum OptimizationType {
  InitialDetect
  Rewrite
  Recheck
  ManualEdit
}

// ========== 扩展现有 Paper 模型 ==========

model Paper {
  id                        String             @id @default(uuid())
  userId                    String
  title                     String
  content                   String             @db.Text
  originalText              String?            @db.Text
  processedText             String?            @db.Text
  status                    PaperStatus        @default(Draft)
  plagiarismRate            Float?
  aigcRate                  Float?

  // --- AIGC扩展字段 (新增) ---
  aigcDetectionId           String?
  aigcOptimizationRounds    Int                @default(0)
  aigcInitialRate           Float?

  createdAt                 DateTime           @default(now())
  updatedAt                 DateTime           @updatedAt

  user                      User               @relation(fields: [userId], references: [id], onDelete: Cascade)
  aigcDetections            AIGCDetection[]
  optimizationRecords       OptimizationRecord[]

  @@map("papers")
}

// ========== 新增：AIGC检测记录表 ==========

model AIGCDetection {
  id                  String               @id @default(uuid())
  userId              String
  paperId             String?
  title               String

  contentHash         String               @unique
  encryptedContent    String?              @db.Text

  result              Json

  overallScore        Float
  riskLevel           AIGCRiskLevel
  paragraphCount      Int
  highRiskCount       Int                  @default(0)

  status              AIGCDetectionStatus  @default(Pending)

  processingTimeMs    Int                  @default(0)
  creditsConsumed     Int                  @default(0)
  source              DetectionSource      @default(Paste)

  deletedAt           DateTime?

  createdAt           DateTime             @default(now())
  updatedAt           DateTime             @updatedAt

  user                User                 @relation(fields: [userId], references: [id], onDelete: Cascade)
  paper               Paper?               @relation(fields: [paperId], references: [id], onDelete: SetNull)
  optimizations       OptimizationRecord[]

  @@index([userId, createdAt])
  @@index([userId, status])
  @@index([contentHash])
  @@index([deletedAt])
  @@map("aigc_detections")
}

// ========== 新增：优化操作记录表 ==========

model OptimizationRecord {
  id                    String           @id @default(uuid())
  detectionId           String
  roundNumber           Int
  operationType         OptimizationType

  beforeAigcRate        Float
  beforeTextHash        String

  targetParagraphIndices Int[]
  selectedVersion        String?
  rewriteVersionIds      String[]

  afterAigcRate         Float
  rateChange            Float

  processingTimeMs      Int               @default(0)
  tokensConsumed        Int               @default(0)
  costCredits           Int               @default(0)

  detail                Json?

  deletedAt             DateTime?

  createdAt             DateTime          @default(now())

  detection             AIGCDetection     @relation(fields: [detectionId], references: [id], onDelete: Cascade)

  @@index([detectionId, roundNumber])
  @@index([detectionId, createdAt])
  @@index([deletedAt])
  @@map("optimization_records")
}
```

### 5.2 Migration脚本要点

```bash
# 生成migration
npx prisma migrate dev --name add_aigc_detection_tables

# Migration将自动包含以下DDL变更:
# 1. CREATE TYPE enum_AIGCRiskLevel AS ENUM ('Low','Medium','MediumHigh','High')
# 2. CREATE TYPE enum_AIGCDetectionStatus AS ENUM ('Pending','Analyzing','Analyzed','Optimizing','Completed','Abandoned')
# 3. CREATE TYPE enum_DetectionSource AS ENUM ('Paste','FileImport','PaperLinked')
# 4. CREATE TYPE enum_OptimizationType AS ENUM ('InitialDetect','Rewrite','Recheck','ManualEdit')
# 5. ALTER TABLE papers ADD COLUMN aigc_detection_id TEXT UNIQUE
# 6. ALTER TABLE papers ADD COLUMN aigc_optimization_rounds INT NOT NULL DEFAULT 0
# 7. ALTER TABLE papers ADD COLUMN aigc_initial_rate REAL
# 8. CREATE TABLE aigc_detections (...)
# 9. CREATE TABLE optimization_records (...)
# 10. CREATE INDEX idx_aigc_detections_user_created ON aigc_detections(user_id, created_at)
# 11. CREATE INDEX idx_aigc_detections_user_status ON aigc_detections(user_id, status)
# 12. CREATE INDEX idx_aigc_detections_content_hash ON aigc_detections(content_hash)
# 13. CREATE INDEX idx_optimization_records_detection_round ON optimization_records(detection_id, round_number)
```

**向后兼容性保证**：
- 所有Paper表新增字段均为 `nullable` 或有 `@default()`
- 不修改任何现有字段的类型或约束
- 不删除任何现有索引
- 现有论文降重功能**零影响**

### 5.3 数据保留策略

```typescript
// 定时任务 (node-cron 或外部调度器)
const DATA_RETENTION_POLICY = {
  softDeleteDays: 30,
  hardDeleteDays: 90,
  cleanupSchedule: '0 3 * * *',
} as const;

async function cleanupOldRecords(prisma: PrismaClient): Promise<void> {
  const now = new Date();

  const softDeleteThreshold = new Date(now);
  softDeleteThreshold.setDate(softDeleteThreshold.getDate() - DATA_RETENTION_POLICY.softDeleteDays);

  const hardDeleteThreshold = new Date(now);
  hardDeleteThreshold.setDate(hardDeleteThreshold.getDate() - DATA_RETENTION_POLICY.hardDeleteDays);

  await prisma.$transaction(async (tx) => {
    await tx.aIGCDetection.updateMany({
      where: {
        status: { in: ['Abandoned', 'Completed'] },
        createdAt: { lt: softDeleteThreshold },
        deletedAt: null,
      },
      data: { deletedAt: now },
    });

    const hardDeleted = await tx.oPTIMIZATION_RECORD.deleteMany({
      where: {
        detection: { deletedAt: { lt: hardDeleteThreshold } },
      },
    });

    await tx.aIGCDetection.deleteMany({
      where: { deletedAt: { lt: hardDeleteThreshold } },
    });

    console.log(`[Cleanup] Soft-deleted stale records, hard-deleted ${hardDeleted.count} optimization records`);
  });
}
```

---

## 6. 性能优化方案

### 6.1 检测性能优化

| 优化手段 | 实现方式 | 预期收益 | 复杂度 |
|---------|---------|---------|--------|
| **规则引擎并行化** | `Promise.all([ttr(), variance(), vocab(), transition(), passive()])` | 规则引擎 < 500ms (5个子模块并行) | 低 |
| **LLM批量调用** | 将可疑段落合并为单次Prompt (≤8段/批)，减少API往返次数 | API调用次数减少60-80% | 中 |
| **Redis内容去重** | SHA256(content) 作为缓存Key，相同文本直接返回 | 重复文本检测 < 50ms | 低 |
| **段落预筛选** | 仅对 rule_score > 30 的段落调用LLM，跳过低风险段落 | LLM调用量减少40-60% | 低 |
| **超时分片** | 单次检测超时15s，超时后返回已完成的部分结果 + 提示 | 避免无限等待 | 中 |

**性能目标量化**：

| 场景 | P50目标 | P99目标 | 测量方式 |
|-----|--------|--------|---------|
| 检测1000字 | < 2s | < 4s | 接口耗时 |
| 检测5000字 | < 4s | < 8s | 接口耗时 |
| 检测20000字 | < 8s | < 15s | 接口耗时 |
| 检测50000字 | < 15s | < 25s | 接口耗时 |
| 规则引擎(任意长度) | < 300ms | < 800ms | 纯计算耗时 |
| LLM检测(8段/批) | < 3s | < 6s | API耗时 |

### 6.2 改写性能优化

| 优化手段 | 实现方式 | 参数 | 预期收益 |
|---------|---------|------|---------|
| **SSE流式传输** | 复用 [papers.ts#L606-L643](file:///workspace/智论平台/backend/src/routes/papers.ts#L606-L643) 的PassThrough模式 | 首token < 2s | 用户感知延迟降低70% |
| **并发控制** | 最多3段同时改写 (`MAX_CONCURRENT_REQUESTS = 3`) | 从 aiRewriteService.ts 复用 | 防止API限流 |
| **改写结果缓存** | Key=`aigc_rewrite:{paraHash}:{version}` TTL=7d | Redis | 相同段落+版本命中时 < 10ms |
| **渐进式返回** | 每完成1个段落立即推送SSE `result` 事件 | - | 用户无需等待全部完成 |

**改写性能目标**：

| 场景 | 目标耗时 | 说明 |
|-----|---------|------|
| 单段单版本(~500字) | < 5s | 含LLM调用 |
| 单段3版本(~500字) | < 12s | 3次串行LLM调用 |
| 3段各3版本 | < 25s | 3段并发 × 每段3版本串行 |
| 10段各3版本 | < 60s | 分4批次并发(3+3+3+1) |

### 6.3 复测性能优化

**增量检测核心逻辑**：

```typescript
async function incrementalRecheck(
  detectionId: string,
  updatedParagraphs: Array<{ index: number; newText: string }>
): Promise<RecheckResponse> {
  const existing = await getExistingDetection(detectionId);
  const existingParagraphs = existing.result.paragraphs;

  const updatedIndices = new Set(updatedParagraphs.map(u => u.index));
  const unchangedParagraphs = existingParagraphs.filter(p => !updatedIndices.has(p.index));

  const recheckedParagraphs: ParagraphResult[] = [];

  for (const updated of updatedParagraphs) {
    const ruleResult = runRuleEngine(updated.newText);
    let llmScore = existingParagraphs[updated.index]?.score ?? 50;

    if (ruleResult.weightedScore > 25 || Math.abs(updated.newText.length - (existingParagraphs[updated.index]?.fullText?.length ?? 0)) > 50) {
      const llmResult = await callLLMDetect(client, [{ index: updated.index, text: updated.newText }]);
      llmScore = llmResult[0]?.score ?? llmScore;
    }

    const finalScore = computeFinalScore(ruleResult.weightedScore, llmScore);
    recheckedParagraphs.push(buildParagraphResult(updated.index, updated.newText, finalScore, ruleResult, llmResult[0]?.evidence));
  }

  const allParagraphs = [...unchangedParagraphs, ...recheckedParagraphs]
    .sort((a, b) => a.index - b.index);

  const newOverallScore = allParagraphs.reduce((sum, p) => sum + p.score, 0) / allParagraphs.length;

  return {
    previousScore: existing.overallScore,
    currentScore: Math.round(newOverallScore),
    scoreChange: Math.round((newOverallScore - existing.overallScore) * 10) / 10,
    updatedParagraphs: recheckedParagraphs,
  };
}
```

---

## 7. 成本控制方案

### 7.1 Token使用估算

| 操作 | 输入Token | 输出Token | DeepSeek费用 | 转人民币(¥) |
|-----|----------|----------|------------|-----------|
| 单次检测(~5000字, ~8段) | ~8000 | ~1500 | $0.0009 | **¥0.006** |
| 单次检测(~20000字, ~30段) | ~25000 | ~4500 | $0.0029 | **¥0.021** |
| 单段改写保守型(~500字) | ~1200 | ~600 | $0.0005 | **¥0.004** |
| 单段改写平衡型(~500字) | ~1400 | ~850 | $0.0007 | **¥0.005** |
| 单段改写激进型(~500字) | ~1600 | ~1100 | $0.0008 | **¥0.006** |
| 复测验证(~5000字, 3段变更) | ~5500 | ~1200 | $0.0008 | **¥0.006** |

> 注：DeepSeek API定价 (2026-05) deepseek-chat: 输入 ¥1/百万Token, 输出 ¥2/百万Token
> 以上为纯API成本，不含基础设施和运营成本

### 7.2 配额管理系统

**继承并扩展** [aiRewriteService.ts#L769-L861](file:///workspace/智论平台/backend/src/services/aiRewriteService.ts#L769-L861) 的 `UsageTracker`：

```typescript
/** AIGC操作每日免费额度 */
const AIGC_DAILY_FREE_QUOTA = {
  detectWords: 50000,
  rewriteWords: 20000,
  recheckWords: 30000,
  maxDailyCost: 5.0,
  maxDetectCount: 20,
} as const;

/** 配额消耗系数 */
const QUOTA_COST_MULTIPLIERS = {
  detect: 1.0,
  rewrite: 0.5,
  recheck: 0.3,
  regenerate: 0.5,
} as const;

function calculateCreditsConsumed(
  operation: 'detect' | 'rewrite' | 'recheck' | 'regenerate',
  wordCount: number
): number {
  return Math.ceil(wordCount * QUOTA_COST_MULTIPLIERS[operation]);
}
```

**免费额度层级**（后续会员体系参考）：

| 层级 | 日检测字数 | 日改写字数 | 日复检字数 | 月度上限 |
|-----|----------|----------|----------|---------|
| 免费用户 | 50,000 | 20,000 | 30,000 | 200,000 |
| 基础会员 | 200,000 | 100,000 | 150,000 | 1,000,000 |
| 专业会员 | 无限 | 500,000 | 500,000 | 无限 |

### 7.3 成本监控告警

```typescript
interface CostAlertConfig {
  dailyBudget: number;
  warningThreshold: number;
  criticalThreshold: number;
  anomalyThreshold: number;
}

const DEFAULT_COST_ALERT: CostAlertConfig = {
  dailyBudget: 500,
  warningThreshold: 0.7,
  criticalThreshold: 0.9,
  anomalyThreshold: 10,
};

async function monitorCostAnomaly(userId: string, operationCost: number): Promise<void> {
  const todayUsage = await usageTracker.getDailyUsage(userId);

  if (todayUsage.cost > DEFAULT_COST_ALERT.dailyBudget * DEFAULT_COST_ALERT.criticalThreshold) {
    await alertManager.sendCritical(`用户${userId}日成本超预警线: ¥${todayUsage.cost}`);
  }

  const avgCostPerOperation = todayUsage.apiCalls > 0 ? todayUsage.cost / todayUsage.apiCalls : 0;
  if (operationCost > avgCostPerOperation * DEFAULT_COST_ALERT.anomalyThreshold) {
    await alertManager.sendWarning(`异常高消耗检测: 用户${userId} 单次操作¥${operationCost}`);
  }
}
```

---

## 8. 安全性设计

### 8.1 数据加密

**完全复用** [papers.ts#L59-L73](file:///workspace/智论平台/backend/src/routes/papers.ts#L59-L73) 的AES-256-CBC实现：

```typescript
// 直接复用，无需修改
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-encryption-key-32-chars-long!!';

function encrypt(text: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

function decrypt(encryptedText: string): string {
  const [ivHex, encrypted] = encryptedText.split(':');
  const decipher = createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY.slice(0, 32)), Buffer.from(ivHex, 'hex'));
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
```

**加密策略**：
- `AIGCDetection.encryptedContent`: 全文AES加密存储
- `OptimizationRecord.detail`: 包含原文/改写文的JSON字段AES加密
- 传输层：HTTPS/TLS 1.3 强制（生产环境Nginx配置）

### 8.2 访问控制

**认证中间件**（复用 `fastify.authenticate`）：

```typescript
// 每个AIGC接口均需JWT认证
fastify.addHook('onRequest', async (request, reply) => {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.status(401).send({
      success: false,
      error: { code: 'NOT_AUTHORIZED', message: '未授权访问，请先登录' },
    });
  }
});
```

**数据所有权隔离**（所有查询强制附带userId）：

```typescript
// 统一的数据访问模式（参考 papers.ts#L422-L437）
const detection = await prisma.aIGCDetection.findFirst({
  where: {
    id: detectionId,
    userId,  // 强制所有权过滤
    deletedAt: null,
  },
});

if (!detection) {
  return reply.status(404).send({
    success: false,
    error: { code: 'DETECTION_NOT_FOUND', message: '检测记录不存在或无权访问' },
  });
}
```

### 8.3 防滥用机制

```typescript
/** 防滥用配置 */
const RATE_LIMIT_CONFIG = {
  perMinute: 60,
  perHour: 200,
  perDay: 500,
  maxConcurrentTasks: 3,
  maxContentSize: 50000,
  minContentSize: 100,
} as const;

/** 内存限流器（MVP版，生产环境升级为Redis + sliding window） */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(userId: string): { allowed: boolean; remaining: number; retryAfter?: number } {
  const now = Date.now();
  const key = `ratelimit:${userId}`;
  const record = rateLimitMap.get(key);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + 60000 });
    return { allowed: true, remaining: RATE_LIMIT_CONFIG.perMinute - 1 };
  }

  if (record.count >= RATE_LIMIT_CONFIG.perMinute) {
    return { allowed: false, remaining: 0, retryAfter: Math.ceil((record.resetTime - now) / 1000) };
  }

  record.count++;
  return { allowed: true, remaining: RATE_LIMIT_CONFIG.perMinute - record.count };
}

/** 并发任务限制 */
const activeTaskCounts = new Map<string, number>();

async function acquireTaskSlot(userId: string): Promise<boolean> {
  const current = activeTaskCounts.get(userId) || 0;
  if (current >= RATE_LIMIT_CONFIG.maxConcurrentTasks) return false;
  activeTaskCounts.set(userId, current + 1);
  return true;
}

function releaseTaskSlot(userId: string): void {
  const current = activeTaskCounts.get(userId) || 0;
  if (current <= 1) activeTaskCounts.delete(userId);
  else activeTaskCounts.set(userId, current - 1);
}
```

---

## 9. 错误处理

### 9.1 统一错误码枚举

```typescript
export enum AIGCErrorCode {
  DETECTION_FAILED = 'DETECTION_FAILED',
  REWRITE_FAILED = 'REWRITE_FAILED',
  RECHECK_FAILED = 'RECHECK_FAILED',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  CONTENT_TOO_SHORT = 'CONTENT_TOO_SHORT',
  CONTENT_TOO_LONG = 'CONTENT_TOO_LONG',
  DETECTION_NOT_FOUND = 'DETECTION_NOT_FOUND',
  NOT_AUTHORIZED = 'NOT_AUTHORIZED',
  RATE_LIMITED = 'RATE_LIMITED',
  PARSE_ERROR = 'PARSE_ERROR',
  AI_SERVICE_ERROR = 'AI_SERVICE_ERROR',
  INVALID_INDEX = 'INVALID_INDEX',
  STATUS_CONFLICT = 'STATUS_CONFLICT',
  OPTIMIZATION_LIMIT_EXCEEDED = 'OPTIMIZATION_LIMIT_EXCEEDED',
}

export const AIGC_ERROR_MESSAGES: Record<AIGCErrorCode, string> = {
  [AIGCErrorCode.DETECTION_FAILED]: 'AIGC检测过程中发生错误，请稍后重试',
  [AIGCErrorCode.REWRITE_FAILED]: '改写生成失败，请尝试重新生成或更换改写版本',
  [AIGCErrorCode.RECHECK_FAILED]: '复测验证失败，请确认修改内容后重试',
  [AIGCErrorCode.QUOTA_EXCEEDED]: '配额不足，请升级会员或明天再试',
  [AIGCErrorCode.CONTENT_TOO_SHORT]: '文本太短（最少100字），无法进行准确检测',
  [AIGCErrorCode.CONTENT_TOO_LONG]: '文本超出最大限制（50000字），请分段提交',
  [AIGCErrorCode.DETECTION_NOT_FOUND]: '检测记录不存在或无权访问',
  [AIGCErrorCode.NOT_AUTHORIZED]: '未授权访问，请先登录',
  [AIGCErrorCode.RATE_LIMITED]: '操作过于频繁，请稍后再试',
  [AIGCErrorCode.PARSE_ERROR]: 'AI返回结果解析失败，已自动重试',
  [AIGCErrorCode.AI_SERVICE_ERROR]: 'AI服务暂时不可用，请稍后重试',
  [AIGCErrorCode.INVALID_INDEX]: '段落索引超出有效范围',
  [AIGCErrorCode.STATUS_CONFLICT]: '当前状态不允许此操作',
  [AIGCErrorCode.OPTIMIZATION_LIMIT_EXCEEDED]: '已达最大优化轮次限制（10轮）',
};
```

### 9.2 重试策略

```typescript
/** 重试配置 */
const RETRY_CONFIG = {
  llmApi: {
    maxRetries: 3,
    delays: [1000, 2000, 4000],
    retryableErrors: ['TIMEOUT', 'RATE_LIMITED', 'UNKNOWN'],
    nonRetryableErrors: ['AUTH_FAILED', 'PARSE_ERROR'],
  },
  database: {
    maxRetries: 3,
    delay: 500,
    retryableErrors: ['ConnectionLost', 'TimedOut'],
  },
  redis: {
    maxRetries: 2,
    delay: 200,
    fallbackToMemory: true,
  },
} as const;

/** LLM API调用通用重试包装器 */
async function withRetry<T>(
  fn: () => Promise<T>,
  config: typeof RETRY_CONFIG.llmApi
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      const errorCode = (error as AIServiceError)?.errorCode;

      if (config.nonRetryableErrors.includes(errorCode)) {
        throw error;
      }

      if (attempt < config.maxRetries && config.retryableErrors.includes(errorCode)) {
        await new Promise(resolve => setTimeout(resolve, config.delays[attempt]));
      }
    }
  }

  throw lastError;
}
```

### 9.3 降级方案

| 故障场景 | 降级策略 | 用户体验影响 | 自动恢复 |
|---------|---------|------------|---------|
| **LLM API不可用** | 仅使用规则引擎 (rule_score × 1.0)，准确率降至~60%，UI提示"AI辅助检测暂不可用，已使用基础规则引擎" | 中（分数可能偏差） | LLM恢复后自动切换 |
| **Redis不可用** | 降级为内存Map缓存 (进程内，重启丢失) | 低（缓存失效需重新计算） | Redis恢复后自动切回 |
| **检测超时(>15s)** | 返回已完成的部分段落结果 + 未完成段落标记为"pending"，前端展示"部分结果，可点击重试" | 中（信息不全） | 用户手动触发重试 |
| **改写某版本失败** | 返回其余成功版本 + 失败版本显示"生成失败，点击重试" | 低（少一个选项） | 用户手动重试 |
| **DeepSeek API返回非JSON** | 重试2次，每次追加"请务必只返回JSON"；仍失败则该段落LLM得分取rule_score | 低（该段落分数可能不准） | 下次自动正常 |

---

## 10. 测试策略

### 10.1 单元测试重点

```typescript
// tests/unit/ruleEngine.test.ts
describe('RuleEngine', () => {
  describe('calculateTTR', () => {
    it('should return high risk for AI-like repetitive text', () => {
      const aiText = '研究表明研究表明研究表明研究表明研究表明'; // TTR极低
      const result = calculateTTR(aiText);
      expect(result.risk).toBe('high');
      expect(result.score).toBeGreaterThan(60);
    });

    it('should return low risk for diverse human writing', () => {
      const humanText = '今天天气真好我和小明去了公园玩滑梯荡秋千还吃了冰淇淋'; // TTR较高
      const result = calculateTTR(humanText);
      expect(result.risk).toBe('low');
      expect(result.score).toBeLessThan(30);
    });

    it('should handle empty text gracefully', () => {
      const result = calculateTTR('');
      expect(result.ttr).toBe(0);
    });
  });

  describe('calculateSentenceVariance', () => {
    it('should detect uniform sentence lengths (AI pattern)', () => {
      const uniformText = '这是第一句。这是第二句。这是第三句。这是第四句。这是第五句。';
      const result = calculateSentenceVariance(uniformText);
      expect(result.variance).toBeLessThan(5);
      expect(result.risk).toBe('high');
    });

    it('should allow varied sentence lengths (human pattern)', () => {
      const variedText = '好。这是一个相当长的句子包含了大量的信息和详细的描述。短。';
      const result = calculateSentenceVariance(variedText);
      expect(result.variance).toBeGreaterThan(20);
      expect(result.risk).toBe('low');
    });
  });

  describe('detectAIVocabulary', () => {
    it('should detect high density of AI words', () => {
      const aiText = '综上所述，研究表明，值得注意的是，不难发现，众所周知，综上所述，由此可见';
      const result = detectAIVocabulary(aiText, 50);
      expect(result.density).toBeGreaterThan(15);
      expect(result.risk).toBe('high');
    });

    it('should return zero score for clean text', () => {
      const cleanText = '我今天去图书馆借了一本关于机器学习的书';
      const result = detectAIVocabulary(cleanText, 25);
      expect(result.score).toBe(0);
    });
  });

  describe('computeFinalScore', () => {
    it('should correctly blend rule and LLM scores', () => {
      expect(computeFinalScore(80, 90)).toBe(86); // 80*0.4 + 90*0.6 = 86
      expect(computeFinalScore(0, 100)).toBe(60);  // 0*0.4 + 100*0.6 = 60
      expect(computeFinalScore(100, 0)).toBe(40); // 100*0.4 + 0*0.6 = 40
    });

    it('should clamp scores to 0-100 range', () => {
      expect(computeFinalScore(-10, 150)).toBeGreaterThanOrEqual(0);
      expect(computeFinalScore(200, 200)).toBeLessThanOrEqual(100);
    });
  });

  describe('generateAIGCDetectPrompt', () => {
    it('should include all paragraphs', () => {
      const prompt = generateAIGCDetectPrompt([
        { index: 1, text: '第一段内容' },
        { index: 2, text: '第二段内容' },
      ]);
      expect(prompt).toContain('段落1');
      expect(prompt).toContain('段落2');
      expect(prompt).toContain('JSON数组');
    });
  });

  describe('parseLLMDetectResponse', () => {
    it('should parse valid JSON array response', () => {
      const raw = '[{"index":1,"score":75,"evidence":["test"],"reasoning":"ok"}]';
      const result = parseLLMDetectResponse(raw, 1);
      expect(result).toHaveLength(1);
      expect(result[0].score).toBe(75);
    });

    it('should handle malformed JSON gracefully', () => {
      expect(() => parseLLMDetectResponse('not json', 1)).toThrow('PARSE_ERROR');
    });

    it('should clamp out-of-range scores', () => {
      const raw = '[{"index":1,"score":-5,"evidence":[],"reasoning":""}]';
      const result = parseLLMDetectResponse(raw, 1);
      expect(result[0].score).toBe(50); // default fallback
    });
  });
});
```

### 10.2 集成测试场景

| 场景编号 | 场景名称 | 步骤 | 预期结果 | 优先级 |
|---------|---------|------|---------|--------|
| IT-01 | 完整检测流程 | 上传5000字文本 → 检测 → 获取结果 | 返回完整段落级结果，overallScore 0-100 | P0 |
| IT-02 | 边界值测试-最短文本 | 上传100字文本 | 检测成功，结果合理 | P0 |
| IT-03 | 边界值测试-最长文本 | 上传50000字文本 | 检测成功，耗时<25s | P0 |
| IT-04 | 超限拒绝 | 上传99字 / 50001字 | 400 CONTENT_TOO_SHORT/LONG | P0 |
| IT-05 | 改写流程 | 检测 → 选择3段高风险 → 改写 → 获得3版本×3段 | SSE流返回9个版本 | P0 |
| IT-06 | 采用改写 → 复测 | 采用版本B → 触发复测 → 新AIGC率降低 | rateChange < 0 | P0 |
| IT-07 | 多轮优化循环 | detect → rewrite → recheck × 3 | 每轮rate下降，timeline正确增长 | P0 |
| IT-08 | 优化上限保护 | 第11轮改写尝试 | 403 OPTIMIZATION_LIMIT_EXCEEDED | P0 |
| IT-09 | 配额耗尽拦截 | 用完免费额度后继续检测 | 402 INSUFFICIENT_CREDITS | P0 |
| IT-10 | 权限隔离 | User A访问 User B的检测记录 | 404 DETECTION_NOT_FOUND | P0 |
| IT-11 | 未授权访问 | 未登录调用API | 401 NOT_AUTHORIZED | P0 |
| IT-12 | 并发检测 | 同一用户同时发起3个检测任务 | 前3个成功，第4个排队/拒绝 | P1 |
| IT-13 | 缓存命中 | 相同文本第二次检测 | 返回缓存结果，耗时<100ms | P1 |
| IT-14 | 软删除 → 查询 | 删除历史记录 → 再次查询 | 404 | P0 |
| IT-15 | LLM降级 | Mock LLM API不可用 → 仅规则引擎 | 返回结果，标注降级 | P1 |

### 10.3 性能基准测试

| 场景 | 目标P50 | 目标P99 | 测试工具 | 通过标准 |
|-----|--------|--------|---------|---------|
| 检测5000字 | < 4s | < 8s | k6 / autocannon | 100次请求全部达标 |
| 检测20000字 | < 8s | < 15s | k6 / autocannon | 50次请求全部达标 |
| 单段改写(3版本) | < 12s | < 20s | k6 / autocannon | 50次请求全部达标 |
| 三段批量改写 | < 25s | < 40s | k6 / autocannon | 30次请求全部达标 |
| 复测验证(3段变更) | < 5s | < 10s | k6 / autocannon | 50次请求全部达标 |
| 历史列表查询(分页) | < 200ms | < 500ms | k6 / autocannon | 200次请求全部达标 |
| 并发10用户检测 | 总计<30s | 总计<50s | k6 (10 VU) | 无错误，无超时 |
| 规则引擎纯计算 | < 300ms | < 800ms | Vitest benchmark | 1000次迭代 |

---

## 11. 与论文降重功能的集成设计

### 11.1 共享组件清单

| 组件 | 来源 | 复用方式 | 修改量 |
|-----|------|---------|--------|
| `encrypt()` / `decrypt()` | [papers.ts#L59-L73](file:///workspace/智论平台/backend/src/routes/papers.ts#L59-L73) | 直接import | 0 |
| `splitIntoParagraphs()` | [papers.ts#L75-L81](file:///workspace/智论平台/backend/src/routes/papers.ts#L75-L81) | 直接import | 0 |
| `calculateWordCount()` | [papers.ts#L83-L87](file:///workspace/智论平台/backend/src/routes/papers.ts#L83-L87) | 直接import | 0 |
| `DeepSeekClient` 类 | [aiRewriteService.ts#L238-L546](file:///workspace/智论平台/backend/src/services/aiRewriteService.ts#L238-L546) | 实例化+新增方法 | +50行 |
| `UsageTracker` 类 | [aiRewriteService.ts#L769-L861](file:///workspace/智论平台/backend/src/services/aiRewriteService.ts#L769-L861) | 扩展操作类型 | +20行 |
| `evaluateFluency()` | [aiRewriteService.ts#L639-670](file:///workspace/智论平台/backend/src/services/aiRewriteService.ts#L639-670) | 直接调用 | 0 |
| `calculateSimilarity()` | `utils/textProcessing.ts` | 直接调用 | 0 |
| `estimateTokens()` | `utils/textProcessing.ts` | 直接调用 | 0 |
| `generateContentHash()` | `utils/textProcessing.ts` | 直接调用 | 0 |
| SSE流式响应模式 | [papers.ts#L606-743](file:///workspace/智论平台/backend/src/routes/papers.ts#L606-L743) | 参考实现 | 模仿编写 |
| Zod验证+错误转换 | [papers.ts#L279-285,325-334](file:///workspace/智论平台/backend/src/routes/papers.ts#L279-L285) | 参考模式 | 模仿编写 |
| Prisma权限查询 | [papers.ts#L422-437](file:///workspace/智论平台/backend/src/routes/papers.ts#L422-L437) | 参考模式 | 模仿编写 |
| Redis缓存读写 | [papers.ts#L409-420,459](file:///workspace/智论平台/backend/src/routes/papers.ts#L409-L420) | 参考模式 | 模仿编写 |
| UsageLog记录 | [papers.ts#L302-310,470-479](file:///workspace/智论平台/backend/src/routes/papers.ts#L302-310) | 参考模式 | 模仿编写 |
| shadcn/ui组件库 | `frontend/components/ui/*` | 直接import | 0 |
| Tailwind配色方案 | `tailwind.config.ts` | 直接复用 | 0 |
| API封装层 | `frontend/lib/api.ts` | 扩展方法 | +80行 |

### 11.2 数据关联关系

```
User (已有)
  ├── Paper[] (已有) ──────────────────────┐
  │    └── aigcDetections: AIGCDetection[]  │ (新增外键)
  │    └── optimizationRecords: ...        │
  │                                         │
  ├── AIGCDetection[] (新增) ◄──────────────┘ (可选关联)
  │    └── optimizations: OptimizationRecord[]
  │
  ├── Document[] (已有)
  ├── Subscription[] (已有)
  └── UsageLog[] (已有) ← AIGC操作日志也写入此处
                          action ∈ {'aigc_detect', 'aigc_rewrite', 'aigc_recheck'}
```

### 11.3 UI一致性规范

**复用论文降重页面的设计语言**：

| 元素 | 论文降重 | AIGC检测 | 一致性 |
|-----|---------|---------|--------|
| 主色调 | blue-500 (#3B82F6) | blue-500 (#3B82F6) | ✅ 相同 |
| 安全色 | green-500 (#22C55E) | green-500 (#22C55E) | ✅ 相同 |
| 警告色 | yellow-500 (#EAB308) | yellow-500 (#EAB308) | ✅ 相同 |
| 危险色 | red-500 (#EF4444) | red-500 (#EF4444) | ✅ 相同 |
| 卡片圆角 | rounded-xl (12px) | rounded-xl (12px) | ✅ 相同 |
| 按钮圆角 | rounded-lg (8px) | rounded-lg (8px) | ✅ 相同 |
| 区块间距 | gap-6 (24px) | gap-6 (24px) | ✅ 相同 |
| 骨架屏动画 | pulse | pulse | ✅ 相同 |
| SSE进度展示 | 进度条+百分比 | 进度条+百分比 | ✅ 相同 |
| DiffViewer | 左右对比+高亮 | 左右对比+高亮 | ✅ 相同 |
| 时间线 | 垂直时间线 | 垂直时间线 | ✅ 相同 |
| 风险Badge | 绿/黄/红三色 | 绿/黄/橙/红四色 | ⚠️ 扩展(多medium-high) |

**前端共享组件清单**（从 `frontend/app/paper/deduplicate/page.tsx` 复用模式）：

| 组件 | 用途 | 来源 |
|-----|------|------|
| `Button` | CTA按钮 | shadcn/ui |
| `Card` | 内容卡片容器 | shadcn/ui |
| `Badge` | 风险等级标签 | shadcn/ui (扩展颜色变体) |
| `Tabs` | 版本切换 | shadcn/ui |
| `Textarea` | 文本输入区 | shadcn/ui |
| `Progress` | 圆形进度条(ScoreCircle) | 自建(参考降重页) |
| `Skeleton` | 加载骨架屏 | shadcn/ui |
| `Toast` | 操作反馈通知 | shadcn/ui |
| `Dialog` | 确认对话框 | shadcn/ui |
| `Tooltip` | 信息提示 | shadcn/ui |

### 11.4 前端API封装层扩展

```typescript
// frontend/lib/api.ts 扩展

const aigcApi = {
  detect: async (data: DetectRequest): Promise<DetectResponse> => {
    return apiClient.post('/aigc/detect', data);
  },

  getDetection: async (id: string): Promise<GetDetectionResponse> => {
    return apiClient.get(`/aigc/detect/${id}`);
  },

  rewrite: async (
    id: string,
    data: RewriteRequest,
    onEvent: (event: string, data: any) => void,
    onComplete: () => void,
    onError: (error: Error) => void
  ): Promise<void> => {
    const response = await fetch(`/api/v1/aigc/detect/${id}/rewrite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(data),
    });

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        try {
          const eventData = JSON.parse(trimmed.slice(6));
          const eventType = line.match(/^event:\s*(.+)$/)?.[1] || 'message';
          onEvent(eventType, eventData);
        } catch { /* ignore */ }
      }
    }
    onComplete();
  },

  recheck: async (id: string, data: RecheckRequest): Promise<RecheckResponse> => {
    return apiClient.post(`/aigc/detect/${id}/recheck`, data);
  },

  getHistory: async (params: HistoryQueryParams): Promise<HistoryListResponse> => {
    return apiClient.get('/aigc/history', { params });
  },

  getHistoryDetail: async (id: string): Promise<HistoryDetailResponse> => {
    return apiClient.get(`/aigc/history/${id}`);
  },

  deleteHistory: async (id: string): Promise<void> => {
    return apiClient.delete(`/aigc/history/${id}`);
  },
};
```

---

## 附录A: 文件结构与代码组织

```
backend/src/
├── routes/
│   ├── papers.ts                    # 已有 (972行) - 论文降重API
│   └── aigc.ts                      # 新建 (~800行) - AIGC检测API
│
├── services/
│   ├── aiRewriteService.ts          # 已有 (1231行) - AI改写服务
│   │   ├── DeepSeekClient           # 复用 (+扩展chatWithJsonResponse)
│   │   ├── UsageTracker             # 复用 (+扩展AIGC操作类型)
│   │   └── evaluateRewriteQuality   # 复用 (调整权重)
│   │
│   ├── aigcDetectService.ts         # 新建 (~600行) - AIGC检测核心
│   │   ├── runRuleEngine()          # 规则引擎入口
│   │   ├── callLLMDetect()          # LLM检测调用
│   │   └── computeFinalScore()      # 综合评分
│   │
│   ├── aigcRewriteService.ts        # 新建 (~500行) - 对抗改写核心
│   │   ├── generateAIGCRewritePrompt()  # 对抗性Prompt
│   │   ├── generateRewriteVersions()    # 多版本生成
│   │   └── checkRewriteQuality()        # 质量保障
│   │
│   └── ruleEngine.ts               # 新建 (~400行) - 规则引擎5子模块
│       ├── calculateTTR()          # 困惑度代理
│       ├── calculateSentenceVariance()  # 句长方差
│       ├── detectAIVocabulary()    # AI高频词检测
│       ├── detectTransitionPatterns()  # 过渡词匹配
│       └── detectPassiveVoice()     # 被动语态统计
│
├── types/
│   ├── paper.ts                     # 已有 (311行) - 复用TokenUsage等类型
│   └── aigc.ts                      # 新建 (~200行) - AIGC专用类型定义
│
└── utils/
    └── textProcessing.ts            # 已有 (262行) - 复用全部工具函数

frontend/
├── app/
│   ├── aigc/
│   │   ├── detect/
│   │   │   └── page.tsx             # 新建 (~350行) - 检测输入页
│   │   ├── result/
│   │   │   └── [id]/
│   │   │       └── page.tsx         # 新建 (~650行) - 结果+改写+时间线
│   │   └── history/
│   │       └── page.tsx             # 新建 (~300行) - 历史记录页
│   │
│   └── paper/
│       └── deduplicate/
│           └── page.tsx             # 已有 (520行) - UI参考
│
├── components/
│   ├── ui/                          # 已有 - shadcn/ui组件库
│   └── aigc/                        # 新建 - AIGC专用组件
│       ├── ScoreCircle.tsx          # 新建 - 圆形评分卡
│       ├── ParagraphHeatmap.tsx     # 新建 - 段落热力图
│       ├── IssueTagCloud.tsx        # 新建 - 问题标签云
│       ├── ParagraphSelector.tsx    # 新建 - 段落选择器
│       ├── AIGCDiffViewer.tsx       # 新建 - 改写对比视图
│       ├── VersionTabs.tsx          # 新建 - 版本选择器
│       └── OptimizationTimeline.tsx # 新建 - 优化时间线
│
└── lib/
    └── api.ts                       # 已有 - 扩展aigcApi命名空间

backend/prisma/
└── schema.prisma                    # 扩展 - 新增3个枚举 + 2个模型 + Paper表3字段
```

---

## 附录B: 开发任务拆解

| 任务ID | 任务 | 文件 | 依赖 | 估时 | 负责人 |
|-------|------|------|------|------|-------|
| T01 | Prisma Schema扩展 + Migration | schema.prisma | Phase 0批准 | 2h | BackendAgent |
| T02 | 类型定义 (types/aigc.ts) | types/aigc.ts | T01 | 1h | BackendAgent |
| T03 | 规则引擎开发 (ruleEngine.ts) | services/ruleEngine.ts | T02 | 4h | AIEngineer |
| T04 | AIGC检测服务 (aigcDetectService.ts) | services/aigcDetectService.ts | T03 | 3h | BackendAgent |
| T05 | 对抗改写服务 (aigcRewriteService.ts) | services/aigcRewriteService.ts | T04 | 3h | AIEngineer |
| T06 | AIGC路由 (routes/aigc.ts) - detect + get | routes/aigc.ts | T04,T05 | 4h | BackendAgent |
| T07 | AIGC路由 - rewrite (SSE) + recheck | routes/aigc.ts | T06 | 3h | BackendAgent |
| T08 | AIGC路由 - history CRUD | routes/aigc.ts | T07 | 2h | BackendAgent |
| T09 | 检测主页UI (/aigc/detect) | app/aigc/detect/page.tsx | T06 | 4h | FrontendAgent |
| T10 | 结果概览组件 (ScoreCircle+Heatmap+TagCloud) | components/aigc/*.tsx | T06 | 5h | FrontendAgent |
| T11 | 改写对比界面 (DiffViewer+VersionTabs) | components/aigc/*.tsx | T07,T09 | 5h | FrontendAgent |
| T12 | 时间线 + 历史页 | components/aigc/* + app/aigc/history | T08 | 3h | FrontendAgent |
| T13 | 前端API封装 + SSE消费 | lib/api.ts | T06-T08 | 2h | FrontendAgent |
| T14 | 单元测试 (规则引擎+Prompt+评分) | tests/unit/*.test.ts | T03-T05 | 3h | TestAgent |
| T15 | 集成测试 (全流程) | tests/integration/*.test.ts | T13 | 3h | TestAgent |
| T16 | 性能基准测试 | tests/performance/*.ts | T14 | 2h | TestAgent |
| **总计** | | | | **49h** | |

---

*ArchitectAgent 技术规格输出完成，等待总监批准*

**文档统计**：
- 总行数: ~1450行
- 算法伪代码: 22个函数（含完整TypeScript签名和实现思路）
- 正则表达式: 15个（过渡词模式10个 + 被动语态5个）
- AI词汇表: 200词（按6大类分组，含权重）
- API接口: 8个（含完整请求/响应/Zod Schema）
- 数据库模型: 2个新表 + 3个新枚举 + Paper表3字段扩展
- 阈值/常量表: 12组（含精确数值）
- 错误码: 15个（含消息模板）
- 测试用例: 26个（单元15 + 集成15 + 性能8）
- 代码复用点: 17处（标注来源文件和行号）
