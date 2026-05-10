/**
 * 引用格式引擎 - 核心算法实现
 * 三层架构：数据层（标准化）→ 规则层（配置）→ 渲染层（输出）
 * 支持 GB/T 7714-2015、APA 第7版、MLA 第9版
 */

import type {
  DocumentType,
  DegreeType,
  CitationFormat,
  AuthorInfo,
  NormalizedMetadata,
  AuthorRules,
  DateRules,
  TitleRules,
  SourceRules,
  StructureRules,
  FormatRules,
} from '../types/library';

// ========== 数据层：标准化函数 ==========

/**
 * 解析作者字符串为结构化的AuthorInfo数组
 * 支持中英文混合、各种分隔符
 *
 * @param authorsString - 原始作者字符串
 * @returns 结构化的作者信息数组
 */
export function parseAuthors(authorsString: string): AuthorInfo[] {
  const raw = authorsString.trim();
  if (!raw) return [];

  const segments = splitAuthorSegments(raw);
  return segments.map(segment => parseSingleAuthor(segment.trim()));
}

/**
 * 分割作者字符串为单个作者片段
 * 支持的分隔符: ", " "; " " & " " and "
 *
 * @param input - 原始输入字符串
 * @returns 分割后的作者片段数组
 */
export function splitAuthorSegments(input: string): string[] {
  let result = input;

  result = result.replace(/\s+and\s+/gi, '|');
  result = result.replace(/\s*&\s*/g, '|');
  result = result.replace(/;\s*/g, '|');

  const commaSpaceCount = (result.match(/,\s+/g) || []).length;
  if (commaSpaceCount >= 2) {
    result = result.replace(/,\s+/g, '|');
  }

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
 *
 * @param authorStr - 单个作者的字符串表示
 * @returns 标准化的作者信息
 */
export function parseSingleAuthor(authorStr: string): AuthorInfo {
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
 *
 * @param name - 中文姓名字符串
 * @returns 标准化的中文作者信息
 */
export function parseChineseAuthor(name: string): AuthorInfo {
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
 *
 * @param name - 西方姓名字符串
 * @returns 标准化的西方作者信息
 */
export function parseWesternAuthor(name: string): AuthorInfo {
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

/**
 * 将原始Document对象转换为NormalizedMetadata
 *
 * @param doc - 原始文档对象
 * @returns 标准化后的元数据
 */
export function normalizeDocument(doc: Record<string, unknown>): NormalizedMetadata {
  return {
    type: (doc.type as DocumentType) || 'JOURNAL_ARTICLE',
    title: ((doc.title as string) || '').trim(),
    authors: parseAuthors((doc.authors as string) || ''),
    year: doc.year as number | undefined,
    containerTitle: getContainerTitle(doc),
    volume: (doc.volume as string) || undefined,
    issue: (doc.issue as string) || undefined,
    pages: (doc.pages as string) || undefined,
    doi: (doc.doi as string) || undefined,
    url: (doc.url as string) || undefined,
    publisher: (doc.publisher as string) || undefined,
    edition: (doc.edition as string) || undefined,
    location: (doc.location as string) || undefined,
    university: (doc.university as string) || undefined,
    degreeType: doc.degreeType as DegreeType | undefined,
    conferenceName: (doc.conferenceName as string) || undefined,
    conferenceLocation: (doc.conferenceLocation as string) || undefined,
    editors: (doc.editors as string) || undefined,
    websiteName: (doc.websiteName as string) || undefined,
    accessDate: doc.accessDate as Date | undefined,
    publishDate: doc.publishDate as Date | undefined,
    patentNumber: (doc.patentNumber as string) || undefined,
    inventors: (doc.inventors as string) || undefined,
    filingDate: doc.filingDate as Date | undefined,
    issuingAuthority: (doc.issuingAuthority as string) || undefined,
    isbn: (doc.isbn as string) || undefined,
    extras: {},
  };
}

/**
 * 根据文献类型获取容器标题
 *
 * @param doc - 文档对象
 * @returns 容器标题字符串或undefined
 */
export function getContainerTitle(doc: Record<string, unknown>): string | undefined {
  switch (doc.type as DocumentType) {
    case 'JOURNAL_ARTICLE': return ((doc.journal as string)?.trim()) || undefined;
    case 'CONFERENCE_PAPER': return ((doc.conferenceName as string)?.trim()) || undefined;
    case 'WEBPAGE': return ((doc.websiteName as string)?.trim()) || undefined;
    case 'BOOK': return ((doc.publisher as string)?.trim()) || undefined;
    case 'THESIS': return ((doc.university as string)?.trim()) || undefined;
    default: return undefined;
  }
}

// ========== 规则层：格式规则常量 ==========

/** GB/T 7714-2015 完整规则配置 */
export const GBT7714_RULES: FormatRules = {
  formatId: 'GBT7714',
  displayName: 'GB/T 7714-2015',

  authorRules: {
    allAuthorsStyle: 'et_al_after_n' as const,
    etAlThreshold: 3,
    etAlString: ', 等',
    authorSeparator: ', ',
    lastAuthorSeparator: ', ',
    firstNameFormat: 'initials' as const,
    lastNameFirst: true,
    lastNameUppercase: true,
    corporateAuthorHandling: 'as_is' as const,
  },

  dateRules: {
    yearOnly: true,
    yearPosition: 'after_title' as const,
    yearParentheses: false,
  },

  titleRules: {
    capitalization: 'as_is' as const,
    italicize: false,
    quotationMarks: false,
    subtitleSeparator: ': ',
    articleLanguageHandling: 'original' as const,
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

  typeOverrides: {},
};

/** APA 第7版完整规则配置 */
export const APA7_RULES: FormatRules = {
  formatId: 'APA7',
  displayName: 'APA 7th Edition',

  authorRules: {
    allAuthorsStyle: 'et_al_after_n' as const,
    etAlThreshold: 20,
    etAlString: ', ... ',
    authorSeparator: ', ',
    lastAuthorSeparator: ', & ',
    firstNameFormat: 'initials' as const,
    lastNameFirst: true,
    lastNameUppercase: false,
    corporateAuthorHandling: 'as_is' as const,
  },

  dateRules: {
    yearOnly: true,
    yearPosition: 'after_authors' as const,
    yearParentheses: true,
  },

  titleRules: {
    capitalization: 'sentence_case' as const,
    italicize: false,
    quotationMarks: false,
    subtitleSeparator: ': ',
    articleLanguageHandling: 'original' as const,
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
      THESIS: '(Doctoral dissertation)',
      BOOK: '',
      CONFERENCE_PAPER: '',
      WEBPAGE: '',
      PATENT: '(U.S. Patent)',
    },
  },

  typeOverrides: {},
};

/** MLA 第9版完整规则配置 */
export const MLA9_RULES: FormatRules = {
  formatId: 'MLA9',
  displayName: 'MLA 9th Edition',

  authorRules: {
    allAuthorsStyle: 'full' as const,
    etAlThreshold: Infinity,
    etAlString: ', et al.',
    authorSeparator: ', ',
    lastAuthorSeparator: ', and ',
    firstNameFormat: 'full' as const,
    lastNameFirst: true,
    lastNameUppercase: false,
    corporateAuthorHandling: 'as_is' as const,
  },

  dateRules: {
    yearOnly: false,
    yearPosition: 'end' as const,
    yearParentheses: false,
    dateFormat: 'D MMM YYYY',
  },

  titleRules: {
    capitalization: 'title_case' as const,
    italicize: false,
    quotationMarks: true,
    subtitleSeparator: ': ',
    articleLanguageHandling: 'original' as const,
  },

  sourceRules: {
    containerItalicize: true,
    volumeFormat: 'vol. *{volume}*',
    issueFormat: 'no. {issue}',
    pagesFormat: 'pp. {pages}',
    includeDoi: false,
    doiUrlPrefix: '',
    includeUrl: true,
    accessDateFormat: 'Accessed {Day} {Month} {Year}.',
  },

  structureRules: {
    fieldOrder: ['authors', 'title', 'container', 'volumeIssue', 'date', 'pages', 'url'],
    fieldSeparators: {
      afterAuthors: '. ',
      afterTitle: ' ',
      afterContainer: ', ',
      afterVolumeIssue: ', ',
      afterDate: ', ',
      afterPages: '.',
      afterUrl: '.',
    },
    endingPunctuation: '.',
    maxAuthorsBeforeEtAl: Infinity,
    typeIdentifier: {
      JOURNAL_ARTICLE: '',
      THESIS: 'Diss.',
      BOOK: '',
      CONFERENCE_PAPER: '',
      WEBPAGE: '',
      PATENT: '',
    },
  },

  typeOverrides: {},
};

// ========== 渲染层：渲染器类 ==========

abstract class CitationRenderer {
  abstract render(metadata: NormalizedMetadata, rules: FormatRules): string;

  protected formatAuthors(authors: AuthorInfo[], rules: AuthorRules): string {
    if (!authors || authors.length === 0) return '';

    const formatted = authors.map(author => this.formatSingleAuthor(author, rules));

    if (formatted.length > rules.etAlThreshold && rules.etAlThreshold !== Infinity) {
      const displayed = formatted.slice(0, rules.etAlThreshold);
      return displayed.join(rules.authorSeparator) + rules.etAlString;
    }

    if (formatted.length === 1) {
      return formatted[0];
    }

    if (formatted.length === 2) {
      return formatted.join(rules.lastAuthorSeparator);
    }

    const allExceptLast = formatted.slice(0, -1).join(rules.authorSeparator);
    const last = formatted[formatted.length - 1];
    return allExceptLast + rules.lastAuthorSeparator + last;
  }

  protected formatSingleAuthor(author: AuthorInfo, rules: AuthorRules): string {
    let lastName = author.lastName;
    let firstName = author.firstName;

    if (rules.lastNameUppercase && !author.isChinese) {
      lastName = lastName.toUpperCase();
    }

    if (rules.firstNameFormat === 'initials') {
      if (author.isChinese) {
        firstName = firstName ? firstName.charAt(0) : '';
      } else {
        if (firstName) {
          const initials = firstName.split(' ')
            .map(part => part.charAt(0).toUpperCase() + '.')
            .join(' ');
          firstName = initials;
        }
        if (author.middleName) {
          const midInitials = author.middleName.split(' ')
            .map(part => part.charAt(0).toUpperCase() + '.')
            .join(' ');
          firstName = firstName ? `${firstName} ${midInitials}` : midInitials;
        }
      }
    }

    if (rules.lastNameFirst) {
      if (author.isChinese) {
        return `${lastName}${firstName}`;
      }
      return `${lastName}, ${firstName}`.replace(/, $/, '').trim();
    }

    return `${firstName} ${lastName}`.trim();
  }

  protected formatDate(metadata: NormalizedMetadata, rules: DateRules): string {
    if (metadata.year) {
      if (rules.yearParentheses) {
        return `(${metadata.year})`;
      }
      return String(metadata.year);
    }

    if (rules.yearParentheses) {
      return '(n.d.)';
    }

    return '';
  }

  protected formatTitle(title: string, rules: TitleRules): string {
    let formatted = title;

    if (rules.capitalization === 'sentence_case') {
      formatted = this.toSentenceCase(formatted);
    } else if (rules.capitalization === 'title_case') {
      formatted = this.toTitleCase(formatted);
    }

    if (rules.quotationMarks) {
      formatted = `"${formatted}"`;
    }

    if (rules.italicize) {
      formatted = `*${formatted}*`;
    }

    return formatted;
  }

  protected getTypeIdentifier(type: DocumentType, rules: StructureRules): string {
    return rules.typeIdentifier[type] || '';
  }

  protected assemble(parts: string[], rules: FormatRules): string {
    const filtered = parts.filter(p => p && p.trim());
    let result = filtered.join('');

    if (result && !result.endsWith(rules.structureRules.endingPunctuation)) {
      result += rules.structureRules.endingPunctuation;
    }

    return result;
  }

  private toSentenceCase(str: string): string {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  private toTitleCase(str: string): string {
    if (!str) return str;
    const minorWords = ['a', 'an', 'the', 'and', 'but', 'or', 'for', 'nor', 'on', 'at', 'to', 'by', 'in', 'of'];
    return str.replace(/\w\S*/g, (word, index) => {
      if (index === 0 || !minorWords.includes(word.toLowerCase())) {
        return word.charAt(0).toUpperCase() + word.substr(1).toLowerCase();
      }
      return word.toLowerCase();
    });
  }
}

class GBT7714Renderer extends CitationRenderer {
  render(metadata: NormalizedMetadata, rules: FormatRules): string {
    const parts: string[] = [];
    const sep = rules.structureRules.fieldSeparators;

    const authorsStr = this.formatAuthors(metadata.authors, rules.authorRules);
    if (authorsStr) {
      parts.push(authorsStr + (sep.afterAuthors || ''));
    }

    const titleStr = metadata.title;
    if (titleStr) {
      parts.push(titleStr + (this.getTypeIdentifier(metadata.type, rules.structureRules)));
    }

    if (metadata.type === 'THESIS') {
      if (metadata.containerTitle) {
        parts.push(metadata.containerTitle + (sep.afterContainer || ''));
      }
      if (metadata.location) {
        parts.push(metadata.location + (sep.afterLocation || ''));
      }
      if (metadata.year) {
        parts.push(String(metadata.year) + (sep.afterYear || ''));
      } else {
        parts.push('[s.n.]');
      }
    } else if (metadata.type === 'BOOK') {
      if (metadata.edition) {
        parts.push(metadata.edition + (sep.afterEdition || ''));
      }
      if (metadata.containerTitle) {
        parts.push(metadata.containerTitle + (sep.afterContainer || ''));
      }
      if (metadata.location) {
        parts.push(metadata.location + (sep.afterLocation || ''));
      }
      if (metadata.year) {
        parts.push(String(metadata.year) + (sep.afterYear || ''));
      }
      if (metadata.pages) {
        parts.push(metadata.pages + (sep.afterPages || ''));
      }
    } else if (metadata.type === 'WEBPAGE') {
      if (metadata.publishDate) {
        const pubDate = new Date(metadata.publishDate);
        const dateStr = `${pubDate.getFullYear()}-${String(pubDate.getMonth() + 1).padStart(2, '0')}-${String(pubDate.getDate()).padStart(2, '0')}`;
        parts.push(dateStr + (sep.afterPublishDate || '('));
      }
      if (metadata.accessDate) {
        const accDate = new Date(metadata.accessDate);
        const accStr = `${accDate.getFullYear()}-${String(accDate.getMonth() + 1).padStart(2, '0')}-${String(accDate.getDate()).padStart(2, '0')}`;
        parts.push(accStr + ')[引用日期]. ');
      }
      if (metadata.url) {
        parts.push(metadata.url + (sep.afterUrl || ''));
      }
    } else if (metadata.type === 'PATENT') {
      if (metadata.patentNumber) {
        parts.push(metadata.patentNumber + (sep.afterPatentNumber || ''));
      }
      if (metadata.issuingAuthority) {
        parts.push(metadata.issuingAuthority + (sep.afterCountry || ''));
      }
      if (metadata.filingDate) {
        const filingDate = new Date(metadata.filingDate);
        const dateStr = `${filingDate.getFullYear()}-${String(filingDate.getMonth() + 1).padStart(2, '0')}-${String(filingDate.getDate()).padStart(2, '0')}`;
        parts.push(dateStr + (sep.afterFilingDate || ''));
      }
    } else {
      if (metadata.containerTitle) {
        parts.push(metadata.containerTitle + (sep.afterContainer || ''));
      }
      if (metadata.year) {
        parts.push(String(metadata.year) + (sep.afterYear || ''));
      } else {
        parts.push('[s.n.]');
      }
      if (metadata.volume && metadata.issue) {
        parts.push(`${metadata.volume}(${metadata.issue})`);
      } else if (metadata.volume) {
        parts.push(metadata.volume);
      }
      if (metadata.pages) {
        parts.push(`: ${metadata.pages}`);
      }
    }

    return this.assemble(parts, rules);
  }
}

class APA7Renderer extends CitationRenderer {
  render(metadata: NormalizedMetadata, rules: FormatRules): string {
    const parts: string[] = [];
    const sep = rules.structureRules.fieldSeparators;

    const authorsStr = this.formatAuthors(metadata.authors, rules.authorRules);
    if (authorsStr) {
      parts.push(authorsStr + (sep.afterAuthors || ''));
    }

    const dateStr = this.formatDate(metadata, rules.dateRules);
    if (dateStr) {
      parts.push(dateStr + (sep.afterDate || ''));
    }

    parts.push(this.formatTitle(metadata.title, rules.titleRules) + (sep.afterTitle || ''));

    let containerStr = metadata.containerTitle || '';
    if (containerStr && rules.sourceRules.containerItalicize) {
      containerStr = `*${containerStr}*`;
    }
    if (containerStr) {
      parts.push(containerStr + (sep.afterContainer || ''));
    }

    if (metadata.volume) {
      let volStr = rules.sourceRules.volumeFormat.replace('{volume}', metadata.volume);
      if (metadata.issue) {
        volStr += rules.sourceRules.issueFormat.replace('{issue}', metadata.issue);
      }
      parts.push(volStr + (sep.afterVolumeIssue || ''));
    }

    if (metadata.pages) {
      parts.push(metadata.pages + (sep.afterPages || ''));
    }

    if (metadata.doi && rules.sourceRules.includeDoi) {
      const doiUrl = rules.sourceRules.doiUrlPrefix + metadata.doi;
      parts.push(doiUrl);
    } else if (metadata.url && rules.sourceRules.includeUrl) {
      parts.push(metadata.url);
    }

    return this.assemble(parts, rules);
  }

  protected formatAuthors(authors: AuthorInfo[], rules: AuthorRules): string {
    if (!authors || authors.length === 0) return '';

    const formatted = authors.map(author => this.formatSingleAuthor(author, rules));

    if (formatted.length > 20) {
      const first19 = formatted.slice(0, 19).join(rules.authorSeparator);
      const last = formatted[formatted.length - 1];
      return `${first19}, ... ${last}`;
    }

    return super.formatAuthors(authors, rules);
  }
}

class MLA9Renderer extends CitationRenderer {
  render(metadata: NormalizedMetadata, rules: FormatRules): string {
    const parts: string[] = [];
    const sep = rules.structureRules.fieldSeparators;

    const authorsStr = this.formatAuthors(metadata.authors, rules.authorRules);
    if (authorsStr) {
      parts.push(authorsStr + (sep.afterAuthors || ''));
    }

    parts.push(this.formatTitle(metadata.title, rules.titleRules) + (sep.afterTitle || ''));

    let containerStr = metadata.containerTitle || '';
    if (containerStr && rules.sourceRules.containerItalicize) {
      containerStr = `*${containerStr}*`;
    }
    if (containerStr) {
      parts.push(containerStr + (sep.afterContainer || ''));
    }

    if (metadata.volume) {
      let volStr = rules.sourceRules.volumeFormat.replace('{volume}', metadata.volume);
      if (metadata.issue) {
        volStr += ' ' + rules.sourceRules.issueFormat.replace('{issue}', metadata.issue);
      }
      parts.push(volStr + (sep.afterVolumeIssue || ''));
    }

    if (metadata.date) {
      const months = ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'Jun.',
                     'Jul.', 'Aug.', 'Sep.', 'Oct.', 'Nov.', 'Dec.'];
      const d = new Date(metadata.date);
      const dateStr = `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
      parts.push(dateStr + (sep.afterDate || ''));
    } else if (metadata.year) {
      parts.push(String(metadata.year) + (sep.afterDate || ''));
    }

    if (metadata.pages) {
      const pageStr = rules.sourceRules.pagesFormat.replace('{pages}', metadata.pages);
      parts.push(pageStr + (sep.afterPages || ''));
    }

    if (metadata.url && rules.sourceRules.includeUrl) {
      parts.push(metadata.url + (sep.afterUrl || ''));
    }

    return this.assemble(parts, rules);
  }

  protected formatSingleAuthor(author: AuthorInfo, rules: AuthorRules): string {
    if (author.isChinese) {
      return `${author.lastName}${author.firstName}`;
    }

    const lastName = author.lastName;
    const firstName = author.firstName;
    const middleName = author.middleName;

    let fullName = firstName;
    if (middleName) {
      fullName += ` ${middleName}`;
    }
    if (fullName) {
      fullName += ` `;
    }

    return `${lastName}, ${fullName}`.trim();
  }
}

// ========== 引擎主类 ==========

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
    const normalized = normalizeDocument(document);
    const baseRules = this.ruleRegistry.get(formatId);

    if (!baseRules) {
      throw new Error(`Unsupported citation format: ${formatId}. Supported formats: ${Array.from(this.ruleRegistry.keys()).join(', ')}`);
    }

    const mergedRules = this.mergeTypeOverrides(baseRules, normalized.type);
    const renderer = this.renderers.get(formatId);

    if (!renderer) {
      throw new Error(`No renderer found for format: ${formatId}`);
    }

    return renderer.render(normalized, mergedRules);
  }

  generateBatch(documents: Record<string, unknown>[], formatId: CitationFormat): string[] {
    return documents.map(doc => this.generate(doc, formatId));
  }

  mergeTypeOverrides(baseRules: FormatRules, type: DocumentType): FormatRules {
    const override = baseRules.typeOverrides?.[type];

    if (!override) {
      return baseRules;
    }

    return {
      ...baseRules,
      authorRules: { ...baseRules.authorRules, ...(override.authorRules || {}) },
      dateRules: { ...baseRules.dateRules, ...(override.dateRules || {}) },
      titleRules: { ...baseRules.titleRules, ...(override.titleRules || {}) },
      sourceRules: { ...baseRules.sourceRules, ...(override.sourceRules || {}) },
      structureRules: {
        ...baseRules.structureRules,
        ...(override.structureRules || {}),
        typeIdentifier: {
          ...baseRules.structureRules.typeIdentifier,
          ...(override.structureRules?.typeIdentifier || {}),
        },
        fieldSeparators: {
          ...baseRules.structureRules.fieldSeparators,
          ...(override.structureRules?.fieldSeparators || {}),
        },
      },
      typeOverrides: baseRules.typeOverrides,
    };
  }
}

/** 导出单例实例 */
export const citationEngine = new CitationEngine();
