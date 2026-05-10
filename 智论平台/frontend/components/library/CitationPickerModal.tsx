'use client';

import { useState, useEffect, useCallback } from 'react';
import { type DocumentListItem, libraryApi } from '@/lib/api';
import TypeBadge from './TypeBadge';

interface CitationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  paperId: string;
  onInsert?: (citationNumber: number, citationText: string) => void;
}

interface PaperCitation {
  id: string;
  documentId: string;
  citationNumber: number;
  citationText: string;
  format: string;
  position: number | null;
  document: DocumentListItem;
}

export default function CitationPickerModal({ isOpen, onClose, paperId, onInsert }: CitationPickerModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [existingCitations, setExistingCitations] = useState<PaperCitation[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [loadingCitations, setLoadingCitations] = useState(false);
  const [insertingId, setInsertingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadDocuments = useCallback(async (query?: string) => {
    setLoadingDocs(true);
    try {
      const response = await libraryApi.getList({ search: query || undefined, pageSize: 50 });
      setDocuments(response.data.documents);
    } catch {
      setError('加载文献库失败');
    } finally {
      setLoadingDocs(false);
    }
  }, []);

  const loadCitations = useCallback(async () => {
    setLoadingCitations(true);
    try {
      const response = await libraryApi.getPaperCitations(paperId);
      setExistingCitations(response.data);
    } catch {
    } finally {
      setLoadingCitations(false);
    }
  }, [paperId]);

  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setError(null);
      loadDocuments();
      loadCitations();
    }
  }, [isOpen, loadDocuments, loadCitations]);

  const handleSearch = () => {
    loadDocuments(searchQuery || undefined);
  };

  const existingDocIds = new Set(existingCitations.map((c) => c.documentId));
  const citationByDocId = new Map(existingCitations.map((c) => [c.documentId, c]));

  const filteredDocs = documents.filter((doc) =>
    !searchQuery ||
    doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.authors.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCite = async (doc: DocumentListItem) => {
    if (existingDocIds.has(doc.id)) return;

    setInsertingId(doc.id);

    try {
      const response = await libraryApi.insertCitation(paperId, [doc.id], 'GBT7714');

      if (response.success && response.data.citations.length > 0) {
        const newCitation = response.data.citations[0];
        const newPaperCitation: PaperCitation = {
          id: newCitation.id,
          documentId: doc.id,
          citationNumber: newCitation.citationNumber,
          citationText: newCitation.citationText,
          format: 'GBT7714',
          position: null,
          document: doc,
        };
        setExistingCitations((prev) => [...prev, newPaperCitation]);
        onInsert?.(newCitation.citationNumber, newCitation.citationText);
      }
    } catch {
      setError('插入引用失败');
    } finally {
      setInsertingId(null);
    }
  };

  const handleClose = () => {
    setSearchQuery('');
    setDocuments([]);
    setExistingCitations([]);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40" onClick={handleClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            📋 选择引用文献
          </h2>
          <button onClick={handleClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none transition-colors">
            ×
          </button>
        </div>

        <div className="px-6 py-3 border-b border-slate-100">
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="搜索标题或作者..."
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
            <button
              onClick={handleSearch}
              disabled={loadingDocs}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm font-medium whitespace-nowrap"
            >
              🔍 搜索
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">⚠ {error}</p>
            </div>
          )}

          {(loadingDocs || loadingCitations) && filteredDocs.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <svg className="animate-spin h-8 w-8 mx-auto mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-sm">加载中...</p>
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <p className="text-3xl mb-2">📂</p>
              <p className="text-sm">未找到匹配的文献</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredDocs.map((doc) => {
                const isCited = existingDocIds.has(doc.id);
                const citation = citationByDocId.get(doc.id);

                return (
                  <div
                    key={doc.id}
                    className={`p-3.5 rounded-lg border transition-colors ${
                      isCited ? 'border-green-200 bg-green-50/50' : 'border-slate-200 bg-white hover:border-blue-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${isCited ? 'text-green-800' : 'text-slate-900'}`}>
                          {doc.title}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5 truncate">{doc.authors}</p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <TypeBadge type={doc.type} size="sm" />
                          {doc.year && <span className="text-xs text-slate-500">{doc.year}</span>}
                          {isCited && citation && (
                            <span className="inline-flex px-2 py-0.5 rounded-md text-xs font-bold bg-green-100 text-green-700">
                              [{citation.citationNumber}]
                            </span>
                          )}
                        </div>
                      </div>

                      {isCited ? (
                        <span className="shrink-0 inline-flex items-center px-2.5 py-1.5 rounded-md text-xs font-medium bg-green-100 text-green-700">
                          ✓ 已引用 [{citation?.citationNumber}]
                        </span>
                      ) : (
                        <button
                          onClick={() => handleCite(doc)}
                          disabled={insertingId === doc.id}
                          className="shrink-0 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                        >
                          {insertingId === doc.id ? (
                            <>
                              <svg className="animate-spin h-3 w-3 inline mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              引用中
                            </>
                          ) : (
                            '📌 引用'
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {existingCitations.length > 0 && (
          <div className="border-t border-slate-200 px-6 py-3 bg-slate-50/80">
            <h4 className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">当前参考文献</h4>
            <div className="max-h-[120px] overflow-y-auto space-y-1 pr-1">
              {[...existingCitations]
                .sort((a, b) => a.citationNumber - b.citationNumber)
                .map((c) => (
                  <div key={c.id} className="flex items-start gap-2 text-xs">
                    <span className="font-mono font-bold text-blue-600 shrink-0 mt-0.5">[{c.citationNumber}]</span>
                    <span className="text-slate-700 leading-relaxed">{c.document.title}</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200">
          <button
            onClick={handleClose}
            className="px-5 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium text-sm"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
}
