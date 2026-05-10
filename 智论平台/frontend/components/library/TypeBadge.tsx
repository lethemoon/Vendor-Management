'use client';

import { type DocumentType } from '@/lib/api';

interface TypeBadgeProps {
  type: DocumentType;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const typeConfig: Record<DocumentType, { icon: string; label: string; colorClass: string; bgClass: string }> = {
  JOURNAL_ARTICLE: {
    icon: '📄',
    label: '期刊文章',
    colorClass: 'text-blue-700',
    bgClass: 'bg-blue-100 border-blue-300',
  },
  THESIS: {
    icon: '🎓',
    label: '学位论文',
    colorClass: 'text-purple-700',
    bgClass: 'bg-purple-100 border-purple-300',
  },
  BOOK: {
    icon: '📚',
    label: '书籍',
    colorClass: 'text-green-700',
    bgClass: 'bg-green-100 border-green-300',
  },
  CONFERENCE_PAPER: {
    icon: '📢',
    label: '会议论文',
    colorClass: 'text-orange-700',
    bgClass: 'bg-orange-100 border-orange-300',
  },
  WEBPAGE: {
    icon: '🌐',
    label: '网页',
    colorClass: 'text-cyan-700',
    bgClass: 'bg-cyan-100 border-cyan-300',
  },
  PATENT: {
    icon: '💡',
    label: '专利',
    colorClass: 'text-red-700',
    bgClass: 'bg-red-100 border-red-300',
  },
};

export default function TypeBadge({ type, size = 'md', showLabel = true }: TypeBadgeProps) {
  const config = typeConfig[type];

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  };

  const iconSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-medium ${config.bgClass} ${config.colorClass} ${sizeClasses[size]}`}
      title={config.label}
    >
      <span className={iconSizes[size]}>{config.icon}</span>
      {showLabel && <span>{config.label}</span>}
    </span>
  );
}

export { typeConfig };
