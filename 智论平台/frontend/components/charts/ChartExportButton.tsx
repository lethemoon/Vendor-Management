'use client';

import { useState, useCallback } from 'react';
import { toPng } from 'html-to-image';

interface ChartExportButtonProps {
  targetRef: React.RefObject<HTMLDivElement | null>;
  filename?: string;
  watermark?: string;
  className?: string;
}

function addWatermark(base64Image: string, text: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      ctx.font = '14px Inter, system-ui, sans-serif';
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.textAlign = 'right';
      ctx.fillText(text, img.width - 16, img.height - 16);
      resolve(canvas.toDataURL('image/png'));
    };
    img.src = base64Image;
  });
}

export default function ChartExportButton({
  targetRef,
  filename = '图表',
  watermark = '智论AI - 数据来源',
  className = '',
}: ChartExportButtonProps) {
  const [exporting, setExporting] = useState(false);

  const handleExport = useCallback(async () => {
    if (!targetRef.current || exporting) return;

    setExporting(true);
    try {
      const dataUrl = await toPng(targetRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left',
        },
      });

      const finalUrl = await addWatermark(dataUrl, watermark);

      const link = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      link.download = `${filename}_${dateStr}.png`;
      link.href = finalUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('图表导出失败:', err);
    } finally {
      setExporting(false);
    }
  }, [targetRef, filename, watermark, exporting]);

  return (
    <button
      onClick={handleExport}
      disabled={exporting || !targetRef?.current}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-slate-200 
        bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-colors
        disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${className}`}
      aria-label="导出为PNG图片"
    >
      {exporting ? (
        <>
          <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          导出中...
        </>
      ) : (
        <>📥 PNG</>
      )}
    </button>
  );
}
