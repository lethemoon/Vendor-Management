'use client';

import { useState } from 'react';

interface IssueTagCloudProps {
  issues: Record<string, number>;
  onTagClick?: (tag: string) => void;
  selectedTag?: string | null;
}

export default function IssueTagCloud({
  issues,
  onTagClick,
  selectedTag,
}: IssueTagCloudProps) {
  const [hoveredTag, setHoveredTag] = useState<string | null>(null);

  const sortedIssues = Object.entries(issues).sort((a, b) => b[1] - a[1]);
  const maxCount = Math.max(...Object.values(issues));

  const getTagStyle = (count: number) => {
    const intensity = count / maxCount;
    
    if (intensity >= 0.8) return 'bg-red-500 text-white border-red-600';
    if (intensity >= 0.6) return 'bg-orange-400 text-white border-orange-500';
    if (intensity >= 0.4) return 'bg-yellow-400 text-yellow-900 border-yellow-500';
    if (intensity >= 0.2) return 'bg-yellow-100 text-yellow-700 border-yellow-300';
    return 'bg-gray-100 text-gray-600 border-gray-300';
  };

  const getBarWidth = (count: number) => {
    return `${(count / maxCount) * 100}%`;
  };

  if (sortedIssues.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p className="text-lg">暂无问题标签</p>
        <p className="text-sm mt-1">检测结果良好</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex flex-wrap gap-3">
        {sortedIssues.map(([tag, count]) => (
          <button
            key={tag}
            onClick={() => onTagClick?.(tag)}
            onMouseEnter={() => setHoveredTag(tag)}
            onMouseLeave={() => setHoveredTag(null)}
            className={`group relative px-4 py-2 rounded-full border-2 font-medium transition-all duration-200 cursor-pointer ${
              selectedTag === tag
                ? 'ring-2 ring-blue-500 ring-offset-2 shadow-lg scale-105'
                : 'hover:shadow-md hover:scale-105'
            } ${getTagStyle(count)}`}
            aria-label={`${tag}：${count}处`}
            aria-pressed={selectedTag === tag}
          >
            <span className="flex items-center gap-2">
              <span>{tag}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                selectedTag === tag ? 'bg-white bg-opacity-30' : 'bg-black bg-opacity-10'
              }`}>
                {count}
              </span>
            </span>

            {hoveredTag === tag && (
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-xl whitespace-nowrap z-20 pointer-events-none">
                <div className="font-medium mb-1">{tag}</div>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-400 rounded-full transition-all duration-300"
                      style={{ width: getBarWidth(count) }}
                    />
                  </div>
                  <span>{count} 处</span>
                </div>
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
              </div>
            )}
          </button>
        ))}
      </div>

      {selectedTag && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700">
            已筛选：<strong>{selectedTag}</strong> 
            <button
              onClick={() => onTagClick?.('')}
              className="ml-2 text-blue-500 underline hover:text-blue-700"
            >
              清除筛选
            </button>
          </p>
        </div>
      )}
    </div>
  );
}
