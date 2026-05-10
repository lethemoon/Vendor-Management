'use client';

import { useRef } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import ChartContainer from './ChartContainer';
import ChartExportButton from './ChartExportButton';

interface RiskPieDataItem {
  riskLevel: string;
  count: number;
  percentage: number;
  color: string;
  label: string;
}

interface RiskPieChartProps {
  data?: RiskPieDataItem[];
  score?: number;
  onSegmentClick?: (riskLevel: string) => void;
}

const RISK_COLORS = {
  low: '#22c55e',
  medium: '#eab308',
  'medium-high': '#f97316',
  high: '#ef4444',
};

export default function RiskPieChart({
  data = [],
  score = 0,
  onSegmentClick,
}: RiskPieChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  if (!data || data.length === 0) {
    return (
      <ChartContainer title="风险等级分布" description="AIGC疑似度分布情况">
        <div className="flex items-center justify-center" style={{ minHeight: 200 }}>
          <p className="text-sm text-slate-400">暂无数据</p>
        </div>
      </ChartContainer>
    );
  }

  const totalParagraphs = data.reduce((sum, d) => sum + d.count, 0);
  const allLow = data.length === 1 && data[0].riskLevel === 'low';
  const allHigh = data.length === 1 && data[0].riskLevel === 'high';

  const statusLabel = allLow ? '✅ 安全' : allHigh ? '⚠️ 高危' : null;
  const statusColor = allLow ? '#22c55e' : allHigh ? '#ef4444' : undefined;

  const handleClick = (entry: any, index: number) => {
    const riskLevel = entry?.riskLevel || (data[index]?.riskLevel);
    onSegmentClick?.(riskLevel);
  };

  return (
    <ChartContainer
      title="风险等级分布"
      description={`共 ${totalParagraphs} 个段落`}
      actions={<ChartExportButton targetRef={chartRef} filename="风险等级分布" />}
    >
      <div ref={chartRef}>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const item = payload[0].payload as RiskPieDataItem;
                return (
                  <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg">
                    <p className="text-sm font-semibold text-slate-800 mb-1">{item.label}</p>
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-xs text-slate-600">
                        {item.count} 段 ({item.percentage}%)
                      </span>
                    </div>
                  </div>
                );
              }}
            />
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={3}
              dataKey="count"
              nameKey="label"
              onClick={(entry: any, index: number) => handleClick(entry, index)}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color || RISK_COLORS[entry.riskLevel as keyof typeof RISK_COLORS] || '#94a3b8'}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        <div className="flex justify-center mt-2">
          <div className="relative w-[200px] h-[200px]" style={{ marginTop: -220 }}>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span
                className="font-bold tabular-nums"
                style={{
                  fontSize: 28,
                  color: statusColor || '#1e293b',
                }}
              >
                {statusLabel ?? `${Math.round(score)}%`}
              </span>
              <span className="text-xs text-slate-400 mt-0.5">
                {statusLabel ? '' : '总体评分'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </ChartContainer>
  );
}
