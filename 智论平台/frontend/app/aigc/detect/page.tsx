'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { aigcApi, type DetectRequest, type HistoryRecord } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function AIGCDetectPage() {
  const router = useRouter();
  
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [source, setSource] = useState<'paste' | 'file_import' | 'paper_linked'>('paste');
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentRecords, setRecentRecords] = useState<HistoryRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  const MIN_CHARS = 100;
  const MAX_CHARS = 50000;

  useEffect(() => {
    loadRecentHistory();
  }, []);

  const loadRecentHistory = async () => {
    try {
      setIsLoadingHistory(true);
      const response = await aigcApi.getHistory({ limit: 5 });
      setRecentRecords(response.data.records || []);
    } catch (err) {
      console.error('Failed to load recent history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const formatContent = (text: string): string => {
    let formatted = text;
    
    formatted = formatted.replace(/<[^>]*>/g, '');
    
    formatted = formatted.replace(/\n{3,}/g, '\n\n');
    
    formatted = formatted.trim();
    
    return formatted;
  };

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const formattedText = formatContent(pastedText);
    
    if (formattedText.length > MAX_CHARS) {
      setError(`文本超出最大限制（${MAX_CHARS}字），已自动截断`);
      setContent(formattedText.slice(0, MAX_CHARS));
    } else {
      setContent(formattedText);
    }
  }, []);

  const getWordCountColor = (count: number) => {
    if (count < MIN_CHARS) return 'text-red-600 font-semibold';
    if (count >= MAX_CHARS * 0.9) return 'text-red-600 font-semibold';
    if (count >= MAX_CHARS * 0.7) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getWordCountStatus = (count: number) => {
    if (count < MIN_CHARS) return `最少需要 ${MIN_CHARS} 字`;
    if (count > MAX_CHARS) return `超出 ${count - MAX_CHARS} 字`;
    if (count === 0) return '';
    return `${count.toLocaleString()} / ${MAX_CHARS.toLocaleString()}`;
  };

  const canDetect = () => {
    return content.length >= MIN_CHARS && content.length <= MAX_CHARS && !isDetecting;
  };

  const handleDetect = async () => {
    if (!canDetect()) return;

    setIsDetecting(true);
    setError(null);

    try {
      const requestData: DetectRequest = {
        content,
        title: title || undefined,
        source,
      };

      const response = await aigcApi.detect(requestData);
      
      router.push(`/aigc/result/${response.data.detectionId}`);
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.error?.message ||
        err.message ||
        '检测失败，请重试';
      
      if (err.response?.status === 402) {
        setError(`配额不足：${errorMessage}`);
      } else if (err.response?.status === 400) {
        setError(errorMessage);
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsDetecting(false);
    }
  };

  const getRiskBadgeVariant = (rate: number) => {
    if (rate <= 20) return 'success' as const;
    if (rate <= 50) return 'warning' as const;
    return 'danger' as const;
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'Optimizing':
        return 'bg-blue-100 text-blue-700 border-blue-300 animate-pulse';
      case 'Analyzing':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300 animate-pulse';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    return `${diffDays}天前`;
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-800">AIGC检测与降痕</h1>
              <p className="mt-2 text-slate-600">
                智能识别AI生成内容，提供专业降痕优化方案
              </p>
            </div>
            <Link href="/aigc/history">
              <Button variant="outline" aria-label="查看历史记录">
                📋 历史记录
              </Button>
            </Link>
          </div>
        </div>

        <Card className="mb-6 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>📝</span>
              粘贴您的论文文本开始检测
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-slate-700 mb-2">
                论文标题（可选）
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value.slice(0, 200))}
                placeholder="输入论文标题，最多200字符"
                maxLength={200}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                aria-label="论文标题输入框"
              />
              {title.length > 0 && (
                <p className="mt-1 text-xs text-slate-500">
                  {title.length} / 200 字符
                </p>
              )}
            </div>

            <div>
              <label htmlFor="source" className="block text-sm font-medium text-slate-700 mb-2">
                来源选择
              </label>
              <select
                id="source"
                value={source}
                onChange={(e) => setSource(e.target.value as typeof source)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                aria-label="选择内容来源"
              >
                <option value="paste">📋 直接粘贴</option>
                <option value="file_import">📁 文件导入</option>
                <option value="paper_linked">🔗 关联论文</option>
              </select>
            </div>

            <div>
              <label htmlFor="content" className="block text-sm font-medium text-slate-700 mb-2">
                论文正文 <span className="text-red-500">*</span>
              </label>
              <textarea
                id="content"
                value={content}
                onChange={(e) => setContent(formatContent(e.target.value))}
                onPaste={handlePaste}
                placeholder="请在此粘贴或输入论文正文内容...&#10;&#10;支持字数范围：100 - 50,000 字&#10;系统将自动去除HTML标签和多余空白"
                rows={15}
                maxLength={MAX_CHARS + 1000}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y leading-relaxed"
                aria-label="论文正文输入区域"
              />
              
              <div className="mt-2 flex items-center justify-between">
                <span className={`text-sm ${getWordCountColor(content.length)}`}>
                  {getWordCountStatus(content.length)}
                </span>
                
                {content.length > 0 && (
                  <span className="text-sm text-slate-500">
                    本次检测将消耗{' '}
                    <strong className="text-blue-600">{content.length.toLocaleString()}</strong> 字配额
                  </span>
                )}
              </div>
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-4 border border-red-200" role="alert">
                <div className="flex items-center gap-2">
                  <span className="text-red-500">⚠️</span>
                  <span className="text-sm text-red-800">{error}</span>
                </div>
              </div>
            )}

            <div className="pt-4">
              <Button
                onClick={handleDetect}
                disabled={!canDetect()}
                size="lg"
                className="w-full min-h-[56px] text-base font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label={
                  isDetecting ? '正在检测中' : content.length < MIN_CHARS 
                    ? '文本太短无法检测' : '开始AIGC检测'
                }
              >
                {isDetecting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    正在检测...
                    <span className="ml-2 text-sm opacity-75">
                      {['分词处理', '句法分析', '特征提取', '综合评判'][
                        Math.floor(Date.now() / 800) % 4
                      ]}
                    </span>
                  </>
                ) : content.length < MIN_CHARS ? (
                  <>⏳ 请输入至少 {MIN_CHARS} 字的文本</>
                ) : (
                  <>✨ 开始检测 ({content.length.toLocaleString()}字)</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>🔥</span>
              最近检测
            </CardTitle>
          </CardHeader>
          
          <CardContent>
            {isLoadingHistory ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse flex items-center gap-4 p-4 bg-gray-100 rounded-lg">
                    <div className="w-10 h-10 bg-gray-300 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-300 rounded w-3/4" />
                      <div className="h-3 bg-gray-300 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentRecords.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-5xl mb-4">🎯</div>
                <h3 className="text-xl font-semibold text-slate-800 mb-2">
                  开始您的第一次AIGC检测
                </h3>
                <p className="text-slate-600 max-w-md mx-auto">
                  粘贴您的论文文本，系统将智能分析AI生成内容并提供专业的降痕优化建议
                </p>
                
                <div className="mt-6 inline-flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-4 py-2 rounded-full">
                  <span>💡</span>
                  <span>提示：检测结果将保存在此处，方便您随时查看和继续优化</span>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {recentRecords.map((record) => (
                  <Link
                    key={record.id}
                    href={`/aigc/result/${record.id}`}
                    className="block p-4 rounded-lg border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-lg">📄</span>
                          <h4 className="font-semibold text-slate-900 truncate group-hover:text-blue-700 transition-colors">
                            {record.title || '未命名文档'}
                          </h4>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-slate-600 ml-9">
                          <span>
                            初始AIGC率:{' '}
                            <strong>{record.initialRate.toFixed(1)}%</strong> → 最终:
                            <strong className={`ml-1 ${
                              record.finalRate <= 30 ? 'text-green-600' :
                              record.finalRate <= 60 ? 'text-orange-600' : 'text-red-600'
                            }`}>
                              {record.finalRate.toFixed(1)}%
                            </strong>
                          </span>
                          
                          <Badge variant={getRiskBadgeVariant(record.finalRate)}>
                            {record.optimizationRounds} 轮优化
                          </Badge>
                          
                          <span className="text-slate-400">
                            {formatTimeAgo(record.createdAt)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusBadgeStyle(
                          record.status
                        )}`}>
                          {record.status === 'Completed' ? '✅ 已完成' :
                           record.status === 'Optimizing' ? '🔄 优化中' :
                           record.status === 'Analyzing' ? '🔍 分析中' : record.status}
                        </span>
                        
                        <span className="text-slate-400 group-hover:text-blue-600 transition-colors">
                          →
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {!isLoadingHistory && recentRecords.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200 text-center">
                <Link
                  href="/aigc/history"
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  查看所有历史记录 →
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
