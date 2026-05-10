'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Card,
  CardContent,
} from '@/components/ui/card';

import TypeTreemapChart from '@/components/charts/TypeTreemapChart';
import CitationBarChart from '@/components/charts/CitationBarChart';
import GrowthAreaChart from '@/components/charts/GrowthAreaChart';
import ActivityGaugeChart from '@/components/charts/ActivityGaugeChart';
import StatisticsBar from '@/components/library/StatisticsBar';
import { useChartData } from '@/components/charts/useChartData';
import { chartApi, type TypeTreeData, type CitationBarData, type GrowthData } from '@/lib/chartApi';
import { useLibraryStore } from '@/lib/stores/libraryStore';

interface KpiData {
  totalCount: number;
  thisMonthCount: number;
  totalCitations: number;
  journalArticleCount: number;
}

export default function LibraryStatsPage() {
  const { documents, loading: storeLoading } = useLibraryStore();

  const [kpiData, setKpiData] = useState<KpiData>({
    totalCount: 0,
    thisMonthCount: 0,
    totalCitations: 0,
    journalArticleCount: 0,
  });

  const { data: typeDistData, loading: typeLoading } = useChartData<{
    types: TypeTreeData[];
    totalDocuments: number;
  }>({
    apiFn: () => chartApi.getLibraryTypeDist(),
    transform: (raw) => raw.data,
  });

  const { data: citationTrendData, loading: citationLoading } = useChartData<{
    average: number;
    maxCount: number;
    minCount: number;
    dataPoints: CitationBarData[];
  }>({
    apiFn: () => chartApi.getLibraryCitationTrend('month'),
    transform: (raw) => raw.data,
  });

  const { data: growthData, loading: growthLoading } = useChartData<GrowthData[]>({
    apiFn: () => chartApi.getLibraryMonthlyGrowth(6),
    transform: (raw) => raw.data,
  });

  useEffect(() => {
    if (documents.length > 0) {
      const stats = documents.reduce(
        (acc, doc) => {
          acc.totalCount++;
          acc.totalCitations += doc.citationCount || 0;
          if (doc.type === 'JOURNAL_ARTICLE') acc.journalArticleCount++;
          return acc;
        },
        { totalCount: 0, thisMonthCount: 0, totalCitations: 0, journalArticleCount: 0 } as KpiData
      );

      const now = new Date();
      const thisMonth = documents.filter((doc) => {
        const d = new Date(doc.createdAt);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }).length;

      setKpiData({ ...stats, thisMonthCount: thisMonth });
    }
  }, [documents]);

  const avgCitationRate = kpiData.totalCount > 0
    ? ((kpiData.totalCitations / kpiData.totalCount) * 100).toFixed(1)
    : '0.0';

  const handleTypeClick = (type: string) => {
    console.log('筛选类型:', type);
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">📊 知识库统计</h1>
            <p className="mt-1 text-slate-600">我的文献库 · 数据概览</p>
          </div>
          <Link href="/library" aria-label="返回文献库">
            <button
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              ← 返回文献库
            </button>
          </Link>
        </div>

        <StatisticsBar
          totalCount={kpiData.totalCount}
          thisMonthCount={kpiData.thisMonthCount}
          journalArticleCount={kpiData.journalArticleCount}
          totalCitations={kpiData.totalCitations}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <TypeTreemapChart
            data={typeDistData?.types}
            onItemClick={handleTypeClick}
          />

          <CitationBarChart
            data={citationTrendData?.dataPoints}
            period="month"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <GrowthAreaChart
            data={growthData}
            showAverage
          />

          <Card className="shadow-sm p-4 min-h-[340px] flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 border-dashed border-slate-300">
            <span className="text-5xl mb-3 opacity-40">🚀</span>
            <p className="text-lg font-semibold text-slate-600 mb-1">即将上线</p>
            <p className="text-sm text-slate-400 text-center max-w-xs">
              TOP10被引文献排行榜 · 引用格式使用统计 · 更多图表功能正在开发中
            </p>
            <div className="mt-4 flex gap-2">
              <span className="px-2 py-1 text-[11px] rounded-full bg-blue-50 text-blue-600 border border-blue-200">
                Phase 2
              </span>
              <span className="px-2 py-1 text-[11px] rounded-full bg-purple-50 text-purple-600 border border-purple-200">
                ECharts
              </span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
