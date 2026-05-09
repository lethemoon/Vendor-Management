'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { aigcApi, type DetectResponse, type RewriteVersion, type OptimizationRecordOutput } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

import ScoreCircle from '@/components/aigc/ScoreCircle';
import ParagraphHeatmap from '@/components/aigc/ParagraphHeatmap';
import IssueTagCloud from '@/components/aigc/IssueTagCloud';
import ParagraphSelector from '@/components/aigc/ParagraphSelector';
import AIGCDiffViewer from '@/components/aigc/AIGCDiffViewer';
import VersionTabs from '@/components/aigc/VersionTabs';
import OptimizationTimeline from '@/components/aigc/OptimizationTimeline';

type DetectionData = DetectResponse['data'];

export default function AIGCResultPage() {
  const router = useRouter();
  const params = useParams();
  const detectionId = params.id as string;

  const [detectionData, setDetectionData] = useState<DetectionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedParagraphs, setSelectedParagraphs] = useState<number[]>([]);
  const [selectedHeatmapIndex, setSelectedHeatmapIndex] = useState<number | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const [isRewriting, setIsRewriting] = useState(false);
  const [rewriteVersions, setRewriteVersions] = useState<RewriteVersion[]>([]);
  const [selectedVersionIndex, setSelectedVersionIndex] = useState(0);
  const [isAdopting, setIsAdopting] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const [optimizationRecords, setOptimizationRecords] = useState<OptimizationRecordOutput[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (detectionId) {
      loadDetectionData();
    }
  }, [detectionId]);

  const loadDetectionData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await aigcApi.getDetection(detectionId);
      setDetectionData(response.data);

      const historyResponse = await aigcApi.getHistoryDetail(detectionId);
      if (historyResponse.data?.optimizationRecords) {
        setOptimizationRecords(historyResponse.data.optimizationRecords);
      }

      if (response.data.paragraphs) {
        const highRiskParagraphs = response.data.paragraphs
          .filter((p) => p.riskLevel === 'high' || p.riskLevel === 'medium-high')
          .map((p) => p.index);
        setSelectedParagraphs(highRiskParagraphs);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || '加载检测数据失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartRewrite = async () => {
    if (!detectionId || selectedParagraphs.length === 0) return;

    setIsRewriting(true);
    setError(null);
    setRewriteVersions([]);
    
    abortControllerRef.current = new AbortController();

    try {
      const response = await aigcApi.rewrite(
        detectionId,
        { targetParagraphIndices: selectedParagraphs },
        () => {},
        () => {},
        () => {}
      );

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
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;

          try {
            const eventData = JSON.parse(line.slice(6));

            if (eventData.type === 'progress') {
              console.log('Rewrite progress:', eventData);
            } else if (eventData.type === 'version_complete') {
              setRewriteVersions((prev) => [...prev, eventData.version]);
            } else if (eventData.type === 'complete') {
              setIsRewriting(false);
              
              if (eventData.versions && Array.isArray(eventData.versions)) {
                setRewriteVersions(eventData.versions);
              }
            } else if (eventData.type === 'error') {
              setError(eventData.message || '改写过程中出现错误');
              setIsRewriting(false);
            }
          } catch (e) {
            console.error('Failed to parse SSE data:', e);
          }
        }
      }
    } finally {
      reader.releaseLock();
      setIsRewriting(false);
    }
  };

  const handleAdoptVersion = async (version: RewriteVersion) => {
    if (!detectionId) return;

    setIsAdopting(true);
    setError(null);

    try {
      await aigcApi.adoptVersion(detectionId, {
        versionId: version.versionId,
        targetParagraphIndices: selectedParagraphs,
      });

      await loadDetectionData();

      setRewriteVersions([]);
      setSelectedParagraphs([]);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || '采用版本失败');
    } finally {
      setIsAdopting(false);
    }
  };

  const handleRegenerate = async () => {
    if (!detectionId || rewriteVersions.length === 0) return;

    setIsRegenerating(true);
    setError(null);

    try {
      const currentVersion = rewriteVersions[selectedVersionIndex];
      
      const response = await aigcApi.rewrite(detectionId, {
        targetParagraphIndices: selectedParagraphs,
        regenerateForVersionId: currentVersion.versionId,
      });

      setRewriteVersions([]);
      
      await handleSSEResponse(response);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || '重新生成失败');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleRecheck = async () => {
    if (!detectionId) return;

    setError(null);

    try {
      const response = await aigcApi.recheck(detectionId, {});

      if (response.data.newDetectionId) {
        router.push(`/aigc/result/${response.data.newDetectionId}`);
      } else {
        await loadDetectionData();
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || '复测失败');
    }
  };

  const handleTagClick = (tag: string) => {
    if (selectedTag === tag) {
      setSelectedTag(null);
    } else {
      setSelectedTag(tag);
      
      if (detectionData?.paragraphs) {
        const filteredParagraphs = detectionData.paragraphs
          .filter((p) => p.issues.includes(tag))
          .map((p) => p.index);
        
        if (filteredParagraphs.length > 0) {
          setSelectedHeatmapIndex(filteredParagraphs[0]);
          setSelectedParagraphs(filteredParagraphs);
        }
      }
    }
  };

  const getFilteredParagraphs = () => {
    if (!detectionData?.paragraphs) return [];

    if (selectedTag) {
      return detectionData.paragraphs.filter((p) =>
        p.issues.includes(selectedTag)
      );
    }

    return detectionData.paragraphs;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-slate-800 mb-2">正在加载检测结果...</h2>
          <p className="text-slate-600">请稍候，正在获取详细分析数据</p>
        </div>
      </div>
    );
  }

  if (error && !detectionData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="max-w-lg mx-4">
          <CardContent className="p-8 text-center">
            <div className="text-red-600 text-6xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-slate-800 mb-2">加载失败</h2>
            <p className="text-slate-600 mb-6">{error}</p>
            <div className="flex gap-3 justify-center">
              <Button onClick={loadDetectionData} variant="outline">
                🔄 重试
              </Button>
              <Link href="/aigc/detect">
                <Button>返回检测</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!detectionData) return null;

  const heatmapData = detectionData.paragraphs.map((p) => ({
    index: p.index,
    score: p.score,
    riskLevel: p.riskLevel,
    preview: p.preview,
  }));

  const filteredParagraphs = getFilteredParagraphs();

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/aigc/detect" aria-label="返回检测页面">
                <Button variant="ghost" size="sm">
                  ← 返回
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-slate-800">AIGC检测结果</h1>
                <p className="mt-1 text-slate-600">
                  {detectionData.title || '未命名文档'} · 检测于{' '}
                  {new Date(detectionData.createdAt).toLocaleString('zh-CN')}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleRecheck}
                variant="outline"
                disabled={isRewriting}
                aria-label="重新检测"
              >
                🔄 重新检测
              </Button>
              <Link href="/aigc/history">
                <Button variant="outline" aria-label="查看历史记录">
                  📋 历史记录
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-md bg-red-50 p-4 border border-red-200" role="alert">
            <div className="text-sm text-red-800">{error}</div>
          </div>
        )}

        <section aria-labelledby="overview-title" className="mb-8">
          <h2 id="overview-title" className="sr-only">检测结果概览</h2>
          
          <Card className="shadow-sm mb-6">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="flex flex-col items-center justify-center">
                  <ScoreCircle
                    score={Math.round(detectionData.overallScore)}
                    riskLevel={detectionData.riskLevel}
                    size={180}
                    strokeWidth={12}
                  />
                  
                  <div className="mt-4 text-center">
                    <p className="text-sm text-slate-500 mb-1">总体AIGC疑似率</p>
                    <p className="text-xs text-slate-400">
                      处理耗时：{detectionData.processingTime.toFixed(1)}秒
                    </p>
                  </div>
                </div>

                <div className="lg:col-span-2 space-y-6">
                  <div>
                    <h3 className="text-base font-semibold text-slate-800 mb-3 flex items-center gap-2">
                      📊 段落热力图
                    </h3>
                    <ParagraphHeatmap
                      paragraphs={heatmapData}
                      onSelect={(index) => {
                        setSelectedHeatmapIndex(index);
                        document.getElementById(`paragraph-${index}`)?.scrollIntoView({
                          behavior: 'smooth',
                          block: 'center',
                        });
                      }}
                      selectedIndex={selectedHeatmapIndex}
                    />
                  </div>

                  <div>
                    <h3 className="text-base font-semibold text-slate-800 mb-3 flex items-center gap-2">
                      🏷️ 问题类型统计
                    </h3>
                    <IssueTagCloud
                      issues={detectionData.issueStatistics}
                      onTagClick={handleTagClick}
                      selectedTag={selectedTag}
                    />
                  </div>
                </div>
              </div>

              {detectionData.summary && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <p className="text-sm text-slate-700 leading-relaxed bg-blue-50 p-4 rounded-lg border border-blue-200">
                    💡 <strong>检测摘要：</strong>{detectionData.summary}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        <section aria-labelledby="detail-title" className="mb-8">
          <h2 id="detail-title" className="sr-only">段落详情与改写区</h2>
          
          <Card className="shadow-sm mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                ✏️ 段落详情与降痕处理
              </CardTitle>
              <CardDescription>
                选择高风险段落进行智能降痕优化
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <ParagraphSelector
                paragraphs={filteredParagraphs}
                selectedIndices={selectedParagraphs}
                onSelectionChange={setSelectedParagraphs}
                maxSelect={10}
              />

              <div className="flex gap-3 justify-between items-center pt-4 border-t border-gray-200">
                <div className="text-sm text-slate-600">
                  已选择 <strong className="text-blue-600">{selectedParagraphs.length}</strong> 个段落
                </div>

                <Button
                  onClick={handleStartRewrite}
                  disabled={isRewriting || selectedParagraphs.length === 0}
                  size="lg"
                  className="min-h-[48px] px-8 shadow-md hover:shadow-lg transition-all"
                  aria-label={
                    isRewriting ? '正在生成改写版本' :
                    selectedParagraphs.length === 0 ? '请先选择段落' : `一键降痕 (${selectedParagraphs.length}段)`
                  }
                >
                  {isRewriting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      正在生成改写版本...
                    </>
                  ) : (
                    <>✨ 一键降痕 ({selectedParagraphs.length}段)</>
                  )}
                </Button>
              </div>

              {(isRewriting || rewriteVersions.length > 0) && (
                <div className="pt-6 border-t border-gray-200">
                  {isRewriting && (
                    <div className="mb-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <div>
                          <h4 className="font-semibold text-slate-800">AI正在生成对抗性改写...</h4>
                          <p className="text-sm text-slate-600">
                            为 {selectedParagraphs.length} 个段落生成多版本改写方案
                          </p>
                        </div>
                      </div>
                      
                      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div className="bg-blue-600 h-full rounded-full animate-pulse" style={{ width: '60%' }} />
                      </div>
                    </div>
                  )}

                  {!isRewriting && rewriteVersions.length > 0 && (
                    <>
                      <div className="mb-6">
                        <h4 className="font-semibold text-slate-800 mb-4">
                          改写结果预览（第{selectedHeatmapIndex !== null ? selectedHeatmapIndex + 1 : 1}段）
                        </h4>
                        
                        {(() => {
                          const paragraph = detectionData.paragraphs.find(
                            (p) => p.index === (selectedHeatmapIndex ?? selectedParagraphs[0])
                          );
                          
                          if (!paragraph) return null;
                          
                          return (
                            <AIGCDiffViewer
                              originalText={paragraph.fullText}
                              rewrittenText={rewriteVersions[selectedVersionIndex]?.text || ''}
                              diffSegments={rewriteVersions[selectedVersionIndex]?.diff}
                            />
                          );
                        })()}
                      </div>

                      <VersionTabs
                        versions={rewriteVersions}
                        selectedVersionIndex={selectedVersionIndex}
                        onVersionChange={setSelectedVersionIndex}
                        onAdopt={handleAdoptVersion}
                        onRegenerate={handleRegenerate}
                        isAdopting={isAdopting}
                        isRegenerating={isRegenerating}
                      />
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        <section aria-labelledby="timeline-title" className="mb-8">
          <h2 id="timeline-title" className="sr-only">优化进度时间线</h2>
          
          <Card className="shadow-sm">
            <CardContent className="p-6">
              <OptimizationTimeline
                records={optimizationRecords}
                currentRound={optimizationRecords.length}
                onRecordClick={(record) => {
                  console.log('Clicked record:', record);
                }}
              />
            </CardContent>
          </Card>
        </section>

        <div className="flex flex-wrap gap-3 justify-center py-6">
          <Link href="/aigc/detect">
            <Button variant="outline" size="lg" className="min-h-[44px]" aria-label="新建检测任务">
              ➕ 新建检测
            </Button>
          </Link>
          
          <Link href="/aigc/history">
            <Button variant="outline" size="lg" className="min-h-[44px]" aria-label="查看历史记录">
              📋 历史记录
            </Button>
          </Link>

          <Button
            onClick={() => window.print()}
            variant="outline"
            size="lg"
            className="min-h-[44px]"
            aria-label="打印当前报告"
          >
            🖨️ 打印报告
          </Button>
        </div>
      </div>
    </div>
  );
}
