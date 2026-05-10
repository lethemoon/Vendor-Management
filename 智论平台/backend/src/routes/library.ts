/**
 * 知识库与引用管理 API路由主文件
 * 实现10个核心端点的完整业务逻辑
 * 基于技术规格文档 TECH_SPEC-知识库引用管理-MVP.md 第4节
 * 代码风格参考 aigc.ts (Fastify + Zod + Prisma + Redis)
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import {
  librarySchemas,
  LibraryErrorCode,
  LIBRARY_ERROR_MESSAGES,
} from '../types/library';
import { libraryService } from '../services/libraryService';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: any, reply: any) => Promise<void>;
  }
}

// ==================== 路由注册函数 ====================

export default async function libraryRoutes(fastify: FastifyInstance) {

  // ==================== 端点1: GET /api/v1/library/documents ====================

  fastify.get('/documents', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request as any).user?.userId;
      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: {
            code: LibraryErrorCode.NOT_AUTHORIZED,
            message: LIBRARY_ERROR_MESSAGES[LibraryErrorCode.NOT_AUTHORIZED],
          },
        });
      }

      const query = librarySchemas.listQuery.parse(request.query);

      const result = await libraryService.getDocuments(userId, query);

      return reply.send({
        success: true,
        data: result,
        message: '获取文献列表成功',
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: {
            code: LibraryErrorCode.VALIDATION_ERROR,
            message: '参数校验失败',
            details: error.errors,
          },
        });
      }

      fastify.log.error(error, '获取文献列表失败');
      return reply.status(500).send({
        success: false,
        error: {
          code: LibraryErrorCode.DOCUMENT_NOT_FOUND,
          message: '获取文献列表失败，请稍后重试',
        },
      });
    }
  });

  // ==================== 端点2: POST /api/v1/library/documents ====================

  fastify.post('/documents', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request as any).user?.userId;
      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: {
            code: LibraryErrorCode.NOT_AUTHORIZED,
            message: LIBRARY_ERROR_MESSAGES[LibraryErrorCode.NOT_AUTHORIZED],
          },
        });
      }

      const body = librarySchemas.createDocument.parse(request.body);

      const typeRequiredFields: Record<string, string[]> = {
        JOURNAL_ARTICLE: ['journal'],
        THESIS: ['university', 'degreeType'],
        BOOK: ['publisher'],
        CONFERENCE_PAPER: ['conferenceName'],
        WEBPAGE: ['websiteName', 'url', 'accessDate'],
        PATENT: ['patentNumber', 'inventors', 'filingDate', 'issuingAuthority'],
      };

      const requiredFields = typeRequiredFields[body.type] || [];
      for (const field of requiredFields) {
        if (!body[field as keyof typeof body]) {
          return reply.status(400).send({
            success: false,
            error: {
              code: LibraryErrorCode.VALIDATION_ERROR,
              message: `文献类型为 ${body.type} 时，${field} 字段必填`,
            },
          });
        }
      }

      const document = await libraryService.createDocument(userId, body);

      return reply.status(201).send({
        success: true,
        data: { document },
        message: '文献创建成功',
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: {
            code: LibraryErrorCode.VALIDATION_ERROR,
            message: '参数校验失败',
            details: error.errors,
          },
        });
      }

      if (
        error instanceof Error &&
        error.message === LIBRARY_ERROR_MESSAGES[LibraryErrorCode.DOCUMENT_ALREADY_EXISTS]
      ) {
        return reply.status(409).send({
          success: false,
          error: {
            code: LibraryErrorCode.DOCUMENT_ALREADY_EXISTS,
            message: error.message,
          },
        });
      }

      if (
        error instanceof Error &&
        error.message === LIBRARY_ERROR_MESSAGES[LibraryErrorCode.QUOTA_EXCEEDED]
      ) {
        return reply.status(403).send({
          success: false,
          error: {
            code: LibraryErrorCode.QUOTA_EXCEEDED,
            message: error.message,
          },
        });
      }

      fastify.log.error(error, '创建文献失败');
      return reply.status(500).send({
        success: false,
        error: {
          code: LibraryErrorCode.DOCUMENT_NOT_FOUND,
          message: '创建文献失败，请稍后重试',
        },
      });
    }
  });

  // ==================== 端点3: GET /api/v1/library/documents/:id ====================

  fastify.get('/documents/:id', {
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
            code: LibraryErrorCode.NOT_AUTHORIZED,
            message: LIBRARY_ERROR_MESSAGES[LibraryErrorCode.NOT_AUTHORIZED],
          },
        });
      }

      const { id: documentId } = request.params;

      const result = await libraryService.getDocumentById(userId, documentId);

      return reply.send({
        success: true,
        data: result,
        message: '获取文献详情成功',
      });
    } catch (error) {
      fastify.log.error(error, '获取文献详情失败');
      return reply.status(404).send({
        success: false,
        error: {
          code: LibraryErrorCode.DOCUMENT_NOT_FOUND,
          message:
            error instanceof Error
              ? error.message
              : LIBRARY_ERROR_MESSAGES[LibraryErrorCode.DOCUMENT_NOT_FOUND],
        },
      });
    }
  });

  // ==================== 端点4: PUT /api/v1/library/documents/:id ====================

  fastify.put('/documents/:id', {
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
            code: LibraryErrorCode.NOT_AUTHORIZED,
            message: LIBRARY_ERROR_MESSAGES[LibraryErrorCode.NOT_AUTHORIZED],
          },
        });
      }

      const { id: documentId } = request.params;
      const body = librarySchemas.updateDocument.parse(request.body);

      const updatedDocument = await libraryService.updateDocument(
        userId,
        documentId,
        body
      );

      return reply.send({
        success: true,
        data: { document: updatedDocument },
        message: '文献更新成功',
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: {
            code: LibraryErrorCode.VALIDATION_ERROR,
            message: '参数校验失败',
            details: error.errors,
          },
        });
      }

      if (
        error instanceof Error &&
        error.message === LIBRARY_ERROR_MESSAGES[LibraryErrorCode.DOCUMENT_NOT_FOUND]
      ) {
        return reply.status(404).send({
          success: false,
          error: {
            code: LibraryErrorCode.DOCUMENT_NOT_FOUND,
            message: error.message,
          },
        });
      }

      if (
        error instanceof Error &&
        error.message === LIBRARY_ERROR_MESSAGES[LibraryErrorCode.DOCUMENT_ALREADY_EXISTS]
      ) {
        return reply.status(409).send({
          success: false,
          error: {
            code: LibraryErrorCode.DOCUMENT_ALREADY_EXISTS,
            message: error.message,
          },
        });
      }

      fastify.log.error(error, '更新文献失败');
      return reply.status(500).send({
        success: false,
        error: {
          code: LibraryErrorCode.DOCUMENT_NOT_FOUND,
          message: '更新文献失败，请稍后重试',
        },
      });
    }
  });

  // ==================== 端点5: DELETE /api/v1/library/documents/:id ====================

  fastify.delete('/documents/:id', {
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
            code: LibraryErrorCode.NOT_AUTHORIZED,
            message: LIBRARY_ERROR_MESSAGES[LibraryErrorCode.NOT_AUTHORIZED],
          },
        });
      }

      const { id: documentId } = request.params;

      const result = await libraryService.deleteDocument(userId, documentId);

      return reply.send({
        success: true,
        data: result,
        message: '文献删除成功',
      });
    } catch (error) {
      fastify.log.error(error, '删除文献失败');
      return reply.status(404).send({
        success: false,
        error: {
          code: LibraryErrorCode.DOCUMENT_NOT_FOUND,
          message:
            error instanceof Error
              ? error.message
              : LIBRARY_ERROR_MESSAGES[LibraryErrorCode.DOCUMENT_NOT_FOUND],
        },
      });
    }
  });

  // ==================== 端点6: POST /api/v1/library/documents/batch-delete ====================

  fastify.post('/documents/batch-delete', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request as any).user?.userId;
      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: {
            code: LibraryErrorCode.NOT_AUTHORIZED,
            message: LIBRARY_ERROR_MESSAGES[LibraryErrorCode.NOT_AUTHORIZED],
          },
        });
      }

      const body = librarySchemas.batchDelete.parse(request.body);

      const result = await libraryService.batchDeleteDocuments(
        userId,
        body.documentIds
      );

      if (result.failed > 0) {
        return reply.status(207).send({
          success: true,
          data: result,
          message: `批量删除完成：成功 ${result.successful} 条，失败 ${result.failed} 条`,
        });
      }

      return reply.send({
        success: true,
        data: result,
        message: `批量删除成功，共删除 ${result.successful} 篇文献`,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: {
            code: LibraryErrorCode.VALIDATION_ERROR,
            message: '参数校验失败',
            details: error.errors,
          },
        });
      }

      fastify.log.error(error, '批量删除失败');
      return reply.status(500).send({
        success: false,
        error: {
          code: LibraryErrorCode.BATCH_OPERATION_FAILED,
          message: '批量操作部分失败，请稍后重试',
        },
      });
    }
  });

  // ==================== 端点7: POST /api/v1/library/doi/lookup ====================

  fastify.post('/doi/lookup', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request as any).user?.userId;
      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: {
            code: LibraryErrorCode.NOT_AUTHORIZED,
            message: LIBRARY_ERROR_MESSAGES[LibraryErrorCode.NOT_AUTHORIZED],
          },
        });
      }

      const body = librarySchemas.doiLookup.parse(request.body);

      console.info(`[Library] DOI查找请求`, {
        doi: body.doi,
        userId,
      });

      const metadata = await libraryService.lookupDOI(body.doi);

      return reply.send({
        success: true,
        data: {
          found: true,
          metadata,
        },
        message: 'DOI检索成功',
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: {
            code: LibraryErrorCode.INVALID_DOI_FORMAT,
            message: 'DOI格式不正确，正确格式示例：10.xxxx/xxxxx',
            details: error.errors,
          },
        });
      }

      if (
        error instanceof Error &&
        error.message === LIBRARY_ERROR_MESSAGES[LibraryErrorCode.DOI_NOT_FOUND]
      ) {
        return reply.status(404).send({
          success: true,
          data: {
            found: false,
            metadata: null,
          },
          message: '未找到匹配的文献，请检查DOI是否正确或手动输入',
        });
      }

      fastify.log.error(error, 'DOI检索失败');
      return reply.status(500).send({
        success: false,
        error: {
          code: LibraryErrorCode.DOI_NOT_FOUND,
          message: 'DOI检索服务暂时不可用，请稍后重试',
        },
      });
    }
  });

  // ==================== 端点8: POST /api/v1/library/citations/generate ====================

  fastify.post('/citations/generate', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request as any).user?.userId;
      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: {
            code: LibraryErrorCode.NOT_AUTHORIZED,
            message: LIBRARY_ERROR_MESSAGES[LibraryErrorCode.NOT_AUTHORIZED],
          },
        });
      }

      const body = librarySchemas.generateCitation.parse(request.body);

      const prisma = require('@prisma/client').PrismaClient;
      const client = new prisma();

      const documents = [];
      for (const docId of body.documentIds) {
        const doc = await client.document.findFirst({
          where: { id: docId, userId, deletedAt: null },
        });

        if (!doc) {
          continue;
        }

        documents.push({
          id: doc.id,
          type: doc.type,
          title: doc.title,
          authors: doc.authors,
          year: doc.year,
          journal: doc.journal,
          volume: doc.volume,
          issue: doc.issue,
          pages: doc.pages,
          doi: doc.doi,
          url: doc.url,
          publisher: doc.publisher,
          edition: doc.edition,
          location: doc.location,
          university: doc.university,
          degreeType: doc.degreeType,
          conferenceName: doc.conferenceName,
          conferenceLocation: doc.conferenceLocation,
          editors: doc.editors,
          websiteName: doc.websiteName,
          accessDate: doc.accessDate?.toISOString(),
          publishDate: doc.publishDate?.toISOString(),
          patentNumber: doc.patentNumber,
          inventors: doc.inventors,
          filingDate: doc.filingDate?.toISOString(),
          issuingAuthority: doc.issuingAuthority,
          isbn: doc.isbn,
        });
      }

      if (documents.length === 0) {
        return reply.status(404).send({
          success: false,
          error: {
            code: LibraryErrorCode.DOCUMENT_NOT_FOUND,
            message: '未找到任何有效文献，请检查文献ID是否正确',
          },
        });
      }

      const citations = libraryService.generateCitations(documents, body.format);

      return reply.send({
        success: true,
        data: { citations },
        message: `成功生成 ${citations.length} 条引用`,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: {
            code: LibraryErrorCode.VALIDATION_ERROR,
            message: '参数校验失败',
            details: error.errors,
          },
        });
      }

      fastify.log.error(error, '引用生成失败');
      return reply.status(500).send({
        success: false,
        error: {
          code: LibraryErrorCode.CITATION_GENERATION_FAILED,
          message: '引用生成失败，请稍后重试',
        },
      });
    }
  });

  // ==================== 端点9: POST /api/v1/library/export ====================

  fastify.post('/export', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request as any).user?.userId;
      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: {
            code: LibraryErrorCode.NOT_AUTHORIZED,
            message: LIBRARY_ERROR_MESSAGES[LibraryErrorCode.NOT_AUTHORIZED],
          },
        });
      }

      const body = librarySchemas.exportCitations.parse(request.body);

      const PrismaClient = require('@prisma/client').PrismaClient;
      const client = new PrismaClient();

      const documents = [];
      for (const docId of body.documentIds) {
        const doc = await client.document.findFirst({
          where: { id: docId, userId, deletedAt: null },
        });

        if (!doc) {
          continue;
        }

        documents.push({
          id: doc.id,
          type: doc.type,
          title: doc.title,
          authors: doc.authors,
          year: doc.year,
          journal: doc.journal,
          volume: doc.volume,
          issue: doc.issue,
          pages: doc.pages,
          doi: doc.doi,
          url: doc.url,
          publisher: doc.publisher,
          edition: doc.edition,
          location: doc.location,
          university: doc.university,
          degreeType: doc.degreeType,
          conferenceName: doc.conferenceName,
          conferenceLocation: doc.conferenceLocation,
          editors: doc.editors,
          websiteName: doc.websiteName,
          accessDate: doc.accessDate?.toISOString(),
          publishDate: doc.publishDate?.toISOString(),
          patentNumber: doc.patentNumber,
          inventors: doc.inventors,
          filingDate: doc.filingDate?.toISOString(),
          issuingAuthority: doc.issuingAuthority,
          isbn: doc.isbn,
        });
      }

      if (documents.length === 0) {
        return reply.status(404).send({
          success: false,
          error: {
            code: LibraryErrorCode.DOCUMENT_NOT_FOUND,
            message: '未找到任何有效文献',
          },
        });
      }

      const exportResult = await libraryService.exportCitations(
        documents,
        body.format,
        body.outputFormat
      );

      return reply.send({
        success: true,
        data: exportResult,
        message: `导出成功，共 ${exportResult.count} 条引用`,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: {
            code: LibraryErrorCode.VALIDATION_ERROR,
            message: '参数校验失败',
            details: error.errors,
          },
        });
      }

      fastify.log.error(error, '导出引用失败');
      return reply.status(500).send({
        success: false,
        error: {
          code: LibraryErrorCode.CITATION_GENERATION_FAILED,
          message: '导出引用失败，请稍后重试',
        },
      });
    }
  });
}
