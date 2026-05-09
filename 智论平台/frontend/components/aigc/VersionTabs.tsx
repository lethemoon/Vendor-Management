'use client';

import { useState } from 'react';
import type { RewriteVersion } from '@/lib/api';

interface VersionTabsProps {
  versions: RewriteVersion[];
  selectedVersionIndex: number;
  onVersionChange: (index: number) => void;
  onAdopt: (version: RewriteVersion) => void;
  onRegenerate: () => void;
  isAdopting?: boolean;
  isRegenerating?: boolean;
}

export default function VersionTabs({
  versions,
  selectedVersionIndex,
  onVersionChange,
  onAdopt,
  onRegenerate,
  isAdopting = false,
  isRegenerating = false,
}: VersionTabsProps) {
  const [transitionDirection, setTransitionDirection] = useState<'left' | 'right'>('right');

  const handleVersionChange = (index: number) => {
    if (index > selectedVersionIndex) {
      setTransitionDirection('right');
    } else {
      setTransitionDirection('left');
    }
    onVersionChange(index);
  };

  const getScoreColor = (score?: number) => {
    const s = score ?? 50;
    if (s <= 30) return 'text-green-600 bg-green-50 border-green-200';
    if (s <= 50) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getVersionIcon = (label: string) => {
    switch (label) {
      case 'conservative': return '🛡️';
      case 'balanced': return '⚖️';
      case 'aggressive': return '🚀';
      default: return '📝';
    }
  };

  const isRecommended = (version: RewriteVersion) => {
    return (version.estimatedScore ?? 50) < 30;
  };

  const currentVersion = versions[selectedVersionIndex];

  return (
    <div className="w-full">
      <div className="grid grid-cols-3 gap-2 mb-4">
        {versions.map((version, index) => (
          <button
            key={version.versionId}
            onClick={() => handleVersionChange(index)}
            className={`relative p-3 rounded-lg border-2 text-left transition-all duration-200 ${
              selectedVersionIndex === index
                ? 'border-blue-500 bg-blue-50 shadow-md'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
            aria-label={`版本 ${index + 1}: ${version.labelText}`}
            aria-selected={selectedVersionIndex === index}
            role="tab"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-base">{getVersionIcon(version.label)}</span>
              {isRecommended(version) && (
                <span className="text-xs bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full font-bold">
                  ★ 推荐
                </span>
              )}
            </div>

            <div className="font-medium text-sm text-gray-900 mb-1">
              {version.labelText}
            </div>

            <div className="space-y-1">
              <div className={`inline-block px-2 py-0.5 rounded text-xs font-semibold border ${getScoreColor(
                version.estimatedScore
              )}`}>
                预估: {version.estimatedScore ?? '-'}%
              </div>

              <div className="text-xs text-gray-500">
                置信度: {(version.confidence * 100).toFixed(0)}%
              </div>
            </div>

            {selectedVersionIndex === index && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
            )}
          </button>
        ))}
      </div>

      <div
        key={selectedVersionIndex}
        className={`bg-white border-2 border-gray-200 rounded-lg p-6 transition-all duration-300 ease-out ${
          transitionDirection === 'right' ? 'animate-slide-in-right' : 'animate-slide-in-left'
        }`}
      >
        <div className="mb-4 pb-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-lg font-semibold text-gray-900">
              {getVersionIcon(currentVersion.label)} {currentVersion.labelText} 改写版本
            </h4>
            
            <div className="flex items-center gap-3">
              <div className={`px-3 py-1.5 rounded-lg text-sm font-bold border ${getScoreColor(
                currentVersion.estimatedScore
              )}`}>
                预估新AIGC率: {currentVersion.estimatedScore ?? '-'}%
              </div>
              
              <div className="text-sm text-gray-500">
                置信度: {(currentVersion.confidence * 100).toFixed(0)}%
              </div>
            </div>
          </div>

          <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
            💡 {currentVersion.changesSummary || '改写完成'}
          </p>
        </div>

        <div className="mb-6">
          <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg border border-green-200">
            <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
              {currentVersion.text}
            </p>
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onRegenerate}
            disabled={isRegenerating}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
            aria-label="重新生成此版本的改写内容"
          >
            {isRegenerating ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                生成中...
              </>
            ) : (
              <>🔄 重生成</>
            )}
          </button>

          <button
            onClick={() => onAdopt(currentVersion)}
            disabled={isAdopting}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] shadow-sm"
            aria-label={`采用此${currentVersion.labelText}版本`}
          >
            {isAdopting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                处理中...
              </>
            ) : (
              <>✅ 采用此版本</>
            )}
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .animate-slide-in-right {
          animation: slideInRight 300ms ease-out;
        }

        .animate-slide-in-left {
          animation: slideInLeft 300ms ease-out;
        }
      `}</style>
    </div>
  );
}
