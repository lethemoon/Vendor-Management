/**
 * 图表数据聚合服务
 * 基于技术规格文档 TECH_SPEC-图表生成-MVP.md 第4.3节
 *
 * 职责:
 * - AIGC检测数据的图表聚合（风险分布、段落时间线、优化趋势等）
 * - 知识库统计数据的图表聚合（类型分布、月度增长、引用趋势等）
 * - Redis缓存管理（TTL=300s）
 * - 数据转换和格式化
 *
 * 缓存策略:
 * - Key格式: chart:{type}:{id}:{period}
 * - TTL: 300秒（5分钟）
 */

import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import {
  RiskPieChartData,
  ParagraphHeatmapData,
  OptimizationTrendData,
  VersionCompareData,
  RiskGaugeData,
  AIGCDetailTableData,
  TypeDistributionData,
  MonthlyGrowthData,
  CitationTrendData,
  TopCitedDocumentsData,
  UserDashboardStats,
  ChartRiskLevel,
} from '../types/chart';

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

const CACHE_TTL = 300;

const RISK_COLOR_MAP: Record<ChartRiskLevel, { label: string; color: string }> = {
  low: { label: '低风险', color: '#22c55e' },
  medium: { label: '中风险', color: '#eab308' },
  'medium-high': { label: '中高风险', color: '#f97316' },
  high: { label: '高风险', color: '#ef4444' },
};

const DOCUMENT_TYPE_META: Record<string, { label: string; icon: string; color: string }> = {
  JOURNAL_ARTICLE: { label: '期刊文章', icon: '📄', color: '#3b82f6' },
  THESIS: { label: '学位论文', icon: '🎓', color: '#8b5cf6' },
  BOOK: { label: '书籍', icon: '📚', color: '#f59e0b' },
  CONFERENCE_PAPER: { label: '会议论文', icon: '📢', color: '#10b981' },
  WEBPAGE: { label: '网页', icon: '🌐', color: '#6b7280' },
  PATENT: { label: '专利', icon: '💡', color: '#ec4899' },
};

const CITATION_FORMAT_META: Record<string, { displayName: string; fullName: string; color: string }> = {
  GBT7714: { displayName: 'GB/T 7714', fullName: 'GB/T 7714-2015', color: '#ef4444' },
  APA7: { displayName: 'APA 7th', fullName: 'Publication Manual of APA, 7th Ed.', color: '#3b82f6' },
  MLA9: { displayName: 'MLA 9th', fullName: 'MLA Handbook, 9th Edition', color: '#22c55e' },
};

function getScoreColor(score: number): string {
  if (score <= 20) return '#bbf7d0';
  if (score <= 40) return '#fef08a';
  if (score <= 60) return '#fed7aa';
  if (score <= 80) return '#fecaca';
  return '#fca5a5';
}

function getCitationColor(rank: number, maxRank: number): string {
  const ratio = rank / maxRank;
  const r = Math.round(59 + (99 - 59) * ratio);
  const g = Math.round(130 + (179 - 130) * ratio);
  const b = Math.round(246 + (253 - 246) * ratio);
  return `rgb(${r}, ${g}, ${b})`;
}

async function getFromCache<T>(key: string): Promise<T | null> {
  try {
    const cached = await redis.get(key);
    if (cached) {
      return JSON.parse(cached) as T;
    }
    return null;
  } catch (error) {
    console.warn(`[ChartService] 缓存读取失败: ${key}`, error);
    return null;
  }
}

async function setCache<T>(key: string, data: T, ttl: number = CACHE_TTL): Promise<void> {
  try {
    await redis.setex(key, ttl, JSON.stringify(data));
  } catch (error) {
    console.warn(`[ChartService] 缓存写入失败: ${key}`, error);
  }
}

export const chartService = {
  async getAIGCRiskDistribution(aigcId: string): Promise<RiskPieChartData> {
    const cacheKey = `chart:aigc:risk-distribution:${aigcId}`;
    const cached = await getFromCache<RiskPieChartData>(cacheKey);
    if (cached) return cached;

    const detection = await prisma.aIGCDetection.findUnique({
      where: { id: aigcId },
      select: { result: true, overallScore: true },
    });

    if (!detection) {
      throw new Error('检测记录不存在');
    }

    const result = detection.result as any;
    const paragraphs: Array<{
      index: number;
      score: number;
      riskLevel: string;
    }> = result?.paragraphs || [];

    const riskCounts: Record<string, number> = {};
    let totalScore = 0;

    paragraphs.forEach((p) => {
      riskCounts[p.riskLevel] = (riskCounts[p.riskLevel] || 0) + 1;
      totalScore += p.score || 0;
    });

    const segments = Object.entries(RISK_COLOR_MAP).map(([level, config]) => ({
      riskLevel: level as ChartRiskLevel,
      label: config.label,
      count: riskCounts[level] || 0,
      percentage:
        paragraphs.length > 0
          ? Math.round(((riskCounts[level] || 0) / paragraphs.length) * 1000) / 10
          : 0,
      color: config.color,
    }));

    const data: RiskPieChartData = {
      segments,
      totalParagraphs: paragraphs.length,
      overallScore:
        paragraphs.length > 0 ? Math.round(totalScore / paragraphs.length) : 0,
    };

    await setCache(cacheKey, data);
    return data;
  },

  async getAIGCSegmentsTimeline(
    aigcId: string,
    sortBy: 'index' | 'score_asc' | 'score_desc' = 'index',
    filterBy: 'all' | 'low' | 'medium' | 'medium-high' | 'high' = 'all'
  ): Promise<ParagraphHeatmapData> {
    const cacheKey = `chart:aigc:segments-timeline:${aigcId}:${sortBy}:${filterBy}`;
    const cached = await getFromCache<ParagraphHeatmapData>(cacheKey);
    if (cached) return cached;

    const detection = await prisma.aIGCDetection.findUnique({
      where: { id: aigcId },
      select: { result: true },
    });

    if (!detection) {
      throw new Error('检测记录不存在');
    }

    const result = detection.result as any;
    let paragraphs: Array<{
      index: number;
      score: number;
      riskLevel: string;
      wordCount: number;
      issues: string[];
      preview: string;
    }> = result?.paragraphs || [];

    if (filterBy !== 'all') {
      paragraphs = paragraphs.filter((p) => p.riskLevel === filterBy);
    }

    if (sortBy === 'score_asc') {
      paragraphs.sort((a, b) => a.score - b.score);
    } else if (sortBy === 'score_desc') {
      paragraphs.sort((a, b) => b.score - a.score);
    }

    const processedParagraphs = paragraphs.map((p) => ({
      index: p.index,
      score: p.score,
      riskLevel: p.riskLevel,
      wordCount: p.wordCount || 0,
      issues: p.issues || [],
      preview: p.preview || '',
      color: getScoreColor(p.score),
      displayName: `P${p.index + 1}`,
    }));

    const data: ParagraphHeatmapData = {
      paragraphs: processedParagraphs,
      sortBy,
      filterBy,
    };

    await setCache(cacheKey, data);
    return data;
  },

  async getAIGCOptimizationTrend(aigcId: string): Promise<OptimizationTrendData> {
    const cacheKey = `chart:aigc:optimization-trend:${aigcId}`;
    const cached = await getFromCache<OptimizationTrendData>(cacheKey);
    if (cached) return cached;

    const detection = await prisma.aIGCDetection.findUnique({
      where: { id: aigcId },
      select: {
        overallScore: true,
        createdAt: true,
        result: true,
        optimizations: {
          where: { deletedAt: null },
          orderBy: { roundNumber: 'asc' },
          select: {
            roundNumber: true,
            operationType: true,
            beforeAigcRate: true,
            afterAigcRate: true,
            rateChange: true,
            targetParagraphIndices: true,
            createdAt: true,
          },
        },
      },
    });

    if (!detection) {
      throw new Error('检测记录不存在');
    }

    const points: OptimizationTrendData['points'] = [
      {
        roundLabel: '初始',
        roundNumber: 0,
        score: detection.overallScore || 0,
        changeFromPrevious: null,
        timestamp: detection.createdAt?.toISOString() || new Date().toISOString(),
        actions: undefined,
        isRebound: false,
      },
    ];

    detection.optimizations.forEach((opt) => {
      const prevScore =
        points.length > 0 ? points[points.length - 1].score : (opt.beforeAigcRate ?? 0);
      const afterRate = opt.afterAigcRate ?? 0;
      const change = Math.round((afterRate - prevScore) * 100) / 100;

      points.push({
        roundLabel: `R${opt.roundNumber ?? 0}`,
        roundNumber: opt.roundNumber ?? 0,
        score: afterRate,
        changeFromPrevious: change,
        timestamp: opt.createdAt?.toISOString() || new Date().toISOString(),
        actions: opt.targetParagraphIndices
          ? `改写P${opt.targetParagraphIndices.join(',P')}`
          : undefined,
        isRebound: change > 0,
      });
    });

    const lastScore = points[points.length - 1]?.score || 0;
    const safeThreshold = 20;

    const data: OptimizationTrendData = {
      points,
      safeThreshold,
      targetAchieved: lastScore < safeThreshold,
    };

    await setCache(cacheKey, data);
    return data;
  },

  async getAIGCRiskGauge(aigcId: string): Promise<RiskGaugeData> {
    const cacheKey = `chart:aigc:risk-gauge:${aigcId}`;
    const cached = await getFromCache<RiskGaugeData>(cacheKey);
    if (cached) return cached;

    const detection = await prisma.aIGCDetection.findUnique({
      where: { id: aigcId },
      select: { overallScore: true, riskLevel: true },
    });

    if (!detection) {
      throw new Error('检测记录不存在');
    }

    const score = detection.overallScore || 0;
    let riskLevel: ChartRiskLevel = 'low';
    let label = '安全';
    let color = RISK_COLOR_MAP.low.color;

    if (score >= 70) {
      riskLevel = 'high';
      label = '高危';
      color = RISK_COLOR_MAP.high.color;
    } else if (score >= 50) {
      riskLevel = 'medium-high';
      label = '中高风险';
      color = RISK_COLOR_MAP['medium-high'].color;
    } else if (score >= 30) {
      riskLevel = 'medium';
      label = '中风险';
      color = RISK_COLOR_MAP.medium.color;
    }

    const data: RiskGaugeData = {
      score,
      riskLevel,
      label,
      color,
      min: 0,
      max: 100,
      thresholds: {
        low: 20,
        medium: 40,
        mediumHigh: 60,
        high: 80,
      },
    };

    await setCache(cacheKey, data);
    return data;
  },

  async getAIGCDetailTable(
    aigcId: string,
    page: number = 1,
    pageSize: number = 20,
    sortBy: 'index' | 'score_asc' | 'score_desc' = 'index',
    filterBy: 'all' | 'low' | 'medium' | 'medium-high' | 'high' = 'all'
  ): Promise<AIGCDetailTableData> {
    const cacheKey = `chart:aigc:detail-table:${aigcId}:${page}:${pageSize}:${sortBy}:${filterBy}`;
    const cached = await getFromCache<AIGCDetailTableData>(cacheKey);
    if (cached) return cached;

    const detection = await prisma.aIGCDetection.findUnique({
      where: { id: aigcId },
      select: { result: true, overallScore: true },
    });

    if (!detection) {
      throw new Error('检测记录不存在');
    }

    const result = detection.result as any;
    let allItems: Array<{
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
    }> = result?.paragraphs || [];

    if (filterBy !== 'all') {
      allItems = allItems.filter((p) => p.riskLevel === filterBy);
    }

    if (sortBy === 'score_asc') {
      allItems.sort((a, b) => a.score - b.score);
    } else if (sortBy === 'score_desc') {
      allItems.sort((a, b) => b.score - a.score);
    }

    const totalCount = allItems.length;
    const startIndex = (page - 1) * pageSize;
    const paginatedItems = allItems.slice(startIndex, startIndex + pageSize);

    const highRiskCount = allItems.filter(
      (p) => p.riskLevel === 'high' || p.riskLevel === 'medium-high'
    ).length;

    const data: AIGCDetailTableData = {
      items: paginatedItems,
      totalItems: totalCount,
      overallScore: detection.overallScore || 0,
      highRiskCount,
    };

    await setCache(cacheKey, data, 60);
    return data;
  },

  async getLibraryTypeStats(userId: string): Promise<TypeDistributionData> {
    const cacheKey = `chart:library:type-distribution:${userId}`;
    const cached = await getFromCache<TypeDistributionData>(cacheKey);
    if (cached) return cached;

    const documents = await prisma.document.findMany({
      where: { userId, deletedAt: null },
      select: { type: true },
    });

    const typeCounts: Record<string, number> = {};
    documents.forEach((doc) => {
      typeCounts[doc.type] = (typeCounts[doc.type] || 0) + 1;
    });

    const total = documents.length;
    const types = Object.entries(typeCounts)
      .map(([type, count]) => {
        const meta = DOCUMENT_TYPE_META[type] || {
          label: type,
          icon: '📋',
          color: '#94a3b8',
        };
        return {
          type,
          ...meta,
          count,
          percentage: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
        };
      })
      .sort((a, b) => b.count - a.count);

    const data: TypeDistributionData = {
      totalDocuments: total,
      types,
    };

    await setCache(cacheKey, data);
    return data;
  },

  async getLibraryCitationTrend(
    userId: string,
    months: number = 6
  ): Promise<CitationTrendData> {
    const cacheKey = `chart:library:citation-trend:${userId}:${months}m`;
    const cached = await getFromCache<CitationTrendData>(cacheKey);
    if (cached) return cached;

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const citations = await prisma.paperCitation.findMany({
      where: {
        paper: { userId },
        createdAt: { gte: startDate },
      },
      select: {
        createdAt: true,
        format: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const monthlyData: Record<string, number> = {};
    for (let i = 0; i < months; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() - months + i + 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyData[key] = 0;
    }

    citations.forEach((citation) => {
      const date = citation.createdAt;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyData.hasOwnProperty(key)) {
        monthlyData[key]++;
      }
    });

    const sortedMonths = Object.keys(monthlyData).sort();
    let cumulativeTotal = 0;
    const dataPoints = sortedMonths.map((month) => {
      cumulativeTotal += monthlyData[month];
      const [year, monthNum] = month.split('-');
      return {
        periodLabel: month,
        displayLabel: `${parseInt(monthNum)}月`,
        count: monthlyData[month],
        cumulativeTotal,
      };
    });

    const data: CitationTrendData = {
      period: 'monthly',
      dataPoints,
      totalCitations: cumulativeTotal,
    };

    await setCache(cacheKey, data);
    return data;
  },

  async getLibraryMonthlyGrowth(
    userId: string,
    months: number = 6
  ): Promise<MonthlyGrowthData> {
    const cacheKey = `chart:library:monthly-growth:${userId}:${months}m`;
    const cached = await getFromCache<MonthlyGrowthData>(cacheKey);
    if (cached) return cached;

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    const documents = await prisma.document.findMany({
      where: {
        userId,
        deletedAt: null,
        createdAt: { gte: startDate },
      },
      select: {
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const monthlyData: Record<string, { added: number; total: number }> = {};

    const existingDocs = await prisma.document.count({
      where: {
        userId,
        deletedAt: null,
        createdAt: { lt: startDate },
      },
    });
    let runningTotal = existingDocs;

    for (let i = 0; i < months; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() - months + i + 1);
      date.setDate(1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyData[key] = { added: 0, total: runningTotal };
    }

    documents.forEach((doc) => {
      const date = doc.createdAt;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyData.hasOwnProperty(key)) {
        monthlyData[key].added++;
        monthlyData[key].total++;
      }
    });

    const sortedMonths = Object.keys(monthlyData).sort();
    let peakMonth: string | null = null;
    let maxAdded = 0;
    let totalAdded = 0;

    const dataPoints = sortedMonths.map((month) => {
      const data = monthlyData[month];
      totalAdded += data.added;
      if (data.added > maxAdded) {
        maxAdded = data.added;
        peakMonth = month;
      }
      const [year, monthNum] = month.split('-');
      return {
        month: `${parseInt(monthNum)}月`,
        addedCount: data.added,
        totalCount: data.total,
      };
    });

    const finalTotal = await prisma.document.count({
      where: { userId, deletedAt: null },
    });

    const data: MonthlyGrowthData = {
      dataPoints,
      totalDocuments: finalTotal,
      averageMonthlyGrowth:
        months > 0 ? Math.round((totalAdded / months) * 10) / 10 : 0,
      peakMonth,
    };

    await setCache(cacheKey, data);
    return data;
  },

  async getTopCitedDocuments(userId: string, limit: number = 10): Promise<TopCitedDocumentsData> {
    const cacheKey = `chart:library:top-cited:${userId}:${limit}`;
    const cached = await getFromCache<TopCitedDocumentsData>(cacheKey);
    if (cached) return cached;

    const topDocs = await prisma.$queryRaw<Array<{
      document_id: string;
      title: string;
      authors: string;
      year: number;
      type: string;
      citation_count: bigint;
    }>>`
      SELECT d.id AS document_id, d.title, d.authors, d.year, d.type, COUNT(pc.id) AS citation_count
      FROM "Document" d
      INNER JOIN "PaperCitation" pc ON pc."documentId" = d.id
      INNER JOIN "Paper" p ON pc."paperId" = p.id
      WHERE p."userId" = ${userId} AND d."deletedAt" IS NULL
      GROUP BY d.id, d.title, d.authors, d.year, d.type
      ORDER BY citation_count DESC
      LIMIT ${limit}
    `;

    const totalCitationsResult = await prisma.$queryRaw<Array<{ total: bigint }>>`
      SELECT COUNT(pc.id)::bigint AS total
      FROM "PaperCitation" pc
      INNER JOIN "Paper" p ON pc."paperId" = p.id
      WHERE p."userId" = ${userId}
    `;

    const totalCitations = Number(totalCitationsResult[0]?.total || 0);

    const rankings = topDocs.map((doc, index) => {
      const displayTitle =
        doc.title.length > 27 ? doc.title.substring(0, 27) + '...' : doc.title;
      return {
        rank: index + 1,
        documentId: doc.document_id,
        title: doc.title,
        displayTitle,
        authors: doc.authors || '',
        year: doc.year,
        type: doc.type,
        citationCount: Number(doc.citation_count),
        percentageOfTotal:
          totalCitations > 0
            ? Math.round((Number(doc.citation_count) / totalCitations) * 1000) / 10
            : 0,
        color: getCitationColor(index + 1, limit),
      };
    });

    const data: TopCitedDocumentsData = {
      rankings,
      totalCitedDocuments: topDocs.length,
      totalCitations,
    };

    await setCache(cacheKey, data);
    return data;
  },

  async getUserActivityStats(userId: string): Promise<UserDashboardStats> {
    const cacheKey = `chart:user:activity-stats:${userId}`;
    const cached = await getFromCache<UserDashboardStats>(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalDocuments, totalDetections, thisMonthAdded, thisMonthDetected, avgRiskResult] =
      await Promise.all([
        prisma.document.count({ where: { userId, deletedAt: null } }),
        prisma.aIGCDetection.count({ where: { userId, deletedAt: null } }),
        prisma.document.count({
          where: { userId, deletedAt: null, createdAt: { gte: startOfMonth } },
        }),
        prisma.aIGCDetection.count({
          where: { userId, deletedAt: null, createdAt: { gte: startOfMonth } },
        }),
        prisma.aIGCDetection.aggregate({
          where: { userId, deletedAt: null },
          _avg: { overallScore: true },
        }),
      ]);

    const totalCitationsResult = await prisma.$queryRaw<Array<{ total: bigint }>>`
      SELECT COUNT(pc.id)::bigint AS total
      FROM "PaperCitation" pc
      INNER JOIN "Paper" p ON pc."paperId" = p.id
      WHERE p."userId" = ${userId}
    `;
    const totalCitations = Number(totalCitationsResult[0]?.total || 0);

    const formatUsageResult = await prisma.$queryRaw<Array<{ format: string; count: bigint }>>`
      SELECT format, COUNT(*)::bigint AS count
      FROM "PaperCitation" pc
      INNER JOIN "Paper" p ON pc."paperId" = p.id
      WHERE p."userId" = ${userId}
      GROUP BY format
      ORDER BY count DESC
      LIMIT 1
    `;
    const mostUsedFormat = formatUsageResult.length > 0 ? formatUsageResult[0].format : 'GBT7714';

    const lastDetection = await prisma.aIGCDetection.findFirst({
      where: { userId, deletedAt: null },
      orderBy: { updatedAt: 'desc' },
      select: { updatedAt: true },
    });

    const data: UserDashboardStats = {
      totalDocuments,
      totalDetections,
      totalCitations,
      thisMonthAdded,
      thisMonthDetected,
      averageRiskScore: Math.round(avgRiskResult._avg.overallScore || 0),
      mostUsedFormat,
      lastActivityAt: lastDetection?.updatedAt?.toISOString() || new Date().toISOString(),
    };

    await setCache(cacheKey, data, 180);
    return data;
  },
};
