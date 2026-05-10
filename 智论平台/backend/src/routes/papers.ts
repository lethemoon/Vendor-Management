import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { PassThrough } from 'stream';

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

const ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-encryption-key-32-chars-long!!';

enum PaperErrorCode {
  PAPER_NOT_FOUND = 'PAPER_NOT_FOUND',
  PAPER_NOT_OWNED = 'PAPER_NOT_OWNED',
  CONTENT_TOO_LONG = 'CONTENT_TOO_LONG',
  ANALYSIS_FAILED = 'ANALYSIS_FAILED',
  REWRITE_FAILED = 'REWRITE_FAILED',
  AI_SERVICE_ERROR = 'AI_SERVICE_ERROR',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  RATE_LIMITED = 'RATE_LIMITED',
}

interface ParagraphAnalysis {
  index: number;
  text: string;
  plagiarismRate: number;
  riskLevel: 'low' | 'medium' | 'high';
}

interface RewriteVersion {
  versionId: string;
  content: string;
  changes: Array<{
    type: 'synonym' | 'structure' | 'paragraph';
    position: number;
    original: string;
    rewritten: string;
  }>;
  confidence: number;
}

interface RewriteResult {
  paragraphIndex: number;
  versions: RewriteVersion[];
}

interface ReportDetail {
  paragraphIndex: number;
  originalText: string;
  rewrittenText?: string;
  originalRate: number;
  newRate: number;
  improvement: number;
  selectedVersion?: number;
}

function encrypt(text: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

function decrypt(encryptedText: string): string {
  const [ivHex, encrypted] = encryptedText.split(':');
  const decipher = createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY.slice(0, 32)), Buffer.from(ivHex, 'hex'));
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

function splitIntoParagraphs(text: string): string[] {
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  if (paragraphs.length === 0) {
    return [text];
  }
  return paragraphs.map(p => p.trim());
}

function calculateWordCount(text: string): number {
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;
  return chineseChars + englishWords;
}

function simulatePlagiarismAnalysis(text: string): ParagraphAnalysis[] {
  const paragraphs = splitIntoParagraphs(text);
  return paragraphs.map((para, index) => {
    const wordCount = para.length;
    let baseRate = Math.random() * 0.4 + 0.1;

    if (wordCount < 50) baseRate *= 0.7;
    else if (wordCount > 500) baseRate *= 1.2;

    const commonPhrases = ['研究表明', '综上所述', '由此可见', '通过分析', '实验结果表明'];
    const phraseCount = commonPhrases.filter(phrase => para.includes(phrase)).length;
    baseRate += phraseCount * 0.05;

    const plagiarismRate = Math.min(Math.max(baseRate, 0), 1);
    let riskLevel: 'low' | 'medium' | 'high' = 'low';

    if (plagiarismRate >= 0.5) riskLevel = 'high';
    else if (plagiarismRate >= 0.25) riskLevel = 'medium';

    return {
      index,
      text: para.substring(0, 200) + (para.length > 200 ? '...' : ''),
      plagiarismRate: Math.round(plagiarismRate * 10000) / 100,
      riskLevel,
    };
  });
}

async function simulateAIRewrite(
  text: string,
  options: {
    strength: 'light' | 'medium' | 'heavy';
    style: 'academic' | 'formal' | 'concise';
    protectedTerms: string[];
  }
): Promise<RewriteVersion> {
  await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1500));

  let rewritten = text;
  const changes: RewriteVersion['changes'] = [];

  const synonymMap: Record<string, string> = {
    '研究': '探究',
    '分析': '剖析',
    '表明': '显示',
    '方法': '途径',
    '结果': '成果',
    '问题': '议题',
    '影响': '作用',
    '发展': '演进',
    '提高': '提升',
    '降低': '减少',
    '重要': '关键',
    '显著': '明显',
    '认为': '指出',
    '提出': '建议',
    '进行': '开展',
    '实现': '达成',
  };

  if (options.strength === 'light') {
    Object.entries(synonymMap).slice(0, 5).forEach(([original, replacement]) => {
      if (rewritten.includes(original) && !options.protectedTerms.includes(original)) {
        const pos = rewritten.indexOf(original);
        rewritten = rewritten.replace(original, replacement);
        changes.push({
          type: 'synonym',
          position: pos,
          original,
          rewritten: replacement,
        });
      }
    });
  } else if (options.strength === 'medium') {
    Object.entries(synonymMap).slice(0, 10).forEach(([original, replacement]) => {
      if (rewritten.includes(original) && !options.protectedTerms.includes(original)) {
        const pos = rewritten.indexOf(original);
        rewritten = rewritten.replace(original, replacement);
        changes.push({
          type: 'synonym',
          position: pos,
          original,
          rewritten: replacement,
        });
      }
    });

    if (rewritten.includes('，')) {
      const sentences = rewritten.split('。');
      if (sentences.length > 2) {
        const temp = sentences[0];
        sentences[0] = sentences[1];
        sentences[1] = temp;
        rewritten = sentences.join('。');
        changes.push({
          type: 'structure',
          position: 0,
          original: sentences[1],
          rewritten: sentences[0],
        });
      }
    }
  } else {
    Object.entries(synonymMap).forEach(([original, replacement]) => {
      if (rewritten.includes(original) && !options.protectedTerms.includes(original)) {
        const pos = rewritten.indexOf(original);
        rewritten = rewritten.replaceAll(original, replacement);
        changes.push({
          type: 'synonym',
          position: pos,
          original,
          rewritten: replacement,
        });
      }
    });

    if (options.style === 'concise') {
      rewritten = rewritten.replace(/非常/g, '').replace(/十分/g, '').replace(/极其/g, '');
      changes.push({
        type: 'structure',
        position: 0,
        original: text,
        rewritten,
      });
    }
  }

  const confidence = 70 + Math.random() * 25;

  return {
    versionId: `v${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    content: rewritten,
    changes,
    confidence: Math.round(confidence * 100) / 100,
  };
}

export default async function papersRoutes(fastify: FastifyInstance) {

  fastify.post('/upload', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['论文管理'],
      summary: '上传论文',
      body: {
        type: 'object',
        properties: {
          title: { type: 'string', maxLength: 200 },
          content: { type: 'string', minLength: 100, maxLength: 50000 },
          source: { type: 'string', enum: ['paste', 'upload'] },
        },
        required: ['content'],
      },
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                paper: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    title: { type: 'string' },
                    wordCount: { type: 'number' },
                    createdAt: { type: 'string' },
                  },
                },
              },
            },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request as any).user?.userId;
      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: '未授权访问',
          },
        });
      }

      const uploadSchema = z.object({
        title: z.string().max(200).optional(),
        content: z.string()
          .min(100, '内容至少100字')
          .max(50000, '内容不能超过50000字'),
        source: z.enum(['paste', 'upload']).optional().default('paste'),
      });

      const body = uploadSchema.parse(request.body);

      const encryptedContent = encrypt(body.content);
      const wordCount = calculateWordCount(body.content);

      const paper = await prisma.paper.create({
        data: {
          userId,
          title: body.title || '未命名论文',
          content: encryptedContent,
          originalText: body.content,
          status: 'Draft',
        },
      });

      await prisma.usageLog.create({
        data: {
          userId,
          action: 'upload',
          resource: paper.id,
          wordsUsed: wordCount,
          cost: 0,
        },
      });

      return reply.status(201).send({
        success: true,
        data: {
          paper: {
            id: paper.id,
            title: paper.title,
            wordCount,
            createdAt: paper.createdAt.toISOString(),
          },
        },
        message: '论文上传成功',
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '参数校验失败',
            details: error.errors,
          },
        });
      }

      fastify.log.error(error, '论文上传失败');
      return reply.status(500).send({
        success: false,
        error: {
          code: PaperErrorCode.PAPER_NOT_FOUND,
          message: '服务器错误，请稍后重试',
        },
      });
    }
  });

  fastify.post('/:id/analyze', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['论文分析'],
      summary: '分析论文重复率',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
        required: ['id'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                analysis: {
                  type: 'object',
                  properties: {
                    totalWords: { type: 'number' },
                    plagiarismRate: { type: 'number' },
                    aigcRate: { type: 'number' },
                    paragraphs: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          index: { type: 'number' },
                          text: { type: 'string' },
                          plagiarismRate: { type: 'number' },
                          riskLevel: { type: 'string', enum: ['low', 'medium', 'high'] },
                        },
                      },
                    },
                  },
                },
              },
            },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const userId = (request as any).user?.userId;
      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: '未授权访问',
          },
        });
      }

      const { id: paperId } = request.params;

      const cacheKey = `analysis:${paperId}`;
      const cachedResult = await redis.get(cacheKey);

      if (cachedResult) {
        return reply.send({
          success: true,
          data: {
            analysis: JSON.parse(cachedResult),
          },
          message: '分析完成（缓存）',
        });
      }

      const paper = await prisma.paper.findFirst({
        where: {
          id: paperId,
          userId,
        },
      });

      if (!paper) {
        return reply.status(404).send({
          success: false,
          error: {
            code: PaperErrorCode.PAPER_NOT_FOUND,
            message: '论文不存在或无权访问',
          },
        });
      }

      const decryptedContent = decrypt(paper.content);
      const totalWords = calculateWordCount(decryptedContent);

      const startTime = Date.now();
      const paragraphs = simulatePlagiarismAnalysis(decryptedContent);
      const analysisTime = Date.now() - startTime;

      const avgPlagiarismRate = paragraphs.length > 0
        ? paragraphs.reduce((sum, p) => sum + p.plagiarismRate, 0) / paragraphs.length
        : 0;

      const aigcRate = Math.round((Math.random() * 15 + 5) * 100) / 100;

      const analysisResult = {
        totalWords,
        plagiarismRate: Math.round(avgPlagiarismRate * 100) / 100,
        aigcRate,
        paragraphs,
      };

      await redis.setex(cacheKey, 24 * 60 * 60, JSON.stringify(analysisResult));

      await prisma.paper.update({
        where: { id: paperId },
        data: {
          status: 'Completed',
          plagiarismRate: analysisResult.plagiarismRate,
          aigcRate: analysisResult.aigcRate,
        },
      });

      await prisma.usageLog.create({
        data: {
          userId,
          action: 'analyze',
          resource: paperId,
          wordsUsed: totalWords,
          cost: 0.08,
          metadata: { analysisTime },
        },
      });

      return reply.send({
        success: true,
        data: {
          analysis: analysisResult,
        },
        message: '分析完成',
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '参数校验失败',
            details: error.errors,
          },
        });
      }

      fastify.log.error(error, '论文分析失败');
      return reply.status(500).send({
        success: false,
        error: {
          code: PaperErrorCode.ANALYSIS_FAILED,
          message: '分析失败，请稍后重试',
        },
      });
    }
  });

  fastify.post('/:id/rewrite', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['智能改写'],
      summary: '智能改写论文（SSE流式）',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
        required: ['id'],
      },
      body: {
        type: 'object',
        properties: {
          paragraphIndices: {
            type: 'array',
            items: { type: 'number' },
            minItems: 1,
            maxItems: 20,
          },
          options: {
            type: 'object',
            properties: {
              strength: { type: 'string', enum: ['light', 'medium', 'heavy'] },
              style: { type: 'string', enum: ['academic', 'formal', 'concise'] },
              protectedTerms: { type: 'array', items: { type: 'string' } },
              versions: { type: 'number', minimum: 1, maximum: 3 },
            },
            required: ['strength'],
          },
        },
        required: ['paragraphIndices', 'options'],
      },
    },
  }, async (request: FastifyRequest<{ Params: { id: string } }, any>, reply: FastifyReply) => {
    try {
      const userId = (request as any).user?.userId;
      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: '未授权访问',
          },
        });
      }

      const { id: paperId } = request.params;

      const rewriteSchema = z.object({
        paragraphIndices: z.array(z.number().int().min(0))
          .min(1, '至少选择一个段落')
          .max(20, '每次最多改写20个段落'),
        options: z.object({
          strength: z.enum(['light', 'medium', 'heavy']),
          style: z.enum(['academic', 'formal', 'concise']).default('academic'),
          protectedTerms: z.array(z.string()).default([]),
          versions: z.number().int().min(1).max(3).default(3),
        }),
      });

      const body = rewriteSchema.parse(request.body);

      const paper = await prisma.paper.findFirst({
        where: {
          id: paperId,
          userId,
        },
      });

      if (!paper) {
        return reply.status(404).send({
          success: false,
          error: {
            code: PaperErrorCode.PAPER_NOT_FOUND,
            message: '论文不存在或无权访问',
          },
        });
      }

      const decryptedContent = decrypt(paper.content);
      const allParagraphs = splitIntoParagraphs(decryptedContent);

      const invalidIndices = body.paragraphIndices.filter(idx => idx >= allParagraphs.length);
      if (invalidIndices.length > 0) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'INVALID_INDEX',
            message: `段落索引超出范围: ${invalidIndices.join(', ')}`,
          },
        });
      }

      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      });

      const stream = new PassThrough();
      stream.pipe(reply.raw);

      const sendSSE = (event: string, data: any) => {
        stream.write(`event: ${event}\n`);
        stream.write(`data: ${JSON.stringify(data)}\n\n`);
      };

      sendSSE('start', {
        status: 'processing',
        totalParagraphs: body.paragraphIndices.length,
        timestamp: new Date().toISOString(),
      });

      const results: RewriteResult[] = [];
      let totalOriginalRate = 0;
      let totalNewRate = 0;

      for (let i = 0; i < body.paragraphIndices.length; i++) {
        const paragraphIndex = body.paragraphIndices[i];
        const paragraphText = allParagraphs[paragraphIndex];

        sendSSE('progress', {
          current: i + 1,
          total: body.paragraphIndices.length,
          paragraphIndex,
          status: 'processing',
          timestamp: new Date().toISOString(),
        });

        const hash = `${paperId}-${paragraphIndex}-${body.options.strength}-${body.options.style}`;
        const cacheKey = `rewrite:${hash}`;
        let cachedVersions: RewriteVersion[] | null = null;

        try {
          const cached = await redis.get(cacheKey);
          if (cached) {
            cachedVersions = JSON.parse(cached);
          }
        } catch (e) {
          fastify.log.warn(e, 'Redis读取失败，使用实时生成');
        }

        let versions: RewriteVersion[];

        if (cachedVersions) {
          versions = cachedVersions;
        } else {
          versions = [];
          for (let v = 0; v < body.options.versions; v++) {
            try {
              const version = await simulateAIRewrite(paragraphText, body.options);
              versions.push(version);
            } catch (error) {
              fastify.log.error(error, `段落${paragraphIndex}版本${v}改写失败`);
              sendSSE('error', {
                paragraphIndex,
                version: v,
                error: '该版本生成失败',
              });
            }
          }

          if (versions.length > 0) {
            try {
              await redis.setex(cacheKey, 7 * 24 * 60 * 60, JSON.stringify(versions));
            } catch (e) {
              fastify.log.warn(e, 'Redis写入失败');
            }
          }
        }

        const result: RewriteResult = {
          paragraphIndex,
          versions,
        };

        results.push(result);

        sendSSE('result', {
          paragraphIndex,
          result,
          timestamp: new Date().toISOString(),
        });

        const originalRate = Math.random() * 40 + 20;
        const newRate = Math.max(0, originalRate - (10 + Math.random() * 20));
        totalOriginalRate += originalRate;
        totalNewRate += newRate;
      }

      const avgOriginalRate = results.length > 0 ? totalOriginalRate / results.length : 0;
      const avgNewRate = results.length > 0 ? totalNewRate / results.length : 0;
      const improvement = avgOriginalRate - avgNewRate;

      const summary = {
        originalRate: Math.round(avgOriginalRate * 100) / 100,
        estimatedNewRate: Math.round(avgNewRate * 100) / 100,
        improvement: Math.round(improvement * 100) / 100,
        apiCost: results.length * body.options.versions * 0.06,
      };

      sendSSE('complete', {
        results,
        summary,
        timestamp: new Date().toISOString(),
      });

      await prisma.paper.update({
        where: { id: paperId },
        data: {
          processedText: JSON.stringify({ results, summary }),
          updatedAt: new Date(),
        },
      });

      await prisma.usageLog.create({
        data: {
          userId,
          action: 'rewrite',
          resource: paperId,
          wordsUsed: body.paragraphIndices?.reduce((sum: number, idx: number) => sum + allParagraphs[idx]?.length || 0, 0) || 0,
          cost: summary.apiCost,
          metadata: {
            paragraphsCount: body.paragraphIndices.length,
            options: body.options,
          },
        },
      });

      stream.end();
      return reply.sent;
    } catch (error) {
      if (error instanceof z.ZodError) {
        if (!reply.sent) {
          return reply.status(400).send({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: '参数校验失败',
              details: error.errors,
            },
          });
        }
      }

      fastify.log.error(error, '论文改写失败');
      if (!reply.sent) {
        return reply.status(500).send({
          success: false,
          error: {
            code: PaperErrorCode.REWRITE_FAILED,
            message: '改写失败，请稍后重试',
          },
        });
      }
    }
  });

  fastify.get('/:id/report', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['报告'],
      summary: '获取降重报告',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
        required: ['id'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                report: {
                  type: 'object',
                  properties: {
                    paperInfo: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        title: { type: 'string' },
                        createdAt: { type: 'string' },
                        wordCount: { type: 'number' },
                      },
                    },
                    summary: {
                      type: 'object',
                      properties: {
                        originalRate: { type: 'number' },
                        finalRate: { type: 'number' },
                        improvement: { type: 'number' },
                        rewrittenParagraphs: { type: 'number' },
                        totalParagraphs: { type: 'number' },
                      },
                    },
                    details: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          paragraphIndex: { type: 'number' },
                          originalText: { type: 'string' },
                          rewrittenText: { type: 'string' },
                          originalRate: { type: 'number' },
                          newRate: { type: 'number' },
                          improvement: { type: 'number' },
                          selectedVersion: { type: 'number' },
                        },
                      },
                    },
                  },
                },
              },
            },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const userId = (request as any).user?.userId;
      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: '未授权访问',
          },
        });
      }

      const { id: paperId } = request.params;

      const paper = await prisma.paper.findFirst({
        where: {
          id: paperId,
          userId,
        },
      });

      if (!paper) {
        return reply.status(404).send({
          success: false,
          error: {
            code: PaperErrorCode.PAPER_NOT_FOUND,
            message: '论文不存在或无权访问',
          },
        });
      }

      const decryptedContent = decrypt(paper.content);
      const wordCount = calculateWordCount(decryptedContent);
      const allParagraphs = splitIntoParagraphs(decryptedContent);

      const analysisCacheKey = `analysis:${paperId}`;
      let analysisData: any = null;

      try {
        const cachedAnalysis = await redis.get(analysisCacheKey);
        if (cachedAnalysis) {
          analysisData = JSON.parse(cachedAnalysis);
        }
      } catch (e) {
        fastify.log.warn(e, '读取分析缓存失败');
      }

      if (!analysisData) {
        analysisData = simulatePlagiarismAnalysis(decryptedContent);
      }

      const paragraphs = Array.isArray(analysisData.paragraphs)
        ? analysisData.paragraphs
        : analysisData;

      let rewriteResults: { results: RewriteResult[]; summary: any } | null = null;

      if (paper.processedText) {
        try {
          rewriteResults = JSON.parse(paper.processedText);
        } catch (e) {
          fastify.log.warn(e, '解析改写结果失败');
        }
      }

      const details: ReportDetail[] = allParagraphs.map((para, index) => {
        const paragraphAnalysis = Array.isArray(paragraphs)
          ? paragraphs.find((p: ParagraphAnalysis) => p.index === index)
          : null;

        const originalRate = paragraphAnalysis?.plagiarismRate ?? 0;

        const rewriteResult = rewriteResults?.results?.find(
          (r: RewriteResult) => r.paragraphIndex === index
        );

        const selectedVersion = rewriteResult?.versions?.[0];
        const newRate = selectedVersion
          ? Math.max(0, originalRate - (10 + Math.random() * 20))
          : originalRate;

        return {
          paragraphIndex: index,
          originalText: para,
          rewrittenText: selectedVersion?.content,
          originalRate,
          newRate: Math.round(newRate * 100) / 100,
          improvement: Math.round((originalRate - newRate) * 100) / 100,
          selectedVersion: rewriteResult ? 0 : undefined,
        };
      });

      const rewrittenCount = details.filter(d => d.rewrittenText).length;
      const avgOriginalRate = details.length > 0
        ? details.reduce((sum, d) => sum + d.originalRate, 0) / details.length
        : 0;
      const avgFinalRate = details.length > 0
        ? details.reduce((sum, d) => sum + d.newRate, 0) / details.length
        : 0;

      const report = {
        paperInfo: {
          id: paper.id,
          title: paper.title,
          createdAt: paper.createdAt.toISOString(),
          wordCount,
        },
        summary: {
          originalRate: Math.round(avgOriginalRate * 100) / 100,
          finalRate: Math.round(avgFinalRate * 100) / 100,
          improvement: Math.round((avgOriginalRate - avgFinalRate) * 100) / 100,
          rewrittenParagraphs: rewrittenCount,
          totalParagraphs: allParagraphs.length,
        },
        details,
      };

      return reply.send({
        success: true,
        data: { report },
        message: '报告生成成功',
      });
    } catch (error) {
      fastify.log.error(error, '获取报告失败');
      return reply.status(500).send({
        success: false,
        error: {
          code: 'REPORT_GENERATION_FAILED',
          message: '报告生成失败，请稍后重试',
        },
      });
    }
  });

  // ==================== 编辑器集成端点: 论文引用管理 ====================

  // ==================== 端点: GET /api/v1/papers/:paperId/citations ====================

  fastify.get('/:paperId/citations', {
    preHandler: [fastify.authenticate],
  }, async (
    request: FastifyRequest<{ Params: { paperId: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const userId = (request as any).user?.userId;
      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: '未授权访问' },
        });
      }

      const { paperId } = request.params;

      const paper = await prisma.paper.findFirst({
        where: { id: paperId, userId },
      });

      if (!paper) {
        return reply.status(404).send({
          success: false,
          error: { code: PaperErrorCode.PAPER_NOT_FOUND, message: '论文不存在或无权访问' },
        });
      }

      const citations = await prisma.paperCitation.findMany({
        where: { paperId, deletedAt: null },
        orderBy: [{ citationNumber: 'asc' }],
        include: {
          document: {
            select: {
              id: true,
              type: true,
              title: true,
              authors: true,
              year: true,
              journal: true,
              doi: true,
              citationCount: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      });

      const referenceList = citations.map((c: any) => ({
        citationNumber: c.citationNumber,
        text: c.citationText,
      }));

      const formattedCitations = citations.map((c: any) => ({
        ...c,
        document: c.document ? {
          ...c.document,
          createdAt: c.document.createdAt.toISOString(),
          updatedAt: c.document.updatedAt.toISOString(),
        } : undefined,
      }));

      return reply.send({
        success: true,
        data: {
          paperId,
          citations: formattedCitations,
          referenceList,
        },
        message: '获取论文引用列表成功',
      });
    } catch (error) {
      fastify.log.error(error, '获取论文引用列表失败');
      return reply.status(500).send({
        success: false,
        error: { code: PaperErrorCode.ANALYSIS_FAILED, message: '获取引用列表失败' },
      });
    }
  });

  // ==================== 端点: POST /api/v1/papers/:paperId/citations ====================

  fastify.post('/:paperId/citations', {
    preHandler: [fastify.authenticate],
  }, async (
    request: FastifyRequest<{ Params: { paperId: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const userId = (request as any).user?.userId;
      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: '未授权访问' },
        });
      }

      const { paperId } = request.params;

      const insertSchema = z.object({
        documentIds: z.array(z.string().uuid()).min(1).max(10),
        format: z.enum(['GBT7714', 'APA7', 'MLA9']).default('GBT7714'),
        position: z.number().int().min(0).optional(),
      });
      const body = insertSchema.parse(request.body);

      const paper = await prisma.paper.findFirst({
        where: { id: paperId, userId },
      });

      if (!paper) {
        return reply.status(404).send({
          success: false,
          error: { code: PaperErrorCode.PAPER_NOT_FOUND, message: '论文不存在或无权访问' },
        });
      }

      const existingCitations = await prisma.paperCitation.findMany({
        where: { paperId, deletedAt: null },
        orderBy: [{ citationNumber: 'asc' }],
      });

      const maxCitationNumber = existingCitations.length > 0
        ? Math.max(...existingCitations.map((c: any) => c.citationNumber))
        : 0;

      const inserted = [];
      let nextCitationNumber = maxCitationNumber + 1;

      for (const docId of body.documentIds) {
        const existingCitation = existingCitations.find(
          (c: any) => c.documentId === docId && !c.deletedAt
        );

        if (existingCitation) {
          continue;
        }

        const doc = await prisma.document.findFirst({
          where: { id: docId, userId, deletedAt: null },
        });

        if (!doc) {
          continue;
        }

        const { citationEngine } = require('../services/citationEngine');
        const citationText = citationEngine.generate(
          {
            type: doc.type,
            title: doc.title,
            authors: doc.authors,
            year: doc.year || undefined,
            journal: doc.journal || undefined,
            volume: doc.volume || undefined,
            issue: doc.issue || undefined,
            pages: doc.pages || undefined,
            doi: doc.doi || undefined,
            url: doc.url || undefined,
            publisher: doc.publisher || undefined,
            edition: doc.edition || undefined,
            location: doc.location || undefined,
            university: doc.university || undefined,
            degreeType: doc.degreeType || undefined,
            conferenceName: doc.conferenceName || undefined,
            conferenceLocation: doc.conferenceLocation || undefined,
            editors: doc.editors || undefined,
            websiteName: doc.websiteName || undefined,
            accessDate: doc.accessDate?.toISOString(),
            publishDate: doc.publishDate?.toISOString(),
            patentNumber: doc.patentNumber || undefined,
            inventors: doc.inventors || undefined,
            filingDate: doc.filingDate?.toISOString(),
            issuingAuthority: doc.issuingAuthority || undefined,
            isbn: doc.isbn || undefined,
          },
          body.format as any
        );

        const newCitation = await prisma.paperCitation.create({
          data: {
            paperId,
            documentId: docId,
            citationNumber: nextCitationNumber,
            citationText,
            format: body.format as any,
            position: body.position,
          },
        });

        inserted.push({
          id: newCitation.id,
          documentId: docId,
          citationNumber: newCitation.citationNumber,
          citationText: newCitation.citationText,
        });

        nextCitationNumber++;
      }

      const docsToUpdate = await prisma.document.findMany({
        where: { id: { in: body.documentIds } },
        select: { id: true, citationCount: true },
      });
      for (const doc of docsToUpdate) {
        await prisma.document.update({
          where: { id: doc.id },
          data: { citationCount: doc.citationCount + 1 },
        });
      }

      const allCitations = await prisma.paperCitation.findMany({
        where: { paperId, deletedAt: null },
        orderBy: [{ citationNumber: 'asc' }],
      });

      const updatedReferenceList = allCitations.map((c: any) => ({
        citationNumber: c.citationNumber,
        text: c.citationText,
      }));

      return reply.status(201).send({
        success: true,
        data: {
          inserted,
          updatedReferenceList,
        },
        message: `成功插入 ${inserted.length} 个引用`,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: '参数校验失败', details: error.errors },
        });
      }

      fastify.log.error(error, '插入引用失败');
      return reply.status(500).send({
        success: false,
        error: { code: PaperErrorCode.REWRITE_FAILED, message: '插入引用失败' },
      });
    }
  });

  // ==================== 端点: DELETE /api/v1/papers/:paperId/citations/:id ====================

  fastify.delete('/:paperId/citations/:citationId', {
    preHandler: [fastify.authenticate],
  }, async (
    request: FastifyRequest<{ Params: { paperId: string; citationId: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const userId = (request as any).user?.userId;
      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: '未授权访问' },
        });
      }

      const { paperId, citationId } = request.params;

      const paper = await prisma.paper.findFirst({
        where: { id: paperId, userId },
      });

      if (!paper) {
        return reply.status(404).send({
          success: false,
          error: { code: PaperErrorCode.PAPER_NOT_FOUND, message: '论文不存在或无权访问' },
        });
      }

      const citation = await prisma.paperCitation.findFirst({
        where: { id: citationId, paperId, deletedAt: null },
      });

      if (!citation) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: '引用记录不存在' },
        });
      }

      await prisma.$transaction(async (tx) => {
        await tx.paperCitation.update({
          where: { id: citationId },
          data: { deletedAt: new Date() },
        });

        const remainingCitations = await tx.paperCitation.findMany({
          where: { paperId, deletedAt: null, citationNumber: { gt: citation.citationNumber } },
          orderBy: [{ citationNumber: 'asc' }],
        });

        for (let i = 0; i < remainingCitations.length; i++) {
          await tx.paperCitation.update({
            where: { id: remainingCitations[i].id },
            data: { citationNumber: citation.citationNumber + i },
          });
        }
      });

      const doc = await prisma.document.findUnique({
        where: { id: citation.documentId },
        select: { citationCount: true },
      });
      if (doc) {
        await prisma.document.update({
          where: { id: citation.documentId },
          data: { citationCount: Math.max(0, doc.citationCount - 1) },
        });
      }

      const allCitations = await prisma.paperCitation.findMany({
        where: { paperId, deletedAt: null },
        orderBy: [{ citationNumber: 'asc' }],
      });

      const updatedReferenceList = allCitations.map((c: any) => ({
        citationNumber: c.citationNumber,
        text: c.citationText,
      }));

      return reply.send({
        success: true,
        data: {
          removed: { id: citationId, documentId: citation.documentId },
          updatedReferenceList,
        },
        message: '引用已移除并重新编号',
      });
    } catch (error) {
      fastify.log.error(error, '移除引用失败');
      return reply.status(500).send({
        success: false,
        error: { code: PaperErrorCode.REWRITE_FAILED, message: '移除引用失败' },
      });
    }
  });
}
