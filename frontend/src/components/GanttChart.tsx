import React from 'react';
import ReactECharts from 'echarts-for-react';

const GanttChart: React.FC = () => {
  const tasks = [
    {
      name: '供应商筛选',
      start: '2026-04-01',
      end: '2026-04-10',
      progress: 100,
      assignee: '采购部'
    },
    {
      name: '资质审核',
      start: '2026-04-08',
      end: '2026-04-15',
      progress: 75,
      assignee: '质量部'
    },
    {
      name: '价格谈判',
      start: '2026-04-12',
      end: '2026-04-20',
      progress: 50,
      assignee: '财务部'
    },
    {
      name: '合同签订',
      start: '2026-04-18',
      end: '2026-04-25',
      progress: 25,
      assignee: '法务部'
    },
    {
      name: '供应商培训',
      start: '2026-04-22',
      end: '2026-04-28',
      progress: 0,
      assignee: '技术部'
    },
    {
      name: '试生产',
      start: '2026-04-26',
      end: '2026-05-05',
      progress: 0,
      assignee: '生产部'
    }
  ];

  const dateToTimestamp = (dateStr: string) => {
    return new Date(dateStr).getTime();
  };

  const getDuration = (start: string, end: string) => {
    return dateToTimestamp(end) - dateToTimestamp(start);
  };

  const colors = ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272'];

  const data = tasks.map((task, index) => ({
    name: task.name,
    value: [
      index,
      dateToTimestamp(task.start),
      dateToTimestamp(task.end),
      getDuration(task.start, task.end),
      task.progress,
      task.assignee
    ],
    itemStyle: {
      color: colors[index % colors.length]
    }
  }));

  const option = {
    title: {
      text: '项目进度甘特图',
      left: 'center'
    },
    tooltip: {
      formatter: function (params: any) {
        const task = tasks[params.value[0]];
        return `${task.name}<br/>
                开始: ${task.start}<br/>
                结束: ${task.end}<br/>
                进度: ${task.progress}%<br/>
                负责人: ${task.assignee}`;
      }
    },
    grid: {
      left: '10%',
      right: '10%',
      top: '15%',
      bottom: '5%'
    },
    xAxis: {
      type: 'time',
      position: 'top',
      axisLine: { onZero: false },
      axisTick: { show: false },
      splitLine: {
        show: true,
        lineStyle: {
          type: 'dashed'
        }
      }
    },
    yAxis: {
      type: 'category',
      data: tasks.map(t => t.name),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        fontSize: 12
      }
    },
    series: [
      {
        type: 'bar',
        data: data,
        encode: {
          x: [1, 2],
          y: 0
        },
        label: {
          show: true,
          formatter: function (params: any) {
            return `${params.value[4]}%`;
          },
          position: 'right'
        },
        barWidth: '60%'
      }
    ]
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <ReactECharts option={option} style={{ height: '500px' }} />
    </div>
  );
};

export default GanttChart;
