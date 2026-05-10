'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { libraryApi, type DocumentDetail, type DocumentType } from '@/lib/api';
import TypeBadge from '@/components/library/TypeBadge';
import CitationGenerator from '@/components/library/CitationGenerator';

const typeLabels: Record<DocumentType, string> = {
  JOURNAL_ARTICLE: '期刊文章',
  THESIS: '学位论文',
  BOOK: '书籍',
  CONFERENCE_PAPER: '会议论文',
  WEBPAGE: '网页',
  PATENT: '专利',
};

const typeFieldGroups: Record<DocumentType, { label: string; fields: { key: string; label: string }[] }[]> = {
  JOURNAL_ARTICLE: [
    {
      label: '期刊信息',
      fields: [
        { key: 'journal', label: '期刊名称' },
        { key: 'volume', label: '卷' },
        { key: 'issue', label: '期' },
        { key: 'pages', label: '页码' },
      ],
    },
  ],
  THESIS: [
    {
      label: '学位信息',
      fields: [
        { key: 'university', label: '授予院校' },
        { key: 'degreeType', label: '学位类型' },
      ],
    },
  ],
  BOOK: [
    {
      label: '出版信息',
      fields: [
        { key: 'publisher', label: '出版社' },
        { key: 'edition', label: '版次' },
        { key: 'isbn', label: 'ISBN' },
        { key: 'location', label: '出版地' },
      ],
    },
  ],
  CONFERENCE_PAPER: [
    {
      label: '会议信息',
      fields: [
        { key: 'conferenceName', label: '会议名称' },
        { key: 'conferenceLocation', label: '举办地点' },
        { key: 'editors', label: '编者' },
        { key: 'pages', label: '页码' },
      ],
    },
  ],
  WEBPAGE: [
    {
      label: '网页信息',
      fields: [
        { key: 'websiteName', label: '网站名称' },
        { key: 'url', label: 'URL' },
        { key: 'accessDate', label: '访问日期' },
        { key: 'publishDate', label: '发布日期' },
      ],
    },
  ],
  PATENT: [
    {
      label: '专利信息',
      fields: [
        { key: 'patentNumber', label: '专利号' },
        { key: 'inventors', label: '发明人' },
        { key: 'filingDate', label: '申请日期' },
        { key: 'issuingAuthority', label: '授权机构' },
      ],
    },
  ],
};

function getTypedData(doc: DocumentDetail) {
  switch (doc.type) {
    case 'JOURNAL_ARTICLE': return doc.journalData;
    case 'THESIS': return doc.thesisData;
    case 'BOOK': return doc.bookData;
    case 'CONFERENCE_PAPER': return doc.conferenceData;
    case 'WEBPAGE': return doc.webpageData;
    case 'PATENT': return doc.patentData;
    default: return null;
  }
}

export default function DocumentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [document, setDocument] = useState<DocumentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadDocument();
  }, [id]);

  const loadDocument = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await libraryApi.getById(id);
      setDocument(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message || '加载文献详情失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await libraryApi.delete(id);
      router.push('/library');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || '删除失败，请重试');
      setDeleteConfirmOpen(false);
      setDeleting(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="animate-pulse h-8 w-48 bg-slate-200 rounded" />
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6 animate-pulse">
            <div className="h-40 bg-slate-200 rounded-xl" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 h-96 bg-slate-200 rounded-xl" />
              <div className="h-80 bg-slate-200 rounded-xl" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error && !document) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-4">
          <div className="text-5xl mb-4">😕</div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">加载失败</h2>
          <p className="text-slate-600 mb-6">{error}</p>
          <Link
            href="/library"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            ← 返回知识库
          </Link>
        </div>
      </div>
    );
  }

  if (!document) return null;

  const typedData = getTypedData(document);
  const fieldGroups = typeFieldGroups[document.type] || [];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <nav className="flex items-center gap-2 text-sm text-slate-500 mb-2">
            <Link href="/library" className="hover:text-blue-600 transition-colors">知识库</Link>
            <span>/</span>
            <span className="text-slate-800 font-medium truncate max-w-lg">{document.title}</span>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <span className="text-red-500 mt-0.5">⚠️</span>
            <p className="text-sm text-red-800 flex-1">{error}</p>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">✕</button>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex flex-wrap items-start gap-4 mb-4">
            <TypeBadge type={document.type} size="lg" />
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-slate-900 leading-tight">{document.title}</h1>
              <p className="text-base text-slate-600 mt-1">{document.authors}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600 pt-4 border-t border-slate-100">
            <span><strong className="text-slate-700">年份:</strong> {document.year || '-'}</span>
            {document.doi && (
              <span>
                <strong className="text-slate-700">DOI:</strong>
                <a
                  href={`https://doi.org/${document.doi}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline ml-1"
                >
                  {document.doi}
                </a>
              </span>
            )}
            {document.url && (
              <span>
                <strong className="text-slate-700">URL:</strong>
                <a
                  href={document.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline ml-1 truncate max-w-xs inline-block align-bottom"
                >
                  {document.url}
                </a>
              </span>
            )}
            <span><strong className="text-slate-700">被引用:</strong> <span className={document.citationCount > 0 ? 'text-orange-600 font-medium' : ''}>{document.citationCount} 次</span></span>
            <span><strong className="text-slate-700">创建于:</strong> {formatDate(document.createdAt)}</span>
            <span><strong className="text-slate-700">更新于:</strong> {formatDate(document.updatedAt)}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                📋 详细信息
              </h2>

              <div className="space-y-6">
                {fieldGroups.map((group) => (
                  <div key={group.label}>
                    <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-3 pb-2 border-b border-slate-100">
                      {group.label}
                    </h3>
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                      {group.fields.map((field) => {
                        let value: string | number | null | undefined = '';
                        if (typedData) {
                          value = (typedData as Record<string, any>)[field.key];
                        }

                        if (field.key === 'degreeType') {
                          const degreeMap: Record<string, string> = {
                            BACHELOR: '学士',
                            MASTER: '硕士',
                            DOCTOR: '博士',
                          };
                          value = value ? degreeMap[String(value)] || String(value) : '';
                        }

                        return (
                          <div key={field.key} className="flex flex-col">
                            <dt className="text-xs text-slate-500">{field.label}</dt>
                            <dd className="text-sm text-slate-800 mt-0.5 break-all">
                            {value || (
                              <span className="text-slate-400 italic">未填写</span>
                            )}
                          </dd>
                        </div>
                        );
                      })}
                    </dl>
                  </div>
                ))}

                {(document.abstract || document.keywords.length > 0 || document.notes) && (
                  <div className="pt-4 border-t border-slate-100 space-y-4">
                    {document.abstract && (
                      <div>
                        <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-2">摘要</h3>
                        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap bg-slate-50 rounded-lg p-4">
                          {document.abstract}
                        </p>
                      </div>
                    )}

                    {document.keywords.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-2">关键词</h3>
                        <div className="flex flex-wrap gap-2">
                          {document.keywords.map((keyword, index) => (
                            <span
                              key={index}
                              className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium"
                            >
                              {keyword}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {document.notes && (
                      <div>
                        <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-2">备注</h3>
                        <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                          {document.notes}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <CitationGenerator document={document} />
          </div>

          <aside className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                ⚡ 快捷操作
              </h3>
              <div className="space-y-3">
                <Link
                  href={`/library/${id}/edit`}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                >
                  ✏️ 编辑文献
                </Link>
                <button
                  onClick={() => setDeleteConfirmOpen(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors font-medium text-sm"
                >
                  🗑️ 删除文献
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                📊 引用统计
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-100">
                  <span className="text-sm text-slate-700">被引用次数</span>
                  <span className="text-2xl font-bold text-orange-600">{document.citationCount}</span>
                </div>
                <div className="space-y-2 text-sm text-slate-600">
                  <div className="flex justify-between">
                    <span>文献类型</span>
                    <TypeBadge type={document.type} size="sm" showLabel />
                  </div>
                  <div className="flex justify-between">
                    <span>发表年份</span>
                    <span className="font-medium text-slate-900">{document.year || '未知'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                🔗 外部链接
              </h3>
              <div className="space-y-2">
                {document.doi && (
                  <a
                    href={`https://doi.org/${document.doi}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 transition-colors py-1.5 px-2 -mx-2 rounded hover:bg-white/60"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    通过 DOI 查看
                  </a>
                )}
                {document.url && (
                  <a
                    href={document.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 transition-colors py-1.5 px-2 -mx-2 rounded hover:bg-white/60"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    访问原始链接
                  </a>
                )}
                {!document.doi && !document.url && (
                  <p className="text-sm text-slate-400 italic">暂无外部链接</p>
                )}
              </div>
            </div>
          </aside>
        </div>

        <div className="mt-8 bg-white rounded-xl border border-slate-200 p-5 text-center">
          <p className="text-sm text-slate-500">
            需要修改此文献？点击右侧「编辑文献」按钮进行修改 · 引用格式支持 GB/T 7714、APA 7th、MLA 9th 三种标准
          </p>
        </div>
      </main>

      {deleteConfirmOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => !deleting && setDeleteConfirmOpen(false)}>
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">确认删除文献</h3>
            <p className="text-sm text-slate-600 mb-6">
              确定要删除《{document.title}》吗？此操作无法撤销。
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmOpen(false)}
                disabled={deleting}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 flex items-center gap-2"
              >
                {deleting ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    删除中...
                  </>
                ) : (
                  <>确认删除</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
