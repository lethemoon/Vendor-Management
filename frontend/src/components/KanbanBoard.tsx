import React from 'react';
import { Plus, MoreHorizontal, User, Calendar } from 'lucide-react';

interface KanbanCard {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  assignee?: string;
  dueDate?: string;
}

interface KanbanColumn {
  id: string;
  title: string;
  color: string;
  cards: KanbanCard[];
}

const initialColumns: KanbanColumn[] = [
  {
    id: 'todo',
    title: '待办',
    color: 'bg-gray-500',
    cards: [
      {
        id: '1',
        title: '供应商资质审核',
        description: '审核ABC科技有限公司的资质文件',
        priority: 'high',
        assignee: '张三',
        dueDate: '2026-04-15'
      },
      {
        id: '2',
        title: '价格谈判准备',
        description: '准备与XYZ供应商的价格谈判材料',
        priority: 'medium',
        assignee: '李四',
        dueDate: '2026-04-18'
      }
    ]
  },
  {
    id: 'in-progress',
    title: '进行中',
    color: 'bg-blue-500',
    cards: [
      {
        id: '3',
        title: '市场调研分析',
        description: '完成电子元器件市场调研报告',
        priority: 'high',
        assignee: '王五',
        dueDate: '2026-04-20'
      }
    ]
  },
  {
    id: 'review',
    title: '审核中',
    color: 'bg-yellow-500',
    cards: [
      {
        id: '4',
        title: '合同条款审查',
        description: '审核框架合同的关键条款',
        priority: 'high',
        assignee: '法务部',
        dueDate: '2026-04-16'
      }
    ]
  },
  {
    id: 'done',
    title: '已完成',
    color: 'bg-green-500',
    cards: [
      {
        id: '5',
        title: '供应商数据库更新',
        description: '更新供应商信息数据库',
        priority: 'low',
        assignee: '赵六',
        dueDate: '2026-04-10'
      }
    ]
  }
];

const KanbanBoard: React.FC = () => {
  const columns = initialColumns;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high':
        return '高';
      case 'medium':
        return '中';
      case 'low':
        return '低';
      default:
        return '';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900">项目看板</h3>
        <button className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none">
          <Plus className="h-4 w-4 mr-2" />
          添加任务
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {columns.map((column) => (
          <div key={column.id} className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full ${column.color} mr-2`}></div>
                <h4 className="font-medium text-gray-900">{column.title}</h4>
                <span className="ml-2 px-2 py-0.5 text-xs bg-gray-200 text-gray-700 rounded-full">
                  {column.cards.length}
                </span>
              </div>
              <button className="text-gray-400 hover:text-gray-600">
                <MoreHorizontal className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              {column.cards.map((card) => (
                <div
                  key={card.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded ${getPriorityColor(card.priority)}`}>
                      {getPriorityLabel(card.priority)}
                    </span>
                    <button className="text-gray-400 hover:text-gray-600">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </div>
                  <h5 className="font-medium text-gray-900 mb-2">{card.title}</h5>
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{card.description}</p>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    {card.assignee && (
                      <div className="flex items-center">
                        <User className="h-3 w-3 mr-1" />
                        <span>{card.assignee}</span>
                      </div>
                    )}
                    {card.dueDate && (
                      <div className="flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        <span>{card.dueDate}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button className="mt-4 w-full flex items-center justify-center px-4 py-2 border border-dashed border-gray-300 rounded-md text-gray-500 hover:border-indigo-500 hover:text-indigo-600">
              <Plus className="h-4 w-4 mr-2" />
              添加卡片
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default KanbanBoard;
