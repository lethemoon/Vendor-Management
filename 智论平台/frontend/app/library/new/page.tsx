'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLibraryStore } from '@/lib/stores/libraryStore';
import DocumentForm from '@/components/library/DocumentForm';
import CitationPreviewPanel from '@/components/library/CitationPreviewPanel';

export default function NewDocumentPage() {
  const router = useRouter();
  const {
    formData,
    loading,
    error,
    resetFormData,
    createDocument,
  } = useLibraryStore();

  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    resetFormData();
  }, [resetFormData]);

  useEffect(() => {
    if (error) {
      setLocalError(error);
      setSubmitting(false);
    }
  }, [error]);

  const handleSubmit = async () => {
    if (!formData.title.trim() || !formData.authors.trim()) {
      setLocalError('请填写必填字段：标题和作者');
      return;
    }

    setSubmitting(true);
    setLocalError(null);

    try {
      const result = await createDocument();

      if (result && result.id) {
        setSuccessMessage('文献创建成功！正在跳转到详情页...');
        setTimeout(() => {
          router.push(`/library/${result.id}`);
        }, 800);
      } else {
        setLocalError('创建文献失败，请检查输入后重试');
        setSubmitting(false);
      }
    } catch (err: any) {
      setLocalError(err.message || '创建文献时发生错误');
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (formData.title || formData.authors || formData.doi) {
      if (window.confirm('确定要放弃当前编辑的内容吗？未保存的数据将丢失。')) {
        router.push('/library');
      }
    } else {
      router.push('/library');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
          <Link
            href="/library"
            className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-blue-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            返回知识库
          </Link>
          <div className="h-6 w-px bg-slate-200" />
          <div>
            <h1 className="text-xl font-bold text-slate-900">添加新文献</h1>
            <p className="text-xs text-slate-500 mt-0.5">手动录入或通过 DOI 智能导入</p>
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
            <h2 className="text-xl font-semibold text-slate-900 mb-2">创建成功！</h2>
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
                <DocumentForm
                  mode="create"
                  onSubmit={handleSubmit}
                  onCancel={handleCancel}
                />
              </div>

              <aside className="space-y-6">
                <CitationPreviewPanel autoUpdate />

                <div className="bg-white rounded-lg border border-slate-200 p-5">
                  <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                    💡 使用提示
                  </h3>
                  <ul className="space-y-2.5 text-sm text-slate-600">
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500 mt-0.5">•</span>
                      <span>填写 DOI 后点击「检索」可自动填充大部分字段</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500 mt-0.5">•</span>
                      <span>标题和作者为必填项，其他字段按需填写</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500 mt-0.5">•</span>
                      <span>右侧面板会实时预览各格式的引用效果</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500 mt-0.5">•</span>
                      <span>不同文献类型有不同的特有字段需要填写</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-5">
                  <h3 className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-2">
                    📌 快捷操作
                  </h3>
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={submitting || loading}
                      className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm flex items-center justify-center gap-2"
                    >
                      {submitting || loading ? (
                        <>
                          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          保存中...
                        </>
                      ) : (
                        <>💾 保存文献</>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="w-full px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium text-sm"
                    >
                      取消
                    </button>
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
