'use client';

import { useState } from 'react';

interface LegendItem {
  name: string;
  color: string;
  value?: number | string;
  active?: boolean;
}

interface ChartLegendProps {
  items: LegendItem[];
  onToggle?: (index: number) => void;
  layout?: 'horizontal' | 'vertical';
  showValues?: boolean;
  className?: string;
}

export default function ChartLegend({
  items,
  onToggle,
  layout = 'horizontal',
  showValues = false,
  className = '',
}: ChartLegendProps) {
  const [activeItems, setActiveItems] = useState<boolean[]>(
    () => items.map(() => true)
  );

  const handleToggle = (index: number) => {
    const next = [...activeItems];
    next[index] = !next[index];
    setActiveItems(next);
    onToggle?.(index);
  };

  const containerClass =
    layout === 'horizontal'
      ? 'flex flex-wrap gap-x-4 gap-y-2'
      : 'flex flex-col gap-2';

  return (
    <div className={`text-xs ${containerClass} ${className}`}>
      {items.map((item, index) => {
        const isActive = item.active ?? activeItems[index];
        return (
          <button
            key={item.name}
            onClick={() => handleToggle(index)}
            className={`inline-flex items-center gap-1.5 transition-opacity cursor-pointer ${
              !isActive ? 'opacity-40' : 'hover:opacity-80'
            }`}
            aria-pressed={isActive}
            aria-label={`${item.name}${showValues && item.value ? `: ${item.value}` : ''}`}
          >
            <span
              className="w-3 h-3 rounded-sm flex-shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-slate-600 whitespace-nowrap">{item.name}</span>
            {showValues && item.value !== undefined && (
              <span className="font-medium text-slate-800">{item.value}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
