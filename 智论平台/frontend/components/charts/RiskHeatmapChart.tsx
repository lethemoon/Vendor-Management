'use client';

import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts/core';
import { HeatmapChart } from 'echarts/charts';
import { VisualMapComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([HeatmapChart, VisualMapComponent, CanvasRenderer]);

interface HeatmapDataPoint {
  x: string;
  y: string;
  value: number;
  label?: string;
}

interface RiskHeatmapChartProps {
  data?: HeatmapDataPoint[];
}

export default function RiskHeatmapChart({ data = [] }: RiskHeatmapChartProps) {
  const option = useMemo(() => {
    if (!data || data.length === 0) return {};

    const xCategories = Array.from(new Set(data.map((d) => d.x)));
    const yCategories = Array.from(new Set(data.map((d) => d.y)));

    const heatmapData = data.map((d) => [
      xCategories.indexOf(d.x),
      yCategories.indexOf(d.y),
      d.value,
      d.label || '',
    ]);

    return {
      tooltip: {
        position: 'top',
        formatter: (params: any) => {
          const [xIdx, yIdx, value, label] = params.data;
          return `
            <div style="padding:4px 8px;font-size:12px;">
              <strong>${xCategories[xIdx]} - ${yCategories[yIdx]}</strong><br/>
              风险强度: ${value}<br/>
              ${label ? `<span style="color:#64748b">${label}</span>` : ''}
            </div>
          `;
        },
        backgroundColor: '#fff',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        borderRadius: 6,
        textStyle: { color: '#1e293b' },
      },
      grid: {
        top: 10,
        right: 80,
        bottom: 60,
        left: 80,
      },
      xAxis: {
        type: 'category',
        data: xCategories,
        axisLabel: {
          fontSize: 11,
          color: '#64748b',
          rotate: xCategories.length > 8 ? 30 : 0,
        },
        splitArea: { show: true },
        axisLine: { lineStyle: { stroke: '#e2e8f0' } },
        axisTick: { alignWithLabel: true },
      },
      yAxis: {
        type: 'category',
        data: yCategories,
        axisLabel: {
          fontSize: 11,
          color: '#64748b',
        },
        splitArea: { show: true },
        axisLine: { lineStyle: { stroke: '#e2e8f0' } },
      },
      visualMap: {
        min: 0,
        max: Math.max(...data.map((d) => d.value), 100),
        calculable: true,
        orient: 'vertical',
        right: 0,
        top: 'center',
        inRange: {
          color: ['#bbf7d0', '#fef08a', '#fed7aa', '#fecaca', '#fca5a5'],
        },
        textStyle: { fontSize: 11, color: '#64748b' },
        dimension: 2,
      },
      series: [
        {
          type: 'heatmap',
          data: heatmapData,
          label: {
            show: false,
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 8,
              shadowColor: 'rgba(0,0,0,0.15)',
            },
          },
          itemStyle: {
            borderColor: '#fff',
            borderWidth: 2,
            borderRadius: 3,
          },
        },
      ],
      animationDuration: 600,
      animationEasing: 'cubicOut',
    };
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-4 shadow-sm">
        <h3 className="font-semibold text-sm text-slate-800 mb-1">风险热力图</h3>
        <p className="text-xs text-slate-500 mb-2">章节与风险类型分布</p>
        <div className="flex items-center justify-center" style={{ minHeight: 250 }}>
          <p className="text-sm text-slate-400">暂无数据</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <h3 className="font-semibold text-sm text-slate-800 mb-1">风险热力图</h3>
      <p className="text-xs text-slate-500 mb-2">章节与风险类型分布</p>
      <ReactECharts
        option={option}
        style={{ height: 320 }}
        opts={{ renderer: 'canvas' }}
        notMerge={true}
        lazyUpdate={true}
      />
    </div>
  );
}
