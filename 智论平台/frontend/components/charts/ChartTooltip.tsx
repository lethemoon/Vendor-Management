'use client';

interface TooltipRow {
  label: string;
  value: string | number;
  color?: string;
}

interface ChartTooltipProps {
  title?: string;
  rows: TooltipRow[];
  footer?: string;
}

export default function ChartTooltip({ title, rows, footer }: ChartTooltipProps) {
  if (!rows || rows.length === 0) return null;

  return (
    <div
      className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 shadow-lg"
      style={{ maxWidth: 320 }}
    >
      {title && (
        <p className="text-sm font-semibold text-slate-800 mb-1.5 pb-1.5 border-b border-slate-100">
          {title}
        </p>
      )}
      <div className="space-y-1">
        {rows.map((row, i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5 min-w-0">
              {row.color && (
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: row.color }}
                />
              )}
              <span className="text-xs text-slate-500 truncate">{row.label}</span>
            </div>
            <span className="text-xs font-semibold text-slate-800 whitespace-nowrap tabular-nums">
              {row.value}
            </span>
          </div>
        ))}
      </div>
      {footer && (
        <>
          <div className="border-t border-slate-100 my-1.5" />
          <p className="text-[11px] text-slate-400">{footer}</p>
        </>
      )}
    </div>
  );
}
