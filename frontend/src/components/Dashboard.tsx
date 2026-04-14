import React from 'react';
import { Link } from 'react-router-dom';
import { Home, BookOpen, Layout, BarChart3 } from 'lucide-react';
import StatisticsPanel from './StatisticsPanel';
import KanbanBoard from './KanbanBoard';
import GanttChart from './GanttChart';
import RadarChart from './RadarChart';

const Dashboard: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState<'overview' | 'kanban' | 'gantt' | 'radar'>('overview');

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">数据看板</h2>
        <p className="text-gray-600">供应商调研知识库管理系统 - 综合数据分析与项目管理</p>
      </div>

      <nav className="flex space-x-1 mb-8 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'overview'
              ? 'border-indigo-500 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <Home className="h-4 w-4 mr-2" />
          综合概览
        </button>
        <button
          onClick={() => setActiveTab('kanban')}
          className={`flex items-center px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'kanban'
              ? 'border-indigo-500 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <Layout className="h-4 w-4 mr-2" />
          项目看板
        </button>
        <button
          onClick={() => setActiveTab('gantt')}
          className={`flex items-center px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'gantt'
              ? 'border-indigo-500 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <BarChart3 className="h-4 w-4 mr-2" />
          进度甘特图
        </button>
        <button
          onClick={() => setActiveTab('radar')}
          className={`flex items-center px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'radar'
              ? 'border-indigo-500 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <BarChart3 className="h-4 w-4 mr-2" />
          供应商评估
        </button>
      </nav>

      <div className="flex items-center mb-6">
        <Link
          to="/knowledge"
          className="flex items-center px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-700"
        >
          <BookOpen className="h-4 w-4 mr-2" />
          查看知识库
        </Link>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-8">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-4">关键指标</h3>
            <StatisticsPanel />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-4">项目进度</h3>
            <GanttChart />
          </div>
        </div>
      )}

      {activeTab === 'kanban' && (
        <KanbanBoard />
      )}

      {activeTab === 'gantt' && (
        <GanttChart />
      )}

      {activeTab === 'radar' && (
        <RadarChart />
      )}
    </div>
  );
};

export default Dashboard;
