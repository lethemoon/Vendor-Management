/**
 * 知识库与引用管理系统类型定义
 * 基于技术规格文档 TECH_SPEC-知识库引用管理-MVP.md 第1.3节
 */

import { z } from 'zod';

// ==================== 枚举类型 ====================

/** 文献类型 */
export type DocumentType =
  | 'JOURNAL_ARTICLE'
  | 'THESIS'
  | 'BOOK'
  | 'CONFERENCE_PAPER'
  | 'WEBPAGE'
  | 'PATENT';

/** 学位类型 */
export type DegreeType = 'BACHELOR' | 'MASTER' | 'DOCTOR';

/** 引用格式 */
export type CitationFormat = 'GBT7714' | 'APA7' | 'MLA9';

// ==================== 核心数据结构 ====================

/** 作者信息（标准化后） */
export interface AuthorInfo {
  lastName: string;
  firstName: string;
  middleName?: string;
  suffix?: string;
  isChinese: boolean;
  isCorporate: boolean;
}

/** 标准化后的元数据（引擎内部使用） */
export interface NormalizedMetadata {
  type: DocumentType;
  title: string;
  authors: AuthorInfo[];
  year?: number;
  date?: Date;
  containerTitle?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  doi?: string;
  url?: string;
  publisher?: string;
  edition?: string;
  location?: string;
  university?: string;
  degreeType?: DegreeType;
  conferenceName?: string;
  conferenceLocation?: string;
  editors?: string;
  websiteName?: string;
  accessDate?: Date;
  publishDate?: Date;
  patentNumber?: string;
  inventors?: string;
  filingDate?: Date;
  issuingAuthority?: string;
  isbn?: string;
  extras: Record<string, unknown>;
}

// ==================== 规则层接口 ====================

/** 作者格式规则 */
export interface AuthorRules {
  allAuthorsStyle: 'full' | 'lastName_first' | 'et_al_after_n';
  etAlThreshold: number;
  etAlString: string;
  authorSeparator: string;
  lastAuthorSeparator: string;
  firstNameFormat: 'initials' | 'full' | 'none';
  lastNameFirst: boolean;
  lastNameUppercase: boolean;
  corporateAuthorHandling: 'as_is' | 'italicize' | 'abbreviate';
}

/** 日期格式规则 */
export interface DateRules {
  yearOnly: boolean;
  yearPosition: 'after_authors' | 'after_title' | 'in_parentheses' | 'end';
  yearParentheses: boolean;
  dateFormat?: string;
}

/** 标题格式规则 */
export interface TitleRules {
  capitalization: 'sentence_case' | 'title_case' | 'as_is';
  italicize: boolean;
  quotationMarks: boolean;
  subtitleSeparator: string;
  articleLanguageHandling: 'translate' | 'original' | 'both';
}

/** 来源容器格式规则 */
export interface SourceRules {
  containerItalicize: boolean;
  volumeFormat: string;
  issueFormat: string;
  pagesFormat: string;
  includeDoi: boolean;
  doiUrlPrefix: string;
  includeUrl: boolean;
  accessDateFormat: string;
}

/** 结构规则 */
export interface StructureRules {
  fieldOrder: string[];
  fieldSeparators: Record<string, string>;
  endingPunctuation: string;
  maxAuthorsBeforeEtAl: number;
  typeIdentifier: Record<DocumentType, string>;
}

/** 完整格式规则配置 */
export interface FormatRules {
  formatId: CitationFormat;
  displayName: string;
  authorRules: AuthorRules;
  dateRules: DateRules;
  titleRules: TitleRules;
  sourceRules: SourceRules;
  structureRules: StructureRules;
  typeOverrides: Partial<Record<DocumentType, Partial<FormatRules>>>;
}

// ==================== API请求/响应类型 ====================

/** 创建文献请求 */
export interface CreateDocumentRequest {
  type: DocumentType;
  title: string;
  authors: string;
  year?: number;
  doi?: string;
  url?: string;
  abstract?: string;
  keywords?: string[];
  notes?: string;
  journal?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  university?: string;
  degreeType?: DegreeType;
  publisher?: string;
  edition?: string;
  isbn?: string;
  location?: string;
  conferenceName?: string;
  conferenceLocation?: string;
  editors?: string;
  websiteName?: string;
  accessDate?: string;
  publishDate?: string;
  patentNumber?: string;
  inventors?: string;
  filingDate?: string;
  issuingAuthority?: string;
}

/** 文献详情响应 */
export interface DocumentDetailResponse {
  id: string;
  type: DocumentType;
  title: string;
  authors: string;
  year?: number;
  doi?: string;
  url?: string;
  abstract?: string;
  keywords: string[];
  notes?: string;
  journal?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  university?: string;
  degreeType?: DegreeType;
  publisher?: string;
  edition?: string;
  isbn?: string;
  location?: string;
  conferenceName?: string;
  conferenceLocation?: string;
  editors?: string;
  websiteName?: string;
  accessDate?: string;
  publishDate?: string;
  patentNumber?: string;
  inventors?: string;
  filingDate?: string;
  issuingAuthority?: string;
  citationCount: number;
  createdAt: string;
  updatedAt: string;
  citations?: {
    gbt7714: string;
    apa7: string;
    mla9: string;
  };
  relatedPapers?: Array<{
    paperId: string;
    paperTitle: string;
    citationCount: number;
  }>;
}

/** 文献列表响应 */
export interface LibraryListResponse {
  items: DocumentListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** 文献列表项 */
export interface DocumentListItem {
  id: string;
  type: DocumentType;
  title: string;
  authors: string;
  year?: number;
  journal?: string;
  doi?: string;
  citationCount: number;
  createdAt: string;
  updatedAt: string;
}

/** DOI查找响应 */
export interface DOILookupResponse {
  found: boolean;
  metadata: DOIMetadata | null;
}

/** DOI元数据 */
export interface DOIMetadata {
  type: DocumentType;
  title: string;
  authors: string[];
  journal?: string;
  year?: number;
  volume?: string;
  issue?: string;
  pages?: string;
  doi: string;
  publisher?: string;
  university?: string;
  degreeType?: DegreeType;
  conferenceName?: string;
  conferenceLocation?: string;
  websiteName?: string;
  url?: string;
  publishDate?: string;
  patentNumber?: string;
  inventors?: string;
  filingDate?: string;
  issuingAuthority?: string;
  isbn?: string;
  abstract?: string;
}

/** 生成引用请求 */
export interface GenerateCitationRequest {
  documentIds: string[];
  format: CitationFormat;
}

/** 生成引用响应 */
export interface GenerateCitationResponse {
  citations: Array<{
    documentId: string;
    citation: string;
    format: CitationFormat;
  }>;
}

/** 导出请求 */
export interface ExportRequest {
  documentIds: string[];
  format: CitationFormat;
  outputFormat: 'text' | 'json';
}

/** 导出响应 */
export interface ExportResponse {
  content: string;
  format: CitationFormat;
  outputFormat: string;
  count: number;
}

/** 论文引用列表响应 */
export interface PaperCitationsResponse {
  paperId: string;
  citations: Array<{
    id: string;
    documentId: string;
    citationNumber: number;
    citationText: string;
    format: CitationFormat;
    position?: number;
    document?: DocumentListItem;
  }>;
  referenceList: Array<{
    citationNumber: number;
    text: string;
  }>;
}

/** 插入引用请求 */
export interface InsertCitationRequest {
  documentIds: string[];
  format?: CitationFormat;
  position?: number;
}

/** 插入引用响应 */
export interface InsertCitationResponse {
  inserted: Array<{
    id: string;
    documentId: string;
    citationNumber: number;
    citationText: string;
  }>;
  updatedReferenceList: Array<{
    citationNumber: number;
    text: string;
  }>;
}

// ==================== 错误码枚举 ====================

/** 知识库系统错误码 */
export enum LibraryErrorCode {
  DOCUMENT_NOT_FOUND = 'DOCUMENT_NOT_FOUND',
  DOCUMENT_NOT_OWNED = 'DOCUMENT_NOT_OWNED',
  DOCUMENT_ALREADY_EXISTS = 'DOCUMENT_ALREADY_EXISTS',
  INVALID_DOCUMENT_TYPE = 'INVALID_DOCUMENT_TYPE',
  INVALID_DOI_FORMAT = 'INVALID_DOI_FORMAT',
  DOI_NOT_FOUND = 'DOI_NOT_FOUND',
  CITATION_GENERATION_FAILED = 'CITATION_GENERATION_FAILED',
  UNSUPPORTED_CITATION_FORMAT = 'UNSUPPORTED_CITATION_FORMAT',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  BATCH_OPERATION_FAILED = 'BATCH_OPERATION_FAILED',
  PAPER_NOT_FOUND = 'PAPER_NOT_FOUND',
  PAPER_NOT_OWNED = 'PAPER_NOT_OWNED',
  CITATION_NOT_FOUND = 'CITATION_NOT_FOUND',
  DUPLICATE_CITATION = 'DUPLICATE_CITATION',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_AUTHORIZED = 'NOT_AUTHORIZED',
}

/** 错误消息映射表 */
export const LIBRARY_ERROR_MESSAGES: Record<LibraryErrorCode, string> = {
  [LibraryErrorCode.DOCUMENT_NOT_FOUND]: '文献不存在或无权访问',
  [LibraryErrorCode.DOCUMENT_NOT_OWNED]: '无权操作此文献',
  [LibraryErrorCode.DOCUMENT_ALREADY_EXISTS]: '该DOI对应的文献已存在',
  [LibraryErrorCode.INVALID_DOCUMENT_TYPE]: '无效的文献类型',
  [LibraryErrorCode.INVALID_DOI_FORMAT]: 'DOI格式不正确，正确格式示例：10.xxxx/xxxxx',
  [LibraryErrorCode.DOI_NOT_FOUND]: '未找到匹配的文献，请检查DOI是否正确或手动输入',
  [LibraryErrorCode.CITATION_GENERATION_FAILED]: '引用生成失败，请稍后重试',
  [LibraryErrorCode.UNSUPPORTED_CITATION_FORMAT]: '不支持的引用格式',
  [LibraryErrorCode.QUOTA_EXCEEDED]: '配额不足，请升级会员或明天再试',
  [LibraryErrorCode.BATCH_OPERATION_FAILED]: '批量操作部分失败',
  [LibraryErrorCode.PAPER_NOT_FOUND]: '论文不存在或无权访问',
  [LibraryErrorCode.PAPER_NOT_OWNED]: '无权操作此论文',
  [LibraryErrorCode.CITATION_NOT_FOUND]: '引用记录不存在',
  [LibraryErrorCode.DUPLICATE_CITATION]: '该文献已被此论文引用',
  [LibraryErrorCode.VALIDATION_ERROR]: '参数校验失败',
  [LibraryErrorCode.NOT_AUTHORIZED]: '未授权，请先登录',
};

// ==================== Zod Schema 定义 ====================

/** 文献类型枚举（用于Zod） */
const DocumentTypeEnum = z.enum([
  'JOURNAL_ARTICLE',
  'THESIS',
  'BOOK',
  'CONFERENCE_PAPER',
  'WEBPAGE',
  'PATENT',
]);

/** 学位类型枚举（用于Zod） */
const DegreeTypeEnum = z.enum(['BACHELOR', 'MASTER', 'DOCTOR']);

/** 引用格式枚举（用于Zod） */
const CitationFormatEnum = z.enum(['GBT7714', 'APA7', 'MLA9']);

/** DOI格式正则表达式 */
const DOI_REGEX = /^10\.\d{4,}\/[^\s]+$/;

/** 知识库 Schema 集合 */
export const librarySchemas = {
  listQuery: z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(50).default(20),
    search: z.string().max(200).optional(),
    sortBy: z
      .enum(['createdAt', 'updatedAt', 'title', 'authors', 'year', 'type'])
      .default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
    type: DocumentTypeEnum.optional(),
    hasDoi: z.enum(['true', 'false']).optional(),
    yearFrom: z.coerce.number().int().min(1900).max(2030).optional(),
    yearTo: z.coerce.number().int().min(1900).max(2030).optional(),
  }),

  createDocument: z.object({
    type: DocumentTypeEnum,
    title: z.string().min(1, '标题不能为空').max(500, '标题不能超过500字符'),
    authors: z.string().min(1, '作者不能为空').max(1000, '作者字段不能超过1000字符'),
    year: z.coerce.number().int().min(1900).max(2030).optional(),
    doi: z
      .string()
      .regex(DOI_REGEX, 'DOI格式不正确')
      .max(200)
      .optional(),
    url: z.string().url('URL格式不正确').optional(),
    abstract: z.string().max(10000).optional(),
    keywords: z.array(z.string().max(50)).max(20).default([]),
    notes: z.string().max(5000).optional(),
    journal: z.string().min(1).max(300).optional(),
    volume: z.string().max(50).optional(),
    issue: z.string().max(50).optional(),
    pages: z.string().max(50).optional(),
    university: z.string().min(1).max(300).optional(),
    degreeType: DegreeTypeEnum.optional(),
    publisher: z.string().min(1).max(300).optional(),
    edition: z.string().max(50).optional(),
    isbn: z.string().max(50).optional(),
    location: z.string().max(200).optional(),
    conferenceName: z.string().min(1).max(300).optional(),
    conferenceLocation: z.string().max(200).optional(),
    editors: z.string().max(500).optional(),
    websiteName: z.string().min(1).max(300).optional(),
    accessDate: z.string().datetime().optional(),
    publishDate: z.string().datetime().optional(),
    patentNumber: z.string().min(1).max(100).optional(),
    inventors: z.string().min(1).max(1000).optional(),
    filingDate: z.string().datetime().optional(),
    issuingAuthority: z.string().min(1).max(200).optional(),
  }),

  updateDocument: z.object({
    title: z.string().min(1).max(500).optional(),
    authors: z.string().min(1).max(1000).optional(),
    year: z.coerce.number().int().min(1900).max(2030).optional(),
    doi: z.string().regex(DOI_REGEX).max(200).optional(),
    url: z.string().url().optional(),
    abstract: z.string().max(10000).optional(),
    keywords: z.array(z.string().max(50)).max(20).optional(),
    notes: z.string().max(5000).optional(),
    journal: z.string().min(1).max(300).optional(),
    volume: z.string().max(50).optional(),
    issue: z.string().max(50).optional(),
    pages: z.string().max(50).optional(),
    university: z.string().min(1).max(300).optional(),
    degreeType: DegreeTypeEnum.optional(),
    publisher: z.string().min(1).max(300).optional(),
    edition: z.string().max(50).optional(),
    isbn: z.string().max(50).optional(),
    location: z.string().max(200).optional(),
    conferenceName: z.string().min(1).max(300).optional(),
    conferenceLocation: z.string().max(200).optional(),
    editors: z.string().max(500).optional(),
    websiteName: z.string().min(1).max(300).optional(),
    accessDate: z.string().datetime().optional(),
    publishDate: z.string().datetime().optional(),
    patentNumber: z.string().min(1).max(100).optional(),
    inventors: z.string().min(1).max(1000).optional(),
    filingDate: z.string().datetime().optional(),
    issuingAuthority: z.string().min(1).max(200).optional(),
  }),

  batchDelete: z.object({
    documentIds: z
      .array(z.string().uuid())
      .min(1, '至少选择1篇文献')
      .max(100, '每次最多删除100篇文献'),
  }),

  doiLookup: z.object({
    doi: z
      .string()
      .min(1, 'DOI不能为空')
      .regex(DOI_REGEX, 'DOI格式不正确，正确格式示例：10.xxxx/xxxxx'),
  }),

  generateCitation: z.object({
    documentIds: z
      .array(z.string().uuid())
      .min(1, '至少选择1篇文献')
      .max(50, '每次最多生成50条引用'),
    format: CitationFormatEnum,
  }),

  exportCitations: z.object({
    documentIds: z
      .array(z.string().uuid())
      .min(1, '至少选择1篇文献')
      .max(100, '每次最多导出100条引用'),
    format: CitationFormatEnum.default('GBT7714'),
    outputFormat: z.enum(['text', 'json']).default('text'),
  }),

  insertCitation: z.object({
    documentIds: z
      .array(z.string().uuid())
      .min(1, '至少选择1篇文献')
      .max(10, '每次最多插入10个引用'),
    format: CitationFormatEnum.default('GBT7714'),
    position: z.number().int().min(0).optional(),
  }),
};
