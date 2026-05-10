'use client';

import { type DocumentType } from '@/lib/api';
import TypeBadge from './TypeBadge';

interface FilterBarProps {
  sortBy: 'createdAt' | 'updatedAt' | 'title' | 'authors' | 'year';
  sortOrder: 'asc' | 'desc';
  selectedTypes: DocumentType | 'ALL';
  viewMode: 'list' | 'grid';
  onSortByChange: (sortBy: 'createdAt' | 'updatedAt' | 'title' | 'authors' | 'year') => void;
  onSortOrderChange: (sortOrder: 'asc' | 'desc') => void;
  onTypeChange: (type: DocumentType | 'ALL') => void;
  onViewModeChange: (mode: 'list' | 'grid') => void;
}

const sortOptions = [
  { value: 'createdAt', label: '创建时间' },
  { value: 'updatedAt', label: '更新时间' },
  { value: 'title', label: '标题' },
  { value: 'authors', label: '作者' },
  { value: 'year', label: '年份' },
];

const documentTypes: (DocumentType | 'ALL')[] = [
  'ALL',
  'JOURNAL_ARTICLE',
  'THESIS',
  'BOOK',
  'CONFERENCE_PAPER',
  'WEBPAGE',
  'PATENT',
];

export default function FilterBar({
  sortBy,
  sortOrder,
  selectedTypes,
  viewMode,
  onSortByChange,
  onSortOrderChange,
  onTypeChange,
  onViewModeChange,
}: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      <div className="flex items-center gap-2">
        <label htmlFor="sort-by" className="text-sm font-medium text-slate-700 whitespace-nowrap">
          排序:
        </label>
        <select
          id="sort-by"
          value={sortBy}
          onChange={(e) => onSortByChange(e.target.value as any)}
          className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <button
          onClick={() => onSortOrderChange(sortOrder === 'asc' ? 'desc' : 'asc')}
          className="p-1.5 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          title={sortOrder === 'asc' ? '升序 → 降序' : '降序 → 升序'}
          aria-label="切换排序顺序"
        >
          <svg
            className={`w-4 h-4 transition-transform ${sortOrder === 'desc' ? '' : 'rotate-180'}`}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M3 3a1 1 0 000 2h11a1 1 0 100-2H3zM3 7a1 1 0 000 2h7a1 1 0 100-2H3zM3 11a1 1 0 100 2h4a1 1 0 100-2H3zM15 8a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1.17a3.001 3.001 0 01-2-2.83 1 1 0 111.731 1A1 1 0 0015 8z" />
          </svg>
        </button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium text-slate-700">类型:</span>
        <div className="flex flex-wrap gap-1.5">
          {documentTypes.map((type) => (
            <button
              key={type}
              onClick={() => onTypeChange(type)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                selectedTypes === type
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              {type === 'ALL' ? '全部' : <TypeBadge type={type} size="sm" showLabel />}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-1 ml-auto">
        <span className="text-sm font-medium text-slate-700 mr-2">视图:</span>
        <button
          onClick={() => onViewModeChange('list')}
          className={`p-2 rounded-lg border transition-all ${
            viewMode === 'list'
              ? 'bg-blue-50 border-blue-500 text-blue-600'
              : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
          }`}
          title="列表视图"
          aria-label="列表视图"
        >
          <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
              clipRule="evenodd"
            />
          </svg>
        </button>
        <button
          onClick={() => onViewModeChange('grid')}
          className={`p-2 rounded-lg border transition-all ${
            viewMode === 'grid'
              ? 'bg-blue-50 border-blue-500 text-blue-600'
              : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
          }`}
          title="网格视图"
          aria-label="网格视图"
        >
          <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM13 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2h-2z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
