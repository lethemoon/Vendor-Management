'use client';

import { useState, useEffect } from 'react';
import { type CitationFormat, type DocumentDetail, type CitationResult } from '@/lib/api';

interface CitationGeneratorProps {
  document: DocumentDetail;
  onCopySuccess?: () => void;
}

const formatConfig: Record<CitationFormat, { label: string; description: string }> = {
  GBT7714: {
    label: 'GB/T 7714',
    description: '中国国家标准引用格式',
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

export default function CitationGenerator({ document, onCopySuccess }: CitationGeneratorProps) {
  const [activeFormat, setActiveFormat] = useState<CitationFormat>('GBT7714');
  const [citationText, setCitationText] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [copiedFormat, setCopiedFormat] = useState<CitationFormat | null>(null);
  const [plainTextMode, setPlainTextMode] = useState(false);

  const handleGenerateCitation = async (format: CitationFormat) => {
    setLoading(true);
    
    try {
      const { libraryApi } = await import('@/lib/api');
      const response = await libraryApi.generateCitations([document.id], format);
      
      if (response.data && response.data.length > 0) {
        setCitationText(response.data[0].citationText);
        setCopiedFormat(null);
      }
    } catch (error) {
      console.error('Failed to generate citation:', error);
      setCitationText('生成失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleGenerateCitation(activeFormat);
  }, [activeFormat, document.id]);

  const handleCopyToClipboard = async () => {
    let textToCopy = citationText;
    
    if (!plainTextMode) {
      textToCopy = textToCopy.replace(/\*([^*]+)\*/g, '$1');
    }

    try {
      await navigator.clipboard.writeText(textToCopy);
      
      setCopiedFormat(activeFormat);
      onCopySuccess?.();
      
      setTimeout(() => {
        setCopiedFormat(null);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const renderFormattedCitation = (text: string) => {
    if (plainTextMode) {
      return text.replace(/\*([^*]+)\*/g, '$1');
    }

    return text.split('*').map((part, index) =>
      index % 2 === 1 ? <em key={index}>{part}</em> : part
    );
  };

  const formats: CitationFormat[] = ['GBT7714', 'APA7', 'MLA9'];

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
        <span>📝</span>
        引用格式生成
      </h3>

      <div className="flex border-b border-slate-200 mb-4">
        {formats.map((format) => (
          <button
            key={format}
            onClick={() => {
              setActiveFormat(format);
              handleGenerateCitation(format);
            }}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-all relative ${
              activeFormat === format
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <div className="font-semibold">{formatConfig[format].label}</div>
            <div className="text-xs opacity-70 mt-0.5">{formatConfig[format].description}</div>
          </button>
        ))}
      </div>

      <div className="bg-slate-50 rounded-lg p-5 min-h-[140px] border border-slate-200 mb-4">
        {loading ? (
          <div className="flex items-center justify-center h-[120px] text-slate-400">
            <div className="text-center">
              <svg
                className="animate-spin h-8 w-8 mx-auto mb-3"
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
              <p className="text-sm font-medium">正在生成{formatConfig[activeFormat].label}格式...</p>
            </div>
          </div>
        ) : citationText ? (
          <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap font-serif text-base">
            {renderFormattedCitation(citationText)}
          </p>
        ) : (
          <div className="flex items-center justify-center h-[120px] text-slate-400">
            <p className="text-sm">暂无引用内容</p>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={handleCopyToClipboard}
          disabled={!citationText || loading}
          className={`flex-1 px-6 py-2.5 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
            copiedFormat === activeFormat
              ? 'bg-green-600 text-white'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {copiedFormat === activeFormat ? (
            <>
              ✓ 已复制到剪贴板
            </>
          ) : (
            <>
              📋 复制引用
            </>
          )}
        </button>

        <label className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-lg cursor-pointer hover:bg-slate-200 transition-colors">
          <input
            type="checkbox"
            checked={plainTextMode}
            onChange={(e) => setPlainTextMode(e.target.checked)}
            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm">复制纯文本</span>
        </label>
      </div>

      {copiedFormat === activeFormat && (
        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800 flex items-center gap-2">
            ✓ 引用已成功复制到剪贴板，可直接粘贴使用
          </p>
        </div>
      )}
    </div>
  );
}
