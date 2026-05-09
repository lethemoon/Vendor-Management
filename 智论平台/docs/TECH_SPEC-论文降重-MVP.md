# 论文降重 MVP版本 技术规格

> 版本：1.0.0  
> 日期：2026-05-09  
> 负责人：ArchitectAgent  
> 状态：待批准

---

## 架构设计

### 系统架构

```
┌─────────────────────────────────────────────────────────┐
│                     前端层 (Next.js)                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │ 文本编辑器 │  │ 降重处理页 │  │ 历史记录页 │              │
│  └──────────┘  └──────────┘  └──────────┘              │
└────────────────────┬────────────────────────────────────┘
                     │ HTTP/HTTPS
┌────────────────────▼────────────────────────────────────┐
│                   API层 (Fastify)                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │ 论文路由  │  │ 分析路由  │  │ 改写路由  │              │
│  └──────────┘  └──────────┘  └──────────┘              │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                   服务层 (Services)                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │ 论文服务  │  │ 分析服务  │  │ 改写服务  │              │
│  └──────────┘  └──────────┘  └──────────┘              │
│  ┌──────────┐  ┌──────────┐                            │
│  │ AI服务   │  │ 报告服务  │                            │
│  └──────────┘  └──────────┘                            │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                 数据层 + AI层                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │ PostgreSQL│  │ Redis    │  │ DeepSeek/硅基流动 │        │
│  └──────────┘  └──────────┘  └──────────┘              │
└─────────────────────────────────────────────────────────┘
```

---

## AI改写策略设计

### Prompt模板设计

#### 主改写Prompt模板

```
你是一位专业的学术写作助手。请根据以下规则对给定文本进行智能改写：

【改写目标】
- 保持原文的核心含义和学术观点不变
- 降低文本的重复率（与已有文献的相似度）
- 改写后的文本应该通顺自然、符合学术规范
- 避免使用过于口语化的表达

【改写参数】
- 改写强度：{strength}（轻度/中度/重度）
- 写作风格：{style}（学术风格/正式风格/简洁风格）
- 保护术语：{protectedTerms}（专有名词列表）

【原文】
{originalText}

【输出要求】
1. 输出改写后的完整文本
2. 标注修改的位置和类型（同义词替换/句式重组/段落重构）
3. 提供改写置信度评分（0-100分）
```

#### 多版本变体Prompt

为了提供多个改写版本，使用以下变体：

**版本A - 保守型**：
- 同义词替换为主
- 句式微调
- 适合保守降重需求

**版本B - 平衡型**：
- 同义词替换 + 句式重组
- 适度调整段落结构
- 平衡质量和降重效果

**版本C - 激进型**：
- 大幅句式重组
- 段落重构
- 最大化降重效果

### 改写参数结构

```typescript
interface RewriteRequest {
  paperId: string;
  paragraphs: string[];           // 待改写的段落列表
  options: {
    strength: 'light' | 'medium' | 'heavy';  // 改写强度
    style: 'academic' | 'formal' | 'concise';      // 写作风格
    protectedTerms: string[];                          // 保护术语列表
    versions: number;                                    // 生成版本数(默认3)
  };
}

interface RewriteResponse {
  results: RewriteResult[];
  summary: {
    originalRate: number;       // 原始重复率
    estimatedNewRate: number;   // 预估新重复率
    improvement: number;         // 降低幅度
  };
}

interface RewriteResult {
  paragraphIndex: number;
  versions: RewriteVersion[];
}

interface RewriteVersion {
  versionId: string;
  content: string;             // 改写后内容
  changes: Change[];            // 修改记录
  confidence: number;           // 置信度评分
}
```

### 质量评估脚本思路

```typescript
// 伪代码示例
async function evaluateRewrite(original: string, rewritten: string): Promise<number> {
  // 1. 语义相似度检查（使用嵌入模型）
  const similarity = await calculateSemanticSimilarity(original, rewritten);
  
  // 2. 重复率预估（模拟查重算法）
  const newPlagiarismRate = await estimatePlagiarismRate(rewritten);
  
  // 3. 通顺度评分（基于语言模型perplexity）
  const fluencyScore = await evaluateFluency(rewritten);
  
  // 4. 综合评分
  const overallScore = (
    similarity * 0.3 +
    (1 - newPlagiarismRate) * 0.4 +
    fluencyScore * 0.3
  );
  
  return overallScore * 100;
}
```

---

## API接口定义

### 1. 上传论文

**接口：** `POST /api/v1/papers/upload`

**请求参数：**
```typescript
{
  title?: string;          // 论文标题（可选）
  content: string;         // 文本内容（必填）
  source?: 'paste' | 'upload';  // 来源类型
}
```

**响应结构：**
```typescript
{
  success: boolean;
  data: {
    paper: {
      id: string;
      title: string;
      wordCount: number;
      createdAt: string;
    };
  };
  message: string;
}
```

**验证规则：**
```typescript
const uploadSchema = z.object({
  title: z.string().max(200).optional(),
  content: z.string()
    .min(100, '内容至少100字')
    .max(50000, '内容不能超过50000字'),
});
```

---

### 2. 分析论文重复率

**接口：** `POST /api/v1/papers/:id/analyze`

**响应结构：**
```typescript
{
  success: boolean;
  data: {
    analysis: {
      totalWords: number;
      plagiarismRate: number;     // 总体重复率
      aigcRate: number;           // AIGC疑似率
      paragraphs: ParagraphAnalysis[];
    };
  };
}
```

**ParagraphAnalysis结构：**
```typescript
interface ParagraphAnalysis {
  index: number;
  text: string;
  plagiarismRate: number;      // 该段重复率
  riskLevel: 'low' | 'medium' | 'high';
  sources?: SourceMatch[];      // 匹配来源（如果有）
}
```

**性能要求：**
- 5000字以内：< 3秒
- 5000-20000字：< 5秒
- 20000字以上：< 10秒

---

### 3. 智能改写

**接口：** `POST /api/v1/papers/:id/rewrite`

**请求参数：**
```typescript
{
  paragraphIndices: number[];    // 要改写的段落索引
  options: {
    strength: 'medium';
    style: 'academic';
    protectedTerms: string[];
    versions: 3;
  };
}
```

**响应结构（流式输出）：**
```typescript
{
  success: boolean;
  data: {
    rewriteId: string;
    results: RewriteResult[];
    summary: {
      originalRate: number;
      estimatedNewRate: number;
      improvement: number;
      apiCost: number;          // 本次API调用成本
    };
  };
}
```

**流式输出支持：**
- 使用Server-Sent Events (SSE)
- 实时推送每个段落的改写结果
- 显示进度条

---

### 4. 获取降重报告

**接口：** `GET /api/v1/papers/:id/report`

**响应结构：**
```typescript
{
  success: boolean;
  data: {
    report: {
      paperInfo: {
        id: string;
        title: string;
        createdAt: string;
        wordCount: number;
      };
      summary: {
        originalRate: number;
        finalRate: number;
        improvement: number;
        rewrittenParagraphs: number;
        totalParagraphs: number;
      };
      details: ReportDetail[];
    };
  };
}
```

---

## 性能优化方案

### 1. 大文本处理策略

**分段处理：**
```typescript
// 将长文本分成段落（按句子或固定长度）
function splitIntoChunks(text: string, chunkSize: number = 1000): string[] {
  const sentences = text.match(/[^。！？.!?]+[。！？.!?]/g) || [];
  const chunks: string[] = [];
  let currentChunk = '';
  
  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > chunkSize && currentChunk) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += sentence;
    }
  }
  
  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}
```

**并行处理：**
```typescript
// 使用Promise.all并行处理多个段落
const results = await Promise.all(
  paragraphs.map(para => rewriteParagraph(para))
);
```

### 2. 流式输出实现

```typescript
// 使用SSE实时推送改写结果
app.post('/api/v1/papers/:id/rewrite', async (request, reply) => {
  const stream = new PassThrough();
  reply.raw(stream).type('text/event-stream');
  
  // 发送SSE头部
  stream.write('event: start\n');
  stream.write('data: {"status":"processing"}\n\n');
  
  // 逐个段落处理并推送
  for (let i = 0; i < paragraphs.length; i++) {
    const result = await rewriteParagraph(paragraphs[i]);
    
    stream.write('event: progress\n');
    stream.write(`data: ${JSON.stringify({
      index: i,
      total: paragraphs.length,
      result
    })}\n\n`);
  }
  
  // 发送完成事件
  stream.write('event: complete\n');
  stream.write('data: {"status":"done"}\n\n');
  stream.end();
});
```

### 3. 缓存策略

**Redis缓存层级：**

| 缓存类型 | Key格式 | TTL | 用途 |
|---------|--------|-----|------|
| 论文分析结果 | `analysis:{paperId}` | 24h | 避免重复分析 |
| 改写结果 | `rewrite:{paragraphHash}` | 7d | 相同段落复用 |
| API调用统计 | `usage:{userId}:daily` | 24h | 配额管理 |
| 用户Token配额 | `quota:{userId}` | 实时 | 成本控制 |

**缓存命中逻辑：**
```typescript
async function getOrCacheRewrite(text: string, hash: string): Promise<RewriteResult> {
  const cacheKey = `rewrite:${hash}`;
  const cached = await redis.get(cacheKey);
  
  if (cached) {
    return JSON.parse(cached);
  }
  
  const result = await callAIForRewrite(text);
  await redis.setex(cacheKey, 7 * 24 * 3600, JSON.stringify(result));
  
  return result;
}
```

---

## 成本控制方案

### Token使用统计

```typescript
interface UsageStats {
  userId: string;
  date: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  apiCalls: number;
}

// 每次调用后更新统计
async function recordUsage(userId: string, usage: UsageRecord) {
  const key = `usage:${userId}:${new Date().toISOString().split('T')[0]}`;
  await redis.incrby(key, usage.cost);
}
```

### 配额管理

```typescript
// 用户每日免费额度
const DAILY_FREE_QUOTA = {
  inputTokens: 50000,      // 5万输入Token
  outputTokens: 150000,    // 15万输出Token
  cost: 10,               // 10元/天
};

// 超额提示
if (userUsage.cost >= DAILY_FREE_QUOTA.cost) {
  throw new Error('今日额度已用完，请明天再试或升级会员');
}
```

### 成本估算

| 操作 | 输入Token | 输出Token | 成本(¥) |
|-----|----------|----------|---------|
| 单段改写(~200字) | ~300 | ~800 | ¥0.06 |
| 全文分析(~5000字) | ~7000 | ~1000 | ¥0.08 |
| 完整降重(~5000字) | ~35000 | ~45000 | ¥0.35 |

---

## 安全性设计

### 1. 数据加密

**传输加密：**
- HTTPS强制使用
- JWT Token安全存储

**存储加密：**
- 论文内容AES-256加密存储
- 敏感字段单独加密

```typescript
import { createCipheriv, randomBytes, createDecipheriv } from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const KEY = process.env.ENCRYPTION_KEY!;

function encrypt(text: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, Buffer.from(KEY), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted = cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

function decrypt(encryptedText: string): string {
  const [ivHex, encrypted] = encryptedText.split(':');
  const decipher = createDecipheriv(ALGORITHM, Buffer.from(KEY), Buffer.from(ivHex, 'hex'));
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted = decipher.final('utf8');
  return decrypted;
}
```

### 2. 隐私保护

**数据保留策略：**
- 用户主动删除后立即清除
- 历史记录保留30天后自动删除
- 不用于训练AI模型

**访问控制：**
- 仅登录用户可访问自己的论文
- API调用频率限制（每分钟10次）
- 批量操作限制（每次最多20段）

### 3. 日志审计

**操作日志：**
```typescript
interface AuditLog {
  userId: string;
  action: string;        // analyze/rewrite/export
  resourceId: string;
  ipAddress: string;
  timestamp: Date;
  details: object;
}
```

---

## 错误处理

### 统一错误格式

```typescript
enum PaperErrorCode {
  PAPER_NOT_FOUND = 'PAPER_NOT_FOUND',
  PAPER_NOT_OWNED = 'PAPER_NOT_OWNED',
  CONTENT_TOO_LONG = 'CONTENT_TOO_LONG',
  ANALYSIS_FAILED = 'ANALYSIS_FAILED',
  REWRITE_FAILED = 'REWRITE_FAILED',
  AI_SERVICE_ERROR = 'AI_SERVICE_ERROR',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  RATE_LIMITED = 'RATE_LIMITED',
}
```

### 重试机制

**AI服务调用重试：**
- 最大重试次数：3次
- 重试间隔：1s, 2s, 4s（指数退避）
- 重试条件：网络错误、服务超时
- 不重试：参数错误、认证失败

---

## 测试策略

### 单元测试重点

```typescript
describe('RewriteService', () => {
  it('should generate valid rewrite prompt', () => {
    const prompt = generateRewritePrompt(originalText, options);
    expect(prompt).toContain('保持原文的核心含义');
    expect(prompt).toContain('降低文本的重复率');
  });
  
  it('should protect specified terms', () => {
    const result = await rewriteWithProtection(text, ['机器学习']);
    expect(result).toContain('机器学习'); // 术语应被保护
  });
  
  it('should meet quality threshold', () => {
    const score = await evaluateQuality(original, rewritten);
    expect(score).toBeGreaterThan(70);
  });
});
```

### 性能测试指标

| 场景 | 目标 | 测量方法 |
|-----|------|---------|
| 文本上传响应 | < 1s | 接口耗时 |
| 分析5000字文本 | < 3s | 接口耗时 |
| 单段改写 | < 5s | 接口耗时 |
| 并发10个改写请求 | < 30s | 总耗时 |
| 内存占用 | < 512MB | 进程监控 |

---

## 用户体验影响评估请求

**@ProductAgent** 请从用户体验角度评估此技术方案：

1. **改写流程**：流式输出是否足够直观？是否需要更明确的进度反馈？
2. **多版本选择**：3个版本是否足够？如何帮助用户快速选择最佳版本？
3. **错误处理**：AI服务失败时的降级方案是否友好？
4. **成本透明**：是否需要实时显示API调用成本？
5. **移动端体验**：大文本编辑在移动端的可用性？

---

*ArchitectAgent 技术规格输出完成，等待总监批准*
