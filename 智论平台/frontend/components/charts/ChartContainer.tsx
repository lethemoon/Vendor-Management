'use client';

import { ReactNode } from 'react';

interface ChartContainerProps {
  title: string;
  description?: string;
  loading?: boolean;
  error?: string | null;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  aspectRatio?: string;
}

export default function ChartContainer({
  title,
  description,
  loading = false,
  error = null,
  actions,
  children,
  className = '',
  aspectRatio = 'auto',
}: ChartContainerProps) {
  if (loading) {
    return (
      <div
        className={`rounded-lg border bg-card p-4 shadow-sm ${className}`}
        style={{ aspectRatio }}
        role="status"
        aria-label={`${title} 加载中`}
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-semibold text-sm text-slate-800 w-32 h-4 bg-slate-200 rounded animate-pulse" />
            {description && (
              <div className="mt-1 w-24 h-3 bg-slate-100 rounded animate-pulse" />
            )}
          </div>
          <div className="w-16 h-8 bg-slate-100 rounded animate-pulse" />
        </div>
        <div
          className="rounded-md bg-slate-50 flex items-center justify-center"
          style={{ minHeight: 220 }}
        >
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            <span className="text-sm text-slate-400">加载中...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`rounded-lg border border-red-200 bg-red-50 p-4 shadow-sm ${className}`}
        style={{ aspectRatio }}
        role="alert"
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-semibold text-sm text-slate-800">{title}</h3>
            {description && (
              <p className="text-xs text-slate-500 mt-0.5">{description}</p>
            )}
          </div>
          {actions}
        </div>
        <div
          className="flex flex-col items-center justify-center rounded-md"
          style={{ minHeight: 160 }}
        >
          <span className="text-3xl mb-2">⚠️</span>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg border bg-card p-4 shadow-sm transition-shadow hover:shadow-md ${className}`}
      style={{ aspectRatio }}
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-semibold text-sm text-slate-800">{title}</h3>
          {description && (
            <p className="text-xs text-slate-500 mt-0.5">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}
