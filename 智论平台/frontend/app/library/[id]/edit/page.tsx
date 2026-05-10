'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { libraryApi, type DocumentDetail } from '@/lib/api';
import { useLibraryStore } from '@/lib/stores/libraryStore';
import DocumentForm from '@/components/library/DocumentForm';
import CitationPreviewPanel from '@/components/library/CitationPreviewPanel';

export default function EditDocumentPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [initialData, setInitialData] = useState<DocumentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const { loading: storeLoading, error: storeError, updateDocument } = useLibraryStore();

  useEffect(() => {
    loadDocumentData();
  }, [id]);

  const loadDocumentData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await libraryApi.getById(id);
      setInitialData(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message || '加载文献数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (storeError && !error) {
      setLocalError(storeError);
      setSubmitting(false);
    }
  }, [storeError]);

  const handleSubmit = async () => {
    if (!initialData) return;

    const state = useLibraryStore.getState();
    if (!state.formData.title.trim() || !state.formData.authors.trim()) {
      setLocalError('请填写必填字段：标题和作者');
      return;
    }

    setSubmitting(true);
    setLocalError(null);

    try {
      const result = await updateDocument(id);

      if (result && result.id) {
        setSuccessMessage('文献更新成功！正在跳转到详情页...');
        setTimeout(() => {
          router.push(`/library/${id}`);
        }, 800);
      } else {
        setLocalError('更新文献失败，请检查输入后重试');
        setSubmitting(false);
      }
    } catch (err: any) {
      setLocalError(err.message || '更新文献时发生错误');
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push(`/library/${id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="animate-pulse h-8 w-40 bg-slate-200 rounded" />
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-pulse">
            <div className="lg:col-span-2 h-[600px] bg-slate-200 rounded-xl" />
            <div className="h-[400px] bg-slate-200 rounded-xl" />
          </div>
        </main>
      </div>
    );
  }

  if (error && !initialData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-4">
          <div className="text-5xl mb-4">😕</div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">加载失败</h2>
          <p className="text-slate-600 mb-6">{error}</p>
          <div className="flex items-center justify-center gap-3">
            <Link
              href={`/library/${id}`}
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            >
              ← 返回详情
            </Link>
            <button
              onClick={loadDocumentData}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              🔄 重试
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4 min-w-0">
            <Link
              href={`/library/${id}`}
              className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-blue-600 transition-colors shrink-0"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              返回
            </Link>
            <div className="h-6 w-px bg-slate-200 shrink-0" />
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-slate-900 truncate">编辑文献</h1>
              {initialData && (
                <p className="text-xs text-slate-500 mt-0.5 truncate">{initialData.title}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-slate-400 hidden sm:inline">
              ID: {id.slice(0, 8)}...
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {successMessage ? (
          <div className="bg-white rounded-xl shadow-sm border border-green-200 p-12 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">保存成功！</h2>
            <p className="text-slate-600">{successMessage}</p>
          </div>
        ) : (
          <>
            {(localError || error) && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                <span className="text-red-500 mt-0.5">⚠️</span>
                <div className="flex-1">
                  <p className="text-sm text-red-800 font-medium">{localError || error}</p>
                </div>
                <button
                  onClick={() => {
                    setLocalError(null);
                    useLibraryStore.setState({ error: null });
                  }}
                  className="text-red-500 hover:text-red-700"
                >
                  ✕
                </button>
              </div>
            )}

            <form
              onSubmit={(e) => e.preventDefault()}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            >
              <div className="lg:col-span-2 space-y-2">
                {initialData && (
                  <DocumentForm
                    mode="edit"
                    initialData={initialData}
                    onSubmit={handleSubmit}
                    onCancel={handleCancel}
                  />
                )}
              </div>

              <aside className="space-y-6">
                <CitationPreviewPanel autoUpdate />

                <div className="bg-white rounded-lg border border-slate-200 p-5">
                  <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                    📌 编辑提示
                  </h3>
                  <ul className="space-y-2.5 text-sm text-slate-600">
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500 mt-0.5">•</span>
                      <span>修改文献类型会切换对应的特有字段</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500 mt-0.5">•</span>
                      <span>DOI 检索功能同样可用，可覆盖当前字段值</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500 mt-0.5">•</span>
                      <span>引用预览面板会实时反映您的修改</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500 mt-0.5">•</span>
                      <span>点击「返回」将放弃未保存的修改</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg border border-indigo-200 p-5">
                  <h3 className="text-sm font-semibold text-indigo-900 mb-2 flex items-center gap-2">
                    ⚡ 快捷操作
                  </h3>
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={submitting || storeLoading}
                      className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm flex items-center justify-center gap-2"
                    >
                      {submitting || storeLoading ? (
                        <>
                          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          保存中...
                        </>
                      ) : (
                        <>💾 保存修改</>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm('确定要放弃当前的修改吗？')) {
                          handleCancel();
                        }
                      }}
                      className="w-full px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium text-sm"
                    >
                      取消编辑
                    </button>
                    <Link
                      href={`/library/${id}`}
                      className="block w-full text-center px-4 py-2.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
                    >
                      查看原文 →
                    </Link>
                  </div>
                </div>
              </aside>
            </form>
          </>
        )}
      </main>
    </div>
  );
}
