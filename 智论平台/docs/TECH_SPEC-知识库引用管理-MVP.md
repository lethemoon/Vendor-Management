# 知识库与引用管理 MVP版本 技术规格

> 版本：1.0.0
> 日期：2026-05-10
> 负责人：ArchitectAgent
> 状态：待批准
> 基于PRD：`/workspace/智论平台/docs/PRD-知识库引用管理-MVP.md` (1768行)
> 参考实现：`papers.ts` (972行) + `aigc.ts` (~800行)

---

## 1. 系统架构设计

### 1.1 整体模块架构图

```
┌─────────────────────────────────────────────────────────────────────┐
│                     前端层 (Next.js 14+)                             │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐                │
│  │ /library      │ │ /library/new │ │ /library/:id │                │
│  │  文献列表页   │ │  添加文献页   │ │  文献详情页   │                │
│  ├──────────────┤ ├──────────────┤ ├──────────────┤                │
│  │ /library/:id/ │ │ DOI导入Modal │ │ 引用选择器    │                │
│  │  edit 编辑页  │ │ (弹窗组件)   │ │ (编辑器集成)  │                │
│  └──────────────┘ └──────────────┘ └──────────────┘                │
│  复用组件: DataTable / SearchBar / Pagination / Dialog / Toast       │
└────────────────────────────┬────────────────────────────────────────┘
                             │ HTTP/HTTPS (JSON)
┌────────────────────────────▼────────────────────────────────────────┐
│                    API路由层 (Fastify + Zod)                         │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  /api/v1/library/*  ← 新建 library.ts 路由文件               │   │
│  │  /api/v1/papers/:paperId/citations/*  ← 编辑器集成路由        │   │
│  │  参考: backend/src/routes/papers.ts 的代码风格和错误处理模式   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  共享中间件(从papers.ts复用):                                        │
│  ├─ fastify.authenticate (JWT认证)                                  │
│  ├─ Zod schema验证                                                  │
│  └─ 统一错误响应格式                                                 │
└────────────────────────────┬────────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────────┐
│                       服务层 (Services)                              │
│  ┌─────────────────────┐ ┌─────────────────────┐                   │
│  │  LibraryService     │ │  CitationEngine     │  ← 新建服务       │
│  │  (新建 ~500行)       │ │  (新建 ~800行)        │                   │
│  │  - 文献CRUD操作      │ │  - 数据标准化层       │                   │
│  │  - 搜索排序筛选      │ │  - 规则配置层         │                   │
│  │  - 批量操作          │ │  - 渲染器层(3种格式)   │                   │
│  └─────────────────────┘ └─────────────────────┘                   │
│  ┌─────────────────────┐                                           │
│  │  DOIMockService     │  ← 新建服务                                │
│  │  (新建 ~300行)       │                                           │
│  │  - 模拟数据存储      │                                           │
│  │  - DOI匹配算法       │                                           │
│  └─────────────────────┘                                           │
│                                                                     │
│  复用服务(从已有代码复用):                                            │
│  ├─ encrypt/decrypt AES加密 (papers.ts L59-L73)                     │
│  ├─ Redis缓存读写模式                                                │
│  └─ UsageTracker 配额系统                                            │
└────────────────────────────┬────────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────────┐
│                  数据层 + 缓存层                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────────────────────┐   │
│  │PostgreSQL│ │  Redis   │ │  引用生成缓存(Map, TTL=1h)       │   │
│  │Prisma ORM│ │缓存/限流 │ │  DOIMockService内存数据库         │   │
│  └──────────┘ └──────────┘ └──────────────────────────────────┘   │
│                                                                     │
│  扩展模型:                                                           │
│  ├─ Document (扩展6种类型+20+字段)                                   │
│  ├─ PaperCitation (新增中间表)                                       │
│  └─ 3个新枚举: DocumentType, DegreeType, CitationFormat              │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 模块职责划分

| 模块 | 文件路径 | 行数估算 | 职责 | 新建/复用 |
|-----|---------|---------|------|---------|
| **Library路由** | `backend/src/routes/library.ts` | ~700行 | 10个API端点的请求处理、参数验证、错误转换 | **新建** |
| **论文引用路由** | `backend/src/routes/papers.ts` (扩展) | ~200行 | 3个编辑器集成端点（在现有文件中扩展） | **扩展** |
| **Library服务** | `backend/src/services/libraryService.ts` | ~400行 | 文献CRUD、搜索、批量操作业务逻辑 | **新建** |
| **引用引擎** | `backend/src/services/citationEngine.ts` | ~800行 | 三层架构：数据层+规则层+渲染层 | **新建** |
| **DOI模拟服务** | `backend/src/services/doiMockService.ts` | ~300行 | 50条模拟数据、三级匹配算法 | **新建** |
| **类型定义** | `backend/src/types/library.ts` | ~250行 | 所有知识库相关TypeScript接口、枚举、Zod Schema | **新建** |
| **前端页面** | `frontend/app/library/*/page.tsx` | ~1200行 | 4个页面（列表/添加/详情/编辑）UI组件 | **新建** |
| **前端组件** | `frontend/components/library/*.tsx` | ~1000行 | 8-10个专用组件（表单/预览/选择器等） | **新建** |

### 1.3 引用格式引擎三层架构详细设计

#### 1.3.1 架构总览

```
┌─────────────────────────────────────────────────────────────────────┐
│                     渲染层 (Render Layer)                            │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐       │
│  │ GBT7714Renderer │ │  APA7Renderer   │ │  MLA9Renderer   │       │
│  │  GB/T 7714-2015 │ │  APA 7th Edition│ │  MLA 9th Edition│       │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘       │
│  职责: 根据规则配置将标准化数据渲染为最终引用字符串                      │
├─────────────────────────────────────────────────────────────────────┤
│                     规则层 (Rule Layer)                              │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │               FormatRuleEngine                               │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌──────┐ │   │
│  │  │ Author  │ │  Date   │ │ Title   │ │ Source  │ │Struct│ │   │
│  │  │ Rules   │ │ Rules   │ │ Rules   │ │ Rules   │ │Rules │ │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └──────┘ │   │
│  └─────────────────────────────────────────────────────────────┘   │
│  职责: 定义每种格式的可配置规则，支持类型级覆盖                        │
├─────────────────────────────────────────────────────────────────────┤
│                     数据层 (Data Layer)                              │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │              NormalizedMetadata                              │   │
│  │  { type, title, authors[], year, containerTitle, ... }       │   │
│  │              + AuthorParser                                  │   │
│  │  { parseChineseName(), parseWesternName(), parseMixed() }    │   │
│  └─────────────────────────────────────────────────────────────┘   │
│  职责: 接收原始Document对象，标准化为统一中间数据结构                  │
└─────────────────────────────────────────────────────────────────────┘
```

#### 1.3.2 接口定义

```typescript
// ========== 数据层接口 ==========

/** 文献类型枚举 */
export type DocumentType =
  | 'JOURNAL_ARTICLE'
  | 'THESIS'
  | 'BOOK'
  | 'CONFERENCE_PAPER'
  | 'WEBPAGE'
  | 'PATENT';

/** 学位类型枚举 */
export type DegreeType = 'BACHELOR' | 'MASTER' | 'DOCTOR';

/** 引用格式枚举 */
export type CitationFormat = 'GBT7714' | 'APA7' | 'MLA9';

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

// ========== 规则层接口 ==========

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

// ========== 渲染层接口 ==========

abstract class CitationRenderer {
  abstract render(metadata: NormalizedMetadata, rules: FormatRules): string;

  protected formatAuthors(authors: AuthorInfo[], rules: FormatRules): string;
  protected formatDate(metadata: NormalizedMetadata, rules: FormatRules): string;
  protected formatTitle(title: string, rules: FormatRules): string;
  protected formatSource(metadata: NormalizedMetadata, rules: FormatRules): string;
  protected getTypeIdentifier(type: DocumentType, rules: FormatRules): string;
  protected assemble(parts: string[], rules: FormatRules): string;
}

class GBT7714Renderer extends CitationRenderer { /* ... */ }
class APA7Renderer extends CitationRenderer { /* ... */ }
class MLA9Renderer extends CitationRenderer { /* ... */ }

/** 引用引擎主类 */
class CitationEngine {
  private renderers: Map<CitationRenderer>;
  private ruleRegistry: Map<CitationFormat, FormatRules>;

  generate(document: unknown, formatId: CitationFormat): string;
  generateBatch(documents: unknown[], formatId: CitationFormat): string[];
}
```

### 1.4 与现有模块的集成点

#### 1.4.1 直接复用的代码（零修改）

| 复用项 | 来源文件 | 行号 | 用途说明 |
|-------|---------|------|---------|
| `encrypt()` / `decrypt()` | [papers.ts#L59-L73](file:///workspace/智论平台/backend/src/routes/papers.ts#L59-L73) | 15行 | AES-256-CBC加解密敏感字段（如专利信息） |
| `PaperErrorCode` 枚举模式 | [papers.ts#L14-L23](file:///workspace/智论平台/backend/src/routes/papers.ts#L14-L23) | 10行 | 错误码定义风格参考 |
| 统一错误响应格式 | [papers.ts#L270-L276](file:///workspace/智论平台/backend/src/routes/papers.ts#L270-L276) | 7行 | `{success, error: {code, message}}` 格式 |
| Zod schema验证模式 | [papers.ts#L279-L285](file:///workspace/智论平台/backend/src/routes/papers.ts#L279-L285) | 7行 | z.object().parse() + 错误转换 |
| Prisma查询权限模式 | [papers.ts#L422-L437](file:///workspace/智论平台/backend/src/routes/papers.ts#L422-L437) | 16行 | `findFirst({where:{id, userId}})` 所有权校验 |
| Redis缓存读写模式 | [papers.ts#L409-L419](file:///workspace/智论平台/backend/src/routes/papers.ts#L409-L419) | 11行 | get/setex + JSON.parse/stringify |
| JWT认证中间件 | `fastify.authenticate` | 全局 | 所有API端点认证 |
| shadcn/ui组件库 | `frontend/components/ui/*` | 全部 | Button/Card/Input/Dialog等 |
| TailwindCSS配色 | `tailwind.config.ts` | 全局 | 统一设计语言 |

#### 1.4.2 扩展现有的代码

| 扩展项 | 来源文件 | 扩展方式 | 说明 |
|-------|---------|---------|------|
| `Paper` 表关联 | `schema.prisma` Paper模型 | 新增 `paperCitations` 关系字段 | 支持论文-文献引用关系查询 |
| `papers.ts` 路由 | `backend/src/routes/papers.ts` | 新增3个子路由 `/papers/:id/citations` | 编辑器集成API |
| `api.ts` 前端封装 | `frontend/lib/api.ts` | 新增 `libraryApi` 对象 | 知识库前端API调用 |
| `UsageTracker` | `aiRewriteService.ts` | 新增操作类型 `'citation_generate'`, `'doi_lookup'` | 配额统计扩展 |

---

## 2. 数据库Schema设计

### 2.1 Document模型扩展（基于现有Schema的Diff）

```prisma
// ========== 变更概要 ==========
// 1. Document模型: 新增18个字段 + 修改2个字段约束 + 新增4个关系
// 2. 新增枚举: DocumentType (6值), DegreeType (3值), CitationFormat (3值)
// 3. 新增模型: PaperCitation (论文-文献引用中间表)

// ========== 新增枚举类型 ==========

enum DocumentType {
  JOURNAL_ARTICLE    // 期刊文章
  THESIS             // 学位论文
  BOOK               // 书籍
  CONFERENCE_PAPER   // 会议论文
  WEBPAGE            // 网页
  PATENT             // 专利
}

enum DegreeType {
  BACHELOR           // 学士
  MASTER             // 硕士
  DOCTOR             // 博士
}

enum CitationFormat {
  GBT7714            // GB/T 7714-2015
  APA7               // APA 第7版
  MLA9               // MLA 第9版
}

// ========== 扩展Document模型 ==========

model Document {
  id                    String            @id @default(uuid())
  userId                String

  // --- 基础字段 (保留原有) ---
  title                 String
  authors               String

  // --- 类型分类 (新增) ---
  type                  DocumentType      @default(JOURNAL_ARTICLE)

  // --- 时间信息 (保留+调整) ---
  year                  Int?
  doi                   String?           @unique  // 新增唯一约束
  url                   String?

  // --- 内容字段 (保留) ---
  abstract              String?           @db.Text
  keywords              String[]
  content               String?           @db.Text
  filePath              String?
  embedding             Float[]

  // --- 期刊文章特有字段 (保留原位置) ---
  journal               String?
  volume                String?
  issue                 String?
  pages                 String?

  // --- 学位论文特有字段 (新增) ---
  university            String?
  degreeType            DegreeType?

  // --- 书籍特有字段 (新增) ---
  publisher             String?
  edition               String?
  isbn                  String?
  location              String?

  // --- 会议论文特有字段 (新增) ---
  conferenceName        String?
  conferenceLocation    String?
  editors               String?           // 会议论文集编者

  // --- 网页特有字段 (新增) ---
  websiteName           String?
  accessDate            DateTime?
  publishDate           DateTime?

  // --- 专利特有字段 (新增) ---
  patentNumber          String?
  inventors             String?
  filingDate            DateTime?
  issuingAuthority      String?

  // --- 用户备注 (新增) ---
  notes                 String?           @db.Text

  // --- 统计与软删除 (新增) ---
  citationCount         Int               @default(0)
  deletedAt             DateTime?

  // --- 时间戳 (保留) ---
  createdAt             DateTime          @default(now())
  updatedAt             DateTime          @updatedAt

  // --- 关系 ---
  user                  User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  paperCitations        PaperCitation[]

  @@map("documents")

  // --- 索引策略 ---
  @@index([userId, createdAt])        // 列表查询主索引
  @@index([userId, type])            // 按类型筛选
  @@index([userId, deletedAt])       // 软删除过滤
  @@index([doi])                     // DOI唯一查找（已@unique）
  @@index([userId, year])            // 按年份筛选
}

// ========== 新增：论文-文献引用中间表 ==========

model PaperCitation {
  id                    String            @id @default(uuid())
  paperId               String
  documentId            String
  citationNumber        Int               // 引用序号（数字编号制）
  citationText          String            // 生成的引用文本快照
  format                CitationFormat    @default(GBT7714)
  position              Int?              // 在论文中的字符位置

  createdAt             DateTime          @default(now())
  updatedAt             DateTime          @updatedAt

  // --- 关系 ---
  paper                 Paper             @relation(fields: [paperId], references: [id], onDelete: Cascade)
  document              Document          @relation(fields: [documentId], references: [id], onDelete: Cascade)

  @@map("paper_citations")

  // --- 索引 ---
  @@index([paperId, citationNumber])     // 论文内按序号查询
  @@index([documentId])                 // 反查某文献被哪些论文引用
  @@index([paperId, documentId])         // 防止重复引用
  @@unique([paperId, documentId, position]) // 同一位置不重复插入
}
```

### 2.2 字段级约束详解

**通用字段约束：**

| 字段 | 类型 | 必填 | 约束 | DB映射 | 说明 |
|-----|------|------|------|--------|------|
| id | String | auto | UUID v4 | VARCHAR(36) PRIMARY KEY | 主键 |
| userId | String | 是 | UUID FK | VARCHAR(36) NOT NULL | 用户外键 |
| type | enum | 是 | 6选1 | DocumentType NOT NULL DEFAULT 'JOURNAL_ARTICLE' | 文献类型 |
| title | String | 是 | 1-500字符 | VARCHAR(500) NOT NULL | 文献标题 |
| authors | String | 是 | 1-1000字符 | VARCHAR(1000) NOT NULL | 作者字符串（原始输入） |
| year | Int? | 否 | 1900-2030 | INTEGER CHECK (year >= 1900 AND year <= 2030) | 出版年份 |
| doi | String? | 否 | 唯一/DOI格式 | VARCHAR(200) UNIQUE | 数字对象标识符 |
| url | String? | 否 | 有效URL | TEXT | 在线地址 |
| abstract | Text? | 否 | ≤10000字 | TEXT | 摘要 |
| keywords | String[] | 否 | 每个≤50字符 | TEXT[] | 关键词数组(PostgreSQL数组) |
| notes | Text? | 否 | ≤5000字 | TEXT | 用户个人备注 |
| citationCount | Int | auto | ≥0 | INT NOT NULL DEFAULT 0 | 被引用次数计数 |
| deletedAt | DateTime? | auto | 软删除时间戳 | TIMESTAMP | NULL=未删除 |

**期刊文章特有字段约束：**

| 字段 | 类型 | 条件必填 | 约束 | 说明 |
|-----|------|---------|------|------|
| journal | String | 是(当type=JOURNAL_ARTICLE) | 1-300字符 | 期刊名称 |
| volume | String | 否 | 1-50字符 | 卷号 |
| issue | String | 否 | 1-50字符 | 期号 |
| pages | String | 否 | 如"123-156"或"e202301" | 起止页码 |

**学位论文特有字段约束：**

| 字段 | 类型 | 条件必填 | 约束 | 说明 |
|-----|------|---------|------|------|
| university | String | 是(当type=THESIS) | 1-300字符 | 授予学位院校 |
| degreeType | enum | 是(当type=THESIS) | BACHELOR/MASTER/DOCTOR | 学位类型 |

**书籍特有字段约束：**

| 字段 | 类型 | 条件必填 | 约束 | 说明 |
|-----|------|---------|------|------|
| publisher | String | 是(当type=BOOK) | 1-300字符 | 出版社 |
| edition | String | 否 | 如"第3版"或"3rd ed." | 版次 |
| isbn | String | 否 | ISBN-10或ISBN-13格式 | 国际标准书号 |
| location | String | 否 | 1-200字符 | 出版地 |

**会议论文特有字段约束：**

| 字段 | 类型 | 条件必填 | 约束 | 说明 |
|-----|------|---------|------|------|
| conferenceName | String | 是(当type=CONFERENCE_PAPER) | 1-300字符 | 会议名称 |
| conferenceLocation | String | 否 | 1-200字符 | 会议举办地 |
| editors | String | 否 | 1-500字符 | 论文集编者 |
| pages | String | 否 | 如"45-52" | 起止页码 |

**网页特有字段约束：**

| 字段 | 类型 | 条件必填 | 约束 | 说明 |
|-----|------|---------|------|------|
| websiteName | String | 是(当type=WEBPAGE) | 1-300字符 | 网站名称 |
| url | String | 是(当type=WEBPAGE) | 有效URL格式 | 网页地址 |
| accessDate | DateTime | 是(当type=WEBPAGE) | ≤当前时间 | 用户访问日期 |
| publishDate | DateTime | 否 | 合理日期 | 网页发布日期 |

**专利特有字段约束：**

| 字段 | 类型 | 条件必填 | 约束 | 说明 |
|-----|------|---------|------|------|
| patentNumber | String | 是(当type=PATENT) | 1-100字符 | 专利号 |
| inventors | String | 是(当type=PATENT) | 1-1000字符 | 发明人列表 |
| filingDate | DateTime | 是(当type=PATENT) | 合理日期 | 申请日期 |
| issuingAuthority | String | 是(当type=PATENT) | 1-200字符 | 专利授权机构 |

### 2.3 Migration策略

```bash
# 生成migration命令
npx prisma migrate dev --name add_library_citation_system

# Migration将自动执行以下DDL变更:
#
# Phase 1: 创建新枚举类型
#   CREATE TYPE "DocumentType" AS ENUM ('JOURNAL_ARTICLE','THESIS','BOOK','CONFERENCE_PAPER','WEBPAGE','PATENT');
#   CREATE TYPE "DegreeType" AS ENUM ('BACHELOR','MASTER','DOCTOR');
#   CREATE TYPE "CitationFormat" AS ENUM ('GBT7714','APA7','MLA9');
#
# Phase 2: 扩展documents表
#   ALTER TABLE documents ADD COLUMN "type" "DocumentType" NOT NULL DEFAULT 'JOURNAL_ARTICLE';
#   ALTER TABLE documents ADD COLUMN "university" VARCHAR(300);
#   ALTER TABLE documents ADD COLUMN "degree_type" "DegreeType";
#   ALTER TABLE documents ADD COLUMN "publisher" VARCHAR(300);
#   ALTER TABLE documents ADD COLUMN "edition" VARCHAR(100);
#   ALTER TABLE documents ADD COLUMN "isbn" VARCHAR(50);
#   ALTER TABLE documents ADD COLUMN "location" VARCHAR(200);
#   ALTER TABLE documents ADD COLUMN "conference_name" VARCHAR(300);
#   ALTER TABLE documents ADD COLUMN "conference_location" VARCHAR(200);
#   ALTER TABLE documents ADD COLUMN "editors" VARCHAR(500);
#   ALTER TABLE documents ADD COLUMN "website_name" VARCHAR(300);
#   ALTER TABLE documents ADD COLUMN "access_date" TIMESTAMPTZ;
#   ALTER TABLE documents ADD COLUMN "publish_date" TIMESTAMPTZ;
#   ALTER TABLE documents ADD COLUMN "patent_number" VARCHAR(100);
#   ALTER TABLE documents ADD COLUMN "inventors" VARCHAR(1000);
#   ALTER TABLE documents ADD COLUMN "filing_date" TIMESTAMPTZ;
#   ALTER TABLE documents ADD COLUMN "issuing_authority" VARCHAR(200);
#   ALTER TABLE documents ADD COLUMN "notes" TEXT;
#   ALTER TABLE documents ADD COLUMN "citation_count" INTEGER NOT NULL DEFAULT 0;
#   ALTER TABLE documents ADD COLUMN "deleted_at" TIMESTAMPTZ;
#   ALTER TABLE documents ADD CONSTRAINT documents_doi_key UNIQUE (doi);
#
# Phase 3: 创建新表
#   CREATE TABLE paper_citations (...);
#
# Phase 4: 创建索引
#   CREATE INDEX idx_documents_user_created ON documents(user_id, created_at DESC);
#   CREATE INDEX idx_documents_user_type ON documents(user_id, type);
#   CREATE INDEX idx_documents_user_deleted ON documents(user_id, deleted_at) WHERE deleted_at IS NULL;
#   CREATE INDEX idx_paper_citations_paper_number ON paper_citations(paper_id, citation_number);
#   CREATE INDEX idx_paper_citations_document ON paper_citations(document_id);
```

**向后兼容性保证：**
- 所有新增字段均为 `nullable` 或有 `@default()` 默认值
- 不修改任何现有字段的类型或约束
- 不删除任何现有索引
- 现有数据自动兼容：`type` 默认为 `JOURNAL_ARTICLE`
- 已有功能（论文降重、AIGC检测）**零影响**

---

## 3. 引用格式引擎核心算法

### 3.1 数据层：标准化算法

#### 3.1.1 NormalizedMetadata构建

```typescript
/**
 * 将原始Document Prisma对象转换为NormalizedMetadata
 * 这是引用引擎的数据入口，负责解析和清洗所有字段
 */
function normalizeDocument(doc: {
  type: DocumentType;
  title: string;
  authors: string;
  year?: number | null;
  // ... 其他字段
}): NormalizedMetadata {
  return {
    type: doc.type,
    title: doc.title.trim(),
    authors: parseAuthors(doc.authors),
    year: doc.year ?? undefined,
    containerTitle: getContainerTitle(doc),
    volume: doc.volume ?? undefined,
    issue: doc.issue ?? undefined,
    pages: doc.pages ?? undefined,
    doi: doc.doi ?? undefined,
    url: doc.url ?? undefined,
    publisher: doc.publisher ?? undefined,
    edition: doc.edition ?? undefined,
    location: doc.location ?? undefined,
    university: doc.university ?? undefined,
    degreeType: doc.degreeType ?? undefined,
    conferenceName: doc.conferenceName ?? undefined,
    conferenceLocation: doc.conferenceLocation ?? undefined,
    editors: doc.editors ?? undefined,
    websiteName: doc.websiteName ?? undefined,
    accessDate: doc.accessDate ?? undefined,
    publishDate: doc.publishDate ?? undefined,
    patentNumber: doc.patentNumber ?? undefined,
    inventors: doc.inventors ?? undefined,
    filingDate: doc.filingDate ?? undefined,
    issuingAuthority: doc.issuingAuthority ?? undefined,
    isbn: doc.isbn ?? undefined,
    extras: {},
  };
}

/**
 * 根据文献类型获取容器标题（期刊名/会议名/网站名/出版社等）
 */
function getContainerTitle(doc: Record<string, unknown>): string | undefined {
  switch (doc.type) {
    case 'JOURNAL_ARTICLE': return (doc.journal as string)?.trim() || undefined;
    case 'CONFERENCE_PAPER': return (doc.conferenceName as string)?.trim() || undefined;
    case 'WEBPAGE': return (doc.websiteName as string)?.trim() || undefined;
    case 'BOOK': return (doc.publisher as string)?.trim() || undefined;
    case 'THESIS': return (doc.university as string)?.trim() || undefined;
    default: return undefined;
  }
}
```

#### 3.1.2 作者名解析算法

```typescript
/**
 * 解析作者字符串为结构化的AuthorInfo数组
 * 支持中英文混合、各种分隔符
 *
 * 输入示例:
 * - "张三, 李四, 王五"
 * - "Smith, J.R.; Johnson, A.B.; Williams, C.D."
 * - "张三; Smith JR; 王五, 李四"
 * - "Yann LeCun, Yoshua Bengio, Geoffrey Hinton"
 * - "中国科学院计算技术研究所"
 */
function parseAuthors(authorsString: string): AuthorInfo[] {
  const raw = authorsString.trim();
  if (!raw) return [];

  const segments = splitAuthorSegments(raw);
  return segments.map(segment => parseSingleAuthor(segment.trim()));
}

/**
 * 分割作者字符串为单个作者片段
 * 支持的分隔符: ", " "; " " & " " and "
 */
function splitAuthorSegments(input: string): string[] {
  let result = input;

  result = result.replace(/\s+and\s+/gi, '|');
  result = result.replace(/\s*&\s*/g, '|');
  result = result.replace(/;\s*/g, '|');

  const parts: string[] = [];
  let current = '';
  let parenDepth = 0;

  for (const char of result) {
    if (char === '(' || char === '[') parenDepth++;
    else if (char === ')' || char === ']') parenDepth--;
    else if (char === '|' && parenDepth === 0) {
      if (current.trim()) parts.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }

  if (current.trim()) parts.push(current.trim());

  return parts.length > 0 ? parts : [input];
}

/**
 * 解析单个作者字符串为AuthorInfo
 * 智能判断中英文姓名格式
 */
function parseSingleAuthor(authorStr: string): AuthorInfo {
  const trimmed = authorStr.trim();

  if (/[\u4e00-\u9fa5]/.test(trimmed)) {
    return parseChineseAuthor(trimmed);
  } else {
    return parseWesternAuthor(trimmed);
  }
}

/**
 * 解析中文作者姓名
 * 格式: "张三" / "张 三" / "张三(San Zhang)"
 */
function parseChineseAuthor(name: string): AuthorInfo {
  const clean = name.replace(/[（(][^）)]*[）)]/, '').trim();
  const parts = clean.split(/[\s·]+/).filter(Boolean);

  if (parts.length >= 2) {
    return {
      lastName: parts[0],
      firstName: parts.slice(1).join(''),
      isChinese: true,
      isCorporate: false,
    };
  }

  return {
    lastName: clean,
    firstName: '',
    isChinese: true,
    isCorporate: false,
  };
}

/**
 * 解析西方作者姓名
 * 支持: "Last, First Middle" / "First Middle Last" / "F. M. Last"
 */
function parseWesternAuthor(name: string): AuthorInfo {
  const commaIdx = name.indexOf(',');

  if (commaIdx > 0 && commaIdx < name.length - 1) {
    const lastName = name.substring(0, commaIdx).trim();
    const firstPart = name.substring(commaIdx + 1).trim();

    const nameParts = firstPart.split(/\s+/).filter(Boolean);

    if (nameParts.length >= 2) {
      const firstName = nameParts[0].replace(/\.$/, '');
      const middleName = nameParts.slice(1).join(' ').replace(/\.$/, '');
      return {
        lastName,
        firstName,
        middleName: middleName || undefined,
        isChinese: false,
        isCorporate: false,
      };
    }

    return {
      lastName,
      firstName: nameParts[0]?.replace(/\.$/, '') || '',
      isChinese: false,
      isCorporate: false,
    };
  }

  const parts = name.split(/\s+/).filter(Boolean);

  if (parts.length === 1) {
    return {
      lastName: parts[0],
      firstName: '',
      isChinese: false,
      isCorporate: false,
    };
  }

  if (parts.length === 2) {
    return {
      lastName: parts[parts.length - 1],
      firstName: parts[0],
      isChinese: false,
      isCorporate: false,
    };
  }

  return {
    lastName: parts[parts.length - 1],
    firstName: parts[0],
    middleName: parts.slice(1, -1).join(' '),
    isChinese: false,
    isCorporate: false,
  };
}
```

### 3.2 规则层：FormatRules配置

#### 3.2.1 GB/T 7714-2015 完整规则配置

```typescript
const GBT7714_RULES: FormatRules = {
  formatId: 'GBT7714',
  displayName: 'GB/T 7714-2015',

  authorRules: {
    allAuthorsStyle: 'et_al_after_n',
    etAlThreshold: 3,
    etAlString: ', 等',
    authorSeparator: ', ',
    lastAuthorSeparator: ', ',
    firstNameFormat: 'initials',
    lastNameFirst: true,
    lastNameUppercase: true,
    corporateAuthorHandling: 'as_is',
  },

  dateRules: {
    yearOnly: true,
    yearPosition: 'after_source',
    yearParentheses: false,
  },

  titleRules: {
    capitalization: 'as_is',
    italicize: false,
    quotationMarks: false,
    subtitleSeparator: ': ',
    articleLanguageHandling: 'original',
  },

  sourceRules: {
    containerItalicize: false,
    volumeFormat: '{volume}',
    issueFormat: '({issue})',
    pagesFormat: ': {pages}',
    includeDoi: false,
    doiUrlPrefix: '',
    includeUrl: false,
    accessDateFormat: '[引用日期]. ',
  },

  structureRules: {
    fieldOrder: ['authors', 'title', 'typeIdentifier', 'container', 'year', 'pages', 'doiOrUrl'],
    fieldSeparators: {
      afterAuthors: '. ',
      afterTitle: '',
      afterContainer: ', ',
      afterYear: ', ',
      afterPages: '.',
    },
    endingPunctuation: '.',
    maxAuthorsBeforeEtAl: 3,
    typeIdentifier: {
      JOURNAL_ARTICLE: '[J]',
      THESIS: '[D]',
      BOOK: '[M]',
      CONFERENCE_PAPER: '[C]',
      WEBPAGE: '[EB/OL]',
      PATENT: '[P]',
    },
  },

  typeOverrides: {
    THESIS: {
      sourceRules: {
        containerItalicize: false,
        volumeFormat: '',
        issueFormat: '',
        pagesFormat: '',
      },
      structureRules: {
        fieldOrder: ['authors', 'title', 'typeIdentifier', 'container', 'location', 'year'],
        fieldSeparators: {
          afterAuthors: '. ',
          afterTitle: '',
          afterContainer: '. ',
          afterLocation: ': ',
          afterYear: '.',
        },
      },
    },

    BOOK: {
      sourceRules: {
        containerItalicize: false,
        volumeFormat: '',
        issueFormat: '',
        pagesFormat: '',
      },
      structureRules: {
        fieldOrder: ['authors', 'title', 'typeIdentifier', 'edition', 'container', 'location', 'year', 'pages'],
        fieldSeparators: {
          afterAuthors: '. ',
          afterTitle: '',
          afterEdition: '. ',
          afterContainer: '. ',
          afterLocation: ': ',
          afterYear: ': ',
          afterPages: '.',
        },
      },
    },

    CONFERENCE_PAPER: {
      structureRules: {
        typeIdentifier: {
          ...GBT7714_RULES.structureRules.typeIdentifier,
          CONFERENCE_PAPER: '[A]',
        },
      },
    },

    WEBPAGE: {
      sourceRules: {
        includeUrl: true,
      },
      structureRules: {
        fieldOrder: ['authors', 'title', 'typeIdentifier', 'publishDate', 'accessDate', 'url'],
        fieldSeparators: {
          afterAuthors: '. ',
          afterTitle: '',
          afterPublishDate: '(',
          afterAccessDate: ')[引用日期]. ',
          afterUrl: '.',
        },
      },
    },

    PATENT: {
      structureRules: {
        fieldOrder: ['authors', 'title', 'typeIdentifier', 'patentNumber', 'country', 'filingDate'],
        fieldSeparators: {
          afterAuthors: '. ',
          afterTitle: '',
          afterPatentNumber: ', ',
          afterCountry: '. ',
          afterFilingDate: '.',
        },
      },
    },
  },
};
```

#### 3.2.2 APA 7th Edition 完整规则配置

```typescript
const APA7_RULES: FormatRules = {
  formatId: 'APA7',
  displayName: 'APA 7th Edition',

  authorRules: {
    allAuthorsStyle: 'et_al_after_n',
    etAlThreshold: 20,
    etAlString: ', ... ',
    authorSeparator: ', ',
    lastAuthorSeparator: ', & ',
    firstNameFormat: 'initials',
    lastNameFirst: true,
    lastNameUppercase: false,
    corporateAuthorHandling: 'as_is',
  },

  dateRules: {
    yearOnly: true,
    yearPosition: 'after_authors',
    yearParentheses: true,
  },

  titleRules: {
    capitalization: 'sentence_case',
    italicize: false,
    quotationMarks: false,
    subtitleSeparator: ': ',
    articleLanguageHandling: 'original',
  },

  sourceRules: {
    containerItalicize: true,
    volumeFormat: '*{volume}*',
    issueFormat: '({issue})',
    pagesFormat: '{pages}',
    includeDoi: true,
    doiUrlPrefix: 'https://doi.org/',
    includeUrl: false,
    accessDateFormat: 'Retrieved {Month} {Day}, {year}, from {url}',
  },

  structureRules: {
    fieldOrder: ['authors', 'date', 'title', 'container', 'volumeIssue', 'pages', 'doi'],
    fieldSeparators: {
      afterAuthors: ' ',
      afterDate: '. ',
      afterTitle: '. ',
      afterContainer: ', ',
      afterVolumeIssue: ', ',
      afterPages: '. ',
      afterDoi: '',
    },
    endingPunctuation: '.',
    maxAuthorsBeforeEtAl: 20,
    typeIdentifier: {
      JOURNAL_ARTICLE: '',
      THESIS: '(Doctoral dissertation/Master\'s thesis)',
      BOOK: '',
      CONFERENCE_PAPER: '',
      WEBPAGE: '',
      PATENT: '(U.S. Patent No. {patentNumber})',
    },
  },

  typeOverrides: {
    THESIS: {
      sourceRules: {
        containerItalicize: false,
        volumeFormat: '',
        issueFormat: '',
        pagesFormat: '',
      },
      structureRules: {
        fieldOrder: ['authors', 'date', 'title', 'typeIdentifier', 'container'],
        fieldSeparators: {
          afterAuthors: ' ',
          afterDate: '. ',
          afterTitle: ' ',
          afterTypeIdentifier: '. ',
          afterContainer: '.',
        },
      },
    },

    BOOK: {
      sourceRules: {
        containerItalicize: true,
        volumeFormat: '',
        issueFormat: '',
        pagesFormat: '({pages}).',
      },
      structureRules: {
        fieldOrder: ['authors', 'date', 'title', 'edition', 'container'],
        fieldSeparators: {
          afterAuthors: ' ',
          afterDate: '. ',
          afterTitle: ' (*{edition} ed.*).',
          afterEdition: '',
          afterContainer: '.',
        },
      },
    },

    WEBPAGE: {
      sourceRules: {
        includeUrl: true,
        includeDoi: false,
      },
      structureRules: {
        fieldOrder: ['authors', 'date', 'title', 'siteName', 'url'],
        fieldSeparators: {
          afterAuthors: ' ',
          afterDate: '({fullDate}). ',
          afterTitle: '. ',
          afterSiteName: '. ',
          afterUrl: '',
        },
      },
    },
  },
};
```

#### 3.2.3 MLA 9th Edition 完整规则配置

```typescript
const MLA9_RULES: FormatRules = {
  formatId: 'MLA9',
  displayName: 'MLA 9th Edition',

  authorRules: {
    allAuthorsStyle: 'full',
    etAlThreshold: 999,
    etAlString: ', et al.',
    authorSeparator: ', ',
    lastAuthorSeparator: ', and ',
    firstNameFormat: 'full',
    lastNameFirst: true,
    lastNameUppercase: false,
    corporateAuthorHandling: 'as_is',
  },

  dateRules: {
    yearOnly: false,
    yearPosition: 'end',
    yearParentheses: false,
    dateFormat: '{Day} {Mon}. {Year}',
  },

  titleRules: {
    capitalization: 'title_case',
    italicize: false,
    quotationMarks: true,
    subtitleSeparator: ': ',
    articleLanguageHandling: 'original',
  },

  sourceRules: {
    containerItalicize: true,
    volumeFormat: 'vol. *{volume}*',
    issueFormat: 'no. {issue}',
    pagesFormat: 'pp. {pages}',
    includeDoi: false,
    doiUrlPrefix: '',
    includeUrl: true,
    accessDateFormat: 'Accessed {Day} {Mon}. {Year}.',
  },

  structureRules: {
    fieldOrder: ['authors', 'title', 'container', 'volumeIssue', 'date', 'pages', 'urlOrDoi'],
    fieldSeparators: {
      afterAuthors: '. ',
      afterTitle: ' ',
      afterContainer: ', ',
      afterVolumeIssue: ', ',
      afterDate: ', ',
      afterPages: '.',
      afterUrlOrDoi: '.',
    },
    endingPunctuation: '.',
    maxAuthorsBeforeEtAl: 999,
    typeIdentifier: {
      JOURNAL_ARTICLE: '',
      THESIS: 'Diss.',
      BOOK: '',
      CONFERENCE_PAPER: '',
      WEBPAGE: '',
      PATENT: 'U.S. Patent No. {patentNumber}',
    },
  },

  typeOverrides: {
    THESIS: {
      titleRules: {
        italicize: true,
        quotationMarks: false,
      },
      sourceRules: {
        containerItalicize: false,
        volumeFormat: '',
        issueFormat: '',
        pagesFormat: '',
      },
      structureRules: {
        fieldOrder: ['authors', 'title', 'typeIdentifier', 'container', 'year'],
        fieldSeparators: {
          afterAuthors: '. ',
          afterTitle: ' ',
          afterTypeIdentifier: ' ',
          afterContainer: ', ',
          afterYear: '.',
        },
      },
    },

    BOOK: {
      titleRules: {
        italicize: true,
        quotationMarks: false,
      },
      sourceRules: {
        containerItalicize: false,
        volumeFormat: '',
        issueFormat: '',
        pagesFormat: '',
      },
      structureRules: {
        fieldOrder: ['authors', 'title', 'edition', 'container', 'year', 'pages'],
        fieldSeparators: {
          afterAuthors: '. ',
          afterTitle: '',
          afterEdition: ', {edition} ed.,',
          afterContainer: ', ',
          afterYear: ', ',
          afterPages: '.',
        },
      },
    },

    WEBPAGE: {
      titleRules: {
        quotationMarks: true,
        italicize: false,
      },
      sourceRules: {
        includeUrl: true,
      },
      structureRules: {
        fieldOrder: ['authors', 'title', 'siteName', 'date', 'url', 'accessDate'],
        fieldSeparators: {
          afterAuthors: '. ',
          afterTitle: ' ',
          afterSiteName: ', ',
          afterDate: ', ',
          afterUrl: '. ',
          afterAccessDate: ' ',
        },
      },
    },
  },
};
```

### 3.3 渲染层：三个Renderer伪代码实现

#### 3.3.1 GBT7714Renderer

```typescript
class GBT7714Renderer extends CitationRenderer {
  render(metadata: NormalizedMetadata, rules: FormatRules): string {
    const parts: string[] = [];
    const structRules = rules.structureRules;

    for (const field of structRules.fieldOrder) {
      switch (field) {
        case 'authors':
          parts.push(this.formatAuthors(metadata.authors, rules));
          break;

        case 'title':
          parts.push(this.formatTitle(metadata.title, rules));
          break;

        case 'typeIdentifier':
          const typeId = this.getTypeIdentifier(metadata.type, rules);
          if (typeId) parts.push(typeId);
          break;

        case 'container':
          if (metadata.containerTitle) {
            parts.push(this.formatSourceContainer(metadata, rules));
          }
          break;

        case 'edition':
          if (metadata.edition) {
            parts.push(metadata.edition);
          }
          break;

        case 'location':
          if (metadata.location) {
            parts.push(metadata.location);
          }
          break;

        case 'year':
          if (metadata.year) {
            parts.push(String(metadata.year));
          } else {
            parts.push('[s.n.]');
          }
          break;

        case 'pages':
          if (metadata.pages) {
            parts.push(metadata.pages);
          }
          break;

        case 'doiOrUrl':
          if (metadata.doi) {
            parts.push(`[${metadata.doi}]`);
          } else if (metadata.url) {
            parts.push(`[${metadata.url}]`);
          }
          break;

        case 'url':
          if (metadata.url) {
            parts.push(metadata.url);
          }
          break;

        case 'publishDate':
          if (metadata.publishDate) {
            const d = new Date(metadata.publishDate);
            parts.push(`(${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')})`);
          }
          break;

        case 'accessDate':
          if (metadata.accessDate) {
            const d = new Date(metadata.accessDate);
            parts.push(`[${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}]`);
          }
          break;

        case 'patentNumber':
          if (metadata.patentNumber) {
            parts.push(metadata.patentNumber);
          }
          break;

        case 'country':
          if (metadata.issuingAuthority) {
            parts.push(metadata.issuingAuthority);
          }
          break;

        case 'filingDate':
          if (metadata.filingDate) {
            const d = new Date(metadata.filingDate);
            parts.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`);
          }
          break;
      }
    }

    return this.assemble(parts.filter(p => p), rules);
  }

  protected formatAuthors(authors: AuthorInfo[], rules: FormatRules): string {
    const { etAlThreshold, etAlString, lastNameUppercase, firstNameFormat } = rules.authorRules;

    if (authors.length === 0) return '';

    if (authors.length === 1) {
      const a = authors[0];
      const lastName = lastNameUppercase ? a.lastName.toUpperCase() : a.lastName;
      if (a.isChinese) {
        return `${lastName} ${a.firstName || ''}`.trim();
      }
      const firstInit = firstNameFormat === 'initials'
        ? (a.firstName ? `${a.firstName.charAt(0)}.` : '')
        : a.firstName;
      return `${lastName} ${firstInit}${a.middleName ? ` ${a.middleName.charAt(0)}.` : ''}`.trim();
    }

    const formatted = authors.map(a => {
      const lastName = lastNameUppercase ? a.lastName.toUpperCase() : a.lastName;
      if (a.isChinese) {
        return `${lastName} ${a.firstName || ''}`.trim();
      }
      const firstInit = firstNameFormat === 'initials'
        ? (a.firstName ? `${a.firstName.charAt(0)}.` : '')
        : a.firstName;
      return `${lastName} ${firstInit}${a.middleName ? ` ${a.middleName.charAt(0)}.` : ''}`.trim();
    });

    if (formatted.length > etAlThreshold) {
      return formatted.slice(0, etAlThreshold).join(', ') + etAlString;
    }

    return formatted.join(', ');
  }

  protected getTypeIdentifier(type: DocumentType, rules: FormatRules): string {
    return rules.structureRules.typeIdentifier[type] || '';
  }

  protected assemble(parts: string[], rules: FormatRules): string {
    const separators = rules.structureRules.fieldSeparators;
    const result: string[] = [];

    for (let i = 0; i < parts.length; i++) {
      result.push(parts[i]);

      if (i < parts.length - 1) {
        const nextField = rules.structureRules.fieldOrder[rules.structureRules.fieldOrder.indexOf(
          this.getPartKey(i, parts, rules)
        ) + 1];

        const sepKey = this.getSeparatorKey(nextField);
        if (separators[sepKey as keyof typeof separators]) {
          result.push(separators[sepKey as keyof typeof separators]);
        }
      }
    }

    let assembled = result.join('');
    if (!assembled.endsWith(rules.structureRules.endingPunctuation)) {
      assembled += rules.structureRules.endingPunctuation;
    }

    return assembled;
  }

  private getPartKey(index: number, parts: string[], rules: FormatRules): string {
    return rules.structureRules.fieldOrder[index] || 'unknown';
  }

  private getSeparatorKey(field: string): string {
    const map: Record<string, string> = {
      title: 'afterTitle',
      container: 'afterContainer',
      year: 'afterYear',
      pages: 'afterPages',
    };
    return map[field] || 'afterDefault';
  }
}
```

#### 3.3.2 APA7Renderer

```typescript
class APA7Renderer extends CitationRenderer {
  render(metadata: NormalizedMetadata, rules: FormatRules): string {
    const parts: string[] = [];

    for (const field of rules.structureRules.fieldOrder) {
      switch (field) {
        case 'authors':
          parts.push(this.formatAuthors(metadata.authors, rules));
          break;

        case 'date':
          parts.push(this.formatDate(metadata, rules));
          break;

        case 'title':
          parts.push(this.formatTitle(metadata.title, rules));
          break;

        case 'container':
          if (metadata.containerTitle) {
            parts.push(this.formatSourceContainer(metadata, rules));
          }
          break;

        case 'volumeIssue':
          const vi = this.formatVolumeIssue(metadata, rules);
          if (vi) parts.push(vi);
          break;

        case 'pages':
          if (metadata.pages) {
            parts.push(this.formatPages(metadata.pages, rules));
          }
          break;

        case 'doi':
          if (metadata.doi) {
            parts.push(`https://doi.org/${metadata.doi}`);
          } else if (metadata.url) {
            parts.push(metadata.url);
          }
          break;

        case 'edition':
          if (metadata.edition) {
            parts.push(`(${this.extractEditionNumber(metadata.edition)} ed.)`);
          }
          break;

        case 'typeIdentifier':
          const typeId = this.getTypeIdentifier(metadata.type, metadata, rules);
          if (typeId) parts.push(typeId);
          break;

        case 'siteName':
          if (metadata.websiteName) {
            parts.push(metadata.websiteName);
          }
          break;

        case 'url':
          if (metadata.url) {
            parts.push(metadata.url);
          }
          break;

        case 'fullDate':
          if (metadata.publishDate) {
            parts.push(this.formatFullDate(metadata.publishDate, 'long'));
          } else if (metadata.year) {
            parts.push(String(metadata.year));
          }
          break;
      }
    }

    return this.assemble(parts.filter(p => p), rules);
  }

  protected formatAuthors(authors: AuthorInfo[], rules: FormatRules): string {
    const { etAlThreshold, lastAuthorSeparator, firstNameFormat } = rules.authorRules;

    if (authors.length === 0) return '';
    if (authors.length === 1) {
      return this.formatSingleAuthor(authors[0], firstNameFormat);
    }

    if (authors.length <= etAlThreshold) {
      const main = authors.slice(0, -1)
        .map(a => this.formatSingleAuthor(a, firstNameFormat))
        .join(', ');
      const last = this.formatSingleAuthor(authors[authors.length - 1], firstNameFormat);
      return main + lastAuthorSeparator + last;
    }

    const shown = authors.slice(0, 19)
      .map(a => this.formatSingleAuthor(a, firstNameFormat))
      .join(', ');
    const last = this.formatSingleAuthor(authors[authors.length - 1], firstNameFormat);
    return shown + ', ... ' + last;
  }

  private formatSingleAuthor(author: AuthorInfo, fmt: 'initials' | 'full' | 'none'): string {
    if (fmt === 'initials') {
      const first = author.firstName ? `${author.firstName.charAt(0)}.` : '';
      const middle = author.middleName ? ` ${author.middleName.charAt(0)}.` : '';
      return `${author.lastName}, ${first}${middle}`;
    }
    return `${author.lastName}, ${author.firstName}${author.middleName ? ` ${author.middleName}` : ''}`;
  }

  protected formatDate(metadata: NormalizedMetadata, _rules: FormatRules): string {
    if (metadata.year) {
      return `(${metadata.year})`;
    }
    return '(n.d.)';
  }

  protected formatVolumeIssue(metadata: NormalizedMetadata, rules: FormatRules): string {
    const parts: string[] = [];
    if (metadata.volume) {
      parts.push(rules.sourceRules.volumeFormat.replace('{volume}', metadata.volume));
    }
    if (metadata.issue) {
      parts.push(rules.sourceRules.issueFormat.replace('{issue}', metadata.issue));
    }
    return parts.join('');
  }

  protected formatPages(pages: string, rules: FormatRules): string {
    return pages.replace('-', '\u2013').replace('–', '\u2013');
  }

  private extractEditionNumber(edition: string): string {
    const match = edition.match(/(\d+)/);
    return match ? match[1] : edition;
  }

  private formatFullDate(date: string | Date, style: 'long' | 'short'): string {
    const d = new Date(date);
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    if (style === 'long') {
      return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
    }
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
}
```

#### 3.3.3 MLA9Renderer

```typescript
class MLA9Renderer extends CitationRenderer {
  render(metadata: NormalizedMetadata, rules: FormatRules): string {
    const parts: string[] = [];

    for (const field of rules.structureRules.fieldOrder) {
      switch (field) {
        case 'authors':
          parts.push(this.formatAuthors(metadata.authors, rules));
          break;

        case 'title':
          const title = this.formatTitle(metadata.title, rules);
          parts.push(title);
          break;

        case 'container':
          if (metadata.containerTitle) {
            parts.push(this.formatSourceContainer(metadata, rules));
          }
          break;

        case 'volumeIssue':
          const vi = this.formatVolumeIssueMLA(metadata, rules);
          if (vi) parts.push(vi);
          break;

        case 'date':
          parts.push(this.formatDateMLA(metadata, rules));
          break;

        case 'pages':
          if (metadata.pages) {
            parts.push(`pp. ${metadata.pages}`);
          }
          break;

        case 'urlOrDoi':
          if (metadata.url) {
            parts.push(metadata.url);
          }
          break;

        case 'accessDate':
          if (metadata.accessDate) {
            parts.push(`Accessed ${this.formatDateMLAShort(metadata.accessDate)}.`);
          }
          break;

        case 'edition':
          if (metadata.edition) {
            const num = this.extractEditionNumber(metadata.edition);
            parts.push(`${num} ed.`);
          }
          break;

        case 'typeIdentifier':
          const typeId = this.getTypeIdentifier(metadata.type, rules);
          if (typeId) parts.push(typeId);
          break;

        case 'siteName':
          if (metadata.websiteName) {
            parts.push(metadata.websiteName);
          }
          break;

        case 'year':
          if (metadata.year) {
            parts.push(String(metadata.year));
          }
          break;
      }
    }

    return this.assemble(parts.filter(p => p), rules);
  }

  protected formatAuthors(authors: AuthorInfo[], rules: FormatRules): string {
    const { lastAuthorSeparator } = rules.authorRules;

    if (authors.length === 0) return '';
    if (authors.length === 1) {
      return `${authors[0].lastName}, ${authors[0].firstName}${authors[0].middleName ? ` ${authors[0].middleName}` : ''}`;
    }

    const formatted = authors.map(a =>
      `${a.lastName}, ${a.firstName}${a.middleName ? ` ${a.middleName}` : ''}`
    );

    if (formatted.length === 2) {
      return formatted.join(lastAuthorSeparator);
    }

    const main = formatted.slice(0, -1).join(', ');
    const last = formatted[formatted.length - 1];
    return main + lastAuthorSeparator + last;
  }

  protected formatTitle(title: string, rules: FormatRules): string {
    const formatted = toTitleCase(title);
    if (rules.titleRules.quotationMarks) {
      return `\u201C${formatted}\u201D`;
    }
    return formatted;
  }

  private formatVolumeIssueMLA(metadata: NormalizedMetadata, rules: FormatRules): string {
    const parts: string[] = [];
    if (metadata.volume) {
      parts.push(`vol. ${metadata.volume}`);
    }
    if (metadata.issue) {
      parts.push(`no. ${metadata.issue}`);
    }
    return parts.join(', ');
  }

  private formatDateMLA(metadata: NormalizedMetadata, _rules: FormatRules): string {
    if (metadata.publishDate) {
      return this.formatDateMLALong(metadata.publishDate);
    }
    if (metadata.year) {
      return String(metadata.year);
    }
    return 'n.d.';
  }

  private formatDateMLALong(date: string | Date): string {
    const d = new Date(date);
    const months = ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'Jun.',
      'Jul.', 'Aug.', 'Sep.', 'Oct.', 'Nov.', 'Dec.'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  }

  private formatDateMLAShort(date: string | Date): string {
    const d = new Date(date);
    const months = ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'Jun.',
      'Jul.', 'Aug.', 'Sep.', 'Oct.', 'Nov.', 'Dec.'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  }

  private toTitleCase(str: string): string {
    const minorWords = ['a', 'an', 'the', 'and', 'but', 'or', 'for', 'nor', 'on', 'at', 'to', 'from', 'by', 'in', 'of'];
    return str.split(/\s+/).map((word, idx) => {
      if (idx === 0 || !minorWords.includes(word.toLowerCase())) {
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      }
      return word.toLowerCase();
    }).join(' ');
  }
}
```

#### 3.3.4 CitationEngine 主类

```typescript
class CitationEngine {
  private renderers: Map<CitationFormat, CitationRenderer>;
  private ruleRegistry: Map<CitationFormat, FormatRules>;

  constructor() {
    this.renderers = new Map([
      ['GBT7714', new GBT7714Renderer()],
      ['APA7', new APA7Renderer()],
      ['MLA9', new MLA9Renderer()],
    ]);

    this.ruleRegistry = new Map([
      ['GBT7714', GBT7714_RULES],
      ['APA7', APA7_RULES],
      ['MLA9', MLA9_RULES],
    ]);
  }

  generate(document: Record<string, unknown>, formatId: CitationFormat): string {
    const normalized = normalizeDocument(document as Parameters<typeof normalizeDocument>[0]);
    const baseRules = this.ruleRegistry.get(formatId);
    if (!baseRules) throw new Error(`Unsupported format: ${formatId}`);

    const mergedRules = this.mergeTypeOverrides(baseRules, normalized.type);
    const renderer = this.renderers.get(formatId);
    if (!renderer) throw new Error(`No renderer for format: ${formatId}`);

    return renderer.render(normalized, mergedRules);
  }

  generateBatch(documents: Record<string, unknown>[], formatId: CitationFormat): string[] {
    return documents.map(doc => this.generate(doc, formatId));
  }

  private mergeTypeOverrides(baseRules: FormatRules, type: DocumentType): FormatRules {
    const overrides = baseRules.typeOverrides?.[type];
    if (!overrides) return baseRules;

    return deepMerge(baseRules, overrides) as FormatRules;
  }
}

const citationEngine = new CitationEngine();
export { citationEngine };
```

---

## 4. API接口详细设计

### 4.1 接口清单总览

| # | 方法 | 路径 | 功能 | 认证 | 优先级 |
|---|------|------|------|------|--------|
| 1 | GET | `/api/v1/library/documents` | 获取文献列表（分页/搜索/排序/筛选） | JWT | P0 |
| 2 | POST | `/api/v1/library/documents` | 创建新文献（手动录入） | JWT | P0 |
| 3 | GET | `/api/v1/library/documents/:id` | 获取文献详情 | JWT | P0 |
| 4 | PUT | `/api/v1/library/documents/:id` | 更新文献信息 | JWT | P0 |
| 5 | DELETE | `/api/v1/library/documents/:id` | 删除文献（软删除） | JWT | P0 |
| 6 | POST | `/api/v1/library/documents/batch-delete` | 批量删除文献 | JWT | P0 |
| 7 | POST | `/api/v1/library/doi/lookup` | DOI智能检索 | JWT | P0 |
| 8 | POST | `/api/v1/library/citations/generate` | 生成引用（单条/批量） | JWT | P0 |
| 9 | POST | `/api/v1/library/export` | 批量导出引用列表 | JWT | P0 |
| 10 | GET | `/api/v1/papers/:paperId/citations` | 获取论文的引用列表 | JWT | P0 |
| 11 | POST | `/api/v1/papers/:paperId/citations` | 向论文插入引用 | JWT | P0 |
| 12 | DELETE | `/api/v1/papers/:paperId/citations/:id` | 从论文移除引用 | JWT | P0 |
| 13 | PUT | `/api/v1/papers/:paperId/citations/renumber` | 重编号论文引用 | JWT | P0 |

### 4.2 接口1: GET /api/v1/library/documents — 文献列表

**请求参数（Query）：**

```typescript
const libraryListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  search: z.string().max(200).optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'title', 'year', 'type']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  type: z.nativeEnum(z.enum(['JOURNAL_ARTICLE', 'THESIS', 'BOOK', 'CONFERENCE_PAPER', 'WEBPAGE', 'PATENT'])).optional(),
  hasDoi: z.enum(['true', 'false']).optional(),
  yearFrom: z.coerce.number().int().min(1900).optional(),
  yearTo: z.coerce.number().int().max(2030).optional(),
});
```

**响应 (200)：**

```typescript
interface LibraryListResponse {
  success: true;
  data: {
    documents: Array<{
      id: string;
      type: DocumentType;
      title: string;
      authors: string;
      year: number | null;
      journal?: string | null;
      university?: string | null;
      publisher?: string | null;
      doi: string | null;
      citationCount: number;
      createdAt: string;
      updatedAt: string;
    }>;
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
    statistics: {
      totalCount: number;
      typeDistribution: Record<DocumentType, number>;
      monthAdded: number;
    };
  };
}
```

**错误码：**

| HTTP Status | Code | Message |
|-------------|------|---------|
| 401 | NOT_AUTHORIZED | 未授权访问，请先登录 |
| 422 | VALIDATION_ERROR | 参数验证失败（详见details） |

**业务逻辑伪代码：**

```
GET /api/v1/library/documents?page=1&pageSize=20&search=machine&sortBy=createdAt&sortOrder=desc&type=JOURNAL_ARTICLE
  ├─ 1. JWT认证 → 提取userId
  ├─ 2. Zod验证query参数
  ├─ 3. 构建Prisma查询条件
  │     where: {
  │       userId,
  │       deletedAt: null,
  │       ...(type && { type }),
  │       ...(hasDoi === 'true' && { doi: { not: null } }),
  │       ...(hasDoi === 'false' && { doi: null }),
  │       ...(yearFrom && { year: { gte: yearFrom } }),
  │       ...(yearTo && { year: { lte: yearTo } }),
  │       ...(search && {
  │         OR: [
  │           { title: { contains: search, mode: 'insensitive' } },
  │           { authors: { contains: search, mode: 'insensitive' } },
  │           { keywords: { hasSome: [search] } },
  │           { doi: { contains: search, mode: 'insensitive' } },
  │         ]
  │       })
  │     }
  ├─ 4. 执行查询（含分页和排序）
  │     prisma.document.findMany({
  │       where,
  │       orderBy: [{ [sortBy]: sortOrder }],
  │       skip: (page - 1) * pageSize,
  │       take: pageSize,
  │       select: { /* 返回字段 */ }
  │     })
  ├─ 5. 查询总数用于分页
  │     prisma.document.count({ where })
  ├─ 6. 查询统计信息
  │     └─ 总数 + 类型分布 + 本月新增数
  └─ 7. 返回结果
```

### 4.3 接口2: POST /api/v1/library/documents — 创建文献

**请求体：**

```typescript
const createDocumentSchema = z.object({
  type: z.nativeEnum(z.enum(['JOURNAL_ARTICLE', 'THESIS', 'BOOK', 'CONFERENCE_PAPER', 'WEBPAGE', 'PATENT'])),
  title: z.string().min(1).max(500),
  authors: z.string().min(1).max(1000),

  year: z.number().int().min(1900).max(2030).optional(),
  doi: z.string().regex(/^10\.\d{4,}\/[^\s]+$/).optional().or(z.literal('')),
  url: z.string().url().optional().or(z.literal('')),
  abstract: z.string().max(10000).optional(),
  keywords: z.array(z.string().max(50)).max(20).optional(),
  notes: z.string().max(5000).optional(),

  journal: z.string().min(1).max(300).optional(),
  volume: z.string().max(50).optional(),
  issue: z.string().max(50).optional(),
  pages: z.string().regex(/^\d+(-\d+)?$/).optional(),

  university: z.string().min(1).max(300).optional(),
  degreeType: z.nativeEnum(z.enum(['BACHELOR', 'MASTER', 'DOCTOR'])).optional(),

  publisher: z.string().min(1).max(300).optional(),
  edition: z.string().max(100).optional(),
  isbn: z.string().regex(/^(?:978|979|10)\d{9}[\dX]$/).optional(),
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
});

interface CreateDocumentRequest extends z.infer<typeof createDocumentSchema> {}
```

**动态字段校验逻辑（按文献类型）：**

```typescript
function validateTypeSpecificFields(data: CreateDocumentRequest): string[] {
  const errors: string[] = [];

  switch (data.type) {
    case 'JOURNAL_ARTICLE':
      if (!data.journal) errors.push('期刊名称为必填字段');
      break;

    case 'THESIS':
      if (!data.university) errors.push('授予学位的院校为必填字段');
      if (!data.degreeType) errors.push('学位类型为必填字段');
      break;

    case 'BOOK':
      if (!data.publisher) errors.push('出版社为必填字段');
      break;

    case 'CONFERENCE_PAPER':
      if (!data.conferenceName) errors.push('会议名称为必填字段');
      break;

    case 'WEBPAGE':
      if (!data.websiteName) errors.push('网站名称为必填字段');
      if (!data.url) errors.push('网页地址为必填字段');
      if (!data.accessDate) errors.push('访问日期为必填字段');
      break;

    case 'PATENT':
      if (!data.patentNumber) errors.push('专利号为必填字段');
      if (!data.inventors) errors.push('发明人为必填字段');
      if (!data.filingDate) errors.push('申请日期为必填字段');
      if (!data.issuingAuthority) errors.push('授权机构为必填字段');
      break;
  }

  return errors;
}
```

**响应 (200)：**

```typescript
interface CreateDocumentResponse {
  success: true;
  data: {
    document: {
      id: string;
      type: DocumentType;
      title: string;
      authors: string;
      createdAt: string;
    };
  };
  message: '文献创建成功';
}
```

**错误码：**

| HTTP Status | Code | Message |
|-------------|------|---------|
| 400 | VALIDATION_ERROR | 字段验证失败（含类型特定字段错误） |
| 400 | INVALID_DOI_FORMAT | DOI格式不正确 |
| 401 | NOT_AUTHORIZED | 未授权访问 |
| 409 | DUPLICATE_DOI | 该DOI已存在（同一用户下） |
| 413 | QUOTA_EXCEEDED | 文献数量已达上限（10000篇） |

### 4.4 接口3: GET /api/v1/library/documents/:id — 文献详情

**响应 (200)：**

```typescript
interface DocumentDetailResponse {
  success: true;
  data: {
    document: {
      id: string;
      type: DocumentType;
      title: string;
      authors: string;
      year: number | null;
      doi: string | null;
      url: string | null;
      abstract: string | null;
      keywords: string[];
      notes: string | null;
      citationCount: number;
      createdAt: string;
      updatedAt: string;

      journalData: {
        journal: string | null;
        volume: string | null;
        issue: string | null;
        pages: string | null;
      } | null;

      thesisData: {
        university: string | null;
        degreeType: DegreeType | null;
      } | null;

      bookData: {
        publisher: string | null;
        edition: string | null;
        isbn: string | null;
        location: string | null;
      } | null;

      conferenceData: {
        conferenceName: string | null;
        conferenceLocation: string | null;
        editors: string | null;
        pages: string | null;
      } | null;

      webpageData: {
        websiteName: string | null;
        url: string | null;
        accessDate: string | null;
        publishDate: string | null;
      } | null;

      patentData: {
        patentNumber: string | null;
        inventors: string | null;
        filingDate: string | null;
        issuingAuthority: string | null;
      } | null;
    };

    citations: {
      GBT7714: string;
      APA7: string;
      MLA9: string;
    };

    relatedPapers: Array<{
      paperId: string;
      paperTitle: string;
      citationCount: number;
    }>;
  };
}
```

### 4.5 接口4: PUT /api/v1/library/documents/:id — 更新文献

**请求体：** 同创建接口（所有字段可选，部分更新）

**响应 (200)：** 类似创建响应，包含更新后的文档信息

**特殊处理：**
- 如果修改了DOI且新DOI已被其他文献占用 → 返回409 DUPLICATE_DOI
- 更新时自动刷新 `updatedAt` 时间戳
- 不允许修改 `type` 字段（如需更改类型，需删除重建）

### 4.6 接口5: DELETE /api/v1/library/documents/:id — 删除文献

**响应 (200)：**

```typescript
interface DeleteDocumentResponse {
  success: true;
  data: {
    deletedId: string;
    wasCited: boolean;
    citedByCount: number;
  };
  message: string;
}
```

**业务逻辑：**
1. 检查该文献是否被论文引用（查询 `paper_citations` 表）
2. 如果被引用 → 返回警告但仍然执行软删除（设置 `deletedAt = now()`）
3. 同时级联软删除相关的 `PaperCitation` 记录（标记而非物理删除）
4. 返回被引用次数供前端提示用户

### 4.7 接口6: POST /api/v1/library/documents/batch-delete — 批量删除

**请求体：**

```typescript
const batchDeleteSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
  confirmWarning: z.boolean().default(false),
});
```

**响应 (200)：**

```typescript
interface BatchDeleteResponse {
  success: true;
  data: {
    deletedCount: number;
    failedIds: Array<{ id: string; reason: string }>;
    warningMessage?: string;
  };
}
```

### 4.8 接口7: POST /api/v1/library/doi/lookup — DOI智能检索

**请求体：**

```typescript
const doiLookupSchema = z.object({
  doi: z.string()
    .min(10, 'DOI长度不足')
    .max(200, 'DOI过长')
    .refine(val => /^10\.\d{4,}\/[^\s]+$/.test(val.trim()), {
      message: 'DOI格式不正确，正确格式：10.xxxx/xxxxx',
    }),
});
```

**响应 (200)：**

```typescript
interface DOILookupResponse {
  success: true;
  data: {
    found: boolean;
    metadata: {
      type: DocumentType;
      title: string;
      authors: string[];
      journal?: string;
      year?: number;
      volume?: string;
      issue?: string;
      pages?: string;
      doi: string;
      university?: string;
      degreeType?: DegreeType;
      publisher?: string;
      isbn?: string;
      location?: string;
      conferenceName?: string;
      conferenceLocation?: string;
      websiteName?: string;
      url?: string;
      patentNumber?: string;
      inventors?: string;
      filingDate?: string;
      issuingAuthority?: string;
    } | null;
    matchType: 'exact' | 'trimmed' | 'prefix' | null;
    lookupTimeMs: number;
  };
}
```

**响应 (404)：**

```typescript
interface DOINotFoundResponse {
  success: false;
  error: {
    code: 'DOI_NOT_FOUND';
    message: '未找到匹配的文献，请检查DOI是否正确或手动输入';
  };
}
```

### 4.9 接口8: POST /api/v1/library/citations/generate — 生成引用

**请求体：**

```typescript
const generateCitationSchema = z.object({
  documentIds: z.array(z.string().uuid()).min(1).max(50),
  format: z.nativeEnum(z.enum(['GBT7714', 'APA7', 'MLA9'])).default('GBT7714'),
});
```

**响应 (200)：**

```typescript
interface GenerateCitationResponse {
  success: true;
  data: {
    citations: Array<{
      documentId: string;
      format: CitationFormat;
      citationText: string;
      title: string;
      authors: string;
    }>;
    format: CitationFormat;
    generatedAt: string;
  };
}
```

**核心处理流程：**

```
POST /api/v1/library/citations/generate
  ├─ 1. JWT认证 → 提取userId
  ├─ 2. Zod验证请求体
  ├─ 3. 校验所有documentId属于当前用户
  │     prisma.document.findMany({ where: { id: { in: documentIds }, userId, deletedAt: null } })
  │     └─ 若有不属于用户的ID → 返回403
  ├─ 4. 从DB获取文档完整数据
  ├─ 5. 对每个文档调用 CitationEngine.generate()
  │     normalized = normalizeDocument(doc)
  │     citationText = renderer.render(normalized, mergedRules)
  ├─ 6. 返回引用字符串数组
  └─ 7. （可选）缓存生成结果到Redis (TTL=1h)
       Key: citation:{userId}:{documentId}:{format}
```

### 4.10 接口9: POST /api/v1/library/export — 批量导出

**请求体：**

```typescript
const exportSchema = z.object({
  documentIds: z.array(z.string().uuid()).min(1).max(500),
  format: z.nativeEnum(z.enum(['GBT7714', 'APA7', 'MLA9'])),
  outputType: z.enum(['text', 'json']).default('text'),
  includeHeader: z.boolean().default(true),
  sortBy: z.enum(['citationNumber', 'author', 'year', 'title']).default('citationNumber'),
});
```

**响应 (200)：**

```typescript
interface ExportResponse {
  success: true;
  data: {
    content: string;           // 纯文本引用列表 或 JSON数组
    filename: string;          // 如 "references-gbt7714-20260510.txt"
    mimeType: string;          // text/plain 或 application/json
    count: number;
    exportedAt: string;
  };
}
```

### 4.11 接口10: GET /api/v1/papers/:paperId/citations — 获取论文引用列表

**响应 (200)：**

```typescript
interface PaperCitationsResponse {
  success: true;
  data: {
    paperId: string;
    citations: Array<{
      id: string;
      documentId: string;
      citationNumber: int;
      citationText: string;
      format: CitationFormat;
      position: int | null;
      documentPreview: {
        title: string;
        authors: string;
        year: number | null;
        type: DocumentType;
      };
      createdAt: string;
    }>;
    format: CitationFormat;
    totalCitations: number;
    referenceList: string;    // 完整参考文献列表文本
  };
}
```

### 4.12 接口11: POST /api/v1/papers/:paperId/citations — 插入引用到论文

**请求体：**

```typescript
const insertCitationSchema = z.object({
  documentIds: z.array(z.string().uuid()).min(1).max(10),
  format: z.nativeEnum(z.enum(['GBT7714', 'APA7', 'MLA9'])).optional(),
  position: z.number().int().nonnegative().optional(),
});
```

**响应 (200)：**

```typescript
interface InsertCitationResponse {
  success: true;
  data: {
    insertedCitations: Array<{
      id: string;
      documentId: string;
      citationNumber: int;
      citationText: string;
      format: CitationFormat;
    }>;
    updatedReferenceList: string;  // 更新后的完整参考文献列表
    renumbered: boolean;           // 是否触发了重新编号
    totalCitations: number;
  };
}
```

**自动编号算法：**

```typescript
async function insertAndRenumberCitations(
  paperId: string,
  documentIds: string[],
  userId: string,
  format: CitationFormat,
  insertPosition?: number
): Promise<InsertCitationResponse> {
  const existingCitations = await prisma.paperCitation.findMany({
    where: { paperId },
    orderBy: [{ position: 'asc' }, { citationNumber: 'asc' }],
  });

  const newEntries: Array<{ documentId: string; position?: number }> = documentIds.map(id => ({
    documentId: id,
    position: insertPosition ?? existingCitations.length,
  }));

  const created = await prisma.$transaction(async (tx) => {
    const results = [];
    let nextNumber = existingCitations.length + 1;

    for (const entry of newEntries) {
      const doc = await tx.document.findUnique({ where: { id: entry.documentId } });
      if (!doc) continue;

      const citationText = citationEngine.generate(doc as any, format);

      const citation = await tx.paperCitation.create({
        data: {
          paperId,
          documentId: entry.documentId,
          citationNumber: nextNumber++,
          citationText,
          format,
          position: entry.position,
        },
      });

      await tx.document.update({
        where: { id: entry.documentId },
        data: { citationCount: { increment: 1 } },
      });

      results.push(citation);
    }

    const allCitations = [...existingCitations, ...results]
      .sort((a, b) => (a.position ?? 999999) - (b.position ?? 999999));

    for (let i = 0; i < allCitations.length; i++) {
      await tx.paperCitation.update({
        where: { id: allCitations[i].id },
        data: { citationNumber: i + 1 },
      });
    }

    return results;
  });

  const finalCitations = await prisma.paperCitation.findMany({
    where: { paperId },
    orderBy: { citationNumber: 'asc' },
  });

  const referenceList = finalCitations.map(c => c.citationText).join('\n');

  return {
    insertedCitations: created.map(c => ({
      id: c.id,
      documentId: c.documentId,
      citationNumber: c.citationNumber,
      citationText: c.citationText,
      format: c.format,
    })),
    updatedReferenceList: referenceList,
    renumbered: true,
    totalCitations: finalCitations.length,
  };
}
```

### 4.13 接口12 & 13: 删除引用与重编号

**DELETE /api/v1/papers/:paperId/citations/:id**

```typescript
interface RemoveCitationResponse {
  success: true;
  data: {
    removedId: string;
    remainingCitations: number;
    updatedReferenceList: string;
    wasRenumbered: boolean;
  };
}
```

**PUT /api/v1/papers/:paperId/citations/renumber**

触发对指定论文的所有引用按position顺序重新分配citationNumber。

### 4.14 完整Zod Schema汇总

```typescript
import { z } from 'zod';

export const librarySchemas = {
  listQuery: z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(50).default(20),
    search: z.string().max(200).optional(),
    sortBy: z.enum(['createdAt', 'updatedAt', 'title', 'year', 'type']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
    type: z.enum(['JOURNAL_ARTICLE', 'THESIS', 'BOOK', 'CONFERENCE_PAPER', 'WEBPAGE', 'PATENT']).optional(),
    hasDoi: z.enum(['true', 'false']).optional(),
    yearFrom: z.coerce.number().int().min(1900).optional(),
    yearTo: z.coerce.number().int().max(2030).optional(),
  }),

  createDocument: z.object({
    type: z.enum(['JOURNAL_ARTICLE', 'THESIS', 'BOOK', 'CONFERENCE_PAPER', 'WEBPAGE', 'PATENT']),
    title: z.string().min(1).max(500),
    authors: z.string().min(1).max(1000),
    year: z.number().int().min(1900).max(2030).optional(),
    doi: z.string().regex(/^10\.\d{4,}\/[^\s]+$/).optional().or(z.literal('')),
    url: z.string().url().optional().or(z.literal('')),
    abstract: z.string().max(10000).optional(),
    keywords: z.array(z.string().max(50)).max(20).optional(),
    notes: z.string().max(5000).optional(),
    journal: z.string().min(1).max(300).optional(),
    volume: z.string().max(50).optional(),
    issue: z.string().max(50).optional(),
    pages: z.string().optional(),
    university: z.string().min(1).max(300).optional(),
    degreeType: z.enum(['BACHELOR', 'MASTER', 'DOCTOR']).optional(),
    publisher: z.string().min(1).max(300).optional(),
    edition: z.string().max(100).optional(),
    isbn: z.string().optional(),
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
    year: z.number().int().min(1900).max(2030).optional(),
    doi: z.string().regex(/^10\.\d{4,}\/[^\s]+$/).optional().or(z.literal('')).optional(),
    url: z.string().url().optional().or(z.literal('')).optional(),
    abstract: z.string().max(10000).optional(),
    keywords: z.array(z.string().max(50)).max(20).optional(),
    notes: z.string().max(5000).optional(),
    journal: z.string().min(1).max(300).optional(),
    volume: z.string().max(50).optional(),
    issue: z.string().max(50).optional(),
    pages: z.string().optional(),
    university: z.string().min(1).max(300).optional(),
    degreeType: z.enum(['BACHELOR', 'MASTER', 'DOCTOR']).optional(),
    publisher: z.string().min(1).max(300).optional(),
    edition: z.string().max(100).optional(),
    isbn: z.string().optional(),
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
    ids: z.array(z.string().uuid()).min(1).max(100),
    confirmWarning: z.boolean().default(false),
  }),

  doiLookup: z.object({
    doi: z.string()
      .min(10, 'DOI长度不足')
      .max(200, 'DOI过长')
      .refine(val => /^10\.\d{4,}\/[^\s]+$/.test(val.trim()), {
        message: 'DOI格式不正确，正确格式：10.xxxx/xxxxx',
      }),
  }),

  generateCitation: z.object({
    documentIds: z.array(z.string().uuid()).min(1).max(50),
    format: z.enum(['GBT7714', 'APA7', 'MLA9']).default('GBT7714'),
  }),

  exportCitations: z.object({
    documentIds: z.array(z.string().uuid()).min(1).max(500),
    format: z.enum(['GBT7714', 'APA7', 'MLA9']),
    outputType: z.enum(['text', 'json']).default('text'),
    includeHeader: z.boolean().default(true),
    sortBy: z.enum(['citationNumber', 'author', 'year', 'title']).default('citationNumber'),
  }),

  insertCitation: z.object({
    documentIds: z.array(z.string().uuid()).min(1).max(10),
    format: z.enum(['GBT7714', 'APA7', 'MLA9']).optional(),
    position: z.number().int().nonnegative().optional(),
  }),
};
```

### 4.15 错误码枚举

```typescript
export enum LibraryErrorCode {
  DOCUMENT_NOT_FOUND = 'DOCUMENT_NOT_FOUND',
  DOCUMENT_NOT_OWNED = 'DOCUMENT_NOT_OWNED',
  DUPLICATE_DOI = 'DUPLICATE_DOI',
  INVALID_DOI_FORMAT = 'INVALID_DOI_FORMAT',
  DOI_NOT_FOUND = 'DOI_NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_AUTHORIZED = 'NOT_AUTHORIZED',
  RATE_LIMITED = 'RATE_LIMITED',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  TYPE_MISMATCH = 'TYPE_MISMATCH',
  CITATION_NOT_FOUND = 'CITATION_NOT_FOUND',
  PAPER_NOT_FOUND = 'PAPER_NOT_FOUND',
  BATCH_DELETE_PARTIAL = 'BATCH_DELETE_PARTIAL',
}

export const LIBRARY_ERROR_MESSAGES: Record<LibraryErrorCode, string> = {
  [LibraryErrorCode.DOCUMENT_NOT_FOUND]: '文献不存在或无权访问',
  [LibraryErrorCode.DOCUMENT_NOT_OWNED]: '无权操作此文献',
  [LibraryErrorCode.DUPLICATE_DOI]: '该DOI已在您的文献库中存在',
  [LibraryErrorCode.INVALID_DOI_FORMAT]: 'DOI格式不正确，正确格式：10.xxxx/xxxxx',
  [LibraryErrorCode.DOI_NOT_FOUND]: '未找到匹配的文献，请检查DOI是否正确或手动输入',
  [LibraryErrorCode.VALIDATION_ERROR]: '请求参数验证失败',
  [LibraryErrorCode.NOT_AUTHORIZED]: '未授权访问，请先登录',
  [LibraryErrorCode.RATE_LIMITED]: '操作过于频繁，请稍后再试',
  [LibraryErrorCode.QUOTA_EXCEEDED]: '已达配额上限',
  [LibraryErrorCode.TYPE_MISMATCH]: '文献类型与提供的字段不匹配',
  [LibraryErrorCode.CITATION_NOT_FOUND]: '引用记录不存在',
  [LibraryErrorCode.PAPER_NOT_FOUND]: '论文不存在或无权访问',
  [LibraryErrorCode.BATCH_DELETE_PARTIAL]: '批量删除部分成功',
};
```

---

## 5. DOI模拟数据服务设计

### 5.1 模拟数据库结构

```typescript
interface DOIMockRecord {
  doi: string;
  metadata: {
    type: DocumentType;
    title: string;
    authors: string[];
    journal?: string;
    year?: number;
    volume?: string;
    issue?: string;
    pages?: string;
    university?: string;
    degreeType?: DegreeType;
    publisher?: string;
    isbn?: string;
    location?: string;
    conferenceName?: string;
    conferenceLocation?: string;
    websiteName?: string;
    url?: string;
    patentNumber?: string;
    inventors?: string;
    filingDate?: string;
    issuingAuthority?: string;
  };
}
```

### 5.2 DOIMockService类设计

```typescript
class DOIMockService {
  private database: Map<string, DOIMockRecord>;

  constructor() {
    this.database = this.loadMockData();
  }

  async lookup(doi: string): Promise<{
    found: boolean;
    metadata: DOIMockRecord['metadata'] | null;
    matchType: 'exact' | 'trimmed' | 'prefix' | null;
    lookupTimeMs: number;
  }> {
    const startTime = Date.now();

    const delay = this.simulateNetworkDelay();
    await new Promise(resolve => setTimeout(resolve, delay));

    const result = this.searchDatabase(doi);

    return {
      ...result,
      lookupTimeMs: Date.now() - startTime,
    };
  }

  private searchDatabase(doi: string): {
    found: boolean;
    metadata: DOIMockRecord['metadata'] | null;
    matchType: 'exact' | 'trimmed' | 'prefix' | null;
  } {
    const trimmed = doi.trim();

    if (this.database.has(trimmed)) {
      return {
        found: true,
        metadata: this.database.get(trimmed)!.metadata,
        matchType: 'exact',
      };
    }

    if (trimmed !== doi && this.database.has(trimmed)) {
      return {
        found: true,
        metadata: this.database.get(trimmed)!.metadata,
        matchType: 'trimmed',
      };
    }

    const prefixMatch = this.prefixSearch(trimmed);
    if (prefixMatch) {
      return {
        found: true,
        metadata: prefixMatch.metadata,
        matchType: 'prefix',
      };
    }

    return { found: false, metadata: null, matchType: null };
  }

  private prefixSearch(doi: string): DOIMockRecord | null {
    const parts = doi.split('/');
    if (parts.length < 2) return null;

    const prefix = `${parts[0]}/${parts[1]}`;

    for (const [key, record] of this.database) {
      if (key.startsWith(prefix)) {
        return record;
      }
    }

    return null;
  }

  private simulateNetworkDelay(): number {
    const baseDelay = 800;
    const variance = 700;
    return Math.floor(Math.random() * variance) + baseDelay;
  }

  private loadMockData(): Map<string, DOIMockRecord> {
    const data = new Map<string, DOIMockRecord>();

    // ===== 30条 期刊文章 (JOURNAL_ARTICLE) =====

    data.set('10.1126/science.169.3946.635', {
      doi: '10.1126/science.169.3946.635',
      metadata: {
        type: 'JOURNAL_ARTICLE',
        title: 'The Structure of Ordinary Water',
        authors: ['Henniker, J.C.', 'Kamb, B.'],
        journal: 'Science',
        year: 1970,
        volume: '169',
        issue: '3946',
        pages: '635-637',
      },
    });

    data.set('10.1038/nature12373', {
      doi: '10.1038/nature12373',
      metadata: {
        type: 'JOURNAL_ARTICLE',
        title: 'Deep learning for natural language processing',
        authors: ['Young, T.', 'Hazarika, D.', 'Poria, S.', 'Cambria, E.'],
        journal: 'IEEE Transactions on Pattern Analysis and Machine Intelligence',
        year: 2023,
        volume: '45',
        issue: '3',
        pages: '1234-1267',
      },
    });

    data.set('10.1145/3319535.3353716', {
      doi: '10.1145/3319535.3353716',
      metadata: {
        type: 'JOURNAL_ARTICLE',
        title: 'BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding',
        authors: ['Devlin, J.', 'Chang, M.W.', 'Lee, K.', 'Toutanova, K.'],
        journal: 'Proceedings of NAACL-HLT',
        year: 2019,
        volume: '1',
        issue: '1',
        pages: '4171-4186',
      },
    });

    data.set('10.1109/TPAMI.2023.3245678', {
      doi: '10.1109/TPAMI.2023.3245678',
      metadata: {
        type: 'JOURNAL_ARTICLE',
        title: 'Attention Is All You Need',
        authors: ['Vaswani, A.', 'Shazeer, N.', 'Parmar, N.', 'Uszkoreit, J.', 'Jones, L.', 'Gomez, A.N.', 'Kaiser, Ł.', 'Polosukhin, I.'],
        journal: 'Advances in Neural Information Processing Systems',
        year: 2017,
        volume: '30',
        pages: '5998-6008',
      },
    });

    data.set('10.1016/j.neucom.2023.01.002', {
      doi: '10.1016/j.neucom.2023.01.002',
      metadata: {
        type: 'JOURNAL_ARTICLE',
        title: 'Graph neural networks: A review of methods and applications',
        authors: ['Wu, Z.', 'Pan, S.', 'Chen, F.', 'Long, G.', 'Zhang, C.', 'Philip, S.Y.'],
        journal: 'Neurocomputing',
        year: 2023,
        volume: '520',
        pages: '1-12',
      },
    });

    // ... 更多25条期刊文章数据（涵盖CS/物理/生物/化学等领域）

    // ===== 5条 学位论文 (THESIS) =====

    data.set('10.13140/RG.2.2.29834.66245', {
      doi: '10.13140/RG.2.2.29834.66245',
      metadata: {
        type: 'THESIS',
        title: 'Research on Deep Learning Methods for Image Recognition',
        authors: ['Zhang, San'],
        year: 2022,
        university: 'Tsinghua University',
        degreeType: 'DOCTOR',
      },
    });

    data.set('10.13140/RG.2.2.12345.67890', {
      doi: '10.13140/RG.2.2.12345.67890',
      metadata: {
        type: 'THESIS',
        title: 'Natural Language Processing Based on Transformer Architecture',
        authors: ['Li, Si'],
        year: 2023,
        university: 'Peking University',
        degreeType: 'MASTER',
      },
    });

    // ... 更多3条学位论文

    // ===== 5条 书籍 (BOOK) =====

    data.set('10.5555/2838580', {
      doi: '10.5555/2838580',
      metadata: {
        type: 'BOOK',
        title: 'Deep Learning',
        authors: ['Goodfellow, I.', 'Bengio, Y.', 'Courville, A.'],
        year: 2016,
        publisher: 'MIT Press',
        location: 'Cambridge, MA',
        isbn: '9780262035613',
      },
    });

    // ... 更多4条书籍

    // ===== 5条 会议论文 (CONFERENCE_PAPER) =====

    data.set('10.1145/3394486.3403392', {
      doi: '10.1145/3394486.3403392',
      metadata: {
        type: 'CONFERENCE_PAPER',
        title: 'EfficientNet: Rethinking Model Scaling for Convolutional Neural Networks',
        authors: ['Tan, M.', 'Le, Q.V.'],
        year: 2019,
        conferenceName: 'Proceedings of the 36th International Conference on Machine Learning',
        conferenceLocation: 'Long Beach, CA',
        pages: '6105-6114',
      },
    });

    // ... 更多4条会议论文

    // ===== 3条 网页 (WEBPAGE) =====

    data.set('10.5555/00000001.00000001', {
      doi: '10.5555/00000001.00000001',
      metadata: {
        type: 'WEBPAGE',
        title: 'GPT-4 Technical Report',
        authors: ['OpenAI'],
        year: 2023,
        websiteName: 'OpenAI Research',
        url: 'https://openai.com/research/gpt-4',
      },
    });

    // ... 更多2条网页

    // ===== 2条 专利 (PATENT) =====

    data.set('10.5555/PAT.2023000001', {
      doi: '10.5555/PAT.2023000001',
      metadata: {
        type: 'PATENT',
        title: 'Neural Network Architecture Search Method and System',
        authors: ['Chen, Wu', 'Wang, Liu'],
        year: 2023,
        patentNumber: 'CN115861234A',
        filingDate: '2023-01-15',
        issuingAuthority: 'China National Intellectual Property Administration',
      },
    });

    // ... 更多1条专利

    return data;
  }
}

export const doiMockService = new DOIMockService();
```

### 5.3 匹配算法优先级

```
输入DOI: "  10.1038/nature12373  "

Step 1: 精确匹配 (去除首尾空格后)
  Key: "10.1038/nature12373"
  Result: ✅ HIT (matchType: 'exact')

---

输入DOI: "10.1145/3319535.3353716"

Step 1: 精确匹配
  Key: "10.1145/3319535.3353716"
  Result: ✅ HIT (matchType: 'exact')

---

输入DOI: "10.1145/3319535"

Step 1: 精确匹配 → MISS
Step 2: trim匹配 → SAME (无变化)
Step 3: 前缀模糊匹配
  Prefix: "10.1145/3319535"
  遍历数据库找到: "10.1145/3319535.3353716" 以此前缀开头
  Result: ⚠️ PARTIAL MATCH (matchType: 'prefix')

---

输入DOI: "10.abc/invalid"

Step 1: 精确匹配 → MISS
Step 2: trim匹配 → MISS
Step 3: 前缀模糊匹配 → MISS
Result: ❌ NOT FOUND
```

---

## 6. 前端组件架构

### 6.1 页面路由规划

| 路由路径 | 页面名称 | 功能描述 | 文件路径 |
|---------|---------|---------|---------|
| `/library` | 文献库主页 | 列表+搜索+统计+工具栏 | `frontend/app/library/page.tsx` |
| `/library/new` | 添加文献页 | 动态表单+实时预览 | `frontend/app/library/new/page.tsx` |
| `/library/[id]` | 文献详情页 | 元数据+引用预览+复制 | `frontend/app/library/[id]/page.tsx` |
| `/library/[id]/edit` | 编辑文献页 | 编辑表单+预览 | `frontend/app/library/[id]/edit/page.tsx` |

### 6.2 组件树结构

```
App Layout
├── Sidebar Navigation
│   ├── 📄 我的论文
│   ├── 🔬 AIGC检测
│   └── 📚 我的文献库 ← 新增入口
│
└── Main Content Area
    └── /library 路由组
        ├── LibraryLayout (共享布局)
        │   ├── Header ("我的文献库")
        │   └── Content Area
        │
        ├── LibraryPage (/library)
        │   ├── StatisticsBar (统计卡片)
        │   │   ├── StatCard (总文献数)
        │   │   ├── StatCard (本月新增)
        │   │   ├── StatCard (类型分布)
        │   │   └── StatCard (被引用数)
        │   ├── Toolbar (工具栏)
        │   │   ├── SearchBar (搜索框)
        │   │   ├── FilterBar (排序/类型/视图切换)
        │   │   └── ActionBar (添加/导入/导出/删除按钮)
        │   ├── DocumentTable (文献列表表格)
        │   │   ├── TableRow × N
        │   │   ├── Checkbox (多选)
        │   │   ├── TypeBadge (类型标签)
        │   │   └── ActionMenu (行操作菜单)
        │   └── Pagination (分页组件)
        │
        ├── NewDocumentPage (/library/new)
        │   ├── DocumentForm (动态表单)
        │   │   ├── TypeSelector (类型下拉)
        │   │   ├── BaseFields (通用字段)
        │   │   ├── JournalFields (期刊字段, 条件显示)
        │   │   ├── ThesisFields (学位论文字段)
        │   │   ├── BookFields (书籍字段)
        │   │   ├── ConferenceFields (会议字段)
        │   │   ├── WebpageFields (网页字段)
        │   │   ├── PatentFields (专利字段)
        │   │   ├── DOILookupButton (DOI检索按钮)
        │   │   └── FormActions (保存/取消)
        │   └── CitationPreviewPanel (右侧预览面板)
        │       ├── CitationCard (GB/T 7714)
        │       ├── CitationCard (APA 7)
        │       └── CitationCard (MLA 9)
        │
        ├── DocumentDetailPage (/library/[id])
        │   ├── DocumentHeader (标题+操作按钮)
        │   ├── MetadataCard (基本信息展示)
        │   ├── CitationGenerator (引用生成区)
        │   │   ├── FormatTabs (格式切换Tab)
        │   │   ├── CitationDisplay (引用文本展示)
        │   │   └── CopyButton (复制按钮)
        │   └── RelatedPapersSection (关联论文列表)
        │
        ├── EditDocumentPage (/library/[id]/edit)
        │   └── (复用NewDocumentPage的DocumentForm组件)
        │
        └── Modal Components (全局弹窗)
            ├── DOILookupModal (DOI导入弹窗)
            │   ├── DOIInput (输入框+示例)
            │   ├── LookupHistory (历史记录)
            │   └── LoadingState (加载动画)
            │
            ├── BatchOperationModal (批量操作确认弹窗)
            │   └── OperationOptions (导出/删除/关联选项)
            │
            └── CitationPickerModal (编辑器引用选择器)
                ├── SearchInput (文献搜索)
                ├── DocumentList (可选文献列表)
                ├── FormatSelector (格式选择)
                └── InsertButton (插入按钮)
```

### 6.3 新增组件清单

| 组件名 | 文件路径 | 行数估算 | 功能 |
|-------|---------|---------|------|
| `StatisticsBar` | `components/library/StatisticsBar.tsx` | ~80行 | 4个统计卡片横排 |
| `SearchBar` | `components/library/SearchBar.tsx` | ~60行 | 搜索框+防抖+清除 |
| `FilterBar` | `components/library/FilterBar.tsx` | ~90行 | 排序/类型/视图切换 |
| `DocumentTable` | `components/library/DocumentTable.tsx` | ~180行 | 文献列表表格+排序+选择 |
| `DocumentForm` | `components/library/DocumentForm.tsx` | ~350行 | 动态表单(6种类型切换) |
| `CitationPreviewPanel` | `components/library/CitationPreviewPanel.tsx` | ~120行 | 右侧3格式实时预览 |
| `CitationGenerator` | `components/library/CitationGenerator.tsx` | ~150行 | 引用生成+复制+格式切换 |
| `DOILookupModal` | `components/library/DOILookupModal.tsx` | ~130行 | DOI检索弹窗 |
| `CitationPickerModal` | `components/library/CitationPickerModal.tsx` | ~160行 | 编辑器内嵌引用选择器 |
| `TypeBadge` | `components/library/TypeBadge.tsx` | ~30行 | 文献类型彩色标签 |

### 6.4 状态管理方案（Zustand Store）

```typescript
import { create } from 'zustand';

interface LibraryStore {
  // 列表状态
  documents: Array<Record<string, unknown>>;
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
  filters: {
    search: string;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
    type: string | null;
    hasDoi: boolean | null;
  };
  selectedIds: Set<string>;
  loading: boolean;
  error: string | null;

  // 详情状态
  activeDocument: Record<string, unknown> | null;
  citations: { GBT7714: string; APA7: string; MLA9: string } | null;

  // 表单状态
  formData: Partial<Record<string, unknown>>;
  formDirty: boolean;
  previewCitations: { GBT7714: string; APA7: string; MLA9: string } | null;

  // Actions
  fetchDocuments: () => Promise<void>;
  setSearch: (search: string) => void;
  setFilters: (filters: Partial<LibraryStore['filters']>) => void;
  toggleSelect: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  setActiveDocument: (doc: Record<string, unknown> | null) => void;
  setFormData: (data: Partial<Record<string, unknown>>) => void;
  resetForm: () => void;
  generatePreview: (data: Record<string, unknown>) => Promise<void>;

  // CRUD Actions
  createDocument: (data: Record<string, unknown>) => Promise<void>;
  updateDocument: (id: string, data: Record<string, unknown>) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  batchDelete: (ids: string[]) => Promise<void>;
  lookupDOI: (doi: string) => Promise<Record<string, unknown>>;
  generateCitations: (ids: string[], format: string) => Promise<string[]>;
}

export const useLibraryStore = create<LibraryStore>((set, get) => ({
  documents: [],
  pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
  filters: { search: '', sortBy: 'createdAt', sortOrder: 'desc', type: null, hasDoi: null },
  selectedIds: new Set(),
  loading: false,
  error: null,
  activeDocument: null,
  citations: null,
  formData: {},
  formDirty: false,
  previewCitations: null,

  fetchDocuments: async () => {
    set({ loading: true, error: null });
    try {
      const { page, pageSize, search, sortBy, sortOrder, type, hasDoi } = get().filters;
      const response = await libraryApi.getList({
        page: get().pagination.page,
        pageSize,
        search,
        sortBy,
        sortOrder,
        type: type || undefined,
        hasDoi: hasDoi === null ? undefined : hasDoi.toString(),
      });
      set({
        documents: response.data.documents,
        pagination: response.data.pagination,
        loading: false,
      });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  // ... 其他actions实现类似
}));
```

### 6.5 api.ts 扩展（libraryApi对象）

```typescript
// frontend/lib/api.ts 扩展部分

export interface DocumentListItem {
  id: string;
  type: DocumentType;
  title: string;
  authors: string;
  year: number | null;
  journal?: string | null;
  university?: string | null;
  publisher?: string | null;
  doi: string | null;
  citationCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentDetail {
  id: string;
  type: DocumentType;
  title: string;
  authors: string;
  year: number | null;
  doi: string | null;
  url: string | null;
  abstract: string | null;
  keywords: string[];
  notes: string | null;
  citationCount: number;
  createdAt: string;
  updatedAt: string;
  journalData: { journal: string | null; volume: string | null; issue: string | null; pages: string | null } | null;
  thesisData: { university: string | null; degreeType: DegreeType | null } | null;
  bookData: { publisher: string | null; edition: string | null; isbn: string | null; location: string | null } | null;
  conferenceData: { conferenceName: string | null; conferenceLocation: string | null; editors: string | null; pages: string | null } | null;
  webpageData: { websiteName: string | null; url: string | null; accessDate: string | null; publishDate: string | null } | null;
  patentData: { patentNumber: string | null; inventors: string | null; filingDate: string | null; issuingAuthority: string | null } | null;
}

export interface DOILookupResult {
  found: boolean;
  metadata: {
    type: DocumentType;
    title: string;
    authors: string[];
    journal?: string;
    year?: number;
    volume?: string;
    issue?: string;
    pages?: string;
    doi: string;
    university?: string;
    degreeType?: DegreeType;
    publisher?: string;
    isbn?: string;
    location?: string;
    conferenceName?: string;
    conferenceLocation?: string;
    websiteName?: string;
    url?: string;
    patentNumber?: string;
    inventors?: string;
    filingDate?: string;
    issuingAuthority?: string;
  } | null;
  matchType: 'exact' | 'trimmed' | 'prefix' | null;
  lookupTimeMs: number;
}

export const libraryApi = {
  getList: async (params?: {
    page?: number;
    pageSize?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    type?: string;
    hasDoi?: string;
    yearFrom?: number;
    yearTo?: number;
  }): Promise<{ success: boolean; data: { documents: DocumentListItem[]; pagination: any; statistics: any } }> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.pageSize) queryParams.append('pageSize', params.pageSize.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);
    if (params?.type) queryParams.append('type', params.type);
    if (params?.hasDoi) queryParams.append('hasDoi', params.hasDoi);
    if (params?.yearFrom) queryParams.append('yearFrom', params.yearFrom.toString());
    if (params?.yearTo) queryParams.append('yearTo', params.yearTo.toString());

    const queryString = queryParams.toString();
    const response = await apiClient.get(`/library/documents${queryString ? `?${queryString}` : ''}`);
    return response.data;
  },

  getById: async (id: string): Promise<{ success: boolean; data: { document: DocumentDetail; citations: any; relatedPapers: any[] } }> => {
    const response = await apiClient.get(`/library/documents/${id}`);
    return response.data;
  },

  create: async (data: Record<string, unknown>): Promise<{ success: boolean; data: { document: { id: string; type: string; title: string; createdAt: string } } }> => {
    const response = await apiClient.post('/library/documents', data);
    return response.data;
  },

  update: async (id: string, data: Record<string, unknown>): Promise<{ success: boolean; data: { document: DocumentDetail } }> => {
    const response = await apiClient.put(`/library/documents/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<{ success: boolean; data: { deletedId: string; wasCited: boolean; citedByCount: number } }> => {
    const response = await apiClient.delete(`/library/documents/${id}`);
    return response.data;
  },

  batchDelete: async (ids: string[]): Promise<{ success: boolean; data: { deletedCount: number; failedIds: any[]; warningMessage?: string } }> => {
    const response = await apiClient.post('/library/documents/batch-delete', { ids, confirmWarning: true });
    return response.data;
  },

  lookupDOI: async (doi: string): Promise<{ success: boolean; data: DOILookupResult }> => {
    const response = await apiClient.post('/library/doi/lookup', { doi });
    return response.data;
  },

  generateCitations: async (documentIds: string[], format: CitationFormat = 'GBT7714'): Promise<{ success: boolean; data: { citations: any[]; format: string; generatedAt: string } }> => {
    const response = await apiClient.post('/library/citations/generate', { documentIds, format });
    return response.data;
  },

  exportCitations: async (documentIds: string[], format: CitationFormat, options?: { outputType?: 'text' | 'json'; includeHeader?: boolean; sortBy?: string }): Promise<any> => {
    const response = await apiClient.post('/library/export', {
      documentIds,
      format,
      outputType: options?.outputType || 'text',
      includeHeader: options?.includeHeader !== false,
      sortBy: options?.sortBy || 'citationNumber',
    });
    return response.data;
  },

  getPaperCitations: async (paperId: string): Promise<{ success: boolean; data: any }> => {
    const response = await apiClient.get(`/papers/${paperId}/citations`);
    return response.data;
  },

  insertCitation: async (paperId: string, documentIds: string[], format?: CitationFormat, position?: number): Promise<any> => {
    const response = await apiClient.post(`/papers/${paperId}/citations`, { documentIds, format, position });
    return response.data;
  },

  removeCitation: async (paperId: string, citationId: string): Promise<any> => {
    const response = await apiClient.delete(`/papers/${paperId}/citations/${citationId}`);
    return response.data;
  },

  renumberCitations: async (paperId: string): Promise<any> => {
    const response = await apiClient.put(`/papers/${paperId}/citations/renumber`);
    return response.data;
  },
};
```

---

## 7. 代码复用分析

### 7.1 从 papers.ts 直接复用的模式

| 模式 | 来源代码 | 复用位置 | 用途 |
|-----|---------|---------|------|
| **JWT认证中间件** | `fastify.authenticate` | 所有13个API端点 | 用户身份验证 |
| **AES加解密函数** | [papers.ts#L59-L73](file:///workspace/智论平台/backend/src/routes/papers.ts#L59-L73) | library.ts | 敏感字段加密（可选） |
| **Zod验证+错误转换** | [papers.ts#L279-L285](file:///workspace/智论平台/backend/src/routes/papers.ts#L279-L285) | library.ts 所有端点 | 请求体验证 |
| **统一错误响应格式** | [papers.ts#L270-L276](file:///workspace/智论平台/backend/src/routes/papers.ts#L270-L276) | library.ts | `{success, error: {code, message}}` |
| **Prisma所有权校验** | [papers.ts#L422-L437](file:///workspace/智论平台/backend/src/routes/papers.ts#L422-L437) | library.ts 详情/更新/删除 | `where: { id, userId, deletedAt: null }` |
| **Redis缓存读写** | [papers.ts#L409-L419](file:///workspace/智论平台/backend/src/routes/papers.ts#L409-L419) | 引用生成缓存 | `get/setex` + TTL |
| **UsageLog记录** | [papers.ts#L302-310](file:///workspace/智论平台/backend/src/routes/papers.ts#L302-L310) | library.ts 操作日志 | action: 'library_create/delete/export' |
| **错误码枚举模式** | [papers.ts#L14-L23](file:///workspace/智论平台/backend/src/routes/papers.ts#L14-L23) | library.ts | `LibraryErrorCode` 枚举定义 |

### 7.2 从 aigc.ts 复用的模式

| 模式 | 来源 | 复用位置 | 用途 |
|-----|------|---------|------|
| **复杂查询参数Schema** | aigc.ts historyQuerySchema | library.ts listQuerySchema | 多条件组合查询验证 |
| **批量操作模式** | aigc.ts batch处理 | library.ts batch-delete | 数组参数+事务处理 |
| **前端SSE消费模式** | aigcApi.rewrite SSE解析 | (本模块暂不需要SSE) | 未来流式引用生成预留 |

### 7.3 新增公共工具函数

```typescript
// backend/src/utils/libraryUtils.ts

/** DOI格式验证 */
export function isValidDOI(doi: string): boolean {
  return /^10\.\d{4,}\/[^\s]+$/.test(doi.trim());
}

/** ISBN格式验证 (支持ISBN-10和ISBN-13) */
export function isValidISBN(isbn: string): boolean {
  const cleaned = isbn.replace(/[-\s]/g, '');
  return /^(?:978|979|10)\d{9}[\dX]$/.test(cleaned) || /^\d{9}[\dX]$/.test(cleaned);
}

/** URL格式验证 */
export function isValidURL(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/** 年份范围验证 */
export function isValidYear(year: number): boolean {
  return Number.isInteger(year) && year >= 1900 && year <= new Date().getFullYear() + 1;
}

/** 页码格式验证 (支持 "123-456" 和 "e202301") */
export function isValidPages(pages: string): boolean {
  return /^\d+(-\d+)?$/.test(pages) || /^e\d+$/.test(pages);
}

/** 生成引用缓存Key */
export function getCitationCacheKey(userId: string, documentId: string, format: CitationFormat): string {
  return `citation:${userId}:${documentId}:${format}`;
}

/** 清理HTML防止XSS */
export function sanitizeHTML(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}
```

---

## 8. 性能优化策略

### 8.1 数据库索引设计

```sql
-- 核心查询索引（已在Schema中定义）
CREATE INDEX idx_documents_user_created ON documents(user_id, created_at DESC);
CREATE INDEX idx_documents_user_type ON documents(user_id, type);
CREATE INDEX idx_documents_user_deleted ON documents(user_id, deleted_at) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX documents_doi_key ON documents(doi) WHERE doi IS NOT NULL;
CREATE INDEX idx_documents_user_year ON documents(user_id, year);

-- 全文搜索优化（PostgreSQL ILIKE利用索引）
-- 注意: ILIKE本身不走普通B-tree索引，以下为未来升级全文检索预留
-- CREATE INDEX idx_documents_search ON documents USING gin(to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(authors, '')));

-- 引用关系索引
CREATE INDEX idx_paper_citations_paper_number ON paper_citations(paper_id, citation_number);
CREATE INDEX idx_paper_citations_document ON paper_citations(document_id);
CREATE INDEX idx_paper_citations_paper_document ON paper_citations(paper_id, document_id);
```

**索引使用场景分析：**

| 查询场景 | 使用索引 | 预期性能 |
|---------|---------|---------|
| 文献列表（默认排序） | `idx_documents_user_created` | <50ms (10000条数据) |
| 按类型筛选 | `idx_documents_user_type` | <20ms |
| DOI精确查找 | `documents_doi_key (UNIQUE)` | <5ms |
| 搜索+排序组合 | `idx_documents_user_created` + filter | <100ms |
| 论文引用列表 | `idx_paper_citations_paper_number` | <10ms |
| 文献被引查询 | `idx_paper_citations_document` | <10ms |

### 8.2 缓存策略

```typescript
// 引用生成结果缓存（TTL=1小时）
const CITATION_CACHE_TTL = 3600;

async function getCachedCitation(
  redis: Redis,
  userId: string,
  documentId: string,
  format: CitationFormat
): Promise<string | null> {
  const key = getCitationCacheKey(userId, documentId, format);
  const cached = await redis.get(key);
  return cached ? JSON.parse(cached) : null;
}

async function setCachedCitation(
  redis: Redis,
  userId: string,
  documentId: string,
  format: CitationFormat,
  citation: string
): Promise<void> {
  const key = getCitationCacheKey(userId, documentId, format);
  await redis.setex(key, CITATION_CACHE_TTL, JSON.stringify(citation));
}

// 文献列表摘要缓存（TTL=5分钟，仅缓存统计数据）
const LIST_STATS_CACHE_TTL = 300;

async function getListStatsCache(redis: Redis, userId: string): Promise<object | null> {
  const key = `library_stats:${userId}`;
  const cached = await redis.get(key);
  return cached ? JSON.parse(cached) : null;
}
```

**缓存层级：**

| 层级 | 缓存内容 | TTL | 失效策略 |
|-----|---------|-----|---------|
| L1-引用结果 | 单条文献×格式的引用文本 | 1h | 文献更新时主动删除 |
| L2-列表统计 | 总数/类型分布/月新增 | 5min | CRUD操作后删除 |
| L3-DOI检索 | 无（MVP每次都查模拟DB） | - | - |

### 8.3 分页和虚拟滚动

**后端分页策略：**
- 默认 `pageSize = 20`，可选 10/20/50
- 使用 `cursor-based` 分页替代 offset（大数据量时更优）
- 响应包含 `hasNext`/`hasPrev` 用于前端按钮状态控制

**前端虚拟滚动（可选优化，P1阶段）：**
- 当列表超过200条时启用 `react-virtualized`
- 固定行高 64px，预估高度准确
- 滚动时动态渲染可见区域±10条

### 8.4 批量操作优化

```typescript
// 批量删除：使用事务+批量UPDATE
async function batchDeleteDocuments(ids: string[], userId: string) {
  return prisma.$transaction(async (tx) => {
    const now = new Date();

    const result = await tx.document.updateMany({
      where: {
        id: { in: ids },
        userId,
        deletedAt: null,
      },
      data: { deletedAt: now },
    });

    return { deletedCount: result.count };
  });
}

// 批量引用生成：并行调用引擎（CPU密集型，可用worker_threads）
async function batchGenerateCitations(documents: any[], format: CitationFormat): Promise<string[]> {
  const BATCH_SIZE = 10;
  const results: string[] = [];

  for (let i = 0; i < documents.length; i += BATCH_SIZE) {
    const batch = documents.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(doc => citationEngine.generate(doc, format))
    );
    results.push(...batchResults);
  }

  return results;
}
```

---

## 9. 测试策略

### 9.1 单元测试范围（重点：引用引擎）

**引用引擎测试矩阵（3格式 × 6类型 = 18+ 核心场景）：**

```typescript
describe('CitationEngine', () => {
  describe('GBT7714Renderer', () => {
    it('应正确生成期刊文章引用（单作者）', () => {
      const doc = mockJournalArticle({ authors: '张三', year: 2023 });
      const result = engine.generate(doc, 'GBT7714');
      expect(result).toContain('张三.');
      expect(result).toContain('[J]');
      expect(result.toEndWith('.'));
    });

    it('应正确处理超过3个作者的et al省略', () => {
      const doc = mockJournalArticle({
        authors: 'Smith, J.; Johnson, A.; Williams, C.; Brown, D.; Davis, E.'
      });
      const result = engine.generate(doc, 'GBT7714');
      expect(result).toContain('等');
      expect(result).not.toContain('Davis');
    });

    it('英文作者姓应全大写', () => {
      const doc = mockJournalArticle({ authors: 'Smith, John R.' });
      const result = engine.generate(doc, 'GBT7714');
      expect(result).toContain('SMITH');
    });

    it('学位论文应使用[D]标识', () => {
      const doc = mockThesis({ university: '清华大学', degreeType: 'DOCTOR' });
      const result = engine.generate(doc, 'GBT7714');
      expect(result).toContain('[D]');
      expect(result).toContain('清华大学');
    });

    it('书籍应使用[M]标识并包含出版社', () => {
      const doc = mockBook({ publisher: '机械工业出版社', location: '北京' });
      const result = engine.generate(doc, 'GBT7714');
      expect(result).toContain('[M]');
      expect(result).toContain('机械工业出版社');
      expect(result).toContain(': 北京');
    });

    it('网页应使用[EB/OL]标识并包含URL', () => {
      const doc = mockWebpage({ websiteName: 'OpenAI', url: 'https://openai.com' });
      const result = engine.generate(doc, 'GBT7714');
      expect(result).toContain('[EB/OL]');
      expect(result).toContain('openai.com');
    });

    it('缺少年份时应显示[s.n.]', () => {
      const doc = mockJournalArticle({ year: undefined });
      const result = engine.generate(doc, 'GBT7714');
      expect(result).toContain('[s.n.]');
    });
  });

  describe('APA7Renderer', () => {
    it('期刊名应为斜体（通过*标记）', () => {
      const doc = mockJournalArticle({ journal: 'Nature' });
      const result = engine.generate(doc, 'APA7');
      expect(result).toContain('*Nature*');
    });

    it('21+作者应显示前19 + ... + 最后1人', () => {
      const authors = Array.from({ length: 25 }, (_, i) => `Author${i}, A.`);
      const doc = mockJournalArticle({ authors: authors.join('; ') });
      const result = engine.generate(doc, 'APA7');
      expect(result).toContain('... ');
    });

    it('年份应在括号内位于作者之后', () => {
      const doc = mockJournalArticle({ year: 2023 });
      const result = engine.generate(doc, 'APA7');
      expect(result).toMatch(/\(\d{4}\)/);
    });

    it('DOI应转换为URL格式', () => {
      const doc = mockJournalArticle({ doi: '10.1234/test.5678' });
      const result = engine.generate(doc, 'APA7');
      expect(result).toContain('https://doi.org/10.1234/test.5678');
    });
  });

  describe('MLA9Renderer', () => {
    it('文章标题应在双引号内', () => {
      const doc = mockJournalArticle({ title: 'Test Article Title' });
      const result = engine.generate(doc, 'MLA9');
      expect(result).toMatch(/"[^"]+"/);
    });

    it('卷号应使用vol.格式', () => {
      const doc = mockJournalArticle({ volume: '45' });
      const result = engine.generate(doc, 'MLA9');
      expect(result).toContain('vol. 45');
    });

    it('所有作者应列出（无et al）', () => {
      const authors = ['A, B.', 'C, D.', 'E, F.', 'G, H.'];
      const doc = mockJournalArticle({ authors: authors.join('; ') });
      const result = engine.generate(doc, 'MLA9');
      expect(result).not.toContain('et al.');
      expect(result).toContain('and');
    });
  });

  describe('AuthorParser', () => {
    it('应正确解析中文作者", () => {
      const result = parseAuthors('张三, 李四, 王五');
      expect(result).toHaveLength(3);
      expect(result[0].lastName).toBe('张三');
      expect(result[0].isChinese).toBe(true);
    });

    it('应正确解析Last, First格式的西文作者', () => {
      const result = parseAuthors('Smith, J.R.; Johnson, A.B.');
      expect(result).toHaveLength(2);
      expect(result[0].lastName).toBe('Smith');
      expect(result[0].firstName).toBe('J');
      expect(result[0].isChinese).toBe(false);
    });

    it('应正确解析First Last格式的西文作者', () => {
      const result = parseAuthors('Yann LeCun, Yoshua Bengio, Geoffrey Hinton');
      expect(result).toHaveLength(3);
      expect(result[0].lastName).toBe('LeCun');
      expect(result[0].firstName).toBe('Yann');
    });

    it('应处理混合中英文作者', () => {
      const result = parseAuthors('张三; Smith JR; 王五');
      expect(result).toHaveLength(3);
      expect(result[0].isChinese).toBe(true);
      expect(result[1].isChinese).toBe(false);
      expect(result[2].isChinese).toBe(true);
    });
  });
});
```

### 9.2 集成测试用例

| 编号 | 场景 | 步骤 | 预期结果 | 优先级 |
|-----|------|------|---------|--------|
| IT-01 | 完整CRUD流程 | 创建→查看→编辑→删除文献 | 全部成功，数据一致 | P0 |
| IT-02 | 6种类型文献创建 | 分别创建6种类型的文献 | 各类型字段校验正确 | P0 |
| IT-03 | DOI检索成功 | 输入有效DOI→自动填充 | 返回元数据，字段填充正确 | P0 |
| IT-04 | DOI检索失败 | 输入无效DOI | 返回404 DOI_NOT_FOUND | P0 |
| IT-05 | 三格式引用生成 | 同一篇文献生成3种格式 | 各格式符合规范标准 | P0 |
| IT-06 | 批量引用生成 | 50篇文献批量生成 | 全部返回，耗时<1s | P0 |
| IT-07 | 批量删除 | 选择10篇文献批量删除 | 全部软删除，citationCount归零 | P0 |
| IT-08 | 搜索功能 | 按/作者/关键词/DOI搜索 | 结果正确，高亮匹配 | P0 |
| IT-09 | 排序功能 | 按时间/标题/作者/年份排序 | 排序正确 | P0 |
| IT-10 | 编辑器插入引用 | 向论文插入3个引用 | 自动编号1/2/3，参考文献列表更新 | P0 |
| IT-11 | 引用删除后重编号 | 删除第2个引用 | 剩余引用重编号为1/2 | P0 |
| IT-12 | 权限隔离 | User A访问User B的文献 | 404 DOCUMENT_NOT_FOUND | P0 |
| IT-13 | DOI重复检测 | 尝试用相同DOI创建第二篇 | 409 DUPLICATE_DOI | P0 |
| IT-14 | 导出功能 | 导出50篇文献的GB/T引用 | 返回纯文本文件，格式正确 | P1 |
| IT-15 | 配额上限 | 尝试创建第10001篇文献 | 413 QUOTA_EXCEEDED | P1 |

### 9.3 E2E测试场景

| 场景 | 用户操作路径 | 验证点 |
|-----|------------|--------|
| 完整学术写作流程 | 登录→进入知识库→DOI导入3篇文献→手动添加1篇→进入编辑器→插入全部4个引用→查看参考文献列表→导出引用 | 全链路通畅，引用格式正确 |
| 大规模文献管理 | 批量导入50篇文献→搜索→排序→筛选→批量导出→批量删除20篇 | 性能达标，操作流畅 |
| 多格式切换 | 添加1篇文献→详情页依次点击GB/T/APA/MLA→分别复制 | 三种格式均符合规范，复制成功 |

---

## 10. 安全设计

### 10.1 认证与授权

**JWT认证（完全复用现有机制）：**

```typescript
// 所有13个API端点统一使用fastify.authenticate中间件
libraryRoute.addHook('onRequest', async (request, reply) => {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.status(401).send({
      success: false,
      error: { code: 'NOT_AUTHORIZED', message: '未授权访问，请先登录' }
    });
  }
});
```

### 10.2 用户数据隔离（强制userId过滤）

**所有数据库查询必须包含 `userId` 条件：**

```typescript
// 安全查询模式（强制执行）
async function getDocumentForUser(userId: string, documentId: string) {
  const doc = await prisma.document.findFirst({
    where: {
      id: documentId,
      userId,
      deletedAt: null,       // 软删除过滤
    },
  });

  if (!doc) {
    throw new AppError(LibraryErrorCode.DOCUMENT_NOT_FOUND, 404);
  }

  return doc;
}

// 列表查询自动隔离
async function listUserDocuments(userId: string, params: ListParams) {
  return prisma.document.findMany({
    where: {
      userId,                // 强制用户过滤
      deletedAt: null,       // 软删除
      // ... 其他筛选条件
    },
  });
}
```

**防越权检查清单：**

| 操作 | 防护措施 | 实现位置 |
|-----|---------|---------|
| 查看详情 | `where: { id, userId }` | GET /documents/:id |
| 更新文献 | 先查后改，校验所有权 | PUT /documents/:id |
| 删除文献 | 先查后删，校验所有权 | DELETE /documents/:id |
| 批量删除 | 批量校验每个ID | POST /batch-delete |
| 生成引用 | 校验documentId归属 | POST /citations/generate |
| 插入引用 | 校验paperId+documentId双归属 | POST /papers/:id/citations |

### 10.3 输入净化（XSS防护）

```typescript
// 后端净化层
function sanitizeInput(input: unknown): unknown {
  if (typeof input === 'string') {
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim()
      .substring(0, maxLength);
  }

  if (Array.isArray(input)) {
    return input.map(item => sanitizeInput(item));
  }

  if (typeof input === 'object' && input !== null) {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[sanitizeInput(key) as string] = sanitizeInput(value);
    }
    return sanitized;
  }

  return input;
}

// 前端输出层（React默认转义）
// 所有通过 {variable} 渲染的文本内容自动被React JSX转义
// 危险情况：dangerouslySetInnerHTML（禁止使用）

// 引用文本特殊处理
function renderCitationText(text: string): React.ReactNode {
  const parts = text.split(/(\*[^*]+\*)/);  // 分割斜体标记

  return (
    <span>
      {parts.map((part, i) =>
        part.startsWith('*') && part.endsWith('*') ?
          <em key={i}>{part.slice(1, -1)}</em> :
          <span key={i}>{part}</span>
      )}
    </span>
  );
}
```

### 10.4 限流策略

```typescript
// Fastify限流配置（复用现有中间件模式）
import rateLimit from '@fastify/rate-limit';

// 全局知识库模块限流
await fastify.register(rateLimit, {
  max: 200,              // 每窗口最大请求数
  timeWindow: '1 minute', // 时间窗口
  keyGenerator: (request) => request.user?.id || request.ip,
  errorResponseBuilder: () => ({
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: '操作过于频繁，请稍后再试',
    },
  }),
});

// 特殊端点更严格限制
const specialLimits: Record<string, { max: number; timeWindow: string }> = {
  '/api/v1/library/doi/lookup':     { max: 30,  timeWindow: '1 minute' },   // DOI检索
  '/api/v1/library/citations/generate': { max: 60,  timeWindow: '1 minute' }, // 引用生成
  '/api/v1/library/documents':        { max: 100, timeWindow: '1 minute' },   // 列表查询
};

// DOI检索额外防护：防止暴力枚举模拟数据
async function doiLookupWithRateLimit(userId: string, doi: string) {
  const redisKey = `doi_lookup:${userId}`;
  const count = await redis.incr(redisKey);

  if (count === 1) {
    await redis.expire(redisKey, 60); // 60秒窗口
  }

  if (count > 30) {
    throw new AppError(LibraryErrorCode.RATE_LIMITED, 429);
  }

  return doiMockService.lookup(doi);
}
```

**限流配置总览：**

| 端点组 | 窗口 | 上限 | 说明 |
|-------|------|------|------|
| 知识库全局 | 1分钟 | 200次 | 常规CRUD操作 |
| DOI检索 | 1分钟 | 30次 | 防止枚举攻击 |
| 引用生成 | 1分钟 | 60次 | CPU密集型操作保护 |
| 列表查询 | 1分钟 | 100次 | 数据库压力控制 |
| 批量导出 | 10分钟 | 5次 | 大量数据处理保护 |

---

## 附录A: 文件结构清单

```
backend/
├── src/
│   ├── routes/
│   │   ├── library.ts                    # 新建 ~700行 (10个API端点)
│   │   └── papers.ts                     # 扩展 +~200行 (3个编辑器集成端点)
│   ├── services/
│   │   ├── libraryService.ts             # 新建 ~400行 (业务逻辑)
│   │   ├── citationEngine.ts             # 新建 ~800行 (引用格式引擎)
│   │   └── doiMockService.ts             # 新建 ~300行 (DOI模拟服务)
│   ├── types/
│   │   └── library.ts                    # 新建 ~250行 (类型定义+Zod Schema)
│   └── utils/
│       └── libraryUtils.ts               # 新建 ~80行 (公共工具函数)
├── prisma/
│   ├── schema.prisma                     # 扩展 (Document+PaperCitation)
│   └── migrations/
│       └── xxx_add_library_citation_system/  # 新增migration

frontend/
├── app/
│   └── library/
│       ├── page.tsx                      # 新建 ~250行 (列表页)
│       ├── new/
│       │   └── page.tsx                  # 新建 ~350行 (添加页)
│       └── [id]/
│           ├── page.tsx                  # 新建 ~280行 (详情页)
│           └── edit/
│               └── page.tsx              # 新建 ~320行 (编辑页)
├── components/
│   └── library/
│       ├── StatisticsBar.tsx             # 新建 ~80行
│       ├── SearchBar.tsx                 # 新建 ~60行
│       ├── FilterBar.tsx                 # 新建 ~90行
│       ├── DocumentTable.tsx             # 新建 ~180行
│       ├── DocumentForm.tsx              # 新建 ~350行
│       ├── CitationPreviewPanel.tsx      # 新建 ~120行
│       ├── CitationGenerator.tsx         # 新建 ~150行
│       ├── DOILookupModal.tsx            # 新建 ~130行
│       ├── CitationPickerModal.tsx       # 新建 ~160行
│       └── TypeBadge.tsx                 # 新建 ~30行
├── lib/
│   ├── api.ts                            # 扩展 +~150行 (libraryApi对象)
│   └── stores/
│       └── libraryStore.ts               # 新建 ~200行 (Zustand store)

docs/
└── TECH_SPEC-知识库引用管理-MVP.md        # 本文档 (~3700行)
```

## 附录B: 开发工作量估算

| 任务编号 | 任务描述 | 复杂度 | 预估工时 | 依赖项 |
|---------|---------|--------|---------|--------|
| T-01 | Prisma Schema扩展+Migration | 低 | 0.5h | 无 |
| T-02 | 类型定义 (types/library.ts) | 低 | 1h | T-01 |
| T-03 | DOIMockService实现 | 中 | 2h | T-02 |
| T-04 | CitationEngine核心(数据层+规则层) | 高 | 6h | T-02 |
| T-05 | GBT7714Renderer实现 | 高 | 4h | T-04 |
| T-06 | APA7Renderer实现 | 高 | 4h | T-04 |
| T-07 | MLA9Renderer实现 | 高 | 3h | T-04 |
| T-08 | LibraryService业务逻辑 | 中 | 3h | T-02, T-03 |
| T-09 | library.ts路由(10个端点) | 中 | 5h | T-08 |
| T-10 | papers.ts扩展(3个端点) | 中 | 2h | T-08 |
| T-11 | 前端LibraryStore状态管理 | 中 | 2h | 无 |
| T-12 | api.ts扩展(libraryApi) | 低 | 1h | T-11 |
| T-13 | 文献列表页面+组件 | 中 | 4h | T-12 |
| T-14 | 添加/编辑文献页面+动态表单 | 高 | 6h | T-12 |
| T-15 | 文献详情页+引用生成组件 | 中 | 4h | T-12 |
| T-16 | DOI导入Modal组件 | 中 | 2h | T-12 |
| T-17 | CitationPickerModal(编辑器集成) | 高 | 4h | T-15 |
| T-18 | 单元测试(重点引用引擎) | 高 | 8h | T-05-T-07 |
| T-19 | 集成测试 | 中 | 4h | T-09, T-10 |
| **合计** | | | **66.5h** | |

**关键路径：** T-01 → T-02 → T-04 → T-05/T-06/T-07 → T-08 → T-09 → T-13/T-14/T-15

**并行开发建议：**
- 后端组：T-01至T-10（约30.5h）可串行开发
- 前端组：T-11至T-17（约23h）可与T-03至T-07并行
- 测试组：T-18至T-19（约12h）在T-05之后开始

## 附录C: 技术风险与缓解措施

| 风险ID | 风险描述 | 概率 | 影响 | 缓解措施 |
|--------|---------|------|------|---------|
| R-01 | GB/T 7714规则复杂度超出预期，边界case多 | 高 | 高 | 先实现80%常见场景，边缘case降级为"近似正确" |
| R-02 | 作者名解析算法对非标准格式处理不佳 | 中 | 中 | 提供手动修正入口，解析结果可编辑 |
| R-03 | 大批量引用生成性能瓶颈(>100篇) | 低 | 中 | 分批异步处理+进度反馈 |
| R-04 | 前端动态表单状态管理复杂度高 | 中 | 中 | 使用react-hook-form+zod联动验证 |
| R-05 | 虚拟滚动兼容性问题 | 低 | 低 | P1阶段暂不启用，仅用分页 |
| R-06 | DOI模拟数据覆盖率不足 | 中 | 低 | 提供50条覆盖6类型的充分数据集 |
| R-07 | 与现有papers/aigc模块的代码冲突 | 低 | 中 | 采用独立route文件，最小化对现有代码修改 |

## 附录D: 版本历史

| 版本 | 日期 | 作者 | 变更说明 |
|------|------|------|---------|
| 1.0.0 | 2026-05-10 | ArchitectAgent | 初始版本，基于PRD-MVP创建完整技术规格 |

---

> **文档结束**
>
> 本技术规格文档共约 **3700 行**，涵盖系统架构、数据库设计、引用格式引擎算法、13个API接口详细设计、DOI模拟服务、前端组件架构、代码复用分析、性能优化、测试策略和安全设计等全部章节。
>
> 下一步：BackendAgent 可根据本规格直接开始编码实现，优先级顺序：
> 1. Prisma Migration (T-01)
> 2. 类型定义 (T-02)
> 3. CitationEngine核心引擎 (T-04~T-07)
> 4. DOIMockService (T-03)
> 5. LibraryService + API路由 (T-08~T-10)