'use client';

import { useState, useEffect } from 'react';
import { type DocumentType, type DegreeType, type DocumentDetail, type DOILookupResult } from '@/lib/api';
import { useLibraryStore } from '@/lib/stores/libraryStore';
import CitationPreviewPanel from './CitationPreviewPanel';

interface DocumentFormProps {
  initialData?: DocumentDetail | null;
  onSubmit: () => void;
  onCancel: () => void;
  mode: 'create' | 'edit';
}

const documentTypes: { value: DocumentType; icon: string; label: string }[] = [
  { value: 'JOURNAL_ARTICLE', icon: '📄', label: '期刊文章' },
  { value: 'THESIS', icon: '🎓', label: '学位论文' },
  { value: 'BOOK', icon: '📚', label: '书籍' },
  { value: 'CONFERENCE_PAPER', icon: '📢', label: '会议论文' },
  { value: 'WEBPAGE', icon: '🌐', label: '网页' },
  { value: 'PATENT', icon: '💡', label: '专利' },
];

export default function DocumentForm({ initialData, onSubmit, onCancel, mode }: DocumentFormProps) {
  const { formData, setFormData, lookupDOI, doiLookupResult, doiLookupLoading } = useLibraryStore();
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData && mode === 'edit') {
      setFormData({
        type: initialData.type,
        title: initialData.title,
        authors: initialData.authors,
        year: initialData.year?.toString() || '',
        doi: initialData.doi || '',
        url: initialData.url || '',
        abstract: initialData.abstract || '',
        keywords: initialData.keywords || [],
        notes: initialData.notes || '',
        journalData: {
          journal: initialData.journalData?.journal || '',
          volume: initialData.journalData?.volume || '',
          issue: initialData.journalData?.issue || '',
          pages: initialData.journalData?.pages || '',
        },
        thesisData: {
          university: initialData.thesisData?.university || '',
          degreeType: initialData.thesisData?.degreeType || '',
        },
        bookData: {
          publisher: initialData.bookData?.publisher || '',
          edition: initialData.bookData?.edition || '',
          isbn: initialData.bookData?.isbn || '',
          location: initialData.bookData?.location || '',
        },
        conferenceData: {
          conferenceName: initialData.conferenceData?.conferenceName || '',
          conferenceLocation: initialData.conferenceData?.conferenceLocation || '',
          editors: initialData.conferenceData?.editors || '',
          pages: initialData.conferenceData?.pages || '',
        },
        webpageData: {
          websiteName: initialData.webpageData?.websiteName || '',
          url: initialData.webpageData?.url || '',
          accessDate: initialData.webpageData?.accessDate || '',
          publishDate: initialData.webpageData?.publishDate || '',
        },
        patentData: {
          patentNumber: initialData.patentData?.patentNumber || '',
          inventors: initialData.patentData?.inventors || '',
          filingDate: initialData.patentData?.filingDate || '',
          issuingAuthority: initialData.patentData?.issuingAuthority || '',
        },
      });
    }
  }, [initialData, mode, setFormData]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = '标题不能为空';
    }
    if (!formData.authors.trim()) {
      newErrors.authors = '作者不能为空';
    }
    if (formData.year && (parseInt(formData.year) < 1900 || parseInt(formData.year) > 2030)) {
      newErrors.year = '年份必须在1900-2030之间';
    }
    if (formData.doi && !/^10\.\d{4,}\/[^\s]+$/.test(formData.doi)) {
      newErrors.doi = 'DOI格式不正确，示例：10.xxxx/xxxxx';
    }

    switch (formData.type) {
      case 'JOURNAL_ARTICLE':
        if (!formData.journalData.journal.trim()) {
          newErrors['journalData.journal'] = '期刊名称不能为空';
        }
        break;
      case 'THESIS':
        if (!formData.thesisData.university.trim()) {
          newErrors['thesisData.university'] = '院校名称不能为空';
        }
        break;
      case 'BOOK':
        if (!formData.bookData.publisher.trim()) {
          newErrors['bookData.publisher'] = '出版社不能为空';
        }
        break;
      case 'CONFERENCE_PAPER':
        if (!formData.conferenceData.conferenceName.trim()) {
          newErrors['conferenceData.conferenceName'] = '会议名称不能为空';
        }
        break;
      case 'WEBPAGE':
        if (!formData.webpageData.websiteName.trim()) {
          newErrors['webpageData.websiteName'] = '网站名称不能为空';
        }
        if (!formData.webpageData.url.trim()) {
          newErrors['webpageData.url'] = 'URL不能为空';
        }
        break;
      case 'PATENT':
        if (!formData.patentData.patentNumber.trim()) {
          newErrors['patentData.patentNumber'] = '专利号不能为空';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleDOILookup = async () => {
    if (!formData.doi.trim()) return;

    const result = await lookupDOI(formData.doi);

    if (result?.found && result.metadata) {
      const meta = result.metadata;
      setFormData({
        type: meta.type,
        title: meta.title,
        authors: meta.authors.join(', '),
        year: meta.year?.toString() || '',
        doi: meta.doi,
        journalData: {
          journal: meta.journal || '',
          volume: meta.volume || '',
          issue: meta.issue || '',
          pages: meta.pages || '',
        },
        thesisData: {
          university: meta.university || '',
          degreeType: meta.degreeType || '',
        },
        bookData: {
          publisher: meta.publisher || '',
          isbn: meta.isbn || '',
          location: meta.location || '',
          edition: '',
        },
        conferenceData: {
          conferenceName: meta.conferenceName || '',
          conferenceLocation: meta.conferenceLocation || '',
          editors: '',
          pages: meta.pages || '',
        },
        webpageData: {
          websiteName: meta.websiteName || '',
          url: meta.url || '',
          accessDate: '',
          publishDate: '',
        },
        patentData: {
          patentNumber: meta.patentNumber || '',
          inventors: meta.inventors || '',
          filingDate: meta.filingDate || '',
          issuingAuthority: meta.issuingAuthority || '',
        },
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    await onSubmit();
  };

  const handleKeywordAdd = (keyword: string) => {
    if (keyword.trim() && !formData.keywords.includes(keyword.trim())) {
      setFormData({ keywords: [...formData.keywords, keyword.trim()] });
    }
  };

  const handleKeywordRemove = (index: number) => {
    setFormData({ keywords: formData.keywords.filter((_, i) => i !== index) });
  };

  const renderTypeSpecificFields = () => {
    switch (formData.type) {
      case 'JOURNAL_ARTICLE':
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="journal" className="block text-sm font-medium text-slate-700 mb-1">
                期刊名 <span className="text-red-500">*</span>
              </label>
              <input
                id="journal"
                type="text"
                value={formData.journalData.journal}
                onChange={(e) =>
                  setFormData({ journalData: { ...formData.journalData, journal: e.target.value } })
                }
                placeholder="输入期刊名称"
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors['journalData.journal'] ? 'border-red-500' : 'border-slate-300'
                }`}
              />
              {errors['journalData.journal'] && (
                <p className="mt-1 text-sm text-red-600">{errors['journalData.journal']}</p>
              )}
            </div>
            <div>
              <label htmlFor="volume" className="block text-sm font-medium text-slate-700 mb-1">卷</label>
              <input
                id="volume"
                type="text"
                value={formData.journalData.volume}
                onChange={(e) =>
                  setFormData({ journalData: { ...formData.journalData, volume: e.target.value } })
                }
                placeholder="如：45"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="issue" className="block text-sm font-medium text-slate-700 mb-1">期</label>
              <input
                id="issue"
                type="text"
                value={formData.journalData.issue}
                onChange={(e) =>
                  setFormData({ journalData: { ...formData.journalData, issue: e.target.value } })
                }
                placeholder="如：3"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="md:col-span-3">
              <label htmlFor="pages-journal" className="block text-sm font-medium text-slate-700 mb-1">
                页码
              </label>
              <input
                id="pages-journal"
                type="text"
                value={formData.journalData.pages}
                onChange={(e) =>
                  setFormData({ journalData: { ...formData.journalData, pages: e.target.value } })
                }
                placeholder="如：1234-1267"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        );

      case 'THESIS':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="university" className="block text-sm font-medium text-slate-700 mb-1">
                院校 <span className="text-red-500">*</span>
              </label>
              <input
                id="university"
                type="text"
                value={formData.thesisData.university}
                onChange={(e) =>
                  setFormData({ thesisData: { ...formData.thesisData, university: e.target.value } })
                }
                placeholder="输入授予学位的院校"
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors['thesisData.university'] ? 'border-red-500' : 'border-slate-300'
                }`}
              />
              {errors['thesisData.university'] && (
                <p className="mt-1 text-sm text-red-600">{errors['thesisData.university']}</p>
              )}
            </div>
            <div>
              <label htmlFor="degree-type" className="block text-sm font-medium text-slate-700 mb-1">
                学位类型 <span className="text-red-500">*</span>
              </label>
              <select
                id="degree-type"
                value={formData.thesisData.degreeType}
                onChange={(e) =>
                  setFormData({ thesisData: { ...formData.thesisData, degreeType: e.target.value as DegreeType | '' } })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="">请选择</option>
                <option value="BACHELOR">学士</option>
                <option value="MASTER">硕士</option>
                <option value="DOCTOR">博士</option>
              </select>
            </div>
          </div>
        );

      case 'BOOK':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="publisher" className="block text-sm font-medium text-slate-700 mb-1">
                出版社 <span className="text-red-500">*</span>
              </label>
              <input
                id="publisher"
                type="text"
                value={formData.bookData.publisher}
                onChange={(e) =>
                  setFormData({ bookData: { ...formData.bookData, publisher: e.target.value } })
                }
                placeholder="输入出版社名称"
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors['bookData.publisher'] ? 'border-red-500' : 'border-slate-300'
                }`}
              />
              {errors['bookData.publisher'] && (
                <p className="mt-1 text-sm text-red-600">{errors['bookData.publisher']}</p>
              )}
            </div>
            <div>
              <label htmlFor="edition" className="block text-sm font-medium text-slate-700 mb-1">版次</label>
              <input
                id="edition"
                type="text"
                value={formData.bookData.edition}
                onChange={(e) =>
                  setFormData({ bookData: { ...formData.bookData, edition: e.target.value } })
                }
                placeholder="如：第3版"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="isbn" className="block text-sm font-medium text-slate-700 mb-1">ISBN</label>
              <input
                id="isbn"
                type="text"
                value={formData.bookData.isbn}
                onChange={(e) =>
                  setFormData({ bookData: { ...formData.bookData, isbn: e.target.value } })
                }
                placeholder="ISBN-10 或 ISBN-13"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-slate-700 mb-1">出版地</label>
              <input
                id="location"
                type="text"
                value={formData.bookData.location}
                onChange={(e) =>
                  setFormData({ bookData: { ...formData.bookData, location: e.target.value } })
                }
                placeholder="如：北京"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        );

      case 'CONFERENCE_PAPER':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="conference-name" className="block text-sm font-medium text-slate-700 mb-1">
                会议名称 <span className="text-red-500">*</span>
              </label>
              <input
                id="conference-name"
                type="text"
                value={formData.conferenceData.conferenceName}
                onChange={(e) =>
                  setFormData({
                    conferenceData: { ...formData.conferenceData, conferenceName: e.target.value },
                  })
                }
                placeholder="输入会议名称"
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors['conferenceData.conferenceName'] ? 'border-red-500' : 'border-slate-300'
                }`}
              />
              {errors['conferenceData.conferenceName'] && (
                <p className="mt-1 text-sm text-red-600">{errors['conferenceData.conferenceName']}</p>
              )}
            </div>
            <div>
              <label htmlFor="conference-location" className="block text-sm font-medium text-slate-700 mb-1">
                举办地
              </label>
              <input
                id="conference-location"
                type="text"
                value={formData.conferenceData.conferenceLocation}
                onChange={(e) =>
                  setFormData({
                    conferenceData: { ...formData.conferenceData, conferenceLocation: e.target.value },
                  })
                }
                placeholder="如：美国旧金山"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="editors" className="block text-sm font-medium text-slate-700 mb-1">编者</label>
              <input
                id="editors"
                type="text"
                value={formData.conferenceData.editors}
                onChange={(e) =>
                  setFormData({ conferenceData: { ...formData.conferenceData, editors: e.target.value } })
                }
                placeholder="会议论文集编者"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="pages-conference" className="block text-sm font-medium text-slate-700 mb-1">
                页码
              </label>
              <input
                id="pages-conference"
                type="text"
                value={formData.conferenceData.pages}
                onChange={(e) =>
                  setFormData({ conferenceData: { ...formData.conferenceData, pages: e.target.value } })
                }
                placeholder="如：45-52"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        );

      case 'WEBPAGE':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="website-name" className="block text-sm font-medium text-slate-700 mb-1">
                网站名称 <span className="text-red-500">*</span>
              </label>
              <input
                id="website-name"
                type="text"
                value={formData.webpageData.websiteName}
                onChange={(e) =>
                  setFormData({ webpageData: { ...formData.webpageData, websiteName: e.target.value } })
                }
                placeholder="输入网站名称"
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors['webpageData.websiteName'] ? 'border-red-500' : 'border-slate-300'
                }`}
              />
              {errors['webpageData.websiteName'] && (
                <p className="mt-1 text-sm text-red-600">{errors['webpageData.websiteName']}</p>
              )}
            </div>
            <div>
              <label htmlFor="url-webpage" className="block text-sm font-medium text-slate-700 mb-1">
                URL <span className="text-red-500">*</span>
              </label>
              <input
                id="url-webpage"
                type="url"
                value={formData.webpageData.url}
                onChange={(e) =>
                  setFormData({ webpageData: { ...formData.webpageData, url: e.target.value } })
                }
                placeholder="https://example.com/page"
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors['webpageData.url'] ? 'border-red-500' : 'border-slate-300'
                }`}
              />
              {errors['webpageData.url'] && (
                <p className="mt-1 text-sm text-red-600">{errors['webpageData.url']}</p>
              )}
            </div>
            <div>
              <label htmlFor="access-date" className="block text-sm font-medium text-slate-700 mb-1">
                访问日期 <span className="text-red-500">*</span>
              </label>
              <input
                id="access-date"
                type="date"
                value={formData.webpageData.accessDate}
                onChange={(e) =>
                  setFormData({ webpageData: { ...formData.webpageData, accessDate: e.target.value } })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="publish-date" className="block text-sm font-medium text-slate-700 mb-1">
                发布日期
              </label>
              <input
                id="publish-date"
                type="date"
                value={formData.webpageData.publishDate}
                onChange={(e) =>
                  setFormData({ webpageData: { ...formData.webpageData, publishDate: e.target.value } })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        );

      case 'PATENT':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="patent-number" className="block text-sm font-medium text-slate-700 mb-1">
                专利号 <span className="text-red-500">*</span>
              </label>
              <input
                id="patent-number"
                type="text"
                value={formData.patentData.patentNumber}
                onChange={(e) =>
                  setFormData({ patentData: { ...formData.patentData, patentNumber: e.target.value } })
                }
                placeholder="输入专利号"
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors['patentData.patentNumber'] ? 'border-red-500' : 'border-slate-300'
                }`}
              />
              {errors['patentData.patentNumber'] && (
                <p className="mt-1 text-sm text-red-600">{errors['patentData.patentNumber']}</p>
              )}
            </div>
            <div>
              <label htmlFor="inventors" className="block text-sm font-medium text-slate-700 mb-1">
                发明人 <span className="text-red-500">*</span>
              </label>
              <input
                id="inventors"
                type="text"
                value={formData.patentData.inventors}
                onChange={(e) =>
                  setFormData({ patentData: { ...formData.patentData, inventors: e.target.value } })
                }
                placeholder="发明人列表"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="filing-date" className="block text-sm font-medium text-slate-700 mb-1">
                申请日期 <span className="text-red-500">*</span>
              </label>
              <input
                id="filing-date"
                type="date"
                value={formData.patentData.filingDate}
                onChange={(e) =>
                  setFormData({ patentData: { ...formData.patentData, filingDate: e.target.value } })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="issuing-authority" className="block text-sm font-medium text-slate-700 mb-1">
                授权机构 <span className="text-red-500">*</span>
              </label>
              <input
                id="issuing-authority"
                type="text"
                value={formData.patentData.issuingAuthority}
                onChange={(e) =>
                  setFormData({ patentData: { ...formData.patentData, issuingAuthority: e.target.value } })
                }
                placeholder="专利授权机构"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="document-type" className="block text-sm font-medium text-slate-700 mb-2">
          文献类型
        </label>
        <select
          id="document-type"
          value={formData.type}
          onChange={(e) => setFormData({ type: e.target.value as DocumentType })}
          className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-base"
        >
          {documentTypes.map((type) => (
            <option key={type.value} value={type.value}>
              {type.icon} {type.label}
            </option>
          ))}
        </select>
      </div>

      <div className="border-t pt-6">
        <h3 className="text-sm font-semibold text-slate-800 mb-4">基本信息</h3>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-slate-700 mb-1">
              标题 <span className="text-red-500">*</span>
            </label>
            <input
              id="title"
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ title: e.target.value })}
              placeholder="输入文献标题"
              maxLength={500}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.title ? 'border-red-500' : 'border-slate-300'
              }`}
            />
            {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
          </div>

          <div>
            <label htmlFor="authors" className="block text-sm font-medium text-slate-700 mb-1">
              作者 <span className="text-red-500">*</span>
            </label>
            <input
              id="authors"
              type="text"
              value={formData.authors}
              onChange={(e) => setFormData({ authors: e.target.value })}
              placeholder="多个作者用逗号分隔（如：张三, 李四, 王五）"
              maxLength={1000}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.authors ? 'border-red-500' : 'border-slate-300'
              }`}
            />
            {errors.authors && <p className="mt-1 text-sm text-red-600">{errors.authors}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="year" className="block text-sm font-medium text-slate-700 mb-1">年份</label>
              <input
                id="year"
                type="number"
                value={formData.year}
                onChange={(e) => setFormData({ year: e.target.value })}
                placeholder="如：2023"
                min={1900}
                max={2030}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.year ? 'border-red-500' : 'border-slate-300'
                }`}
              />
              {errors.year && <p className="mt-1 text-sm text-red-600">{errors.year}</p>}
            </div>

            <div>
              <label htmlFor="doi-input" className="block text-sm font-medium text-slate-700 mb-1">
                DOI
              </label>
              <div className="flex gap-2">
                <input
                  id="doi-input"
                  type="text"
                  value={formData.doi}
                  onChange={(e) => setFormData({ doi: e.target.value })}
                  placeholder="10.xxxx/xxxxx"
                  className={`flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.doi ? 'border-red-500' : 'border-slate-300'
                  }`}
                />
                <button
                  type="button"
                  onClick={handleDOILookup}
                  disabled={doiLookupLoading || !formData.doi.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap transition-colors"
                >
                  {doiLookupLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      检索中
                    </>
                  ) : (
                    <>🔍 检索</>
                  )}
                </button>
              </div>
              {errors.doi && <p className="mt-1 text-sm text-red-600">{errors.doi}</p>}
              {doiLookupResult?.found && (
                <p className="mt-2 text-sm text-green-600 flex items-center gap-1">
                  ✓ 检索成功，已自动填充字段
                </p>
              )}
              {doiLookupResult && !doiLookupResult.found && (
                <p className="mt-2 text-sm text-orange-600">
                  ⚠ 未找到匹配文献，请检查DOI或手动填写
                </p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="url-general" className="block text-sm font-medium text-slate-700 mb-1">URL</label>
            <input
              id="url-general"
              type="url"
              value={formData.url}
              onChange={(e) => setFormData({ url: e.target.value })}
              placeholder="https://..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      <div className="border-t pt-6">
        <h3 className="text-sm font-semibold text-slate-800 mb-4">
          {documentTypes.find((t) => t.value === formData.type)?.icon}{' '}
          {documentTypes.find((t) => t.value === formData.type)?.label} 特有信息
        </h3>
        
        {renderTypeSpecificFields()}
      </div>

      <div className="border-t pt-6">
        <h3 className="text-sm font-semibold text-slate-800 mb-4">附加信息（可选）</h3>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="abstract" className="block text-sm font-medium text-slate-700 mb-1">
              摘要
            </label>
            <textarea
              id="abstract"
              value={formData.abstract}
              onChange={(e) => setFormData({ abstract: e.target.value })}
              placeholder="输入文献摘要内容..."
              rows={4}
              maxLength={10000}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">关键词</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.keywords.map((keyword, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                >
                  {keyword}
                  <button
                    type="button"
                    onClick={() => handleKeywordRemove(index)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                id="keyword-input"
                placeholder="添加关键词后按回车"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleKeywordAdd((e.target as HTMLInputElement).value);
                    (e.target as HTMLInputElement).value = '';
                  }
                }}
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-slate-700 mb-1">备注</label>
            <textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ notes: e.target.value })}
              placeholder="个人备注..."
              rows={3}
              maxLength={5000}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
        >
          取消
        </button>
        <button
          type="submit"
          disabled={useLibraryStore.getState().loading}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {mode === 'create' ? '💾 保存文献' : '💾 保存修改'}
        </button>
      </div>
    </form>
  );
}
