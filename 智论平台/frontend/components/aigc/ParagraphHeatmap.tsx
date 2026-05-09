'use client';

import { useState } from 'react';

interface ParagraphData {
  index: number;
  score: number;
  riskLevel: string;
  preview: string;
}

interface ParagraphHeatmapProps {
  paragraphs: ParagraphData[];
  onSelect: (index: number) => void;
  selectedIndex: number | null;
}

export default function ParagraphHeatmap({
  paragraphs,
  onSelect,
  selectedIndex,
}: ParagraphHeatmapProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const getBackgroundColor = (score: number) => {
    if (score <= 20) return 'bg-green-100 hover:bg-green-200 border-green-300';
    if (score <= 40) return 'bg-yellow-100 hover:bg-yellow-200 border-yellow-300';
    if (score <= 60) return 'bg-orange-100 hover:bg-orange-200 border-orange-300';
    if (score <= 80) return 'bg-red-100 hover:bg-red-200 border-red-300';
    return 'bg-red-200 hover:bg-red-300 border-red-400';
  };

  const getTextColor = (score: number) => {
    if (score <= 20) return 'text-green-700';
    if (score <= 40) return 'text-yellow-700';
    if (score <= 60) return 'text-orange-700';
    if (score <= 80) return 'text-red-700';
    return 'text-red-800';
  };

  const getRiskIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return '🟢';
      case 'medium': return '🟡';
      case 'medium-high': return '🟠';
      case 'high': return '🔴';
      default: return '⚪';
    }
  };

  return (
    <div className="w-full">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {paragraphs.map((paragraph) => (
          <div
            key={paragraph.index}
            onClick={() => onSelect(paragraph.index)}
            onMouseEnter={() => setHoveredIndex(paragraph.index)}
            onMouseLeave={() => setHoveredIndex(null)}
            className={`relative p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 transform ${
              selectedIndex === paragraph.index
                ? 'border-blue-500 bg-blue-50 shadow-lg scale-105 z-10'
                : getBackgroundColor(paragraph.score)
            } ${
              hoveredIndex === paragraph.index && selectedIndex !== paragraph.index
                ? 'scale-105 shadow-md'
                : ''
            }`}
            role="button"
            tabIndex={0}
            aria-label={`段落 ${paragraph.index + 1}，疑似度 ${paragraph.score}%`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect(paragraph.index);
              }
            }}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-semibold text-gray-700">
                P{paragraph.index + 1}
              </span>
              <span className="text-base">{getRiskIcon(paragraph.riskLevel)}</span>
            </div>
            
            <div className={`text-lg font-bold mb-1 ${getTextColor(paragraph.score)}`}>
              {paragraph.score}%
            </div>

            {(hoveredIndex === paragraph.index || selectedIndex === paragraph.index) && (
              <div className="mt-2 pt-2 border-t border-gray-300 border-opacity-50">
                <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                  {paragraph.preview}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      <p className="text-sm text-gray-500 mt-4 text-center">
        点击段落卡片查看详情和改写选项
      </p>
    </div>
  );
}
