'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { paperAPI, type Paper } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type StatusFilter = 'all' | 'draft' | 'analyzed' | 'rewriting' | 'completed';
type SortOption = 'newest' | 'wordCount';

export default function HistoryPage() {
  const router = useRouter();
  
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortOption, setSortOption] = useState<SortOption>('newest');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadPapers();
  }, []);

  const loadPapers = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await paperAPI.getList();
      setPapers(response.data || []);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || '加载历史记录失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    setError('');

    try {
      await paperAPI.delete(id);
      setPapers(prev => prev.filter(p => p.id !== id));
      setDeleteConfirmId(null);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || '删除失败，请重试');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredAndSortedPapers = () => {
    let filtered = papers;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.status === statusFilter);
    }

    if (sortOption === 'newest') {
      filtered = [...filtered].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } else if (sortOption === 'wordCount') {
      filtered = [...filtered].sort((a, b) => b.wordCount - a.wordCount);
    }

    return filtered;
  };

  const getStatusBadgeVariant = (status: Paper['status']) => {
    switch (status) {
      case 'draft': return 'outline' as const;
      case 'analyzed': return 'secondary' as const;
      case 'rewriting': return 'warning' as const;
      case 'completed': return 'success' as const;
      default: return 'outline' as const;
    }
  };

  const getStatusLabel = (status: Paper['status']) => {
    switch (status) {
      case 'draft': return '草稿';
      case 'analyzed': return '已分析';
      case 'rewriting': return '改写中';
      case 'completed': return '已完成';
      default: return '未知';
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
    if (diffDays < 30) return `${diffDays}天前`;
    
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const statusFilters: { value: StatusFilter; label: string; count?: number }[] = [
    { value: 'all', label: '全部' },
    { value: 'draft', label: '草稿', count: papers.filter(p => p.status === 'draft').length },
    { value: 'analyzed', label: '已分析', count: papers.filter(p => p.status === 'analyzed').length },
    { value: 'rewriting', label: '改写中', count: papers.filter(p => p.status === 'rewriting').length },
    { value: 'completed', label: '已完成', count: papers.filter(p => p.status === 'completed').length },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">正在加载历史记录...</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map(i => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
                  <div className="flex gap-2 mb-4">
                    <div className="h-6 bg-gray-200 rounded-full w-16"></div>
                    <div className="h-6 bg-gray-200 rounded-full w-20"></div>
                  </div>
                  <div className="flex gap-2">
                    <div className="h-9 bg-gray-200 rounded flex-1"></div>
                    <div className="h-9 bg-gray-200 rounded flex-1"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const displayPapers = filteredAndSortedPapers();

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">历史记录</h1>
              <p className="mt-2 text-gray-600">
                共 {papers.length} 篇论文
              </p>
            </div>
            <Link href="/paper/editor">
              <Button aria-label="创建新论文">
                ✨ 新建论文
              </Button>
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-md bg-red-50 p-4" role="alert">
            <div className="text-sm text-red-800">{error}</div>
          </div>
        )}

        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex flex-wrap gap-2" role="tablist" aria-label="按状态筛选">
                {statusFilters.map(filter => (
                  <button
                    key={filter.value}
                    onClick={() => setStatusFilter(filter.value)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                      statusFilter === filter.value
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                    role="tab"
                    aria-selected={statusFilter === filter.value}
                    aria-label={`筛选${filter.label}${filter.count !== undefined ? ` (${filter.count})` : ''}`}
                  >
                    {filter.label}
                    {filter.count !== undefined && (
                      <span className={`ml-2 ${
                        statusFilter === filter.value ? 'text-blue-100' : 'text-gray-500'
                      }`}>
                        ({filter.count})
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <label htmlFor="sort" className="text-sm text-gray-600">
                  排序：
                </label>
                <select
                  id="sort"
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value as SortOption)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="选择排序方式"
                >
                  <option value="newest">最新优先</option>
                  <option value="wordCount">字数最多</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {displayPapers.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <div className="text-6xl mb-6">📝</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                还没有论文记录
              </h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                开始您的第一次降重之旅吧！上传论文内容，体验智能分析和一键改写功能。
              </p>
              <Link href="/paper/editor">
                <Button size="lg" className="min-h-[48px] px-8" aria-label="新建第一篇论文">
                  🚀 新建论文
                </Button>
              </Link>
              
              <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
                <div className="text-center p-4">
                  <div className="text-3xl mb-2">📊</div>
                  <h4 className="font-semibold text-gray-900 mb-1">智能分析</h4>
                  <p className="text-sm text-gray-600">自动检测重复率和高风险段落</p>
                </div>
                <div className="text-center p-4">
                  <div className="text-3xl mb-2">✨</div>
                  <h4 className="font-semibold text-gray-900 mb-1">AI 改写</h4>
                  <p className="text-sm text-gray-600">多版本智能改写，保持原意</p>
                </div>
                <div className="text-center p-4">
                  <div className="text-3xl mb-2">📈</div>
                  <h4 className="font-semibold text-gray-900 mb-1">效果显著</h4>
                  <p className="text-sm text-gray-600">平均降低重复率 30% 以上</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {displayPapers.map((paper) => (
              <Card
                key={paper.id}
                className="hover:shadow-lg transition-all duration-200 hover:-translate-y-1 group"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="text-lg font-semibold line-clamp-2 flex-1">
                      {paper.title}
                    </CardTitle>
                    <Badge variant={getStatusBadgeVariant(paper.status)}>
                      {getStatusLabel(paper.status)}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>字数：</span>
                      <span className="font-medium text-gray-900">
                        {paper.wordCount.toLocaleString()} 字
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span>创建时间：</span>
                      <span className="font-medium text-gray-900">
                        {formatTimeAgo(paper.createdAt)}
                      </span>
                    </div>
                    
                    {(paper.plagiarismRate !== undefined) && (
                      <div className="flex justify-between">
                        <span>重复率：</span>
                        <span className={`font-medium ${
                          paper.plagiarismRate < 30 ? 'text-green-600' :
                          paper.plagiarismRate <= 50 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {paper.plagiarismRate.toFixed(1)}%
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2 border-t">
                    <Link href={`/paper/editor?id=${paper.id}`} className="flex-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full min-h-[44px]"
                        aria-label={`继续编辑${paper.title}`}
                      >
                        ✏️ 继续编辑
                      </Button>
                    </Link>
                    
                    {paper.status === 'analyzed' && (
                      <Link href={`/paper/deduplicate?id=${paper.id}`} className="flex-1">
                        <Button
                          size="sm"
                          className="w-full min-h-[44px]"
                          aria-label={`查看${paper.title}的分析结果`}
                        >
                          🔍 查看分析
                        </Button>
                      </Link>
                    )}
                    
                    {paper.status === 'completed' && (
                      <Link href={`/paper/deduplicate?id=${paper.id}`} className="flex-1">
                        <Button
                          size="sm"
                          className="w-full min-h-[44px]"
                          variant="secondary"
                          aria-label={`查看${paper.title}的报告`}
                        >
                          📊 查看报告
                        </Button>
                      </Link>
                    )}
                    
                    {deleteConfirmId === paper.id ? (
                      <div className="flex gap-2">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(paper.id)}
                          disabled={isDeleting}
                          className="min-h-[44px]"
                          aria-label="确认删除此论文"
                        >
                          {isDeleting ? '删除中...' : '确认删除'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteConfirmId(null)}
                          className="min-h-[44px]"
                          aria-label="取消删除"
                        >
                          取消
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeleteConfirmId(paper.id)}
                        className="min-h-[44px] text-red-600 hover:text-red-700 hover:border-red-300"
                        aria-label={`删除${paper.title}`}
                      >
                        🗑️ 删除
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
