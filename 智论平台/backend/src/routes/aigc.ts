/**
 * AIGC检测与降痕 API路由主文件
 * 实现8个核心端点的完整业务逻辑
 * 基于技术规格文档 TECH_SPEC-AIGC检测-MVP.md 第4节
 * 代码风格参考 papers.ts (Fastify + Zod + Prisma + Redis)
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { PassThrough } from 'stream';

import {
  aigcSchemas,
  AIGCErrorCode,
  AIGC_ERROR_MESSAGES,
  ParagraphResult,
  RewriteVersionOutput,
} from '../types/aigc';
import {
  chartSchemas,
  ChartErrorCode,
  CHART_ERROR_MESSAGES,
} from '../types/chart';
import { chartService } from '../services/chartService';
import {
  runRuleEngine,
  splitSentences,
} from '../services/ruleEngine';
import {
  generateAIGCDetectPrompt,
  callLLMDetect,
  parseLLMDetectResponse,
  computeFinalScore,
  mapRiskLevel,
  generateSummary,
  buildParagraphResult,
} from '../services/aigcDetectService';
import {
  generateRewriteVersions,
  checkRewriteQuality,
} from '../services/aigcRewriteService';
import { DeepSeekClient } from '../services/aiRewriteService';
import { AIServiceError } from '../types/paper';
import {
  splitByParagraph,
  calculateWordCount,
  generateContentHash,
} from '../utils/textProcessing';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: any, reply: any) => Promise<void>;
  }
}

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

const ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY =
  process.env.ENCRYPTION_KEY || 'default-encryption-key-32-chars-long!!';

// ==================== 工具函数（复用papers.ts） ====================

function encrypt(text: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv(
    ALGORITHM,
    Buffer.from(ENCRYPTION_KEY.slice(0, 32)),
    iv
  );
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

function decrypt(encryptedText: string): string {
  const [ivHex, encrypted] = encryptedText.split(':');
  const decipher = createDecipheriv(
    ALGORITHM,
    Buffer.from(ENCRYPTION_KEY.slice(0, 32)),
    Buffer.from(ivHex, 'hex')
  );
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// ==================== 频率限制配置 ====================

const RATE_LIMIT_CONFIG = {
  perMinute: 60,
  maxConcurrentTasks: 3,
} as const;

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function toPrismaRiskLevel(level: string): string {
  const map: Record<string, string> = {
    low: 'Low',
    medium: 'Medium',
    'medium-high': 'MediumHigh',
    high: 'High',
  };
  return map[level] || 'Medium';
}

function checkRateLimit(userId: string): {
  allowed: boolean;
  remaining: number;
  retryAfter?: number;
} {
  const now = Date.now();
  const record = rateLimitMap.get(userId);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + 60000 });
    return { allowed: true, remaining: RATE_LIMIT_CONFIG.perMinute - 1 };
  }

  if (record.count >= RATE_LIMIT_CONFIG.perMinute) {
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.ceil((record.resetTime - now) / 1000),
    };
  }

  record.count++;
  return { allowed: true, remaining: RATE_LIMIT_CONFIG.perMinute - record.count };
}

// ==================== 路由注册函数 ====================

export default async function aigcRoutes(fastify: FastifyInstance) {
  // ==================== 端点1: POST /api/v1/aigc/detect ====================

  fastify.post('/detect', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request as any).user?.userId;
      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: {
            code: AIGCErrorCode.NOT_AUTHORIZED,
            message: AIGC_ERROR_MESSAGES[AIGCErrorCode.NOT_AUTHORIZED],
          },
        });
      }

      const rateLimit = checkRateLimit(userId);
      if (!rateLimit.allowed) {
        return reply.status(429).send({
          success: false,
          error: {
            code: AIGCErrorCode.RATE_LIMITED,
            message: `${AIGC_ERROR_MESSAGES[AIGCErrorCode.RATE_LIMITED]}，${rateLimit.retryAfter}秒后重试`,
          },
        });
      }

      const body = aigcSchemas.detect.parse(request.body);

      const startTime = Date.now();

      const cleanedContent = body.content.trim().replace(/\s+/g, ' ');
      const paragraphs = splitByParagraph(cleanedContent);
      const wordCount = calculateWordCount(cleanedContent);
      const contentHash = generateContentHash(cleanedContent);

      const cacheKey = `aigc:${contentHash}`;
      const cachedResult = await redis.get(cacheKey);
      if (cachedResult) {
        const cachedData = JSON.parse(cachedResult);
        return reply.send({
          success: true,
          data: {
            ...cachedData,
            processingTime: Date.now() - startTime,
          },
          message: '检测完成（缓存命中）',
        });
      }

      const detection = await prisma.aIGCDetection.create({
        data: {
          userId,
          title: body.title || '未命名检测',
          contentHash,
          encryptedContent: encrypt(cleanedContent),
          overallScore: 0,
          riskLevel: 'Medium',
          paragraphCount: paragraphs.length,
          status: 'Analyzing',
          source: body.source?.toUpperCase() || 'PASTE',
          paperId: body.paperId,
        },
      });

      console.info(`[AIGC] 开始检测`, {
        detectionId: detection.id,
        wordCount,
        paragraphCount: paragraphs.length,
      });

      const ruleResults: Array<{
        index: number;
        text: string;
        ruleResult: ReturnType<typeof runRuleEngine>;
      }> = [];

      for (let i = 0; i < paragraphs.length; i++) {
        ruleResults.push({
          index: i,
          text: paragraphs[i],
          ruleResult: runRuleEngine(paragraphs[i]),
        });
      }

      const suspiciousParagraphs = ruleResults.filter(
        r => r.ruleResult.weightedScore > 30
      );

      let llmResults: Map<number, { score: number; evidence: string[] }> =
        new Map();

      if (suspiciousParagraphs.length > 0) {
        const batchSize = 8;
        for (let i = 0; i < suspiciousParagraphs.length; i += batchSize) {
          const batch = suspiciousParagraphs.slice(i, i + batchSize);
          const batchInput = batch.map(b => ({
            index: b.index,
            text: b.text,
          }));

          try {
            const apiClient = new DeepSeekClient({
              apiKey: process.env.DEEPSEEK_API_KEY || '',
              baseUrl: process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com',
              model: 'deepseek-chat',
              maxTokens: 4000,
              temperature: 0.1,
              timeout: 30000,
              maxRetries: 3,
            });

            const results = await callLLMDetect(apiClient, batchInput);
            for (const result of results) {
              llmResults.set(result.index, {
                score: result.score,
                evidence: result.evidence,
              });
            }
          } catch (error) {
            console.warn(
              '[AIGC] LLM检测失败，使用规则引擎得分',
              error
            );
            for (const item of batch) {
              llmResults.set(item.index, {
                score: item.ruleResult.weightedScore,
                evidence: [],
              });
            }
          }
        }
      }

      const finalParagraphs: ParagraphResult[] = [];
      let offset = 0;
      for (const rr of ruleResults) {
        const llmData = llmResults.get(rr.index);
        const llmScore = llmData?.score ?? rr.ruleResult.weightedScore;
        const finalScore = computeFinalScore(
          rr.ruleResult.weightedScore,
          llmScore
        );

        finalParagraphs.push(
          buildParagraphResult(
            rr.index,
            rr.text,
            finalScore,
            rr.ruleResult,
            llmData?.evidence,
            offset
          )
        );

        offset += rr.text.length + 2;
      }

      const overallScore =
        finalParagraphs.length > 0
          ? Math.round(
              finalParagraphs.reduce((sum, p) => sum + p.score, 0) /
                finalParagraphs.length
            )
          : 0;

      const issueStatistics: Record<string, number> = {};
      for (const p of finalParagraphs) {
        for (const issue of p.issues) {
          issueStatistics[issue] = (issueStatistics[issue] || 0) + 1;
        }
      }

      const summary = generateSummary(finalParagraphs, overallScore);
      const processingTime = Date.now() - startTime;
      const creditsConsumed = Math.ceil(wordCount * 1.0);

      const resultData = {
        summary,
        paragraphs: finalParagraphs,
        issueStatistics,
      };

      await prisma.aIGCDetection.update({
        where: { id: detection.id },
        data: {
          overallScore,
          riskLevel: toPrismaRiskLevel(mapRiskLevel(overallScore)) as any,
          status: 'Analyzed',
          highRiskCount: finalParagraphs.filter(
            p => p.riskLevel === 'high'
          ).length,
          processingTimeMs: processingTime,
          creditsConsumed,
          result: resultData as any,
        },
      });

      await redis.setex(
        cacheKey,
        24 * 60 * 60,
        JSON.stringify({
          detectionId: detection.id,
          overallScore,
          riskLevel: mapRiskLevel(overallScore),
          summary,
          paragraphs: finalParagraphs,
          issueStatistics,
          creditsConsumed,
          createdAt: detection.createdAt.toISOString(),
        })
      );

      await prisma.usageLog.create({
        data: {
          userId,
          action: 'aigc_detect',
          resource: detection.id,
          wordsUsed: wordCount,
          cost: creditsConsumed * 0.0001,
          metadata: {
            paragraphCount: paragraphs.length,
            overallScore,
            processingTime,
          },
        },
      });

      console.info(`[AIGC] 检测完成`, {
        detectionId: detection.id,
        overallScore,
        processingTime,
      });

      return reply.send({
        success: true,
        data: {
          detectionId: detection.id,
          overallScore,
          riskLevel: mapRiskLevel(overallScore),
          summary,
          paragraphs: finalParagraphs,
          issueStatistics,
          processingTime,
          creditsConsumed,
          createdAt: detection.createdAt.toISOString(),
        },
        message: '检测完成',
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

      fastify.log.error(error, 'AIGC检测失败');
      return reply.status(500).send({
        success: false,
        error: {
          code: AIGCErrorCode.DETECTION_FAILED,
          message: AIGC_ERROR_MESSAGES[AIGCErrorCode.DETECTION_FAILED],
        },
      });
    }
  });

  // ==================== 端点2: GET /api/v1/aigc/detect/:id ====================

  fastify.get('/detect/:id', {
    preHandler: [fastify.authenticate],
  }, async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const userId = (request as any).user?.userId;
      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: {
            code: AIGCErrorCode.NOT_AUTHORIZED,
            message: AIGC_ERROR_MESSAGES[AIGCErrorCode.NOT_AUTHORIZED],
          },
        });
      }

      const { id: detectionId } = request.params;

      const cacheKey = `aigc_detail:${detectionId}`;
      let cachedDetail = await redis.get(cacheKey);

      if (cachedDetail) {
        return reply.send(JSON.parse(cachedDetail));
      }

      const detection = await prisma.aIGCDetection.findFirst({
        where: {
          id: detectionId,
          userId,
          deletedAt: null,
        },
        include: {
          optimizations: {
            where: { deletedAt: null },
            orderBy: { roundNumber: 'asc' },
          },
        },
      });

      if (!detection) {
        return reply.status(404).send({
          success: false,
          error: {
            code: AIGCErrorCode.DETECTION_NOT_FOUND,
            message:
              AIGC_ERROR_MESSAGES[AIGCErrorCode.DETECTION_NOT_FOUND],
          },
        });
      }

      const result = detection.result as any;
      const timeline = detection.optimizations.map(opt => ({
        id: opt.id,
        roundNumber: opt.roundNumber,
        operationType: opt.operationType,
        beforeAigcRate: opt.beforeAigcRate,
        afterAigcRate: opt.afterAigcRate,
        rateChange: opt.rateChange,
        targetParagraphIndices: opt.targetParagraphIndices,
        selectedVersion: opt.selectedVersion,
        processingTimeMs: opt.processingTimeMs,
        costCredits: opt.costCredits,
        createdAt: opt.createdAt.toISOString(),
      }));

      const responseData = {
        success: true,
        data: {
          detection: {
            id: detection.id,
            title: detection.title,
            overallScore: detection.overallScore,
            riskLevel: detection.riskLevel.toLowerCase(),
            status: detection.status,
            paragraphCount: detection.paragraphCount,
            highRiskCount: detection.highRiskCount,
            optimizationRounds: timeline.length,
            source: (detection.source ?? 'manual').toLowerCase(),
            processingTimeMs: detection.processingTimeMs,
            creditsConsumed: detection.creditsConsumed,
            createdAt: detection.createdAt.toISOString(),
            updatedAt: detection.updatedAt.toISOString(),
          },
          result: result || { summary: '', paragraphs: [], issueStatistics: {} },
          timeline,
        },
      };

      await redis.setex(cacheKey, 60 * 60, JSON.stringify(responseData));

      return reply.send(responseData);
    } catch (error) {
      fastify.log.error(error, '获取检测结果失败');
      return reply.status(500).send({
        success: false,
        error: {
          code: AIGCErrorCode.DETECTION_NOT_FOUND,
          message: '获取检测结果失败，请稍后重试',
        },
      });
    }
  });

  // ==================== 端点3: POST /api/v1/aigc/detect/:id/rewrite (SSE) ====================

  fastify.post('/:id/rewrite', {
    preHandler: [fastify.authenticate],
  }, async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const userId = (request as any).user?.userId;
      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: {
            code: AIGCErrorCode.NOT_AUTHORIZED,
            message: AIGC_ERROR_MESSAGES[AIGCErrorCode.NOT_AUTHORIZED],
          },
        });
      }

      const { id: detectionId } = request.params;
      const body = aigcSchemas.rewrite.parse(request.body);

      const detection = await prisma.aIGCDetection.findFirst({
        where: {
          id: detectionId,
          userId,
          deletedAt: null,
        },
      });

      if (!detection) {
        return reply.status(404).send({
          success: false,
          error: {
            code: AIGCErrorCode.DETECTION_NOT_FOUND,
            message:
              AIGC_ERROR_MESSAGES[AIGCErrorCode.DETECTION_NOT_FOUND],
          },
        });
      }

      if (detection.status !== 'Analyzed') {
        return reply.status(409).send({
          success: false,
          error: {
            code: AIGCErrorCode.STATUS_CONFLICT,
            message:
              AIGC_ERROR_MESSAGES[AIGCErrorCode.STATUS_CONFLICT],
          },
        });
      }

      const decryptedContent = decrypt(detection.encryptedContent!);
      const allParagraphs = splitByParagraph(decryptedContent);

      const invalidIndices = body.targetParagraphIndices.filter(
        idx => idx < 0 || idx >= allParagraphs.length
      );
      if (invalidIndices.length > 0) {
        return reply.status(400).send({
          success: false,
          error: {
            code: AIGCErrorCode.INVALID_INDEX,
            message: `段落索引超出范围: ${invalidIndices.join(', ')}`,
          },
        });
      }

      const currentRound =
        (await prisma.optimizationRecord.count({
          where: { detectionId },
        })) + 1;

      if (currentRound > 10) {
        return reply.status(403).send({
          success: false,
          error: {
            code: AIGCErrorCode.OPTIMIZATION_LIMIT_EXCEEDED,
            message:
              AIGC_ERROR_MESSAGES[
                AIGCErrorCode.OPTIMIZATION_LIMIT_EXCEEDED
              ],
          },
        });
      }

      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      });

      const stream = new PassThrough();
      stream.pipe(reply.raw);

      const sendSSE = (event: string, data: unknown) => {
        stream.write(`event: ${event}\n`);
        stream.write(`data: ${JSON.stringify(data)}\n\n`);
      };

      sendSSE('start', {
        status: 'processing',
        totalTargets: body.targetParagraphIndices.length,
        timestamp: new Date().toISOString(),
      });

      const allResults: Array<{
        paragraphIndex: number;
        versions: RewriteVersionOutput[];
      }> = [];

      const rewriteStartTime = Date.now();
      let totalOriginalScore = 0;
      let totalEstimatedScore = 0;

      const apiClient = new DeepSeekClient({
        apiKey: process.env.DEEPSEEK_API_KEY || '',
        baseUrl: process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com',
        model: 'deepseek-chat',
        maxTokens: 2000,
        temperature: 0.8,
        timeout: 45000,
        maxRetries: 3,
      });

      for (
        let i = 0;
        i < body.targetParagraphIndices.length;
        i++
      ) {
        const pIdx = body.targetParagraphIndices[i];
        const paragraphText = allParagraphs[pIdx];

        sendSSE('progress', {
          current: i + 1,
          total: body.targetParagraphIndices.length,
          paragraphIndex: pIdx,
          status: 'generating',
          timestamp: new Date().toISOString(),
        });

        const result = detection.result as any;
        const paraResult = result?.paragraphs?.find(
          (p: ParagraphResult) => p.index === pIdx
        );
        const currentScore = paraResult?.score ?? 50;
        totalOriginalScore += currentScore;

        const versions = await generateRewriteVersions(
          apiClient,
          paragraphText,
          paraResult?.issues ?? [],
          currentScore
        );

        allResults.push({ paragraphIndex: pIdx, versions });

        sendSSE('result', {
          paragraphIndex: pIdx,
          versions,
          timestamp: new Date().toISOString(),
        });

        const bestVersion = versions[0];
        if (bestVersion) {
          totalEstimatedScore += bestVersion.estimatedScore;
        }
      }

      const avgOriginalScore =
        allResults.length > 0
          ? totalOriginalScore / allResults.length
          : 0;
      const avgEstimatedScore =
        allResults.length > 0
          ? totalEstimatedScore / allResults.length
          : 0;
      const improvement = avgOriginalScore - avgEstimatedScore;
      const processingTime = Date.now() - rewriteStartTime;

      const rewriteCredits = Math.ceil(
        body.targetParagraphIndices.reduce(
          (sum, idx) => sum + allParagraphs[idx]?.length || 0,
          0
        ) * 0.5
      );

      sendSSE('complete', {
        rewriteId: `rewrite_${Date.now()}`,
        totalResults: allResults.length,
        summary: {
          avgOriginalScore: Math.round(avgOriginalScore),
          avgEstimatedScore: Math.round(avgEstimatedScore),
          avgImprovement: Math.round(improvement),
        },
        creditsConsumed: rewriteCredits,
        processingTimeMs: processingTime,
        timestamp: new Date().toISOString(),
      });

      await prisma.optimizationRecord.create({
        data: {
          detectionId,
          roundNumber: currentRound,
          operationType: 'Rewrite',
          beforeAigcRate: Math.round(avgOriginalScore * 100) / 100,
          beforeTextHash: generateContentHash(decryptedContent),
          targetParagraphIndices: body.targetParagraphIndices,
          afterAigcRate: Math.round(avgEstimatedScore * 100) / 100,
          rateChange: Math.round(improvement * 100) / 100,
          processingTimeMs: processingTime,
          costCredits: rewriteCredits,
          detail: {
            originalTexts: body.targetParagraphIndices.map(
              idx => allParagraphs[idx]
            ),
            rewrittenTexts: allResults.map(r =>
              r.versions[0]?.text || ''
            ),
          },
        },
      });

      await prisma.aIGCDetection.update({
        where: { id: detectionId },
        data: {
          optimizationRounds: currentRound,
          overallScore: Math.round(avgEstimatedScore),
          riskLevel: toPrismaRiskLevel(mapRiskLevel(Math.round(avgEstimatedScore))) as any,
          updatedAt: new Date(),
        },
      });

      await prisma.usageLog.create({
        data: {
          userId,
          action: 'aigc_rewrite',
          resource: detectionId,
          wordsUsed: body.targetParagraphIndices.reduce(
            (sum, idx) => sum + allParagraphs[idx]?.length || 0,
            0
          ),
          cost: rewriteCredits * 0.0001,
          metadata: {
            targetParagraphs: body.targetParagraphIndices.length,
            versionPreference: body.versionPreference,
            processingTime,
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

      fastify.log.error(error, '改写失败');
      if (!reply.sent) {
        return reply.status(500).send({
          success: false,
          error: {
            code: AIGCErrorCode.REWRITE_FAILED,
            message: AIGC_ERROR_MESSAGES[AIGCErrorCode.REWRITE_FAILED],
          },
        });
      }
    }
  });

  // ==================== 端点4: POST /api/v1/aigc/detect/:id/recheck ====================

  fastify.post('/:id/recheck', {
    preHandler: [fastify.authenticate],
  }, async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const userId = (request as any).user?.userId;
      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: {
            code: AIGCErrorCode.NOT_AUTHORIZED,
            message: AIGC_ERROR_MESSAGES[AIGCErrorCode.NOT_AUTHORIZED],
          },
        });
      }

      const { id: detectionId } = request.params;
      const body = aigcSchemas.recheck.parse(request.body);

      const detection = await prisma.aIGCDetection.findFirst({
        where: {
          id: detectionId,
          userId,
          deletedAt: null,
        },
      });

      if (!detection) {
        return reply.status(404).send({
          success: false,
          error: {
            code: AIGCErrorCode.DETECTION_NOT_FOUND,
            message:
              AIGC_ERROR_MESSAGES[AIGCErrorCode.DETECTION_NOT_FOUND],
          },
        });
      }

      const result = detection.result as any;
      const existingParagraphs: ParagraphResult[] =
        result?.paragraphs || [];

      const updatedIndices = new Set(
        body.updatedParagraphs.map(u => u.index)
      );
      const unchangedParagraphs = existingParagraphs.filter(
        p => !updatedIndices.has(p.index)
      );

      const recheckedParagraphs: ParagraphResult[] = [];
      const recheckStartTime = Date.now();

      for (const updated of body.updatedParagraphs) {
        const ruleResult = runRuleEngine(updated.newText);
        let llmScore =
          existingParagraphs[updated.index]?.score ?? 50;

        if (
          ruleResult.weightedScore > 25 ||
          Math.abs(
            updated.newText.length -
              (existingParagraphs[updated.index]?.fullText?.length ?? 0)
          ) > 50
        ) {
          try {
            const apiClient = new DeepSeekClient({
              apiKey: process.env.DEEPSEEK_API_KEY || '',
              baseUrl: process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com',
              model: 'deepseek-chat',
              maxTokens: 4000,
              temperature: 0.1,
              timeout: 30000,
              maxRetries: 3,
            });

            const llmResults = await callLLMDetect(apiClient, [
              { index: updated.index, text: updated.newText },
            ]);
            llmScore = llmResults[0]?.score ?? llmScore;
          } catch (error) {
            console.warn('[AIGC] 复测LLM调用失败，使用规则引擎得分');
          }
        }

        const finalScore = computeFinalScore(
          ruleResult.weightedScore,
          llmScore
        );

        recheckedParagraphs.push(
          buildParagraphResult(
            updated.index,
            updated.newText,
            finalScore,
            ruleResult
          )
        );
      }

      const allParagraphs = [...unchangedParagraphs, ...recheckedParagraphs].sort(
        (a, b) => a.index - b.index
      );

      const newOverallScore =
        allParagraphs.length > 0
          ? Math.round(
              allParagraphs.reduce((sum, p) => sum + p.score, 0) /
                allParagraphs.length
            )
          : 0;

      const previousScore = detection.overallScore;
      const scoreChange = Math.round(
        (newOverallScore - previousScore) * 10
      ) / 10;

      const processingTime = Date.now() - recheckStartTime;
      const recheckWords = body.updatedParagraphs.reduce(
        (sum, u) => sum + u.newText.length,
        0
      );
      const creditsConsumed = Math.ceil(recheckWords * 0.3);

      const currentRound =
        (await prisma.optimizationRecord.count({
          where: { detectionId },
        })) + 1;

      const optimizationRecord = await prisma.optimizationRecord.create({
        data: {
          detectionId,
          roundNumber: currentRound,
          operationType: 'Recheck',
          beforeAigcRate: Math.round(previousScore * 100) / 100,
          beforeTextHash: detection.contentHash,
          targetParagraphIndices: body.updatedParagraphs.map(
            u => u.index
          ),
          afterAigcRate: Math.round(newOverallScore * 100) / 100,
          rateChange: scoreChange,
          processingTimeMs: processingTime,
          costCredits: creditsConsumed,
        },
      });

      await prisma.aIGCDetection.update({
        where: { id: detectionId },
        data: {
          overallScore: newOverallScore,
          riskLevel: toPrismaRiskLevel(mapRiskLevel(newOverallScore)) as any,
          optimizationRounds: currentRound,
          status: 'Analyzed',
          result: {
            summary: generateSummary(allParagraphs, newOverallScore),
            paragraphs: allParagraphs,
            issueStatistics: {},
          } as any,
          updatedAt: new Date(),
        },
      });

      await prisma.usageLog.create({
        data: {
          userId,
          action: 'aigc_recheck',
          resource: detectionId,
          wordsUsed: recheckWords,
          cost: creditsConsumed * 0.0001,
          metadata: {
            updatedParagraphs: body.updatedParagraphs.length,
            previousScore,
            currentScore: newOverallScore,
            scoreChange,
          },
        },
      });

      return reply.send({
        success: true,
        data: {
          recheckId: optimizationRecord.id,
          previousScore: Math.round(previousScore * 100) / 100,
          currentScore: newOverallScore,
          scoreChange,
          updatedParagraphs: recheckedParagraphs,
          optimizationRecord: {
            roundNumber: optimizationRecord.roundNumber,
            operationType: 'Recheck' as const,
            beforeAigcRate: optimizationRecord.beforeAigcRate,
            afterAigcRate: optimizationRecord.afterAigcRate,
            rateChange: optimizationRecord.rateChange,
            targetParagraphIndices: optimizationRecord.targetParagraphIndices,
            processingTimeMs: optimizationRecord.processingTimeMs,
            costCredits: optimizationRecord.costCredits,
          },
          creditsConsumed,
        },
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

      fastify.log.error(error, '复测验证失败');
      return reply.status(500).send({
        success: false,
        error: {
          code: AIGCErrorCode.RECHECK_FAILED,
          message: AIGC_ERROR_MESSAGES[AIGCErrorCode.RECHECK_FAILED],
        },
      });
    }
  });

  // ==================== 端点5: GET /api/v1/aigc/history ====================

  fastify.get('/history', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request as any).user?.userId;
      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: {
            code: AIGCErrorCode.NOT_AUTHORIZED,
            message: AIGC_ERROR_MESSAGES[AIGCErrorCode.NOT_AUTHORIZED],
          },
        });
      }

      const query = aigcSchemas.historyQuery.parse(request.query);

      const whereClause: Record<string, unknown> = {
        userId,
        deletedAt: null,
      };

      if (query.status) {
        whereClause.status = query.status;
      }
      if (query.dateFrom) {
        whereClause.createdAt = { ...(whereClause.createdAt as object), gte: new Date(query.dateFrom) };
      }
      if (query.dateTo) {
        whereClause.createdAt = { ...(whereClause.createdAt as object), lte: new Date(query.dateTo) };
      }

      const orderBy: Record<string, 'asc' | 'desc'> = {};
      orderBy[query.sortBy] = query.sortOrder;

      const [items, total] = await Promise.all([
        prisma.aIGCDetection.findMany({
          where: whereClause,
          orderBy,
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
          select: {
            id: true,
            title: true,
            overallScore: true,
            riskLevel: true,
            status: true,
            paragraphCount: true,
            highRiskCount: true,
            optimizationRounds: true,
            source: true,
            processingTimeMs: true,
            creditsConsumed: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
        prisma.aIGCDetection.count({ where: whereClause }),
      ]);

      const formattedItems = items.map(item => ({
        ...item,
        riskLevel: item.riskLevel.toLowerCase(),
        source: (item.source ?? 'manual').toLowerCase(),
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      }));

      return reply.send({
        success: true,
        data: {
          items: formattedItems,
          total,
          page: query.page,
          pageSize: query.pageSize,
          totalPages: Math.ceil(total / query.pageSize),
        },
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

      fastify.log.error(error, '获取历史记录失败');
      return reply.status(500).send({
        success: false,
        error: {
          code: AIGCErrorCode.DETECTION_NOT_FOUND,
          message: '获取历史记录失败，请稍后重试',
        },
      });
    }
  });

  // ==================== 端点6: GET /api/v1/aigc/history/:id ====================

  fastify.get('/history/:id', {
    preHandler: [fastify.authenticate],
  }, async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const userId = (request as any).user?.userId;
      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: {
            code: AIGCErrorCode.NOT_AUTHORIZED,
            message: AIGC_ERROR_MESSAGES[AIGCErrorCode.NOT_AUTHORIZED],
          },
        });
      }

      const { id } = request.params;

      const detection = await prisma.aIGCDetection.findFirst({
        where: {
          id,
          userId,
          deletedAt: null,
        },
        include: {
          optimizations: {
            where: { deletedAt: null },
            orderBy: { roundNumber: 'asc' },
          },
        },
      });

      if (!detection) {
        return reply.status(404).send({
          success: false,
          error: {
            code: AIGCErrorCode.DETECTION_NOT_FOUND,
            message:
              AIGC_ERROR_MESSAGES[AIGCErrorCode.DETECTION_NOT_FOUND],
          },
        });
      }

      const result = detection.result as any;
      const timeline = detection.optimizations.map(opt => ({
        id: opt.id,
        roundNumber: opt.roundNumber,
        operationType: opt.operationType,
        beforeAigcRate: opt.beforeAigcRate,
        afterAigcRate: opt.afterAigcRate,
        rateChange: opt.rateChange,
        targetParagraphIndices: opt.targetParagraphIndices,
        selectedVersion: opt.selectedVersion,
        processingTimeMs: opt.processingTimeMs,
        costCredits: opt.costCredits,
        createdAt: opt.createdAt.toISOString(),
      }));

      return reply.send({
        success: true,
        data: {
          detection: {
            id: detection.id,
            title: detection.title,
            overallScore: detection.overallScore,
            riskLevel: detection.riskLevel.toLowerCase(),
            status: detection.status,
            paragraphCount: detection.paragraphCount,
            highRiskCount: detection.highRiskCount,
            optimizationRounds: timeline.length,
            source: (detection.source ?? 'manual').toLowerCase(),
            processingTimeMs: detection.processingTimeMs,
            creditsConsumed: detection.creditsConsumed,
            createdAt: detection.createdAt.toISOString(),
            updatedAt: detection.updatedAt.toISOString(),
          },
          result: result || { summary: '', paragraphs: [], issueStatistics: {} },
          timeline,
        },
      });
    } catch (error) {
      fastify.log.error(error, '获取历史详情失败');
      return reply.status(500).send({
        success: false,
        error: {
          code: AIGCErrorCode.DETECTION_NOT_FOUND,
          message: '获取历史详情失败，请稍后重试',
        },
      });
    }
  });

  // ==================== 端点7: DELETE /api/v1/aigc/history/:id ====================

  fastify.delete('/history/:id', {
    preHandler: [fastify.authenticate],
  }, async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const userId = (request as any).user?.userId;
      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: {
            code: AIGCErrorCode.NOT_AUTHORIZED,
            message: AIGC_ERROR_MESSAGES[AIGCErrorCode.NOT_AUTHORIZED],
          },
        });
      }

      const { id } = request.params;

      const detection = await prisma.aIGCDetection.findFirst({
        where: {
          id,
          userId,
          deletedAt: null,
        },
      });

      if (!detection) {
        return reply.status(404).send({
          success: false,
          error: {
            code: AIGCErrorCode.DETECTION_NOT_FOUND,
            message:
              AIGC_ERROR_MESSAGES[AIGCErrorCode.DETECTION_NOT_FOUND],
          },
        });
      }

      await prisma.$transaction(async (tx) => {
        await tx.optimizationRecord.updateMany({
          where: { detectionId: id },
          data: { deletedAt: new Date() },
        });

        await tx.aIGCDetection.update({
          where: { id },
          data: { deletedAt: new Date() },
        });
      });

      const cacheKeys = [`aigc:${detection.contentHash}`, `aigc_detail:${id}`];
      for (const key of cacheKeys) {
        try {
          await redis.del(key);
        } catch (e) {
          console.warn(`[AIGC] 清除缓存失败: ${key}`, e);
        }
      }

      return reply.send({
        success: true,
        data: { deleted: true, id },
        message: '删除成功',
      });
    } catch (error) {
      fastify.log.error(error, '删除记录失败');
      return reply.status(500).send({
        success: false,
        error: {
          code: AIGCErrorCode.DETECTION_NOT_FOUND,
          message: '删除记录失败，请稍后重试',
        },
      });
    }
  });

  // ==================== 端点8: GET /api/v1/aigc/:id/chart/risk-distribution ====================

  fastify.get('/:id/chart/risk-distribution', {
    preHandler: [fastify.authenticate],
  }, async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const userId = (request as any).user?.userId;
      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: {
            code: ChartErrorCode.NOT_AUTHORIZED,
            message: CHART_ERROR_MESSAGES[ChartErrorCode.NOT_AUTHORIZED],
          },
        });
      }

      const { id: aigcId } = request.params;
      chartSchemas.riskDistributionQuery.parse({ id: aigcId });

      const detection = await prisma.aIGCDetection.findFirst({
        where: { id: aigcId, userId, deletedAt: null },
      });

      if (!detection) {
        return reply.status(404).send({
          success: false,
          error: {
            code: ChartErrorCode.DETECTION_NOT_FOUND,
            message: CHART_ERROR_MESSAGES[ChartErrorCode.DETECTION_NOT_FOUND],
          },
        });
      }

      const data = await chartService.getAIGCRiskDistribution(aigcId);

      return reply.send({
        success: true,
        data,
        message: '获取风险分布数据成功',
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: {
            code: ChartErrorCode.INVALID_PARAMETERS,
            message: '参数校验失败',
            details: error.errors,
          },
        });
      }

      fastify.log.error(error, '获取风险分布数据失败');
      return reply.status(500).send({
        success: false,
        error: {
          code: ChartErrorCode.AGGREGATION_FAILED,
          message: '获取风险分布数据失败，请稍后重试',
        },
      });
    }
  });

  // ==================== 端点9: GET /api/v1/aigc/:id/chart/segments-timeline ====================

  fastify.get('/:id/chart/segments-timeline', {
    preHandler: [fastify.authenticate],
  }, async (
    request: FastifyRequest<{ Params: { id: string }; Querystring: { sortBy?: string; filterBy?: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const userId = (request as any).user?.userId;
      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: {
            code: ChartErrorCode.NOT_AUTHORIZED,
            message: CHART_ERROR_MESSAGES[ChartErrorCode.NOT_AUTHORIZED],
          },
        });
      }

      const { id: aigcId } = request.params;
      const query = chartSchemas.segmentsTimelineQuery.parse({
        id: aigcId,
        sortBy: request.query.sortBy,
        filterBy: request.query.filterBy,
      });

      const detection = await prisma.aIGCDetection.findFirst({
        where: { id: aigcId, userId, deletedAt: null },
      });

      if (!detection) {
        return reply.status(404).send({
          success: false,
          error: {
            code: ChartErrorCode.DETECTION_NOT_FOUND,
            message: CHART_ERROR_MESSAGES[ChartErrorCode.DETECTION_NOT_FOUND],
          },
        });
      }

      const data = await chartService.getAIGCSegmentsTimeline(
        aigcId,
        query.sortBy,
        query.filterBy
      );

      return reply.send({
        success: true,
        data,
        message: '获取段落时间线数据成功',
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: {
            code: ChartErrorCode.INVALID_PARAMETERS,
            message: '参数校验失败',
            details: error.errors,
          },
        });
      }

      fastify.log.error(error, '获取段落时间线数据失败');
      return reply.status(500).send({
        success: false,
        error: {
          code: ChartErrorCode.AGGREGATION_FAILED,
          message: '获取段落时间线数据失败，请稍后重试',
        },
      });
    }
  });

  // ==================== 端点10: GET /api/v1/aigc/:id/chart/risk-gauge ====================

  fastify.get('/:id/chart/risk-gauge', {
    preHandler: [fastify.authenticate],
  }, async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const userId = (request as any).user?.userId;
      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: {
            code: ChartErrorCode.NOT_AUTHORIZED,
            message: CHART_ERROR_MESSAGES[ChartErrorCode.NOT_AUTHORIZED],
          },
        });
      }

      const { id: aigcId } = request.params;
      chartSchemas.riskGaugeQuery.parse({ id: aigcId });

      const detection = await prisma.aIGCDetection.findFirst({
        where: { id: aigcId, userId, deletedAt: null },
      });

      if (!detection) {
        return reply.status(404).send({
          success: false,
          error: {
            code: ChartErrorCode.DETECTION_NOT_FOUND,
            message: CHART_ERROR_MESSAGES[ChartErrorCode.DETECTION_NOT_FOUND],
          },
        });
      }

      const data = await chartService.getAIGCRiskGauge(aigcId);

      return reply.send({
        success: true,
        data,
        message: '获取风险仪表盘数据成功',
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: {
            code: ChartErrorCode.INVALID_PARAMETERS,
            message: '参数校验失败',
            details: error.errors,
          },
        });
      }

      fastify.log.error(error, '获取风险仪表盘数据失败');
      return reply.status(500).send({
        success: false,
        error: {
          code: ChartErrorCode.AGGREGATION_FAILED,
          message: '获取风险仪表盘数据失败，请稍后重试',
        },
      });
    }
  });

  // ==================== 端点11: GET /api/v1/aigc/:id/chart/detail-table ====================

  fastify.get('/:id/chart/detail-table', {
    preHandler: [fastify.authenticate],
  }, async (
    request: FastifyRequest<{
      Params: { id: string };
      Querystring: { page?: string; pageSize?: string; sortBy?: string; filterBy?: string };
    }>,
    reply: FastifyReply
  ) => {
    try {
      const userId = (request as any).user?.userId;
      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: {
            code: ChartErrorCode.NOT_AUTHORIZED,
            message: CHART_ERROR_MESSAGES[ChartErrorCode.NOT_AUTHORIZED],
          },
        });
      }

      const { id: aigcId } = request.params;
      const query = chartSchemas.detailTableQuery.parse({
        id: aigcId,
        page: request.query.page,
        pageSize: request.query.pageSize,
        sortBy: request.query.sortBy,
        filterBy: request.query.filterBy,
      });

      const detection = await prisma.aIGCDetection.findFirst({
        where: { id: aigcId, userId, deletedAt: null },
      });

      if (!detection) {
        return reply.status(404).send({
          success: false,
          error: {
            code: ChartErrorCode.DETECTION_NOT_FOUND,
            message: CHART_ERROR_MESSAGES[ChartErrorCode.DETECTION_NOT_FOUND],
          },
        });
      }

      const data = await chartService.getAIGCDetailTable(
        aigcId,
        query.page,
        query.pageSize,
        query.sortBy,
        query.filterBy
      );

      return reply.send({
        success: true,
        data,
        meta: {
          currentPage: query.page,
          pageSize: query.pageSize,
          totalItems: data.totalItems,
        },
        message: '获取详细数据表成功',
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: {
            code: ChartErrorCode.INVALID_PARAMETERS,
            message: '参数校验失败',
            details: error.errors,
          },
        });
      }

      fastify.log.error(error, '获取详细数据表失败');
      return reply.status(500).send({
        success: false,
        error: {
          code: ChartErrorCode.AGGREGATION_FAILED,
          message: '获取详细数据表失败，请稍后重试',
        },
      });
    }
  });
}
