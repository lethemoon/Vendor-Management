import React from 'react';
import { BarChart3, Users, FileText, TrendingUp, Briefcase, CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number | string;
  trend?: number;
  icon: React.ReactNode;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, trend, icon, color }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
          {trend !== undefined && (
            <p className={`text-sm mt-1 ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {trend >= 0 ? '+' : ''}{trend}%
            </p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

const StatisticsPanel: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard
        title="供应商总数"
        value={24}
        trend={12}
        icon={<Users className="h-6 w-6 text-white" />}
        color="bg-blue-500"
      />
      <StatCard
        title="知识库文档"
        value={156}
        trend={8}
        icon={<FileText className="h-6 w-6 text-white" />}
        color="bg-green-500"
      />
      <StatCard
        title="进行中项目"
        value={12}
        trend={-3}
        icon={<Briefcase className="h-6 w-6 text-white" />}
        color="bg-purple-500"
      />
      <StatCard
        title="已完成任务"
        value={89}
        trend={15}
        icon={<CheckCircle className="h-6 w-6 text-white" />}
        color="bg-orange-500"
      />
      <StatCard
        title="待审批事项"
        value={5}
        icon={<Clock className="h-6 w-6 text-white" />}
        color="bg-yellow-500"
      />
      <StatCard
        title="本月增长"
        value="+23%"
        icon={<TrendingUp className="h-6 w-6 text-white" />}
        color="bg-emerald-500"
      />
      <StatCard
        title="数据分析"
        value="查看"
        icon={<BarChart3 className="h-6 w-6 text-white" />}
        color="bg-indigo-500"
      />
      <StatCard
        title="风险预警"
        value={2}
        icon={<AlertCircle className="h-6 w-6 text-white" />}
        color="bg-red-500"
      />
    </div>
  );
};

export default StatisticsPanel;
