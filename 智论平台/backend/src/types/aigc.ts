/**
 * AIGC检测与降痕系统类型定义
 * 基于技术规格文档 TECH_SPEC-AIGC检测-MVP.md 第4.7节
 */

import { z } from 'zod';

// ==================== 枚举类型 ====================

/** AIGC风险等级 */
export type AIGCRiskLevel = 'low' | 'medium' | 'medium-high' | 'high';

/** 检测状态 */
export type AIGCDetectionStatus = 'Pending' | 'Analyzing' | 'Analyzed' | 'Optimizing' | 'Completed' | 'Abandoned';

/** 检测来源 */
export type DetectionSource = 'paste' | 'file_import' | 'paper_linked';

/** 优化操作类型 */
export type OptimizationType = 'InitialDetect' | 'Rewrite' | 'Recheck' | 'ManualEdit';

/** 改写版本类型 */
export type RewriteVersionType = 'conservative' | 'balanced' | 'aggressive';

// ==================== 核心数据结构 ====================

/** 单个段落的检测结果 */
export interface ParagraphResult {
  /** 段落索引 */
  index: number;
  /** 预览文本（前100字符） */
  preview: string;
  /** 完整文本 */
  fullText: string;
  /** 综合评分 (0-100) */
  score: number;
  /** 风险等级 */
  riskLevel: AIGCRiskLevel;
  /** 问题列表 */
  issues: string[];
  /** 字数统计 */
  wordCount: number;
  /** 在原文中的起始偏移量 */
  startOffset: number;
  /** 在原文中的结束偏移量 */
  endOffset: number;
  /** 规则引擎细分得分 */
  ruleBreakdown: {
    ttr: number;
    sentenceVariance: number;
    vocabulary: number;
    transitions: number;
    passiveVoice: number;
  };
  /** LLM证据（可选） */
  llmEvidence?: string[];
}

/** 改写版本结果 */
export interface RewriteVersion {
  /** 版本唯一标识 */
  versionId: string;
  /** 版本标签 */
  label: RewriteVersionType;
  /** 版本显示名称 */
  labelText: string;
  /** 改写后文本 */
  text: string;
  /** 预估AIGC率 (0-100) */
  estimatedScore: number;
  /** 置信度 (0-100) */
  confidence: number;
  /** 变更摘要 */
  changesSummary: string;
  /** 差异对比片段 */
  diff: DiffSegment[];
}

/** Diff对比片段 */
export interface DiffSegment {
  /** 片段类型 */
  type: 'equal' | 'delete' | 'insert' | 'replace';
  /** 文本内容 */
  value: string;
}

/** 优化操作记录输出 */
export interface OptimizationRecordOutput {
  /** 记录ID */
  id: string;
  /** 轮次编号 */
  roundNumber: number;
  /** 操作类型 */
  operationType: OptimizationType;
  /** 操作前AIGC率 */
  beforeAigcRate: number;
  /** 操作后AIGC率 */
  afterAigcRate: number;
  /** 率变化值 */
  rateChange: number;
  /** 目标段落索引列表 */
  targetParagraphIndices: number[];
  /** 选中的版本ID */
  selectedVersion?: string;
  /** 处理耗时(ms) */
  processingTimeMs: number;
  /** 消耗积分 */
  costCredits: number;
  /** 创建时间 */
  createdAt: string;
  /** 详细信息（可选） */
  detail?: {
    originalTexts: string[];
    rewrittenTexts: string[];
  };
}

/** 检测详情 */
export interface DetectionDetail {
  /** 检测记录ID */
  id: string;
  /** 标题 */
  title: string;
  /** 总体评分 */
  overallScore: number;
  /** 风险等级 */
  riskLevel: AIGCRiskLevel;
  /** 检测状态 */
  status: AIGCDetectionStatus;
  /** 段落数量 */
  paragraphCount: number;
  /** 高风险段落数量 */
  highRiskCount: number;
  /** 优化轮次 */
  optimizationRounds: number;
  /** 来源 */
  source: DetectionSource;
  /** 处理耗时(ms) */
  processingTimeMs: number;
  /** 消耗积分 */
  creditsConsumed: number;
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
}

// ==================== API请求/响应类型 ====================

/** 检测请求 */
export interface DetectRequest {
  /** 待检测内容 (100-50000字) */
  content: string;
  /** 标题（可选，最大200字符） */
  title?: string;
  /** 来源 */
  source?: DetectionSource;
  /** 关联的论文ID（可选） */
  paperId?: string;
}

/** 检测响应 */
export interface DetectResponse {
  success: true;
  data: {
    detectionId: string;
    overallScore: number;
    riskLevel: AIGCRiskLevel;
    summary: string;
    paragraphs: ParagraphResult[];
    issueStatistics: Record<string, number>;
    processingTime: number;
    creditsConsumed: number;
    createdAt: string;
  };
  message: string;
}

/** 获取检测结果响应 */
export interface GetDetectionResponse {
  success: true;
  data: {
    detection: DetectionDetail;
    result: {
      summary: string;
      paragraphs: ParagraphResult[];
      issueStatistics: Record<string, number>;
    };
    timeline: OptimizationRecordOutput[];
  };
}

/** 改写请求 */
export interface RewriteRequest {
  /** 目标段落索引数组 (1-10个) */
  targetParagraphIndices: number[];
  /** 版本偏好 */
  versionPreference?: RewriteVersionType;
  /** 保护术语列表 */
  protectedTerms?: string[];
}

/** 复测请求 */
export interface RecheckRequest {
  /** 更新的段落列表 */
  updatedParagraphs: Array<{
    index: number;
    newText: string;
  }>;
}

/** 复测响应 */
export interface RecheckResponse {
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

/** 历史查询参数 */
export interface HistoryQueryParams {
  page?: number;
  pageSize?: number;
  status?: AIGCDetectionStatus;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: 'createdAt' | 'overallScore' | 'optimizationRounds';
  sortOrder?: 'asc' | 'desc';
}

/** 历史列表响应 */
export interface HistoryListResponse {
  success: true;
  data: {
    items: DetectionDetail[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

/** 历史详情响应 */
export interface HistoryDetailResponse extends GetDetectionResponse {}

// ==================== 规则引擎类型 ====================

/** TTR计算结果 */
export interface TTRResult {
  ttr: number;
  score: number;
  risk: 'high' | 'medium' | 'low';
}

/** 句长方差分析结果 */
export interface SentenceVarianceResult {
  variance: number;
  meanLength: number;
  sentenceCount: number;
  score: number;
  risk: 'high' | 'medium' | 'low';
}

/** AI词汇检测结果 */
export interface VocabularyDetectionResult {
  density: number;
  matchedWords: Array<{
    word: string;
    category: string;
    count: number;
  }>;
  score: number;
  risk: 'high' | 'medium' | 'low';
}

/** 过渡词模式检测结果 */
export interface TransitionPatternResult {
  patterns: Array<{
    label: string;
    count: number;
    penalty: number;
  }>;
  totalPenalty: number;
  score: number;
}

/** 被动语态检测结果 */
export interface PassiveVoiceResult {
  passiveCount: number;
  ratio: number;
  score: number;
}

/** 规则引擎综合结果 */
export interface RuleEngineResult {
  ttr: TTRResult;
  sentenceVariance: SentenceVarianceResult;
  vocabulary: VocabularyDetectionResult;
  transitions: TransitionPatternResult;
  passiveVoice: PassiveVoiceResult;
  weightedScore: number;
  issues: string[];
}

/** LLM检测结果 */
export interface LLMDetectResult {
  index: number;
  score: number;
  evidence: string[];
  reasoning: string;
}

/** 改写版本输出 */
export interface RewriteVersionOutput {
  versionId: string;
  label: RewriteVersionType;
  labelText: string;
  text: string;
  estimatedScore: number;
  confidence: number;
  changesSummary: string;
  diff: DiffSegment[];
}

/** 改写质量检查结果 */
export interface RewriteQualityCheck {
  passed: boolean;
  semanticSimilarity: number;
  termProtectionOk: boolean;
  missingTerms: string[];
  fluencyScore: number;
  suggestions: string[];
}

// ==================== 规则引擎专用类型 ====================

/** 规则引擎子模块风险等级 */
export type RuleRiskLevel = 'high' | 'medium' | 'low';

/** LLM检测输入段落 */
export interface DetectParagraph {
  /** 段落序号 */
  index: number;
  /** 段落文本 */
  text: string;
}

/** 改写选项（用于对抗性改写Prompt） */
export interface AIGCRewriteOptions {
  /** 改写版本类型 */
  version: RewriteVersionType;
  /** 该段落存在的AI特征问题列表 */
  issues: string[];
  /** 当前AIGC疑似度分数 */
  currentScore: number;
}

/** Diff片段类型 */
export type DiffSegmentType = 'equal' | 'delete' | 'insert' | 'replace';

/** AIGC改写质量评估结果 */
export interface AIGCRewriteQualityResult {
  /** 综合质量分 (0-100) */
  overall: number;
  /** 语义相似度 (0-1) */
  semanticSimilarity: number;
  /** AIGC率降低幅度 (0-1) */
  aigcScoreImprovement: number;
  /** 通顺度评分 (0-1) */
  fluencyScore: number;
  /** 评估置信度 (0-1) */
  confidence: number;
  /** 改进建议列表 */
  suggestions: string[];
}

// ==================== 错误码枚举 ====================

/** AIGC系统错误码 */
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

/** 错误消息映射表 */
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

// ==================== Zod Schema 定义 ====================

/** AIGC检测状态枚举（用于Zod） */
const AIGCDetectionStatusEnum = z.enum([
  'Pending',
  'Analyzing',
  'Analyzed',
  'Optimizing',
  'Completed',
  'Abandoned',
]);

/** AIGC Schema集合 */
export const aigcSchemas = {
  detect: z.object({
    content: z
      .string()
      .min(100, '文本太短，最少需要100字才能进行准确检测')
      .max(50000, '文本超出最大限制（50000字），请分段提交'),
    title: z
      .string()
      .min(1, '标题不能为空')
      .max(200, '标题不能超过200字符')
      .optional(),
    source: z
      .enum(['paste', 'file_import', 'paper_linked'])
      .default('paste'),
    paperId: z.string().uuid('无效的Paper ID格式').optional(),
  }),

  rewrite: z.object({
    targetParagraphIndices: z
      .array(z.number().int().min(0))
      .min(1, '至少选择1个段落进行改写')
      .max(10, '每次最多改写10个段落'),
    versionPreference: z
      .enum(['conservative', 'balanced', 'aggressive'])
      .default('balanced'),
    protectedTerms: z
      .array(z.string())
      .max(50, '保护术语最多50个')
      .default([]),
  }),

  recheck: z.object({
    updatedParagraphs: z
      .array(
        z.object({
          index: z.number().int().min(0),
          newText: z.string().min(10, '更新后的文本至少需要10个字符'),
        })
      )
      .min(1, '至少提供1个更新的段落')
      .max(20, '每次最多更新20个段落'),
  }),

  historyQuery: z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(50).default(10),
    status: AIGCDetectionStatusEnum.optional(),
    dateFrom: z.string().datetime().optional(),
    dateTo: z.string().datetime().optional(),
    sortBy: z
      .enum(['createdAt', 'overallScore', 'optimizationRounds'])
      .default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }),
};
