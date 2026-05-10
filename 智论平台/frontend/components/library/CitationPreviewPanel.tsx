'use client';

import { useState, useEffect } from 'react';
import { type CitationFormat } from '@/lib/api';
import { useLibraryStore } from '@/lib/stores/libraryStore';

interface CitationPreviewPanelProps {
  documentId?: string;
  autoUpdate?: boolean;
}

const formatConfig: Record<CitationFormat, { label: string; description: string }> = {
  GBT7714: {
    label: 'GB/T 7714',
    description: '中国国家标准',
  },
  APA7: {
    label: 'APA 7th',
    description: '美国心理学会第7版',
  },
  MLA9: {
    label: 'MLA 9th',
    description: '现代语言协会第9版',
  },
};

export default function CitationPreviewPanel({ documentId, autoUpdate = true }: CitationPreviewPanelProps) {
  const [activeFormat, setActiveFormat] = useState<CitationFormat>('GBT7714');
  const { previewCitations, generatePreview, formData } = useLibraryStore();

  useEffect(() => {
    if (autoUpdate && formData.title && formData.authors) {
      const timer = setTimeout(() => {
        generatePreview(activeFormat);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [formData, activeFormat, autoUpdate, generatePreview]);

  const handleCopyToClipboard = async (format: CitationFormat) => {
    const citationText = previewCitations[format];
    
    if (!citationText) return;

    try {
      await navigator.clipboard.writeText(citationText);
      
      const button = document.getElementById(`copy-btn-${format}`);
      if (button) {
        const originalText = button.textContent;
        button.textContent = '✓ 已复制!';
        button.classList.add('bg-green-600');
        
        setTimeout(() => {
          button.textContent = originalText;
          button.classList.remove('bg-green-600');
        }, 2000);
      }
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const formats: CitationFormat[] = ['GBT7714', 'APA7', 'MLA9'];

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6 h-fit sticky top-6">
      <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
        <span>👁️</span>
        引用格式预览
      </h3>

      <div className="flex border-b border-slate-200 mb-4">
        {formats.map((format) => (
          <button
            key={format}
            onClick={() => setActiveFormat(format)}
            className={`flex-1 px-3 py-2 text-sm font-medium transition-all relative ${
              activeFormat === format
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <div>{formatConfig[format].label}</div>
            <div className="text-xs opacity-70 mt-0.5">{formatConfig[format].description}</div>
            {format === 'GBT7714' && (
              <span className="absolute top-1 right-1 text-xs">★</span>
            )}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {formats.map((format) => (
          <div
            key={format}
            className={`${activeFormat !== format ? 'hidden' : ''}`}
          >
            <div className="bg-slate-50 rounded-lg p-4 min-h-[120px] border border-slate-200">
              {previewCitations[format] ? (
                <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap font-serif">
                  {previewCitations[format]}
                </p>
              ) : (
                <div className="flex items-center justify-center h-full min-h-[120px] text-slate-400">
                  <div className="text-center">
                    <svg
                      className="animate-spin h-6 w-6 mx-auto mb-2"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    <p className="text-sm">正在生成{formatConfig[format].label}格式引用...</p>
                  </div>
                </div>
              )}
            </div>

            <button
              id={`copy-btn-${format}`}
              onClick={() => handleCopyToClipboard(format)}
              disabled={!previewCitations[format]}
              className="mt-3 w-full px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium flex items-center justify-center gap-2"
            >
              <span>📋</span>
              复制引用
            </button>
          </div>
        ))}
      </div>

      {!formData.title && !formData.authors && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            💡 填写标题和作者后将自动生成引用预览
          </p>
        </div>
      )}
    </div>
  );
}
