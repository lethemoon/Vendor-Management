'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { aigcApi, type HistoryRecord, type HistoryQueryParams } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type FilterTab = 'all' | 'in-progress' | 'completed' | 'abandoned';

interface SortOption {
  value: string;
  label: string;
}

export default function AIGCHistoryPage() {
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [sortBy, setSortBy] = useState('latest');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const sortOptions: SortOption[] = [
    { value: 'latest', label: '最新优先' },
    { value: 'rate-asc', label: 'AIGC率升序' },
    { value: 'rounds-desc', label: '优化轮次降序' },
  ];

  useEffect(() => {
    loadHistory();
  }, [activeTab, sortBy]);

  const loadHistory = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params: HistoryQueryParams = {
        limit: 50,
        sortBy,
      };

      if (activeTab !== 'all') {
        params.status = activeTab;
      }

      const response = await aigcApi.getHistory(params);
      setRecords(response.data.records || []);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || '加载历史记录失败');
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, sortBy]);

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    setError(null);

    try {
      await aigcApi.deleteHistory(id);
      
      setRecords((prev) => prev.filter((r) => r.id !== id));
      setDeleteConfirmId(null);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || '删除失败，请重试');
    } finally {
      setIsDeleting(false);
    }
  };

  const getFilteredRecords = (): HistoryRecord[] => {
    let filtered = [...records];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.title?.toLowerCase().includes(query) ||
          r.id.toLowerCase().includes(query)
      );
    }

    return filtered;
  };

  const getRiskBadgeVariant = (rate: number) => {
    if (rate <= 20) return 'success' as const;
    if (rate <= 50) return 'warning' as const;
    return 'danger' as const;
  };

  const getStatusBadgeStyle = (status: string): string => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'Optimizing':
        return 'bg-blue-100 text-blue-700 border-blue-300 animate-spin-slow';
      case 'Analyzing':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300 animate-pulse';
      case 'Abandoned':
        return 'bg-gray-100 text-gray-600 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-300';
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'Completed': return '✅ 已完成';
      case 'Optimizing': return '🔄 优化中';
      case 'Analyzing': return '🔍 分析中';
      case 'Pending': return '⏳ 等待中';
      case 'Abandoned': return '⚪ 已放弃';
      default: return status;
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getRateChangeColor = (initial: number, final: number) => {
    const change = final - initial;
    if (change < -20) return 'text-green-600 font-bold';
    if (change < 0) return 'text-green-600';
    if (change > 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const canContinueOptimize = (record: HistoryRecord) => {
    return (
      record.status === 'Completed' &&
      record.finalRate > 20 &&
      record.optimizationRounds < 10
    );
  };

  const filteredRecords = getFilteredRecords();

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-800">AIGC检测历史</h1>
              <p className="mt-2 text-slate-600">查看和管理您的所有检测记录</p>
            </div>

            <Link href="/aigc/detect">
              <Button aria-label="开始新的检测">
                ➕ 新建检测
              </Button>
            </Link>
          </div>
        </div>

        <Card className="mb-6 shadow-sm">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-6">
              <div className="relative flex-1 max-w-md w-full">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="🔍 搜索标题或ID..."
                  className="w-full pl-4 pr-10 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  aria-label="搜索检测记录"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    aria-label="清除搜索"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="flex gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  aria-label="排序方式"
                >
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8" role="tablist" aria-label="状态筛选">
                {[
                  { key: 'all' as FilterTab, label: '全部', count: records.length },
                  {
                    key: 'in-progress' as FilterTab,
                    label: '进行中',
                    count: records.filter(
                      (r) =>
                        r.status === 'Pending' ||
                        r.status === 'Analyzing' ||
                        r.status === 'Optimizing'
                    ).length,
                  },
                  {
                    key: 'completed' as FilterTab,
                    label: '已完成',
                    count: records.filter((r) => r.status === 'Completed').length,
                  },
                  {
                    key: 'abandoned' as FilterTab,
                    label: '已放弃',
                    count: records.filter((r) => r.status === 'Abandoned').length,
                  },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                      activeTab === tab.key
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                    role="tab"
                    aria-selected={activeTab === tab.key}
                    aria-label={`${tab.label} (${tab.count})`}
                  >
                    {tab.label}
                    {tab.count > 0 && (
                      <span
                        className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                          activeTab === tab.key
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </nav>
            </div>
          </CardContent>
        </Card>

        {error && (
          <div className="mb-6 rounded-md bg-red-50 p-4 border border-red-200" role="alert">
            <div className="text-sm text-red-800">{error}</div>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="shadow-sm animate-pulse">
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <div className="h-5 bg-gray-200 rounded w-3/4" />
                    <div className="h-4 bg-gray-200 rounded w-1/2" />
                    <div className="h-4 bg-gray-200 rounded w-full" />
                    <div className="h-10 bg-gray-200 rounded w-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredRecords.length === 0 ? (
          <Card className="shadow-sm">
            <CardContent className="p-12 text-center">
              <div className="text-6xl mb-4">📭</div>
              <h3 className="text-xl font-semibold text-slate-800 mb-2">
                {searchQuery ? '未找到匹配的记录' : '还没有AIGC检测记录'}
              </h3>
              <p className="text-slate-600 mb-6 max-w-md mx-auto">
                {searchQuery
                  ? '尝试使用其他关键词搜索，或者清除筛选条件'
                  : '完成第一次检测后，记录将显示在此处'}
              </p>
              
              {!searchQuery && (
                <Link href="/aigc/detect">
                  <Button size="lg" className="min-h-[48px]" aria-label="开始第一次检测">
                    🚀 开始第一次检测
                  </Button>
                </Link>
              )}

              {searchQuery && (
                <Button
                  variant="outline"
                  onClick={() => setSearchQuery('')}
                  size="lg"
                  className="min-h-[48px]"
                  aria-label="清除搜索条件"
                >
                  清除搜索
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="mb-4 text-sm text-slate-600">
              共找到 <strong>{filteredRecords.length}</strong> 条记录
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredRecords.map((record) => (
                <Card
                  key={record.id}
                  className="shadow-sm hover:shadow-md transition-shadow group"
                >
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <Link
                          href={`/aigc/result/${record.id}`}
                          className="flex-1 min-w-0"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xl">📄</span>
                            <h3 className="font-semibold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                              {record.title || '未命名文档'}
                            </h3>
                          </div>
                        </Link>

                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border whitespace-nowrap ${getStatusBadgeStyle(
                            record.status
                          )}`}
                        >
                          {getStatusLabel(record.status)}
                        </span>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-4 flex-wrap">
                          <span className="text-slate-600">
                            初始AIGC率:{' '}
                            <strong>{record.initialRate.toFixed(1)}%</strong>
                          </span>
                          
                          <span className="text-slate-400">→</span>
                          
                          <span className={getRateChangeColor(record.initialRate, record.finalRate)}>
                            最终: <strong>{record.finalRate.toFixed(1)}%</strong>
                          </span>
                        </div>

                        <div className="flex items-center gap-4 text-slate-600 flex-wrap">
                          <span>
                            优化{' '}
                            <Badge variant="secondary" className="mx-1">
                              {record.optimizationRounds} 轮
                            </Badge>
                          </span>

                          <span>字数: {record.wordCount.toLocaleString()}</span>

                          <span className="text-slate-400 ml-auto">
                            {formatDateTime(record.createdAt)}
                          </span>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-gray-200 flex gap-2 justify-end">
                        <Link href={`/aigc/result/${record.id}`}>
                          <Button variant="outline" size="sm" aria-label="查看详情">
                            查看详情
                          </Button>
                        </Link>

                        {canContinueOptimize(record) && (
                          <Link href={`/aigc/result/${record.id}`}>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-orange-600 border-orange-300 hover:bg-orange-50"
                              aria-label="继续优化"
                            >
                              继续优化
                            </Button>
                          </Link>
                        )}

                        {deleteConfirmId === record.id ? (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDelete(record.id)}
                              disabled={isDeleting}
                              aria-label="确认删除此记录"
                            >
                              {isDeleting ? '删除中...' : '确认删除'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setDeleteConfirmId(null)}
                              aria-label="取消删除"
                            >
                              取消
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => setDeleteConfirmId(record.id)}
                            aria-label="删除此记录"
                          >
                            🗑️ 删除
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>

      <style jsx global>{`
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }
      `}</style>
    </div>
  );
}
