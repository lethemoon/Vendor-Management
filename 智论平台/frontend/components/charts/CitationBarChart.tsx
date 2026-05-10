'use client';

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts';
import ChartContainer from './ChartContainer';
import ChartExportButton from './ChartExportButton';

interface CitationBarDataItem {
  periodLabel: string;
  displayLabel: string;
  count: number;
  cumulativeTotal?: number;
  changeFromPrevious?: number | null;
  isCurrentPeriod?: boolean;
  isPeak?: boolean;
}

interface CitationBarChartProps {
  data?: CitationBarDataItem[];
  period?: 'month' | 'quarter';
}

function getScoreColor(score: number): string {
  if (score <= 20) return '#bbf7d0';
  if (score <= 40) return '#fef08a';
  if (score <= 60) return '#fed7aa';
  if (score <= 80) return '#fecaca';
  return '#fca5a5';
}

export default function CitationBarChart({
  data = [],
  period = 'month',
}: CitationBarChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  const displayData = useMemo(
    () =>
      data.map((d) => ({
        ...d,
        fill: d.isPeak ? '#3b82f6' : d.isCurrentPeriod ? '#60a5fa' : '#93c5fd',
      })),
    [data]
  );

  if (!data || data.length === 0) {
    return (
      <ChartContainer title="引用趋势" description={`${period === 'month' ? '月度' : '季度'}引用统计`}>
        <div className="flex items-center justify-center" style={{ minHeight: 250 }}>
          <p className="text-sm text-slate-400">暂无数据</p>
        </div>
      </ChartContainer>
    );
  }

  return (
    <ChartContainer
      title="引用趋势"
      description={`${period === 'month' ? '月度' : '季度'}引用统计`}
      actions={<ChartExportButton targetRef={chartRef} filename="引用趋势" />}
    >
      <div ref={chartRef}>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart
            data={displayData}
            margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
          >
            <defs>
              <linearGradient id="citationGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#93c5fd" stopOpacity={0.7} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="displayLabel"
              tick={{ fontSize: 11, fill: '#64748b' }}
              axisLine={{ stroke: '#e2e8f0' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#64748b' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as CitationBarDataItem;
                return (
                  <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg">
                    <p className="text-sm font-semibold text-slate-800 mb-1">
                      📅 {d.displayLabel}
                    </p>
                    <div className="space-y-0.5">
                      <div className="flex justify-between gap-4">
                        <span className="text-xs text-slate-500">新增引用</span>
                        <span className="text-xs font-semibold text-slate-800 tabular-nums">
                          {d.count} 次
                        </span>
                      </div>
                      {d.cumulativeTotal !== undefined && (
                        <div className="flex justify-between gap-4">
                          <span className="text-xs text-slate-500">累计总量</span>
                          <span className="text-xs font-semibold text-slate-800 tabular-nums">
                            {d.cumulativeTotal}
                          </span>
                        </div>
                      )}
                      {d.changeFromPrevious != null && (
                        <div className="flex justify-between gap-4">
                          <span className="text-xs text-slate-500">较上期</span>
                          <span
                            className={`text-xs font-semibold tabular-nums ${
                              d.changeFromPrevious >= 0
                                ? 'text-green-600'
                                : 'text-red-500'
                            }`}
                          >
                            {d.changeFromPrevious > 0 ? '+' : ''}
                            {d.changeFromPrevious}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              }}
            />
            <Bar dataKey="count" fill="url(#citationGradient)" radius={[4, 4, 0, 0]} maxBarSize={48}>
              {displayData.map((entry, index) => (
                <Cell key={index} fill={entry.fill} />
              ))}
              <LabelList
                dataKey="count"
                position="top"
                fontSize={11}
                fill="#64748b"
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartContainer>
  );
}

import { useRef } from 'react';
