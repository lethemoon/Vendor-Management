'use client';

import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts/core';
import { RadarComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([RadarComponent, CanvasRenderer]);

interface RadarDataItem {
  name: string;
  value: number;
  max?: number;
}

interface KeywordRadarChartProps {
  data?: RadarDataItem[];
  categories?: string[];
}

export default function KeywordRadarChart({
  data = [],
  categories = ['关键词A', '关键词B', '关键词C', '关键词D', '关键词E'],
}: KeywordRadarChartProps) {
  const option = useMemo(() => {
    const indicators = categories.map((cat) => {
      const match = data.find((d) => d.name === cat);
      return {
        name: cat,
        max: match?.max || 100,
      };
    });

    const values = categories.map((cat) => {
      const match = data.find((d) => d.name === cat);
      return match?.value || 0;
    });

    return {
      tooltip: {
        trigger: 'item',
        backgroundColor: '#fff',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        borderRadius: 6,
        textStyle: { fontSize: 12, color: '#1e293b' },
        formatter: (params: any) => {
          const vals = params.value;
          let html = '<div style="padding:2px 4px;font-size:12px;">';
          indicators.forEach((ind, i) => {
            html += `${ind.name}: <b>${vals[i]}</b><br/>`;
          });
          html += '</div>';
          return html;
        },
      },
      radar: {
        indicator: indicators,
        shape: 'polygon',
        splitNumber: 4,
        axisName: {
          color: '#64748b',
          fontSize: 11,
        },
        splitLine: {
          lineStyle: { color: '#e2e8f0' },
        },
        splitArea: {
          areaStyle: {
            color: ['#f8fafc', '#f1f5f9', '#e2e8f0', '#cbd5e1'],
          },
        },
        axisLine: {
          lineStyle: { color: '#e2e8f0' },
        },
      },
      series: [
        {
          type: 'radar',
          data: [
            {
              value: values,
              name: '关键词权重',
              symbol: 'circle',
              symbolSize: 5,
              lineStyle: {
                color: '#3b82f6',
                width: 2,
              },
              areaStyle: {
                color: 'rgba(59,130,246,0.15)',
              },
              itemStyle: {
                color: '#3b82f6',
                borderColor: '#fff',
                borderWidth: 1.5,
              },
            },
          ],
        },
      ],
      animationDuration: 800,
      animationEasing: 'cubicOut',
    };
  }, [data, categories]);

  if (!data || data.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-4 shadow-sm">
        <h3 className="font-semibold text-sm text-slate-800 mb-1">关键词雷达图</h3>
        <p className="text-xs text-slate-500 mb-2">多维度关键词权重展示</p>
        <div className="flex items-center justify-center" style={{ minHeight: 250 }}>
          <p className="text-sm text-slate-400">暂无数据</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <h3 className="font-semibold text-sm text-slate-800 mb-1">关键词雷达图</h3>
      <p className="text-xs text-slate-500 mb-2">多维度关键词权重展示</p>
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
