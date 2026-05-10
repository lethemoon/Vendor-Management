'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLibraryStore } from '@/lib/stores/libraryStore';
import { libraryApi } from '@/lib/api';
import StatisticsBar from '@/components/library/StatisticsBar';
import SearchBar from '@/components/library/SearchBar';
import FilterBar from '@/components/library/FilterBar';
import DocumentTable from '@/components/library/DocumentTable';

export default function LibraryPage() {
  const router = useRouter();
  const {
    documents,
    pagination,
    filters,
    selectedIds,
    loading,
    error,
    fetchDocuments,
    setSearch,
    setFilters,
    setPage,
    setPageSize,
    toggleSelect,
    selectAll,
    clearSelection,
    batchDelete,
    deleteDocument,
  } = useLibraryStore();

  const [statistics, setStatistics] = useState({
    totalCount: 0,
    thisMonthCount: 0,
    journalArticleCount: 0,
    totalCitations: 0,
  });
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [batchDeleteConfirm, setBatchDeleteConfirm] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  useEffect(() => {
    fetchDocuments();
  }, [pagination.page, pagination.pageSize]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchDocuments();
    }, 400);
    return () => clearTimeout(timer);
  }, [filters.search, filters.sortBy, filters.sortOrder, filters.type]);

  const loadStatistics = useCallback(async () => {
    try {
      const response = await libraryApi.getList({ page: 1, pageSize: 1 });
      const stats = response.data.statistics as any;
      setStatistics({
        totalCount: stats.totalCount ?? 0,
        thisMonthCount: stats.thisMonthCount ?? 0,
        journalArticleCount: stats.typeDistribution?.JOURNAL_ARTICLE ?? stats.journalArticleCount ?? 0,
        totalCitations: stats.totalCitations ?? 0,
      });
    } catch (err) {
      console.error('Failed to load statistics:', err);
    }
  }, []);

  useEffect(() => {
    loadStatistics();
  }, [loadStatistics]);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
  }, [setSearch]);

  const handleSortByChange = useCallback((sortBy: typeof filters.sortBy) => {
    setFilters({ sortBy });
  }, [setFilters]);

  const handleSortOrderChange = useCallback((sortOrder: typeof filters.sortOrder) => {
    setFilters({ sortOrder });
  }, [setFilters]);

  const handleTypeChange = useCallback((type: typeof filters.type) => {
    setFilters({ type });
  }, [setFilters]);

  const handleViewDetail = useCallback((id: string) => {
    router.push(`/library/${id}`);
  }, [router]);

  const handleEdit = useCallback((id: string) => {
    router.push(`/library/${id}/edit`);
  }, [router]);

  const handleDeleteClick = useCallback((id: string) => {
    setDeleteConfirmId(id);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteConfirmId) return;
    const success = await deleteDocument(deleteConfirmId);
    if (success) {
      setDeleteConfirmId(null);
      fetchDocuments();
      loadStatistics();
    }
  }, [deleteConfirmId, deleteDocument, fetchDocuments, loadStatistics]);

  const handleGenerateCitation = useCallback(async (id: string) => {
    try {
      const response = await libraryApi.generateCitations([id], 'GBT7714');
      if (response.data && response.data.length > 0) {
        const citationText = response.data[0].citationText;
        await navigator.clipboard.writeText(citationText);
        alert(`引用已复制到剪贴板！\n\n${citationText}`);
      }
    } catch (err) {
      console.error('Failed to generate citation:', err);
      alert('生成引用失败，请重试');
    }
  }, []);

  const handleBatchDelete = useCallback(async () => {
    const success = await batchDelete();
    if (success) {
      setBatchDeleteConfirm(false);
      fetchDocuments();
      loadStatistics();
    }
  }, [batchDelete, fetchDocuments, loadStatistics]);

  const handleExportSelected = useCallback(async () => {
    if (selectedIds.size === 0) return;
    try {
      const ids = Array.from(selectedIds);
      const response = await libraryApi.exportCitations(ids, 'GBT7714', {
        includeHeader: true,
        lineNumbers: true,
      });
      const blob = new Blob([response.data.content], { type: response.data.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = response.data.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
      alert('导出失败，请重试');
    }
  }, [selectedIds]);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, [setPage]);

  const renderPagination = () => {
    const { page, pageSize, total, totalPages } = pagination;
    if (totalPages <= 1) return null;

    const pages: number[] = [];
    const maxVisible = 7;
    let start = Math.max(1, page - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return (
      <div className="flex items-center justify-between mt-6 bg-white rounded-lg border border-slate-200 px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <span>每页</span>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span>条，共 {total} 条记录</span>
        </div>

        <nav className="flex items-center gap-1" aria-label="分页导航">
          <button
            onClick={() => handlePageChange(page - 1)}
            disabled={page <= 1}
            className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            ← 上一页
          </button>

          {start > 1 && (
            <>
              <button onClick={() => handlePageChange(1)} className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">1</button>
              {start > 2 && <span className="px-2 text-slate-400">...</span>}
            </>
          )}

          {pages.map((p) => (
            <button
              key={p}
              onClick={() => handlePageChange(p)}
              className={`px-3 py-1.5 text-sm border rounded-lg transition-colors ${
                p === page
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'border-slate-300 hover:bg-slate-50'
              }`}
            >
              {p}
            </button>
          ))}

          {end < totalPages && (
            <>
              {end < totalPages - 1 && <span className="px-2 text-slate-400">...</span>}
              <button onClick={() => handlePageChange(totalPages)} className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">{totalPages}</button>
            </>
          )}

          <button
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= totalPages}
            className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            下一页 →
          </button>
        </nav>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">我的知识库</h1>
            <p className="text-sm text-slate-500 mt-0.5">管理和组织您的学术文献资源</p>
          </div>
          <Link
            href="/library/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            添加文献
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <span className="text-red-500 mt-0.5">⚠️</span>
            <div className="flex-1">
              <p className="text-sm text-red-800 font-medium">{error}</p>
            </div>
            <button
              onClick={() => useLibraryStore.setState({ error: null })}
              className="text-red-500 hover:text-red-700"
            >
              ✕
            </button>
          </div>
        )}

        <StatisticsBar
          totalCount={statistics.totalCount}
          thisMonthCount={statistics.thisMonthCount}
          journalArticleCount={statistics.journalArticleCount}
          totalCitations={statistics.totalCitations}
        />

        <div className="space-y-4 mb-6">
          <SearchBar
            value={filters.search}
            onChange={handleSearchChange}
            placeholder="搜索文献（标题/作者/DOI/关键词）..."
          />
          <FilterBar
            sortBy={filters.sortBy}
            sortOrder={filters.sortOrder}
            selectedTypes={filters.type}
            viewMode={viewMode}
            onSortByChange={handleSortByChange}
            onSortOrderChange={handleSortOrderChange}
            onTypeChange={handleTypeChange}
            onViewModeChange={setViewMode}
          />
        </div>

        {selectedIds.size > 0 && (
          <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-blue-800 font-medium">
              已选择 {selectedIds.size} 项
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setBatchDeleteConfirm(true)}
                className="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-medium"
              >
                🗑️ 删除选中
              </button>
              <button
                onClick={handleExportSelected}
                className="px-3 py-1.5 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors font-medium"
              >
                📤 导出选中
              </button>
              <button
                onClick={clearSelection}
                className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 transition-colors"
              >
                取消选择
              </button>
            </div>
          </div>
        )}

        <DocumentTable
          documents={documents}
          selectedIds={selectedIds}
          loading={loading}
          onToggleSelect={toggleSelect}
          onSelectAll={selectAll}
          onView={handleViewDetail}
          onEdit={handleEdit}
          onDelete={handleDeleteClick}
          onGenerateCitation={handleGenerateCitation}
        />

        {renderPagination()}
      </main>

      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setDeleteConfirmId(null)}>
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">确认删除</h3>
            <p className="text-sm text-slate-600 mb-6">
              确定要删除这篇文献吗？此操作无法撤销。
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}

      {batchDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setBatchDeleteConfirm(false)}>
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">批量删除确认</h3>
            <p className="text-sm text-slate-600 mb-6">
              确定要删除选中的 {selectedIds.size} 篇文献吗？此操作无法撤销。
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setBatchDeleteConfirm(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleBatchDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                确认删除 ({selectedIds.size})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
