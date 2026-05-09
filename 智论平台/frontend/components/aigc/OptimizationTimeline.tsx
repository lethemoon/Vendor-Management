'use client';

import { useState } from 'react';

interface OptimizationRecordOutput {
  id: string;
  roundNumber: number;
  operationType: 'InitialDetect' | 'Rewrite' | 'Recheck';
  beforeAigcRate: number;
  afterAigcRate: number;
  rateChange: number;
  targetParagraphIndices: number[];
  processingTimeMs: number;
  costCredits: number;
  createdAt: string;
}

interface OptimizationTimelineProps {
  records: OptimizationRecordOutput[];
  currentRound?: number;
  onRecordClick?: (record: OptimizationRecordOutput) => void;
}

export default function OptimizationTimeline({
  records,
  currentRound,
  onRecordClick,
}: OptimizationTimelineProps) {
  const [hoveredRecord, setHoveredRecord] = useState<string | null>(null);

  const formatTimestamp = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
    });
  };

  const getOperationLabel = (type: string, round: number) => {
    switch (type) {
      case 'InitialDetect':
        return `初始检测`;
      case 'Rewrite':
        return `第${round - 1}轮优化`;
      case 'Recheck':
        return `复测验证`;
      default:
        return `操作 #${round}`;
    }
  };

  const getNodeStatus = (record: OptimizationRecordOutput, index: number) => {
    if (index === records.length - 1 && currentRound === record.roundNumber) {
      return 'current';
    }
    if (index < records.length - 1) {
      return 'completed';
    }
    return 'future';
  };

  const getChangeColor = (change: number) => {
    if (change < 0) return 'text-green-600 bg-green-50 border-green-200';
    if (change > 0) return 'text-red-600 bg-red-50 border-red-200';
    return 'text-gray-600 bg-gray-50 border-gray-200';
  };

  const getChangeLabel = (change: number) => {
    if (change < 0) return `${change}% ↓`;
    if (change > 0) return `+${change}% ↑`;
    return '±0%';
  };

  if (records.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <div className="text-4xl mb-3">📋</div>
        <p className="text-lg font-medium">暂无优化记录</p>
        <p className="text-sm mt-1">完成检测后将显示优化时间线</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">优化进度时间线</h3>

      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

        <div className="space-y-6">
          {records.map((record, index) => {
            const nodeStatus = getNodeStatus(record, index);
            
            return (
              <div
                key={record.id}
                className="relative pl-12 group"
                onMouseEnter={() => setHoveredRecord(record.id)}
                onMouseLeave={() => setHoveredRecord(null)}
              >
                <div
                  className={`absolute left-2 top-1 w-5 h-5 rounded-full border-2 flex items-center justify-center z-10 transition-all ${
                    nodeStatus === 'completed'
                      ? 'bg-green-500 border-green-500 text-white'
                      : nodeStatus === 'current'
                      ? 'bg-blue-500 border-blue-500 text-white animate-pulse ring-4 ring-blue-200'
                      : 'bg-gray-200 border-gray-300 text-gray-500'
                  }`}
                >
                  {nodeStatus === 'completed' && (
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {nodeStatus === 'current' && (
                    <div className="w-2 h-2 bg-white rounded-full" />
                  )}
                  {nodeStatus === 'future' && (
                    <div className="w-2 h-2 bg-gray-400 rounded-full" />
                  )}
                </div>

                <div
                  className={`bg-white rounded-lg border-2 p-4 transition-all cursor-pointer ${
                    hoveredRecord === record.id
                      ? 'shadow-lg border-blue-300'
                      : 'shadow-sm border-gray-200'
                  } ${
                    nodeStatus === 'current' ? 'ring-2 ring-blue-200' : ''
                  }`}
                  onClick={() => onRecordClick?.(record)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onRecordClick?.(record);
                    }
                  }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <h4 className="font-semibold text-gray-900">
                        {getOperationLabel(record.operationType, record.roundNumber)}
                      </h4>
                      
                      {nodeStatus === 'current' && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium animate-pulse">
                          ← 您在这里
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-gray-500">
                      {formatDate(record.createdAt)} {formatTimestamp(record.createdAt)}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">AIGC率:</span>
                      <span className="font-semibold text-gray-900">
                        {record.beforeAigcRate.toFixed(1)}% → {record.afterAigcRate.toFixed(1)}%
                      </span>
                      
                      <span className={`text-xs px-2 py-1 rounded-full border font-bold ${getChangeColor(
                        record.rateChange
                      )}`}>
                        {getChangeLabel(record.rateChange)}
                      </span>
                    </div>

                    {record.operationType === 'Rewrite' && record.targetParagraphIndices.length > 0 && (
                      <div className="text-sm text-gray-600">
                        改写段落：
                        {record.targetParagraphIndices.map((idx) => (
                          <span
                            key={idx}
                            className="inline-block mx-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium"
                          >
                            P{idx + 1}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="text-xs text-gray-500 ml-auto">
                      耗时 {(record.processingTimeMs / 1000).toFixed(1)}s | 消耗 {record.costCredits} 配额
                    </div>
                  </div>

                  {hoveredRecord === record.id && (
                    <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-600">
                      <p>点击查看该轮次的详细改写记录</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
