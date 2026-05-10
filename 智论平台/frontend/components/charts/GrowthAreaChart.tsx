'use client';

import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import ChartContainer from './ChartContainer';
import ChartExportButton from './ChartExportButton';

interface GrowthDataItem {
  month: string;
  count: number;
  cumulativeTotal?: number;
}

interface GrowthAreaChartProps {
  data?: GrowthDataItem[];
  showAverage?: boolean;
}

export default function GrowthAreaChart({
  data = [],
  showAverage = true,
}: GrowthAreaChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  const average = useMemo(() => {
    if (!showAverage || !data.length) return 0;
    return Math.round(data.reduce((sum, d) => sum + d.count, 0) / data.length);
  }, [data, showAverage]);

  if (!data || data.length === 0) {
    return (
      <ChartContainer title="月度增长" description="文献新增趋势">
        <div className="flex items-center justify-center" style={{ minHeight: 250 }}>
          <p className="text-sm text-slate-400">暂无数据</p>
        </div>
      </ChartContainer>
    );
  }

  return (
    <ChartContainer
      title="月度增长"
      description="文献新增趋势"
      actions={<ChartExportButton targetRef={chartRef} filename="月度增长" />}
    >
      <div ref={chartRef}>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="growthGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: '#64748b' }}
              axisLine={{ stroke: '#e2e8f0' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#64748b' }}
              axisLine={false}
              tickLine={false}
            />
            {showAverage && average > 0 && (
              <ReferenceLine
                y={average}
                stroke="#94a3b8"
                strokeDasharray="5 5"
                label={{
                  value: `月均 ${average}`,
                  position: 'right',
                  fill: '#94a3b8',
                  fontSize: 10,
                }}
              />
            )}
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as GrowthDataItem;
                return (
                  <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg">
                    <p className="text-sm font-semibold text-slate-800 mb-1">
                      📅 {d.month}
                    </p>
                    <div className="space-y-0.5">
                      <div className="flex justify-between gap-4">
                        <span className="text-xs text-slate-500">新增文献</span>
                        <span className="text-xs font-semibold text-slate-800 tabular-nums">
                          {d.count} 篇
                        </span>
                      </div>
                      {d.cumulativeTotal !== undefined && (
                        <div className="flex justify-between gap-4">
                          <span className="text-xs text-slate-500">累计总量</span>
                          <span className="text-xs font-semibold text-blue-600 tabular-nums">
                            {d.cumulativeTotal} 篇
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#growthGradient)"
              dot={{ r: 3, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
              activeDot={{ r: 5, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartContainer>
  );
}

import { useRef } from 'react';
