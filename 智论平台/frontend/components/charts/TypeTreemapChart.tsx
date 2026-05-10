'use client';

import { useState } from 'react';
import {
  Treemap,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import ChartContainer from './ChartContainer';
import ChartExportButton from './ChartExportButton';

interface TypeTreeDataItem {
  type: string;
  label: string;
  icon: string;
  count: number;
  percentage: number;
  color: string;
}

interface TypeTreemapChartProps {
  data?: TypeTreeDataItem[];
  onItemClick?: (type: string) => void;
}

const DEFAULT_COLORS: Record<string, string> = {
  JOURNAL_ARTICLE: '#3b82f6',
  THESIS: '#8b5cf6',
  BOOK: '#f59e0b',
  CONFERENCE_PAPER: '#10b981',
  WEBPAGE: '#6b7280',
  PATENT: '#ec4899',
};

const COLOR_VALUES: Record<string, string> = {
  '#3b82f6': '400',
  '#8b5cf6': '400',
  '#f59e0b': '400',
  '#10b981': '400',
  '#6b7280': '300',
  '#ec4899': '400',
};

export default function TypeTreemapChart({
  data = [],
  onItemClick,
}: TypeTreemapChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [activeType, setActiveType] = useState<string | null>(null);

  if (!data || data.length === 0) {
    return (
      <ChartContainer title="文献类型分布" description="按类型统计文献数量">
        <div className="flex flex-col items-center justify-center" style={{ minHeight: 240 }}>
          <span className="text-4xl mb-3">📚</span>
          <p className="text-sm text-slate-500 mb-3">暂无文献数据</p>
          <p className="text-xs text-slate-400">添加第一篇文献开始构建您的学术知识库</p>
        </div>
      </ChartContainer>
    );
  }

  const treemapData = [
    {
      name: '类型分布',
      children: data.map((d) => ({
        name: d.label,
        size: d.count,
        type: d.type,
        icon: d.icon,
        count: d.count,
        percentage: d.percentage,
        color: d.color || DEFAULT_COLORS[d.type] || '#94a3b8',
      })),
    },
  ];

  const handleClick = (entry: any) => {
    const type = entry?.type;
    if (type) {
      setActiveType(type === activeType ? null : type);
      onItemClick?.(type);
    }
  };

  return (
    <ChartContainer
      title="文献类型分布"
      description={`共 ${data.reduce((s, d) => s + d.count, 0)} 篇文献`}
      actions={<ChartExportButton targetRef={chartRef} filename="文献类型分布" />}
    >
      <div ref={chartRef}>
        <ResponsiveContainer width="100%" height={280}>
          <Treemap
            data={treemapData}
            dataKey="size"
            aspectRatio={4 / 3}
            stroke="#fff"
            content={({ x, y, width, height, ...rest }: any) => {
              const entry = rest as any;
              const isActive = activeType === entry.type;
              const bgColor = entry.color || '#94a3b8';
              const shade = COLOR_VALUES[bgColor] || '300';

              if (width < 30 || height < 30) return <g />;

              return (
                <g onClick={() => handleClick(entry)}>
                  <rect
                    x={x}
                    y={y}
                    width={width}
                    height={height}
                    fill={`bg-${bgColor}-${isActive ? '600' : shade}`}
                    style={{
                      fill: isActive ? bgColor : undefined,
                      opacity: isActive ? 1 : 0.85,
                    }}
                    stroke="#fff"
                    strokeWidth={2}
                    rx={4}
                    className="cursor-pointer hover:opacity-100 transition-opacity"
                  />
                  {width > 50 && height > 35 && (
                    <>
                      <text
                        x={x + width / 2}
                        y={y + height / 2 - 6}
                        textAnchor="middle"
                        fill="#fff"
                        fontSize={Math.min(width, height) > 80 ? 14 : 11}
                        fontWeight={600}
                        style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
                      >
                        {entry.icon} {entry.name}
                      </text>
                      <text
                        x={x + width / 2}
                        y={y + height / 2 + 12}
                        textAnchor="middle"
                        fill="rgba(255,255,255,0.85)"
                        fontSize={Math.min(width, height) > 80 ? 13 : 10}
                        fontWeight={500}
                        style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
                      >
                        {entry.count}篇 ({entry.percentage}%)
                      </text>
                    </>
                  )}
                </g>
              );
            }}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as any;
              return (
                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="w-3 h-3 rounded"
                      style={{ backgroundColor: d.color }}
                    />
                    <p className="text-sm font-semibold text-slate-800">
                      {d.icon} {d.name}
                    </p>
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex justify-between gap-4">
                      <span className="text-xs text-slate-500">数量</span>
                      <span className="text-xs font-semibold text-slate-800 tabular-nums">
                        {d.count} 篇
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-xs text-slate-500">占比</span>
                      <span className="text-xs font-semibold text-slate-800 tabular-nums">
                        {d.percentage}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            }}
          />
        </ResponsiveContainer>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
        {data.map((d) => (
          <button
            key={d.type}
            onClick={() => onItemClick?.(d.type)}
            className={`inline-flex items-center gap-1 text-xs transition-opacity cursor-pointer ${
              activeType === d.type ? 'opacity-100' : 'opacity-70 hover:opacity-100'
            }`}
          >
            <span
              className="w-2.5 h-2.5 rounded-sm"
              style={{ backgroundColor: d.color || DEFAULT_COLORS[d.type] }}
            />
            <span className="text-slate-600">{d.icon} {d.label}</span>
            <span className="font-medium text-slate-800 tabular-nums">{d.count}</span>
          </button>
        ))}
      </div>
    </ChartContainer>
  );
}

import { useRef } from 'react';
