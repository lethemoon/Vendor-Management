import apiClient from './api';

// ========== 图表数据类型定义 ==========

export interface RiskPieData {
  segments: Array<{
    riskLevel: 'low' | 'medium' | 'medium-high' | 'high';
    count: number;
    percentage: number;
    color: string;
    label: string;
  }>;
  totalParagraphs: number;
  overallScore: number;
}

export interface SegmentData {
  index: number;
  score: number;
  riskLevel: string;
  wordCount: number;
  issues: string[];
  preview: string;
}

export interface TypeTreeData {
  type: string;
  label: string;
  icon: string;
  count: number;
  percentage: number;
  color: string;
}

export interface CitationBarData {
  periodLabel: string;
  displayLabel: string;
  count: number;
  cumulativeTotal?: number;
  changeFromPrevious?: number | null;
  isCurrentPeriod?: boolean;
  isPeak?: boolean;
}

export interface GrowthData {
  month: string;
  count: number;
  cumulativeTotal?: number;
}

export interface RadarDataItem {
  name: string;
  value: number;
  max?: number;
}

export interface HeatmapDataPoint {
  x: string;
  y: string;
  value: number;
  label?: string;
}

// ========== chartApi ==========

export const chartApi = {
  // --- AIGC 检测图表 ---

  getAIGCRiskDist: async (id: string): Promise<{ success: boolean; data: RiskPieData }> => {
    const response = await apiClient.get(`/aigc/detections/${id}/chart/risk-pie`);
    return response.data;
  },

  getAIGCSegments: async (
    id: string,
    params?: { sortBy?: string; filterBy?: string }
  ): Promise<{ success: boolean; data: { paragraphs: SegmentData[] } }> => {
    const queryParams = new URLSearchParams();
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.filterBy) queryParams.append('filterBy', params.filterBy);
    const qs = queryParams.toString();
    const response = await apiClient.get(
      `/aigc/detections/${id}/chart/paragraph-heatmap${qs ? `?${qs}` : ''}`
    );
    return response.data;
  },

  // --- 知识库统计图表 ---

  getLibraryOverview: async (): Promise<{
    success: boolean;
    data: {
      totalCount: number;
      thisMonthCount: number;
      totalCitations: number;
      journalArticleCount: number;
    };
  }> => {
    const response = await apiClient.get('/library/stats/overview');
    return response.data;
  },

  getLibraryTypeDist: async (): Promise<{ success: boolean; data: { types: TypeTreeData[]; totalDocuments: number } }> => {
    const response = await apiClient.get('/library/stats/type-distribution');
    return response.data;
  },

  getLibraryCitationTrend: async (period?: string): Promise<{
    success: boolean;
    data: {
      average: number;
      maxCount: number;
      minCount: number;
      dataPoints: CitationBarData[];
    };
  }> => {
    const params = period ? `?period=${period}` : '';
    const response = await apiClient.get(`/library/stats/monthly-trend${params}`);
    return response.data;
  },

  getLibraryMonthlyGrowth: async (months = 6): Promise<{
    success: boolean;
    data: GrowthData[];
  }> => {
    const response = await apiClient.get(`/library/stats/monthly-growth?months=${months}`);
    return response.data;
  },
};
