import React from 'react';
import ReactECharts from 'echarts-for-react';

const RadarChart: React.FC = () => {
  const option = {
    title: {
      text: '供应商评估雷达图',
      left: 'center'
    },
    legend: {
      data: ['供应商A', '供应商B', '供应商C'],
      bottom: '5%'
    },
    radar: {
      indicator: [
        { name: '价格竞争力', max: 100 },
        { name: '产品质量', max: 100 },
        { name: '交付能力', max: 100 },
        { name: '技术支持', max: 100 },
        { name: '售后服务', max: 100 },
        { name: '创新能力', max: 100 }
      ],
      center: ['50%', '55%'],
      radius: '65%'
    },
    series: [
      {
        name: '供应商评估',
        type: 'radar',
        data: [
          {
            value: [85, 90, 78, 82, 88, 75],
            name: '供应商A',
            areaStyle: {
              color: 'rgba(84, 112, 198, 0.3)'
            },
            lineStyle: {
              color: '#5470c6'
            },
            itemStyle: {
              color: '#5470c6'
            }
          },
          {
            value: [92, 78, 85, 76, 80, 88],
            name: '供应商B',
            areaStyle: {
              color: 'rgba(145, 204, 117, 0.3)'
            },
            lineStyle: {
              color: '#91cc75'
            },
            itemStyle: {
              color: '#91cc75'
            }
          },
          {
            value: [75, 82, 90, 88, 76, 82],
            name: '供应商C',
            areaStyle: {
              color: 'rgba(250, 200, 88, 0.3)'
            },
            lineStyle: {
              color: '#fac858'
            },
            itemStyle: {
              color: '#fac858'
            }
          }
        ]
      }
    ]
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <ReactECharts option={option} style={{ height: '500px' }} />
    </div>
  );
};

export default RadarChart;
