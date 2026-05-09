'use client';

import { useState, useRef, useEffect } from 'react';

interface DiffSegment {
  type: 'equal' | 'delete' | 'insert' | 'replace';
  value: string;
}

interface AIGCDiffViewerProps {
  originalText: string;
  rewrittenText: string;
  diffSegments?: DiffSegment[];
}

export default function AIGCDiffViewer({
  originalText,
  rewrittenText,
  diffSegments,
}: AIGCDiffViewerProps) {
  const [syncScroll, setSyncScroll] = useState(true);
  const originalRef = useRef<HTMLDivElement>(null);
  const rewrittenRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!syncScroll) return;

    const handleOriginalScroll = () => {
      if (originalRef.current && rewrittenRef.current) {
        const percentage =
          originalRef.current.scrollTop /
          (originalRef.current.scrollHeight - originalRef.current.clientHeight);
        rewrittenRef.current.scrollTop =
          percentage *
          (rewrittenRef.current.scrollHeight - rewrittenRef.current.clientHeight);
      }
    };

    const originalElement = originalRef.current;
    originalElement?.addEventListener('scroll', handleOriginalScroll);
    return () => originalElement?.removeEventListener('scroll', handleOriginalScroll);
  }, [syncScroll]);

  const renderDiffSegment = (segment: DiffSegment, isOriginal: boolean) => {
    switch (segment.type) {
      case 'equal':
        return (
          <span key={`${segment.type}-${segment.value}`} className="text-gray-800">
            {segment.value}
          </span>
        );
      case 'delete':
        return isOriginal ? (
          <span
            key={`${segment.type}-${segment.value}`}
            className="bg-red-100 text-red-700 line-through decoration-red-500"
          >
            {segment.value}
          </span>
        ) : null;
      case 'insert':
        return !isOriginal ? (
          <span
            key={`${segment.type}-${segment.value}`}
            className="bg-green-100 text-green-700 font-medium"
          >
            {segment.value}
          </span>
        ) : null;
      case 'replace':
        return isOriginal ? (
          <span
            key={`${segment.type}-${segment.value}`}
            className="bg-orange-100 text-orange-700 line-through decoration-orange-500"
          >
            {segment.value}
          </span>
        ) : (
          <span
            key={`${segment.type}-${segment.value}`}
            className="bg-green-100 text-green-700 font-medium underline decoration-green-300"
          >
            {segment.value}
          </span>
        );
      default:
        return null;
    }
  };

  const renderContent = (text: string, isOriginal: boolean) => {
    if (diffSegments && diffSegments.length > 0) {
      return (
        <p className="leading-relaxed whitespace-pre-wrap">
          {diffSegments.map((segment) =>
            renderDiffSegment(segment, isOriginal)
          )}
        </p>
      );
    }

    return (
      <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">{text}</p>
    );
  };

  const getWordCount = (text: string) => {
    return text.replace(/\s/g, '').length;
  };

  const originalWords = getWordCount(originalText);
  const rewrittenWords = getWordCount(rewrittenText);
  const wordDiff = rewrittenWords - originalWords;

  return (
    <div className="w-full border rounded-lg overflow-hidden">
      <div className="bg-gray-50 border-b px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h4 className="font-semibold text-gray-900">原文对比视图</h4>
          
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={syncScroll}
              onChange={(e) => setSyncScroll(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-600">同步滚动</span>
          </label>
        </div>

        <div className="flex gap-4 text-xs text-gray-500">
          <span>原文：{originalWords.toLocaleString()} 字</span>
          <span>改写：{rewrittenWords.toLocaleString()} 字</span>
          <span className={wordDiff >= 0 ? 'text-green-600' : 'text-red-600'}>
            {wordDiff >= 0 ? '+' : ''}{wordDiff}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 divide-x">
        <div className="bg-gray-50 p-4">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-200">
            <span className="text-sm font-medium text-gray-700">📝 原文</span>
          </div>
          <div
            ref={originalRef}
            className="max-h-[400px] overflow-y-auto pr-2 custom-scrollbar bg-white p-4 rounded border border-gray-200"
          >
            {renderContent(originalText, true)}
          </div>
        </div>

        <div className="bg-green-50 p-4">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-green-200">
            <span className="text-sm font-medium text-green-700">✨ 改写后</span>
          </div>
          <div
            ref={rewrittenRef}
            className="max-h-[400px] overflow-y-auto pr-2 custom-scrollbar bg-white p-4 rounded border border-green-200"
          >
            {renderContent(rewrittenText, false)}
          </div>
        </div>
      </div>

      <div className="bg-gray-50 border-t px-4 py-2 flex items-center justify-end gap-4 text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-red-100 border border-red-300 rounded" />
            <span className="text-gray-600">删除</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-green-100 border border-green-300 rounded" />
            <span className="text-gray-600">新增</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-orange-100 border border-orange-300 rounded" />
            <span className="text-gray-600">修改</span>
          </div>
        </div>
      </div>
    </div>
  );
}
