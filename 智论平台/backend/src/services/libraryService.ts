/**
 * 知识库业务逻辑服务层
 * 基于技术规格文档 TECH_SPEC-知识库引用管理-MVP.md 第1.2节
 *
 * 职责:
 * - 文献CRUD操作封装
 * - 搜索/排序/筛选逻辑
 * - 批量操作事务处理
 * - 引用生成缓存管理
 * - 配额检查
 */

import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { CitationFormat, LibraryErrorCode, LIBRARY_ERROR_MESSAGES } from '../types/library';
import { citationEngine } from './citationEngine';

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

const MAX_DOCUMENTS_PER_USER = 10000;
const CITATION_CACHE_TTL = 60 * 60;

interface ListOptions {
  page: number;
  pageSize: number;
  search?: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  type?: string;
  hasDoi?: string;
  yearFrom?: number;
  yearTo?: number;
}

export class LibraryService {
  async getDocuments(userId: string, options: ListOptions) {
    const whereClause: Record<string, unknown> = {
      userId,
      deletedAt: null,
    };

    if (options.type) {
      whereClause.type = options.type;
    }

    if (options.hasDoi === 'true') {
      whereClause.doi = { not: null };
    } else if (options.hasDoi === 'false') {
      whereClause.doi = null;
    }

    if (options.yearFrom || options.yearTo) {
      const yearFilter: Record<string, unknown> = {};
      if (options.yearFrom) {
        yearFilter.gte = options.yearFrom;
      }
      if (options.yearTo) {
        yearFilter.lte = options.yearTo;
      }
      whereClause.year = yearFilter;
    }

    if (options.search) {
      const searchTerm = `%${options.search}%`;
      whereClause.OR = [
        { title: { contains: searchTerm, mode: 'insensitive' as const } },
        { authors: { contains: searchTerm, mode: 'insensitive' as const } },
        { doi: { contains: searchTerm, mode: 'insensitive' as const } },
        { keywords: { hasSome: [options.search] } as unknown as undefined },
      ];
    }

    const orderBy: Record<string, 'asc' | 'desc'> = {};
    orderBy[options.sortBy] = options.sortOrder;

    const [items, total] = await Promise.all([
      prisma.document.findMany({
        where: whereClause,
        orderBy,
        skip: (options.page - 1) * options.pageSize,
        take: options.pageSize,
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
      }),
      prisma.document.count({ where: whereClause }),
    ]);

    return {
      items: items.map(item => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      })),
      total,
      page: options.page,
      pageSize: options.pageSize,
      totalPages: Math.ceil(total / options.pageSize),
    };
  }

  async getDocumentById(userId: string, documentId: string) {
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        userId,
        deletedAt: null,
      },
    });

    if (!document) {
      throw new Error(LIBRARY_ERROR_MESSAGES[LibraryErrorCode.DOCUMENT_NOT_FOUND]);
    }

    const gbt7714Citation = await this.generateCitationFromDocument(document, 'GBT7714');
    const apa7Citation = await this.generateCitationFromDocument(document, 'APA7');
    const mla9Citation = await this.generateCitationFromDocument(document, 'MLA9');

    const relatedPapers = await prisma.paperCitation.findMany({
      where: { documentId },
      include: {
        paper: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
      },
    });

    return {
      ...this.formatDocument(document),
      citations: {
        gbt7714: gbt7714Citation,
        apa7: apa7Citation,
        mla9: mla9Citation,
      },
      relatedPapers: relatedPapers.map((rc: any) => ({
        paperId: rc.paper.id,
        paperTitle: rc.paper.title,
        citationCount: rc.citationNumber,
      })),
    };
  }

  async createDocument(userId: string, data: Record<string, unknown>) {
    await this.checkQuota(userId);

    if (data.doi) {
      const existingDoc = await prisma.document.findFirst({
        where: {
          doi: data.doi as string,
          deletedAt: null,
        },
      });

      if (existingDoc) {
        throw new Error(LIBRARY_ERROR_MESSAGES[LibraryErrorCode.DOCUMENT_ALREADY_EXISTS]);
      }
    }

    const document = await prisma.document.create({
      data: {
        userId,
        type: data.type as any,
        title: data.title as string,
        authors: data.authors as string,
        year: data.year as number | undefined,
        doi: data.doi as string | undefined,
        url: data.url as string | undefined,
        abstract: data.abstract as string | undefined,
        keywords: (data.keywords as string[]) || [],
        notes: data.notes as string | undefined,
        journal: data.journal as string | undefined,
        volume: data.volume as string | undefined,
        issue: data.issue as string | undefined,
        pages: data.pages as string | undefined,
        university: data.university as string | undefined,
        degreeType: data.degreeType as any,
        publisher: data.publisher as string | undefined,
        edition: data.edition as string | undefined,
        isbn: data.isbn as string | undefined,
        location: data.location as string | undefined,
        conferenceName: data.conferenceName as string | undefined,
        conferenceLocation: data.conferenceLocation as string | undefined,
        editors: data.editors as string | undefined,
        websiteName: data.websiteName as string | undefined,
        accessDate: data.accessDate ? new Date(data.accessDate as string) : undefined,
        publishDate: data.publishDate ? new Date(data.publishDate as string) : undefined,
        patentNumber: data.patentNumber as string | undefined,
        inventors: data.inventors as string | undefined,
        filingDate: data.filingDate ? new Date(data.filingDate as string) : undefined,
        issuingAuthority: data.issuingAuthority as string | undefined,
      },
    });

    return this.formatDocument(document);
  }

  async updateDocument(
    userId: string,
    documentId: string,
    data: Record<string, unknown>
  ) {
    const existingDoc = await prisma.document.findFirst({
      where: {
        id: documentId,
        userId,
        deletedAt: null,
      },
    });

    if (!existingDoc) {
      throw new Error(LIBRARY_ERROR_MESSAGES[LibraryErrorCode.DOCUMENT_NOT_FOUND]);
    }

    if (data.doi && data.doi !== existingDoc.doi) {
      const conflictDoc = await prisma.document.findFirst({
        where: {
          doi: data.doi as string,
          deletedAt: null,
          id: { not: documentId },
        },
      });

      if (conflictDoc) {
        throw new Error(LIBRARY_ERROR_MESSAGES[LibraryErrorCode.DOCUMENT_ALREADY_EXISTS]);
      }
    }

    const updateData: Record<string, unknown> = {};

    const updatableFields = [
      'title', 'authors', 'year', 'doi', 'url', 'abstract',
      'keywords', 'notes', 'journal', 'volume', 'issue', 'pages',
      'university', 'degreeType', 'publisher', 'edition', 'isbn',
      'location', 'conferenceName', 'conferenceLocation', 'editors',
      'websiteName', 'accessDate', 'publishDate', 'patentNumber',
      'inventors', 'filingDate', 'issuingAuthority',
    ];

    for (const field of updatableFields) {
      if (data[field] !== undefined) {
        if (
          field === 'accessDate' ||
          field === 'publishDate' ||
          field === 'filingDate'
        ) {
          updateData[field] = new Date(data[field] as string);
        } else {
          updateData[field] = data[field];
        }
      }
    }

    const updatedDocument = await prisma.document.update({
      where: { id: documentId },
      data: updateData,
    });

    return this.formatDocument(updatedDocument);
  }

  async deleteDocument(userId: string, documentId: string) {
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        userId,
        deletedAt: null,
      },
    });

    if (!document) {
      throw new Error(LIBRARY_ERROR_MESSAGES[LibraryErrorCode.DOCUMENT_NOT_FOUND]);
    }

    const citationCount = await prisma.paperCitation.count({
      where: { documentId },
    });

    if (citationCount > 0) {
      console.warn(
        `[Library] 删除文献 ${documentId} 时发现 ${citationCount} 条关联引用`
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.paperCitation.updateMany({
        where: { documentId },
        data: { deletedAt: new Date() },
      });

      await tx.document.update({
        where: { id: documentId },
        data: { deletedAt: new Date() },
      });
    });

    try {
      const cacheKeys = [
        `citation:${documentId}:*`,
        `library_detail:${documentId}`,
      ];
      for (const key of cacheKeys) {
        await redis.del(key);
      }
    } catch (e) {
      console.warn('[Library] 清除缓存失败', e);
    }

    return { deleted: true, id: documentId };
  }

  async batchDeleteDocuments(
    userId: string,
    documentIds: string[]
  ) {
    const results: Array<{
      id: string;
      success: boolean;
      error?: string;
    }> = [];

    await prisma.$transaction(async (tx) => {
      for (const docId of documentIds) {
        try {
          const doc = await tx.document.findFirst({
            where: { id: docId, userId, deletedAt: null },
          });

          if (!doc) {
            results.push({
              id: docId,
              success: false,
              error: LIBRARY_ERROR_MESSAGES[LibraryErrorCode.DOCUMENT_NOT_FOUND],
            });
            continue;
          }

          await tx.paperCitation.updateMany({
            where: { documentId: docId },
            data: { deletedAt: new Date() },
          });

          await tx.document.update({
            where: { id: docId },
            data: { deletedAt: new Date() },
          });

          results.push({ id: docId, success: true });
        } catch (error) {
          results.push({
            id: docId,
            success: false,
            error: error instanceof Error ? error.message : '删除失败',
          });
        }
      }
    });

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success);

    return {
      total: results.length,
      successful,
      failed: failed.length,
      details: results,
    };
  }

  async lookupDOI(doi: string) {
    const { doiMockService } = require('./doiMockService');
    const metadata = await doiMockService.lookup(doi);

    if (!metadata) {
      throw new Error(LIBRARY_ERROR_MESSAGES[LibraryErrorCode.DOI_NOT_FOUND]);
    }

    return metadata;
  }

  generateCitations(
    documents: Record<string, unknown>[],
    format: CitationFormat
  ) {
    return documents.map(doc => ({
      documentId: doc.id as string,
      citation: citationEngine.generate(doc, format),
      format,
    }));
  }

  async exportCitations(
    documents: Record<string, unknown>[],
    format: CitationFormat,
    outputFormat: 'text' | 'json'
  ) {
    const citations = this.generateCitations(documents, format);

    if (outputFormat === 'json') {
      return {
        content: JSON.stringify(citations, null, 2),
        format,
        outputFormat: 'json',
        count: citations.length,
      };
    }

    const textContent = citations
      .map(c => `[${citations.indexOf(c) + 1}] ${c.citation}`)
      .join('\n\n');

    return {
      content: textContent,
      format,
      outputFormat: 'text',
      count: citations.length,
    };
  }

  async checkQuota(userId: string) {
    const count = await prisma.document.count({
      where: { userId, deletedAt: null },
    });

    if (count >= MAX_DOCUMENTS_PER_USER) {
      throw new Error(LIBRARY_ERROR_MESSAGES[LibraryErrorCode.QUOTA_EXCEEDED]);
    }
  }

  private async generateCitationFromDocument(
    document: any,
    format: CitationFormat
  ): Promise<string> {
    const cacheKey = `citation:${document.id}:${format}`;

    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return cached;
      }
    } catch (e) {
      console.warn('[Library] Redis读取失败，使用实时生成');
    }

    const docForEngine = {
      id: document.id,
      type: document.type,
      title: document.title,
      authors: document.authors,
      year: document.year,
      journal: document.journal,
      volume: document.volume,
      issue: document.issue,
      pages: document.pages,
      doi: document.doi,
      url: document.url,
      publisher: document.publisher,
      edition: document.edition,
      location: document.location,
      university: document.university,
      degreeType: document.degreeType,
      conferenceName: document.conferenceName,
      conferenceLocation: document.conferenceLocation,
      editors: document.editors,
      websiteName: document.websiteName,
      accessDate: document.accessDate?.toISOString(),
      publishDate: document.publishDate?.toISOString(),
      patentNumber: document.patentNumber,
      inventors: document.inventors,
      filingDate: document.filingDate?.toISOString(),
      issuingAuthority: document.issuingAuthority,
      isbn: document.isbn,
    };

    const citation = citationEngine.generate(docForEngine, format);

    try {
      await redis.setex(cacheKey, CITATION_CACHE_TTL, citation);
    } catch (e) {
      console.warn('[Library] Redis写入失败', e);
    }

    return citation;
  }

  private formatDocument(document: any) {
    return {
      id: document.id,
      type: document.type,
      title: document.title,
      authors: document.authors,
      year: document.year,
      doi: document.doi,
      url: document.url,
      abstract: document.abstract,
      keywords: document.keywords || [],
      notes: document.notes,
      journal: document.journal,
      volume: document.volume,
      issue: document.issue,
      pages: document.pages,
      university: document.university,
      degreeType: document.degreeType,
      publisher: document.publisher,
      edition: document.edition,
      isbn: document.isbn,
      location: document.location,
      conferenceName: document.conferenceName,
      conferenceLocation: document.conferenceLocation,
      editors: document.editors,
      websiteName: document.websiteName,
      accessDate: document.accessDate?.toISOString(),
      publishDate: document.publishDate?.toISOString(),
      patentNumber: document.patentNumber,
      inventors: document.inventors,
      filingDate: document.filingDate?.toISOString(),
      issuingAuthority: document.issuingAuthority,
      citationCount: document.citationCount || 0,
      createdAt: document.createdAt.toISOString(),
      updatedAt: document.updatedAt.toISOString(),
    };
  }
}

export const libraryService = new LibraryService();
