'use client';

import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts/core';
import { ScatterChart } from 'echarts/charts';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([ScatterChart, CanvasRenderer]);

interface SegmentDataItem {
  index: number;
  score: number;
  riskLevel: string;
  wordCount: number;
  issues: string[];
  preview: string;
}

interface SegmentTimelineChartProps {
  data?: SegmentDataItem[];
}

const RISK_COLOR_MAP: Record<string, string> = {
  low: '#22c55e',
  medium: '#eab308',
  'medium-high': '#f97316',
  high: '#ef4444',
};

export default function SegmentTimelineChart({ data = [] }: SegmentTimelineChartProps) {
  const option = useMemo(() => {
    if (!data || data.length === 0) return {};

    const points = data.map((d) => [d.index, d.score]);
    const colors = data.map((d) => RISK_COLOR_MAP[d.riskLevel] || '#94a3b8');

    return {
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          if (!params.data) return '';
          const idx = params.data[0];
          const seg = data.find((d) => d.index === idx);
          if (!seg) return '';
          return `
            <div style="padding:4px 8px;font-size:12px;">
              <strong>第${seg.index}段落</strong><br/>
              AIGC疑似度: ${seg.score}%<br/>
              风险等级: ${seg.riskLevel}<br/>
              字数: ${seg.wordCount}
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
        top: 20,
        right: 20,
        bottom: 40,
        left: 50,
      },
      xAxis: {
        type: 'value',
        name: '段落位置',
        nameTextStyle: { fontSize: 11, color: '#64748b' },
        axisLabel: { fontSize: 11, fill: '#64748b' },
        splitLine: { show: false },
        axisLine: { lineStyle: { stroke: '#e2e8f0' } },
      },
      yAxis: {
        type: 'value',
        name: '风险分数',
        nameTextStyle: { fontSize: 11, color: '#64748b' },
        min: 0,
        max: 100,
        axisLabel: { fontSize: 11, fill: '#64748b' },
        splitLine: { lineStyle: { stroke: '#e2e8f0', type: 'dashed' } },
        axisLine: { show: false },
      },
      dataZoom: [
        {
          type: 'inside',
          xAxisIndex: 0,
          filterMode: 'none',
        },
        {
          type: 'slider',
          xAxisIndex: 0,
          height: 16,
          bottom: 5,
          borderColor: '#e2e8f0',
          fillerColor: 'rgba(59,130,246,0.1)',
          handleStyle: { color: '#3b82f6' },
          textStyle: { fontSize: 10, fill: '#94a3b8' },
        },
      ],
      series: [
        {
          type: 'scatter',
          symbolSize: (val: number[]) => Math.max(8, Math.min(24, val[1] / 5)),
          data: points.map((p, i) => ({
            value: p,
            itemStyle: { color: colors[i] },
          })),
          markLine: {
            silent: true,
            lineStyle: [{ color: '#ef4444', type: 'dashed', width: 1.5 }, { color: '#f59e0b', type: 'dashed', width: 1 }],
            label: [
              { show: true, formatter: '高风险阈值(70)', position: 'insideEndTop', fontSize: 10, fill: '#ef4444' },
              { show: true, formatter: '中风险阈值(40)', position: 'insideEndTop', fontSize: 10, fill: '#f59e0b' },
            ],
            data: [{ yAxis: 70 }, { yAxis: 40 }],
          },
        },
        {
          type: 'line',
          data: points.sort((a, b) => a[0] - b[0]),
          smooth: true,
          symbol: 'none',
          lineStyle: { color: '#93c5fd', width: 1, opacity: 0.5, type: 'dashed' },
        },
      ],
      animationDuration: 800,
      animationEasing: 'cubicOut',
    };
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-4 shadow-sm">
        <h3 className="font-semibold text-sm text-slate-800 mb-1">段落时间线</h3>
        <p className="text-xs text-slate-500 mb-2">各段落风险分数分布</p>
        <div className="flex items-center justify-center" style={{ minHeight: 250 }}>
          <p className="text-sm text-slate-400">暂无数据</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <h3 className="font-semibold text-sm text-slate-800 mb-1">段落时间线</h3>
      <p className="text-xs text-slate-500 mb-2">
        各段落风险分数分布 · 共{data.length}段
      </p>
      <ReactECharts
        option={option}
        style={{ height: 300 }}
        opts={{ renderer: 'canvas' }}
        notMerge={true}
        lazyUpdate={true}
      />
    </div>
  );
}
