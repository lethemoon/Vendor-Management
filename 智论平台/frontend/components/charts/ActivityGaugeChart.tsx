'use client';

import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts/core';
import { GaugeChart } from 'echarts/charts';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([GaugeChart, CanvasRenderer]);

interface ActivityGaugeChartProps {
  value?: number;
  max?: number;
  label?: string;
}

export default function ActivityGaugeChart({
  value = 0,
  max = 100,
  label = '活跃度',
}: ActivityGaugeChartProps) {
  const option = useMemo(() => {
    const percentage = Math.min(Math.max(value / max, 0), 1) * 100;

    return {
      series: [
        {
          type: 'gauge',
          startAngle: 200,
          endAngle: -20,
          min: 0,
          max: 100,
          radius: '90%',
          center: ['50%', '55%'],
          splitNumber: 5,
          axisLine: {
            lineStyle: {
              width: 18,
              color: [
                [0.3, '#22c55e'],
                [0.6, '#f59e0b'],
                [0.85, '#f97316'],
                [1, '#ef4444'],
              ],
            },
          },
          pointer: {
            icon: 'path://M12.8,0.7l12,40.1H0.7L12.8,0.7z',
            length: '55%',
            width: 14,
            offsetCenter: [0, '-45%'],
            itemStyle: { color: 'auto' },
          },
          axisTick: {
            length: 8,
            lineStyle: { color: 'auto', width: 1.5 },
            distance: -18,
          },
          splitLine: {
            length: 14,
            lineStyle: { color: 'auto', width: 2.5 },
            distance: -23,
          },
          axisLabel: {
            distance: 28,
            color: '#64748b',
            fontSize: 11,
            formatter: '{value}%',
          },
          detail: {
            valueAnimation: true,
            formatter: `{value}%`,
            color: percentage <= 30 ? '#22c55e' : percentage <= 65 ? '#f59e0b' : '#ef4444',
            fontSize: 28,
            fontWeight: 700,
            offsetCenter: [0, '10%'],
          },
          title: {
            offsetCenter: [0, '35%'],
            fontSize: 13,
            color: '#64748b',
          },
          data: [
            {
              value: Math.round(percentage),
              name: label,
            },
          ],
          animationDuration: 1200,
          animationEasing: 'elasticOut',
        },
      ],
    };
  }, [value, max, label]);

  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <h3 className="font-semibold text-sm text-slate-800 mb-1">{label}</h3>
      <p className="text-xs text-slate-500 mb-2">
        当前值 {value} / 最大值 {max}
      </p>
      <ReactECharts
        option={option}
        style={{ height: 260 }}
        opts={{ renderer: 'canvas' }}
        notMerge={true}
        lazyUpdate={true}
      />
    </div>
  );
}
