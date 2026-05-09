'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { paperAPI, type Paper, type Analysis, type RewriteOptions, type RewriteResult, type ParagraphAnalysis } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Suspense } from 'react';

function DeduplicateContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paperId = searchParams.get('id');
  
  const [paper, setPaper] = useState<Paper | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [rewriteResults, setRewriteResults] = useState<RewriteResult[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRewriting, setIsRewriting] = useState(false);
  const [selectedParagraphs, setSelectedParagraphs] = useState<number[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  
  const [options, setOptions] = useState<RewriteOptions>({
    strength: 'medium',
    style: 'academic',
    protectedTerms: [],
    versions: 3,
    selectedParagraphs: [],
  });
  
  const [protectedTermsInput, setProtectedTermsInput] = useState('');
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (paperId) {
      loadPaperData();
    } else {
      setError('缺少论文ID参数');
      setLoading(false);
    }
  }, [paperId]);

  const loadPaperData = async () => {
    try {
      setLoading(true);
      
      const listResponse = await paperAPI.getList();
      const currentPaper = listResponse.data.find((p: Paper) => p.id === paperId);
      
      if (currentPaper) {
        setPaper(currentPaper);
        
        if (currentPaper.status === 'analyzed' || currentPaper.status === 'completed') {
          await analyzePaper();
        }
      } else {
        setError('未找到该论文');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || '加载论文数据失败');
    } finally {
      setLoading(false);
    }
  };

  const analyzePaper = async () => {
    if (!paperId) return;
    
    setIsAnalyzing(true);
    setError('');

    try {
      const response = await paperAPI.analyze(paperId);
      setAnalysis(response.data);
      
      if (response.data.paragraphs) {
        setSelectedParagraphs(
          response.data.paragraphs
            .filter((p: ParagraphAnalysis) => p.riskLevel === 'high' || p.riskLevel === 'medium')
            .map((p: ParagraphAnalysis) => p.index)
        );
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || '分析失败，请重试');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleParagraphToggle = (index: number) => {
    setSelectedParagraphs(prev =>
      prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const handleSelectAllHighRisk = () => {
    if (!analysis) return;
    setSelectedParagraphs(
      analysis.paragraphs
        .filter(p => p.riskLevel === 'high' || p.riskLevel === 'medium')
        .map(p => p.index)
    );
  };

  const handleClearSelection = () => {
    setSelectedParagraphs([]);
  };

  const handleStartRewrite = async () => {
    if (!paperId || selectedParagraphs.length === 0) {
      setError('请至少选择一个段落进行改写');
      return;
    }

    setIsRewriting(true);
    setError('');
    setRewriteResults([]);
    
    abortControllerRef.current = new AbortController();

    try {
      const rewriteOptions: RewriteOptions = {
        ...options,
        protectedTerms: protectedTermsInput.split(',').map(t => t.trim()).filter(t => t),
        selectedParagraphs,
      };

      const response = await paperAPI.rewrite(paperId, rewriteOptions);
      
      await handleSSEResponse(response);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err.response?.data?.error?.message || '改写失败，请重试');
      }
      setIsRewriting(false);
    }
  };

  const handleSSEResponse = async (response: any) => {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const lines = text.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'progress') {
                setRewriteResults(prev => {
                  const existing = prev.find(r => r.paragraphIndex === data.paragraphIndex);
                  if (existing) {
                    return prev.map(r =>
                      r.paragraphIndex === data.paragraphIndex
                        ? { ...r, status: 'processing' as const }
                        : r
                    );
                  }
                  return [...prev, {
                    paragraphIndex: data.paragraphIndex,
                    originalText: data.originalText || '',
                    versions: [],
                    status: 'processing' as const,
                  }];
                });
              } else if (data.type === 'result') {
                setRewriteResults(prev =>
                  prev.map(r =>
                    r.paragraphIndex === data.paragraphIndex
                      ? {
                          ...r,
                          versions: data.versions || [],
                          status: 'completed' as const,
                        }
                      : r
                  )
                );
              } else if (data.type === 'complete') {
                setIsRewriting(false);
                if (paper) {
                  setPaper(prev => prev ? { ...prev, status: 'completed' } : null);
                }
              } else if (data.type === 'error') {
                setError(data.message || '处理过程中出现错误');
                setIsRewriting(false);
              }
            } catch (e) {
              console.error('Failed to parse SSE data:', e);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
      setIsRewriting(false);
    }
  };

  const handleStopRewrite = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsRewriting(false);
    }
  };

  const getRiskColor = (rate: number) => {
    if (rate < 30) return 'text-green-600 bg-green-50 border-green-200';
    if (rate <= 50) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getRiskBadgeVariant = (level: string) => {
    switch (level) {
      case 'low': return 'success' as const;
      case 'medium': return 'warning' as const;
      case 'high': return 'danger' as const;
      default: return 'secondary' as const;
    }
  };

  const getRiskLabel = (level: string) => {
    switch (level) {
      case 'low': return '低风险';
      case 'medium': return '中风险';
      case 'high': return '高风险';
      default: return '未知';
    }
  };

  const getCircularProgress = (rate: number, size = 120) => {
    const radius = (size - 16) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (rate / 100) * circumference;
    
    let color = '#10B981';
    if (rate >= 30 && rate <= 50) color = '#F59E0B';
    if (rate > 50) color = '#EF4444';

    return (
      <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#E5E7EB"
            strokeWidth="8"
            fill="none"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth="8"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-500 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold" style={{ color }}>{rate.toFixed(1)}%</span>
        </div>
      </div>
    );
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
    return `${diffDays}天前`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">正在加载数据...</p>
        </div>
      </div>
    );
  }

  if (error && !paper) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="p-6 text-center">
            <div className="text-red-600 text-6xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">加载失败</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Link href="/paper/editor">
              <Button>返回编辑器</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">降重处理中心</h1>
              <p className="mt-2 text-gray-600">
                {paper ? paper.title : '论文智能分析与改写'}
              </p>
            </div>
            <div className="flex gap-3">
              <Link href="/paper/history">
                <Button variant="outline" aria-label="查看历史记录">
                  历史记录
                </Button>
              </Link>
              <Link href="/paper/editor">
                <Button variant="outline" aria-label="返回编辑器">
                  返回编辑器
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-md bg-red-50 p-4" role="alert">
            <div className="text-sm text-red-800">{error}</div>
          </div>
        )}

        {paper && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>论文基本信息</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-500">标题</p>
                  <p className="font-medium text-gray-900">{paper.title}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">字数</p>
                  <p className="font-medium text-gray-900">{paper.wordCount.toLocaleString()} 字</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">状态</p>
                  <Badge variant={
                    paper.status === 'completed' ? 'success' :
                    paper.status === 'analyzed' ? 'secondary' :
                    paper.status === 'rewriting' ? 'warning' : 'outline'
                  }>
                    {paper.status === 'draft' ? '草稿' :
                     paper.status === 'analyzed' ? '已分析' :
                     paper.status === 'rewriting' ? '改写中' : '已完成'}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-500">创建时间</p>
                  <p className="font-medium text-gray-900">{formatTimeAgo(paper.createdAt)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {!analysis && !isAnalyzing && paper?.status === 'draft' && (
          <Card className="mb-6">
            <CardContent className="p-8 text-center">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold mb-2">开始分析您的论文</h3>
              <p className="text-gray-600 mb-6">
                点击下方按钮，系统将自动检测重复率并标记高风险段落
              </p>
              <Button
                onClick={analyzePaper}
                size="lg"
                className="min-h-[48px] px-8"
                aria-label="开始分析论文"
              >
                🚀 开始分析
              </Button>
            </CardContent>
          </Card>
        )}

        {isAnalyzing && (
          <Card className="mb-6">
            <CardContent className="p-8 text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <h3 className="text-xl font-semibold mb-2">正在分析论文...</h3>
              <p className="text-gray-600">系统正在检测重复率和AIGC疑似内容，请稍候</p>
            </CardContent>
          </Card>
        )}

        {analysis && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">总体重复率</CardTitle>
                </CardHeader>
                <CardContent className="flex justify-center">
                  {getCircularProgress(analysis.plagiarismRate)}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">AIGC 疑似率</CardTitle>
                </CardHeader>
                <CardContent className="flex justify-center">
                  {getCircularProgress(analysis.aigcRate)}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">段落统计</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">总段落数</span>
                      <Badge variant="secondary">{analysis.paragraphs.length}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">高风险</span>
                      <Badge variant="danger">
                        {analysis.paragraphs.filter(p => p.riskLevel === 'high').length}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">中风险</span>
                      <Badge variant="warning">
                        {analysis.paragraphs.filter(p => p.riskLevel === 'medium').length}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">低风险</span>
                      <Badge variant="success">
                        {analysis.paragraphs.filter(p => p.riskLevel === 'low').length}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>段落级分析</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAllHighRisk}
                      aria-label="选择所有高风险段落"
                    >
                      选择高风险
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleClearSelection}
                      aria-label="清除选择"
                    >
                      清除选择
                    </Button>
                  </div>
                </div>
                <CardDescription>
                  已选择 {selectedParagraphs.length} 个段落进行改写
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {analysis.paragraphs.map((paragraph) => (
                    <div
                      key={paragraph.index}
                      className={`p-4 rounded-lg border-2 transition-all cursor-pointer hover:shadow-md ${
                        selectedParagraphs.includes(paragraph.index)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200'
                      }`}
                      onClick={() => handleParagraphToggle(paragraph.index)}
                      role="checkbox"
                      aria-checked={selectedParagraphs.includes(paragraph.index)}
                      tabIndex={0}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={selectedParagraphs.includes(paragraph.index)}
                          onChange={() => handleParagraphToggle(paragraph.index)}
                          className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          aria-label={`选择第${paragraph.index + 1}段`}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant={getRiskBadgeVariant(paragraph.riskLevel)}>
                              {getRiskLabel(paragraph.riskLevel)}
                            </Badge>
                            <span className="text-sm font-medium text-gray-900">
                              重复率：{paragraph.plagiarismRate.toFixed(1)}%
                            </span>
                            <span className="text-xs text-gray-500">
                              第{paragraph.index + 1}段
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 line-clamp-2">
                            {paragraph.text}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="mb-6">
              <CardHeader>
                <CardTitle>智能改写控制面板</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      改写强度
                    </label>
                    <div className="flex gap-2">
                      {[
                        { value: 'light', label: '轻度', desc: '保守修改' },
                        { value: 'medium', label: '中度', desc: '平衡修改' },
                        { value: 'heavy', label: '重度', desc: '深度改写' },
                      ].map(option => (
                        <button
                          key={option.value}
                          onClick={() => setOptions({ ...options, strength: option.value as any })}
                          className={`flex-1 px-4 py-3 rounded-lg border-2 text-center transition-all ${
                            options.strength === option.value
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          aria-label={`${option.label}改写`}
                          aria-pressed={options.strength === option.value}
                        >
                          <div className="font-medium">{option.label}</div>
                          <div className="text-xs mt-1 opacity-75">{option.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      写作风格
                    </label>
                    <select
                      value={options.style}
                      onChange={(e) => setOptions({ ...options, style: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      aria-label="选择写作风格"
                    >
                      <option value="academic">学术风格</option>
                      <option value="formal">正式风格</option>
                      <option value="concise">简洁风格</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="protectedTerms" className="block text-sm font-medium text-gray-700 mb-2">
                    保护术语（可选）
                  </label>
                  <input
                    id="protectedTerms"
                    type="text"
                    placeholder="输入需要保护的术语，用逗号分隔，如：机器学习,深度学习,神经网络"
                    value={protectedTermsInput}
                    onChange={(e) => setProtectedTermsInput(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label="保护术语输入框"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    这些术语在改写时将被保留不变
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={handleStartRewrite}
                    disabled={isRewriting || selectedParagraphs.length === 0}
                    size="lg"
                    className="flex-1 min-h-[48px]"
                    aria-label="开始改写选中的段落"
                  >
                    {isRewriting ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        改写中...
                      </>
                    ) : (
                      `✨ 开始改写 (${selectedParagraphs.length}段)`
                    )}
                  </Button>
                  
                  {isRewriting && (
                    <Button
                      variant="outline"
                      onClick={handleStopRewrite}
                      size="lg"
                      className="min-h-[48px]"
                      aria-label="停止改写"
                    >
                      ⏹️ 停止
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {(isRewriting || rewriteResults.length > 0) && (
              <Card className="mb-6">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>改写结果</CardTitle>
                    {isRewriting && (
                      <Badge variant="warning" className="animate-pulse">
                        处理中...
                      </Badge>
                    )}
                  </div>
                  <CardDescription>
                    已完成 {rewriteResults.filter(r => r.status === 'completed').length} / {selectedParagraphs.length} 段
                  </CardDescription>
                </CardHeader>
                
                {isRewriting && (
                  <div className="px-6 pb-4">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                        style={{
                          width: `${(rewriteResults.filter(r => r.status === 'completed').length / selectedParagraphs.length) * 100}%`
                        }}
                      ></div>
                    </div>
                  </div>
                )}
                
                <CardContent>
                  <div className="space-y-6">
                    {rewriteResults.map(result => (
                      <div key={result.paragraphIndex} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-gray-900">
                            第{result.paragraphIndex + 1}段改写结果
                          </h4>
                          {result.status === 'processing' && (
                            <Badge variant="warning" className="animate-pulse">
                              <svg className="animate-spin -ml-1 mr-2 h-3 w-3 inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              处理中
                            </Badge>
                          )}
                          {result.status === 'completed' && (
                            <Badge variant="success">已完成</Badge>
                          )}
                        </div>

                        <div className="mb-4 p-3 bg-gray-100 rounded-md">
                          <p className="text-sm font-medium text-gray-700 mb-1">原文：</p>
                          <p className="text-sm text-gray-600">{result.originalText}</p>
                        </div>

                        {result.status === 'processing' && (
                          <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                            <p className="mt-2 text-sm text-gray-500">AI正在生成改写版本...</p>
                          </div>
                        )}

                        {result.status === 'completed' && result.versions.length > 0 && (
                          <Tabs defaultValue="balanced">
                            <TabsList className="grid w-full grid-cols-3">
                              <TabsTrigger value="conservative" aria-label="保守型版本">
                                🛡️ 保守型
                              </TabsTrigger>
                              <TabsTrigger value="balanced" aria-label="均衡型版本">
                                ⚖️ 均衡型
                              </TabsTrigger>
                              <TabsTrigger value="aggressive" aria-label="激进型版本">
                                🚀 激进型
                              </TabsTrigger>
                            </TabsList>
                            
                            {result.versions.map(version => (
                              <TabsContent key={version.versionId} value={version.type}>
                                <div className="space-y-3">
                                  <div className="p-4 bg-white border rounded-md">
                                    <p className="text-sm text-gray-800 leading-relaxed">
                                      {version.text}
                                    </p>
                                  </div>
                                  
                                  <div className="flex items-center justify-between flex-wrap gap-2">
                                    <div className="flex gap-2">
                                      <Badge variant="secondary">
                                        置信度：{(version.confidence * 100).toFixed(0)}%
                                      </Badge>
                                      {version.modificationTypes?.map(type => (
                                        <Badge key={type} variant="outline">
                                          {type}
                                        </Badge>
                                      ))}
                                    </div>
                                    
                                    <Button
                                      size="sm"
                                      aria-label={`采用此${version.type === 'conservative' ? '保守型' : version.type === 'balanced' ? '均衡型' : '激进型'}版本`}
                                    >
                                      ✓ 采用此版本
                                    </Button>
                                  </div>
                                </div>
                              </TabsContent>
                            ))}
                          </Tabs>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="mb-6">
              <CardContent className="p-6">
                <div className="flex flex-wrap gap-3 justify-center">
                  <Button
                    variant="outline"
                    size="lg"
                    className="min-h-[44px]"
                    aria-label="生成完整报告"
                  >
                    📊 生成报告
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="lg"
                    className="min-h-[44px]"
                    disabled
                    title="即将上线"
                    aria-label="导出Word文档（即将上线）"
                  >
                    📄 导出Word（即将上线）
                  </Button>
                  
                  <Link href="/paper/editor">
                    <Button
                      variant="outline"
                      size="lg"
                      className="min-h-[44px]"
                      aria-label="返回编辑器继续编辑"
                    >
                      ✏️ 返回编辑器
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

export default function DeduplicatePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><p className="text-gray-500">加载中...</p></div>}>
      <DeduplicateContent />
    </Suspense>
  );
}