'use client';

interface StatisticsBarProps {
  totalCount: number;
  thisMonthCount: number;
  journalArticleCount?: number;
  totalCitations: number;
}

export default function StatisticsBar({
  totalCount,
  thisMonthCount,
  journalArticleCount = 0,
  totalCitations,
}: StatisticsBarProps) {
  const stats = [
    {
      icon: '📚',
      value: totalCount.toLocaleString(),
      label: '总文献数',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
    },
    {
      icon: '📅',
      value: `+${thisMonthCount}`,
      label: '本月新增',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
    },
    {
      icon: '📄',
      value: `${totalCount > 0 ? Math.round((journalArticleCount / totalCount) * 100) : 0}%`,
      label: '期刊文章占比',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
    },
    {
      icon: '🔬',
      value: totalCitations.toLocaleString(),
      label: '被引用次数',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {stats.map((stat, index) => (
        <div
          key={index}
          className={`rounded-lg border-2 p-4 ${stat.bgColor} ${stat.borderColor} transition-all hover:shadow-md`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-sm text-slate-600 mt-1">{stat.label}</p>
            </div>
            <span className="text-3xl opacity-80">{stat.icon}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
