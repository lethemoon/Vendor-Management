/**
 * 图表生成系统类型定义
 * 基于技术规格文档 TECH_SPEC-图表生成-MVP.md 第1.3节和第4.2节
 * 包含AIGC检测可视化和知识库统计面板的所有数据接口
 */

import { z } from 'zod';

// ==================== 主题与配色系统 ====================

/** 风险等级颜色映射 */
export interface RiskColorMap {
  low: string;
  medium: string;
  mediumHigh: string;
  high: string;
}

/** 文献类型颜色映射 */
export interface DocumentTypeColorMap {
  JOURNAL_ARTICLE: string;
  THESIS: string;
  BOOK: string;
  CONFERENCE_PAPER: string;
  WEBPAGE: string;
  PATENT: string;
}

/** 引用格式颜色映射 */
export interface CitationFormatColorMap {
  GBT7714: string;
  APA7: string;
  MLA9: string;
}

/** 图表完整色彩方案 */
export interface ChartColors {
  primary: string;
  secondary: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  risk: RiskColorMap;
  documentType: DocumentTypeColorMap;
  citationFormat: CitationFormatColorMap;
  background: string;
  surface: string;
  border: string;
  gridLine: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
}

/** 图表主题配置（light/dark/colorblind） */
export interface ChartTheme {
  id: string;
  name: string;
  colors: ChartColors;
  gradient: {
    areaStart: string;
    areaEnd: string;
    areaOpacity: number;
  };
  font: {
    family: string;
    sizeAxis: number;
    sizeLabel: number;
    sizeTitle: number;
    sizeTooltip: number;
    sizeLegend: number;
    weightNormal: number;
    weightBold: number;
  };
  animation: {
    duration: number;
    easing: string;
    staggerDelay: number;
    isActive: boolean;
  };
}

// ==================== 场景①：AIGC检测可视化数据接口 ====================

/** 风险等级（用于图表） */
export type ChartRiskLevel = 'low' | 'medium' | 'medium-high' | 'high';

/** 风险分布饼图数据段 */
export interface RiskPieSegment {
  riskLevel: ChartRiskLevel;
  label: string;
  count: number;
  percentage: number;
  color: string;
}

/** 风险分布饼图完整数据 */
export interface RiskPieChartData {
  segments: RiskPieSegment[];
  totalParagraphs: number;
  overallScore: number;
}

/** 段落热力图数据项 */
export interface ParagraphHeatmapItem {
  index: number;
  score: number;
  riskLevel: string;
  wordCount: number;
  issues: string[];
  preview: string;
  color: string;
  displayName: string;
}

/** 段落热力图完整数据 */
export interface ParagraphHeatmapData {
  paragraphs: ParagraphHeatmapItem[];
  sortBy: 'index' | 'score_asc' | 'score_desc';
  filterBy: 'all' | 'low' | 'medium' | 'medium-high' | 'high';
}

/** 优化趋势数据点 */
export interface OptimizationTrendPoint {
  roundLabel: string;
  roundNumber: number;
  score: number;
  changeFromPrevious: number | null;
  timestamp: string;
  actions?: string;
  isRebound: boolean;
}

/** 优化趋势折线图完整数据 */
export interface OptimizationTrendData {
  points: OptimizationTrendPoint[];
  safeThreshold: number;
  targetAchieved: boolean;
}

/** 版本对比维度元数据 */
export interface VersionCompareDimension {
  name: string;
  key: string;
  lowerIsBetter: boolean;
  unit: string;
}

/** 版本对比版本数据 */
export interface VersionCompareVersion {
  label: string;
  versionId: string;
  color: string;
  values: Record<string, number>;
  isRecommended: boolean;
}

/** 版本对比柱状图完整数据 */
export interface VersionCompareData {
  dimensions: VersionCompareDimension[];
  versions: VersionCompareVersion[];
}

/** AIGC风险仪表盘简化版数据 */
export interface RiskGaugeData {
  score: number;
  riskLevel: ChartRiskLevel;
  label: string;
  color: string;
  min: number;
  max: number;
  thresholds: {
    low: number;
    medium: number;
    mediumHigh: number;
    high: number;
  };
}

/** AIGC详细数据表项 */
export interface AIGCDetailTableItem {
  index: number;
  preview: string;
  score: number;
  riskLevel: string;
  wordCount: number;
  issues: string[];
  ruleBreakdown: {
    ttr: number;
    sentenceVariance: number;
    vocabulary: number;
    transitions: number;
    passiveVoice: number;
  };
}

/** AIGC详细数据表完整数据 */
export interface AIGCDetailTableData {
  items: AIGCDetailTableItem[];
  totalItems: number;
  overallScore: number;
  highRiskCount: number;
}

// ==================== 场景②：知识库统计数据接口 ====================

/** 文献类型分布数据项 */
export interface TypeDistributionItem {
  type: string;
  label: string;
  icon: string;
  count: number;
  percentage: number;
  color: string;
}

/** 文献类型分布饼图完整数据 */
export interface TypeDistributionData {
  totalDocuments: number;
  types: TypeDistributionItem[];
  othersCount?: number;
}

/** 月度趋势数据点 */
export interface MonthlyTrendDataPoint {
  periodLabel: string;
  displayLabel: string;
  count: number;
  cumulativeTotal: number;
  changeFromPrevious: number | null;
  isCurrentPeriod: boolean;
  isPeak: boolean;
}

/** 月度趋势面积图完整数据 */
export interface MonthlyTrendData {
  period: 'monthly' | 'weekly';
  dataPoints: MonthlyTrendDataPoint[];
  average: number;
  maxCount: number;
  minCount: number;
  stagnantMonths: number[];
}

/** 引用趋势数据点 */
export interface CitationTrendDataPoint {
  periodLabel: string;
  displayLabel: string;
  count: number;
  cumulativeTotal: number;
}

/** 引用趋势完整数据 */
export interface CitationTrendData {
  period: 'monthly' | 'weekly';
  dataPoints: CitationTrendDataPoint[];
  totalCitations: number;
}

/** 月度增长数据点 */
export interface MonthlyGrowthDataPoint {
  month: string;
  addedCount: number;
  totalCount: number;
}

/** 月度增长完整数据 */
export interface MonthlyGrowthData {
  dataPoints: MonthlyGrowthDataPoint[];
  totalDocuments: number;
  averageMonthlyGrowth: number;
  peakMonth: string | null;
}

/** TOP10被引文献排行项 */
export interface TopCitedDocumentItem {
  rank: number;
  documentId: string;
  title: string;
  displayTitle: string;
  authors: string;
  year: number;
  type: string;
  citationCount: number;
  percentageOfTotal: number;
  color: string;
}

/** TOP10被引文献排行榜完整数据 */
export interface TopCitedDocumentsData {
  rankings: TopCitedDocumentItem[];
  totalCitedDocuments: number;
  totalCitations: number;
}

// ==================== 统计概览数据 ====================

/** 用户仪表盘统计概览 */
export interface UserDashboardStats {
  totalDocuments: number;
  totalDetections: number;
  totalCitations: number;
  thisMonthAdded: number;
  thisMonthDetected: number;
  averageRiskScore: number;
  mostUsedFormat: string;
  lastActivityAt: string;
}

// ==================== 通用请求/响应类型 ====================

/** 图表API通用成功响应 */
export interface ChartSuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    cached: boolean;
    generatedAt: string;
    ttl: number;
  };
}

/** 图表API通用错误响应 */
export interface ChartErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/** 图表API请求参数 - 风险分布 */
export interface RiskDistributionRequest {
  detectionId: string;
}

/** 图表API请求参数 - 段落时间线 */
export interface SegmentsTimelineRequest {
  detectionId: string;
  sortBy?: 'index' | 'score_asc' | 'score_desc';
  filterBy?: 'all' | 'low' | 'medium' | 'medium-high' | 'high';
}

/** 图表API请求参数 - 库统计 */
export interface LibraryStatsRequest {
  userId: string;
  months?: number;
  limit?: number;
}

// ==================== 错误码枚举 ====================

/** 图表系统错误码 */
export enum ChartErrorCode {
  CHART_DATA_NOT_FOUND = 'CHART_DATA_NOT_FOUND',
  DETECTION_NOT_FOUND = 'DETECTION_NOT_FOUND',
  INVALID_PARAMETERS = 'INVALID_PARAMETERS',
  CACHE_ERROR = 'CACHE_ERROR',
  AGGREGATION_FAILED = 'AGGREGATION_FAILED',
  NOT_AUTHORIZED = 'NOT_AUTHORIZATION_REQUIRED',
}

/** 图表错误消息映射表 */
export const CHART_ERROR_MESSAGES: Record<ChartErrorCode, string> = {
  [ChartErrorCode.CHART_DATA_NOT_FOUND]: '图表数据不存在或无法生成',
  [ChartErrorCode.DETECTION_NOT_FOUND]: '检测记录不存在或无权访问',
  [ChartErrorCode.INVALID_PARAMETERS]: '请求参数无效',
  [ChartErrorCode.CACHE_ERROR]: '缓存操作失败',
  [ChartErrorCode.AGGREGATION_FAILED]: '数据聚合处理失败',
  [ChartErrorCode.NOT_AUTHORIZED]: '未授权访问，请先登录',
};

// ==================== Zod Schema 定义 ====================

/** 排序方式枚举 */
const SortByEnum = z.enum(['index', 'score_asc', 'score_desc']);

/** 风险等级筛选枚举 */
const FilterByEnum = z.enum(['all', 'low', 'medium', 'medium-high', 'high']);

/** 时间粒度枚举 */
const PeriodEnum = z.enum(['monthly', 'weekly']);

/** 图表 Schema 集合 */
export const chartSchemas = {
  /** AIGC图表 - 风险分布查询参数 */
  riskDistributionQuery: z.object({
    id: z.string().uuid('无效的检测记录ID格式'),
  }),

  /** AIGC图表 - 段落时间线查询参数 */
  segmentsTimelineQuery: z.object({
    id: z.string().uuid('无效的检测记录ID格式'),
    sortBy: SortByEnum.default('index'),
    filterBy: FilterByEnum.default('all'),
  }),

  /** AIGC图表 - 风险仪表盘查询参数 */
  riskGaugeQuery: z.object({
    id: z.string().uuid('无效的检测记录ID格式'),
  }),

  /** AIGC图表 - 详细数据表查询参数 */
  detailTableQuery: z.object({
    id: z.string().uuid('无效的检测记录ID格式'),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    sortBy: SortByEnum.default('index'),
    filterBy: FilterByEnum.default('all'),
  }),

  /** Library图表 - 统计概览查询参数 */
  overviewQuery: z.object({}),

  /** Library图表 - 类型分布查询参数 */
  typeDistributionQuery: z.object({}),

  /** Library图表 - 引用趋势查询参数 */
  citationTrendQuery: z.object({
    months: z.coerce.number().int().min(1).max(24).default(6),
    period: PeriodEnum.default('monthly'),
  }),

  /** Library图表 - 月度增长查询参数 */
  monthlyGrowthQuery: z.object({
    months: z.coerce.number().int().min(1).max(24).default(6),
  }),
};
