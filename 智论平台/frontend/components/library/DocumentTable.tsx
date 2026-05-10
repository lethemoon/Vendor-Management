'use client';

import { useState } from 'react';
import Link from 'next/link';
import { type DocumentListItem, type DocumentType } from '@/lib/api';
import TypeBadge from './TypeBadge';

interface DocumentTableProps {
  documents: DocumentListItem[];
  selectedIds: Set<string>;
  loading: boolean;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onGenerateCitation: (id: string) => void;
}

export default function DocumentTable({
  documents,
  selectedIds,
  loading,
  onToggleSelect,
  onSelectAll,
  onView,
  onEdit,
  onDelete,
  onGenerateCitation,
}: DocumentTableProps) {
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);

  const isAllSelected = documents.length > 0 && documents.every((doc) => selectedIds.has(doc.id));
  const isSomeSelected = documents.some((doc) => selectedIds.has(doc.id));

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="space-y-3 p-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="animate-pulse flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
              <div className="w-5 h-5 bg-slate-300 rounded" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-slate-300 rounded w-3/4" />
                <div className="h-3 bg-slate-300 rounded w-1/2" />
              </div>
              <div className="w-16 h-8 bg-slate-300 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
        <div className="text-6xl mb-4">📚</div>
        <h3 className="text-xl font-semibold text-slate-800 mb-2">暂无文献</h3>
        <p className="text-slate-600 mb-6 max-w-md mx-auto">
          您的文献库还是空的，开始添加您的第一篇文献吧！支持手动录入或通过 DOI 智能导入。
        </p>
        <Link
          href="/library/new"
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          <span>➕</span>
          添加第一篇文献
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left w-12">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = isSomeSelected && !isAllSelected;
                  }}
                  onChange={onSelectAll}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  aria-label="全选"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider w-24">
                类型
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                标题
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider w-48">
                作者
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider w-20">
                年份
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider w-20">
                被引用
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider w-32">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {documents.map((doc) => (
              <tr
                key={doc.id}
                className={`hover:bg-slate-50 transition-colors ${
                  selectedIds.has(doc.id) ? 'bg-blue-50' : ''
                }`}
              >
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(doc.id)}
                    onChange={() => onToggleSelect(doc.id)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    aria-label={`选择 ${doc.title}`}
                  />
                </td>

                <td className="px-4 py-3">
                  <TypeBadge type={doc.type} size="sm" showLabel={false} />
                </td>

                <td className="px-4 py-3">
                  <Link
                    href={`/library/${doc.id}`}
                    className="text-sm font-medium text-slate-900 hover:text-blue-600 transition-colors line-clamp-2"
                    title={doc.title}
                  >
                    {doc.title}
                  </Link>
                </td>

                <td className="px-4 py-3">
                  <span className="text-sm text-slate-600 line-clamp-1" title={doc.authors}>
                    {doc.authors}
                  </span>
                </td>

                <td className="px-4 py-3">
                  <span className="text-sm text-slate-700">{doc.year || '-'}</span>
                </td>

                <td className="px-4 py-3">
                  <span className={`text-sm font-medium ${doc.citationCount > 0 ? 'text-orange-600' : 'text-slate-400'}`}>
                    {doc.citationCount}
                  </span>
                </td>

                <td className="px-4 py-3 text-right">
                  <div className="relative inline-block">
                    <button
                      onClick={() => setActionMenuId(actionMenuId === doc.id ? null : doc.id)}
                      className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                      aria-label="操作菜单"
                    >
                      操作 ▼
                    </button>

                    {actionMenuId === doc.id && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setActionMenuId(null)}
                        />
                        <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-20">
                          <button
                            onClick={() => {
                              onView(doc.id);
                              setActionMenuId(null);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                          >
                            👁️ 查看详情
                          </button>
                          <button
                            onClick={() => {
                              onEdit(doc.id);
                              setActionMenuId(null);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                          >
                            ✏️ 编辑
                          </button>
                          <button
                            onClick={() => {
                              onGenerateCitation(doc.id);
                              setActionMenuId(null);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                          >
                            📋 生成引用
                          </button>
                          <hr className="my-1 border-slate-200" />
                          <button
                            onClick={() => {
                              onDelete(doc.id);
                              setActionMenuId(null);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                          >
                            🗑️ 删除
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
