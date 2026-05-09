/**
 * 论文降重系统类型定义
 * 基于技术规格文档 TECH_SPEC-论文降重-MVP.md
 */

// ==================== 改写相关类型 ====================

/** 改写强度选项 */
export type RewriteStrength = 'light' | 'medium' | 'heavy';

/** 写作风格选项 */
export type RewriteStyle = 'academic' | 'formal' | 'concise';

/** 修改类型 */
export type ChangeType = 'synonym_replace' | 'sentence_restructure' | 'paragraph_reorganize';

/** API操作类型 */
export type OperationType = 'analyze' | 'rewrite' | 'evaluate';

/** 风险等级 */
export type RiskLevel = 'low' | 'medium' | 'high';

/** 改写选项配置 */
export interface RewriteOptions {
  /** 改写强度：轻度/中度/重度 */
  strength: RewriteStrength;
  /** 写作风格：学术/正式/简洁 */
  style: RewriteStyle;
  /** 保护术语列表（专有名词，改写时原样保留） */
  protectedTerms: string[];
  /** 生成版本数量（默认3） */
  versions: number;
}

/** 改写请求 */
export interface RewriteRequest {
  /** 论文ID */
  paperId: string;
  /** 待改写的段落列表 */
  paragraphs: string[];
  /** 改写选项 */
  options: RewriteOptions;
}

/** 文本位置范围 */
export interface TextPosition {
  /** 起始位置 */
  start: number;
  /** 结束位置 */
  end: number;
}

/** 单次修改记录 */
export interface Change {
  /** 修改类型 */
  type: ChangeType;
  /** 修改位置 */
  position: TextPosition;
  /** 原文片段 */
  original: string;
  /** 改写后文本 */
  rewritten: string;
}

/** 单个改写版本 */
export interface RewriteVersion {
  /** 版本唯一标识 */
  versionId: string;
  /** 改写后内容 */
  content: string;
  /** 修改记录列表 */
  changes: Change[];
  /** 置信度评分 (0-100) */
  confidence: number;
}

/** 单个段落的改写结果 */
export interface RewriteResult {
  /** 段落索引 */
  paragraphIndex: number;
  /** 多个改写版本 */
  versions: RewriteVersion[];
}

/** 改写响应摘要 */
export interface RewriteSummary {
  /** 原始重复率 */
  originalRate: number;
  /** 预估新重复率 */
  estimatedNewRate: number;
  /** 降低幅度（百分比） */
  improvement: number;
}

/** 改写响应 */
export interface RewriteResponse {
  /** 各段落改写结果 */
  results: RewriteResult[];
  /** 改写摘要统计 */
  summary: RewriteSummary;
  /** 本次API调用成本（元） */
  apiCost?: number;
}

// ==================== 分析相关类型 ====================

/** 来源匹配信息 */
export interface SourceMatch {
  /** 匹配来源名称 */
  source: string;
  /** 相似度 (0-1) */
  similarity: number;
  /** 来源URL（可选） */
  url?: string;
}

/** 单段分析结果 */
export interface ParagraphAnalysis {
  /** 段落索引 */
  index: number;
  /** 段落文本 */
  text: string;
  /** 该段重复率 (0-1) */
  plagiarismRate: number;
  /** 风险等级 */
  riskLevel: RiskLevel;
  /** 匹配来源列表（可选） */
  sources?: SourceMatch[];
}

/** 论文分析结果 */
export interface PaperAnalysis {
  /** 总字数 */
  totalWords: number;
  /** 总体重复率 (0-1) */
  plagiarismRate: number;
  /** AIGC疑似率 (0-1) */
  aigcRate: number;
  /** 各段落分析结果 */
  paragraphs: ParagraphAnalysis[];
}

// ==================== 质量评估相关类型 ====================

/** 质量评分结果 */
export interface QualityScore {
  /** 综合评分 (0-100) */
  overall: number;
  /** 语义相似度 (0-1, 越高越好，但不宜=1) */
  semanticSimilarity: number;
  /** 预估新重复率 (0-1, 越低越好) */
  plagiarismEstimate: number;
  /** 通顺度评分 (0-1) */
  fluencyScore: number;
  /** 评估置信度 (0-1) */
  confidence: number;
  /** 改进建议列表 */
  suggestions: string[];
}

// ==================== Token使用与成本相关类型 ====================

/** Token使用记录 */
export interface TokenUsage {
  /** 用户ID */
  userId: string;
  /** 输入Token数 */
  inputTokens: number;
  /** 输出Token数 */
  outputTokens: number;
  /** 成本（元） */
  cost: number;
  /** 时间戳 */
  timestamp: Date;
  /** 操作类型 */
  operation: OperationType;
}

/** 用户每日使用量统计 */
export interface DailyUsage {
  /** 输入Token总数 */
  inputTokens: number;
  /** 输出Token总数 */
  outputTokens: number;
  /** 总成本（元） */
  cost: number;
  /** API调用次数 */
  apiCalls: number;
}

/** 配额检查结果 */
export interface QuotaCheckResult {
  /** 是否在配额内 */
  withinQuota: boolean;
  /** 剩余额度 */
  remaining: {
    /** 剩余输入Token */
    inputTokens: number;
    /** 剩余输出Token */
    outputTokens: number;
    /** 剩余成本额度（元） */
    cost: number;
  };
}

/** 成本估算配置 */
export interface CostEstimate {
  /** 输入Token估算 */
  inputTokens: number;
  /** 输出Token估算 */
  outputTokens: number;
  /** 成本估算（元） */
  cost: number;
}

// ==================== DeepSeek API配置类型 ====================

/** DeepSeek API客户端配置 */
export interface DeepSeekConfig {
  /** API密钥 */
  apiKey: string;
  /** API基础URL */
  baseUrl: string;
  /** 模型名称 */
  model: string;
  /** 最大生成Token数 */
  maxTokens: number;
  /** 温度参数（控制随机性） */
  temperature: number;
  /** 请求超时时间（毫秒） */
  timeout: number;
  /** 最大重试次数 */
  maxRetries: number;
}

// ==================== 错误处理类型 ====================

/** AI服务错误代码 */
export type AIServiceErrorCode = 'RATE_LIMITED' | 'TIMEOUT' | 'AUTH_FAILED' | 'UNKNOWN';

/** 自定义AI服务错误类 */
export class AIServiceError extends Error {
  /** 错误代码 */
  public readonly code: AIServiceErrorCode;
  /** 是否可重试 */
  public readonly retryable: boolean;
  /** 原始错误（如果有） */
  public readonly cause?: Error;

  constructor(
    message: string,
    code: AIServiceErrorCode,
    retryable: boolean,
    cause?: Error
  ) {
    super(message);
    this.name = 'AIServiceError';
    this.code = code;
    this.retryable = retryable;
    this.cause = cause;
  }
}

/** 论文操作错误代码 */
export enum PaperErrorCode {
  PAPER_NOT_FOUND = 'PAPER_NOT_FOUND',
  PAPER_NOT_OWNED = 'PAPER_NOT_OWNED',
  CONTENT_TOO_LONG = 'CONTENT_TOO_LONG',
  ANALYSIS_FAILED = 'ANALYSIS_FAILED',
  REWRITE_FAILED = 'REWRITE_FAILED',
  AI_SERVICE_ERROR = 'AI_SERVICE_ERROR',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  RATE_LIMITED = 'RATE_LIMITED',
}

// ==================== 缓存相关类型 ====================

/** 缓存条目 */
export interface CacheEntry<T> {
  /** 缓存数据 */
  data: T;
  /** 创建时间 */
  createdAt: Date;
  /** 过期时间（TTL秒） */
  ttl: number;
}

// ==================== 流式响应类型 ====================

/** SSE事件类型 */
export type SSEEventType = 'start' | 'progress' | 'complete' | 'error';

/** SSE进度事件数据 */
export interface SSEProgressData {
  /** 当前处理的段落索引 */
  index: number;
  /** 总段落数 */
  total: number;
  /** 当前段落改写结果 */
  result?: RewriteResult;
}

/** SSE事件 */
export interface SSEEvent {
  /** 事件类型 */
  event: SSEEventType;
  /** 事件数据 */
  data: unknown;
  /** 时间戳 */
  timestamp: Date;
}
