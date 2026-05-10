'use client';

import { useState } from 'react';
import { type CitationFormat, type DOILookupResult, libraryApi } from '@/lib/api';
import { useLibraryStore } from '@/lib/stores/libraryStore';

interface DOILookupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const formatOptions: { value: CitationFormat; label: string }[] = [
  { value: 'GBT7714', label: 'GB/T 7714' },
  { value: 'APA7', label: 'APA 7th' },
  { value: 'MLA9', label: 'MLA 9th' },
];

export default function DOILookupModal({ isOpen, onClose }: DOILookupModalProps) {
  const { lookupDOI, doiLookupResult, doiLookupLoading, createDocument, setFormData, resetFormData } = useLibraryStore();
  const [doiInput, setDoiInput] = useState('');
  const [results, setResults] = useState<Array<DOILookupResult & { doi: string; imported: boolean }>>([]);
  const [selectedFormat, setSelectedFormat] = useState<CitationFormat>('GBT7714');
  const [importingId, setImportingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLookup = async () => {
    const dois = doiInput.trim().split('\n').map((d) => d.trim()).filter(Boolean);
    if (dois.length === 0) return;

    setError(null);
    setResults([]);

    const lookupResults: Array<DOILookupResult & { doi: string; imported: boolean }> = [];

    for (const doi of dois) {
      const result = await lookupDOI(doi);
      lookupResults.push({
        ...(result || { found: false, metadata: null, matchType: null, lookupTimeMs: 0 }),
        doi,
        imported: false,
      });
    }

    setResults(lookupResults);
  };

  const handleImport = async (index: number) => {
    const result = results[index];
    if (!result.found || !result.metadata || result.imported) return;

    setImportingId(result.doi);

    try {
      const meta = result.metadata;
      setFormData({
        type: meta.type,
        title: meta.title,
        authors: meta.authors.join(', '),
        year: meta.year?.toString() || '',
        doi: meta.doi,
        journalData: { journal: meta.journal || '', volume: meta.volume || '', issue: meta.issue || '', pages: meta.pages || '' },
        thesisData: { university: meta.university || '', degreeType: meta.degreeType || '' },
        bookData: { publisher: meta.publisher || '', edition: '', isbn: meta.isbn || '', location: meta.location || '' },
        conferenceData: { conferenceName: meta.conferenceName || '', conferenceLocation: meta.conferenceLocation || '', editors: '', pages: meta.pages || '' },
        webpageData: { websiteName: meta.websiteName || '', url: meta.url || '', accessDate: '', publishDate: '' },
        patentData: { patentNumber: meta.patentNumber || '', inventors: meta.inventors || '', filingDate: meta.filingDate || '', issuingAuthority: meta.issuingAuthority || '' },
      });

      const doc = await createDocument();

      setResults((prev) =>
        prev.map((r, i) => (i === index ? { ...r, imported: true } : r))
      );

      resetFormData();

      if (!doc) {
        setError('导入失败，请重试');
      }
    } catch (err) {
      setError('导入过程中发生错误');
    } finally {
      setImportingId(null);
    }
  };

  const handleClose = () => {
    setDoiInput('');
    setResults([]);
    setError(null);
    resetFormData();
    onClose();
  };

  const matchTypeLabel: Record<string, { label: string; colorClass: string }> = {
    exact: { label: '精确匹配', colorClass: 'text-green-700 bg-green-100' },
    trimmed: { label: '去空格匹配', colorClass: 'text-blue-700 bg-blue-100' },
    prefix: { label: '前缀匹配', colorClass: 'text-yellow-700 bg-yellow-100' },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40" onClick={handleClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            🔍 DOI 导入文献
          </h2>
          <button onClick={handleClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none transition-colors">
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div>
            <label htmlFor="doi-batch-input" className="block text-sm font-medium text-slate-700 mb-1.5">
              DOI 号（支持批量输入，每行一个）
            </label>
            <textarea
              id="doi-batch-input"
              value={doiInput}
              onChange={(e) => setDoiInput(e.target.value)}
              placeholder={"10.xxxx/xxxxx\n10.xxxx/yyyyy"}
              rows={3}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleLookup();
                }
              }}
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleLookup}
              disabled={doiLookupLoading || !doiInput.trim()}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm flex items-center gap-2"
            >
              {doiLookupLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  查找中...
                </>
              ) : (
                <>🔍 查找</>
              )}
            </button>

            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600">导入格式：</span>
              <select
                value={selectedFormat}
                onChange={(e) => setSelectedFormat(e.target.value as CitationFormat)}
                className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
              >
                {formatOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">⚠ {error}</p>
            </div>
          )}

          {results.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-700">查找结果 ({results.filter((r) => r.found).length}/{results.length})</h3>
              <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                {results.map((result, index) => (
                  <div
                    key={`${result.doi}-${index}`}
                    className={`p-4 rounded-lg border ${
                      result.found ? 'border-slate-200 bg-white' : 'border-red-200 bg-red-50'
                    }`}
                  >
                    {result.found && result.metadata ? (
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">{result.metadata.title}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{result.metadata.authors.join(', ')}</p>
                          </div>
                          {result.matchType && (
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${matchTypeLabel[result.matchType]?.colorClass || 'text-slate-600 bg-slate-100'}`}>
                              {matchTypeLabel[result.matchType]?.label || result.matchType}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          {result.metadata.year && <span>📅 {result.metadata.year}</span>}
                          {result.metadata.journal && <span>📖 {result.metadata.journal}</span>}
                          <span className="text-slate-400 font-mono">{result.doi}</span>
                        </div>
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-xs text-slate-400">耗时 {result.lookupTimeMs}ms</span>
                          {result.imported ? (
                            <span className="text-sm text-green-600 font-medium">✓ 已导入</span>
                          ) : (
                            <button
                              onClick={() => handleImport(index)}
                              disabled={importingId === result.doi}
                              className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              {importingId === result.doi ? (
                                <>
                                  <svg className="animate-spin h-3.5 w-3.5 inline mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  导入中
                                </>
                              ) : (
                                '📥 导入'
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-red-600 font-medium">未找到文献</p>
                          <p className="text-xs text-red-400 mt-0.5 font-mono">{result.doi}</p>
                        </div>
                        <span className="text-sm text-red-400">✗</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!doiLookupLoading && results.length === 0 && (
            <div className="py-10 text-center text-slate-400">
              <p className="text-3xl mb-2">🔗</p>
              <p className="text-sm">输入 DOI 号开始查找文献</p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200">
          <button
            onClick={handleClose}
            className="px-5 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium text-sm"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
