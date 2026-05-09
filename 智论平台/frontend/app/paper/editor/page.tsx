'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { paperAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

const MAX_WORDS = 50000;
const MAX_TITLE_LENGTH = 200;

export default function EditorPage() {
  const router = useRouter();
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [paperId, setPaperId] = useState<string | null>(null);

  useEffect(() => {
    const count = content.replace(/\s/g, '').length;
    setWordCount(count);
  }, [content]);

  const handleSaveDraft = async () => {
    if (!content.trim()) {
      setError('请输入论文内容');
      return;
    }

    setIsSaving(true);
    setError('');
    setSuccessMessage('');

    try {
      let response;
      if (paperId) {
        response = await paperAPI.saveDraft(paperId, { title: title || '未命名论文', content });
      } else {
        response = await paperAPI.upload({ title: title || '未命名论文', content });
        setPaperId(response.data.id);
      }
      
      setSuccessMessage('草稿保存成功');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || '保存失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAnalyze = async () => {
    if (!content.trim()) {
      setError('请输入论文内容');
      return;
    }

    setIsAnalyzing(true);
    setError('');

    try {
      let currentPaperId = paperId;
      
      if (!currentPaperId) {
        const response = await paperAPI.upload({ title: title || '未命名论文', content });
        currentPaperId = response.data.id;
        setPaperId(currentPaperId);
      }

      router.push(`/paper/deduplicate?id=${currentPaperId}`);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || '提交失败，请重试');
      setIsAnalyzing(false);
    }
  };

  const getWordCountColor = () => {
    const ratio = wordCount / MAX_WORDS;
    if (ratio > 0.9) return 'text-red-600';
    if (ratio > 0.7) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">论文编辑器</h1>
              <p className="mt-2 text-gray-600">粘贴或输入您的论文内容，开始智能降重之旅</p>
            </div>
            <Link
              href="/paper/history"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              历史记录 →
            </Link>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>论文信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                论文标题（可选）
              </label>
              <input
                id="title"
                type="text"
                maxLength={MAX_TITLE_LENGTH}
                placeholder="请输入论文标题，最多200字符"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                aria-label="论文标题输入框"
              />
              <div className="mt-1 text-xs text-gray-500 text-right">
                {title.length}/{MAX_TITLE_LENGTH}
              </div>
            </div>

            <div>
              <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
                论文内容 *
              </label>
              <Textarea
                id="content"
                placeholder={`请粘贴或输入您的论文内容...&#10;&#10;支持格式：&#10;• 直接粘贴文本&#10;• 上传 Word 文件（.docx）&#10;• 上传 PDF 文件&#10;&#10;最大支持 ${MAX_WORDS.toLocaleString()} 字`}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[400px] resize-y"
                aria-label="论文内容输入区域"
              />
              
              <div className="mt-3 flex items-center justify-between">
                <Badge variant={wordCount > MAX_WORDS ? 'danger' : 'secondary'}>
                  <span className={getWordCountColor()}>
                    字数统计：{wordCount.toLocaleString()} / {MAX_WORDS.toLocaleString()}
                  </span>
                </Badge>
                
                {wordCount > MAX_WORDS && (
                  <span className="text-sm text-red-600">
                    ⚠️ 超出字数限制，请删减内容
                  </span>
                )}
              </div>
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-4" role="alert">
                <div className="text-sm text-red-800">{error}</div>
              </div>
            )}

            {successMessage && (
              <div className="rounded-md bg-green-50 p-4" role="status">
                <div className="text-sm text-green-800">{successMessage}</div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-6 flex items-center justify-between gap-4">
          <Button
            variant="outline"
            onClick={handleSaveDraft}
            disabled={isSaving || !content.trim()}
            className="flex-1 min-h-[44px]"
            aria-label="保存草稿"
          >
            {isSaving ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                保存中...
              </>
            ) : (
              '💾 保存草稿'
            )}
          </Button>

          <Button
            onClick={handleAnalyze}
            disabled={isAnalyzing || !content.trim() || wordCount > MAX_WORDS}
            className="flex-1 min-h-[44px] bg-blue-600 hover:bg-blue-700"
            aria-label="开始分析"
          >
            {isAnalyzing ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                提交中...
              </>
            ) : (
              '🚀 开始分析'
            )}
          </Button>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-4 text-center">
              <div className="text-3xl mb-2">📝</div>
              <h3 className="font-semibold text-gray-900">智能分析</h3>
              <p className="text-sm text-gray-600 mt-1">自动识别高重复段落并标记风险等级</p>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-4 text-center">
              <div className="text-3xl mb-2">✨</div>
              <h3 className="font-semibold text-gray-900">一键改写</h3>
              <p className="text-sm text-gray-600 mt-1">AI智能改写，保持原意降低重复率</p>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-4 text-center">
              <div className="text-3xl mb-2">📊</div>
              <h3 className="font-semibold text-gray-900">详细报告</h3>
              <p className="text-sm text-gray-600 mt-1">生成完整的降重报告和对比分析</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
