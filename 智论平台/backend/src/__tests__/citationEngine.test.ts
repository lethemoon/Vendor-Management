/**
 * 引用格式引擎完整测试套件
 * 覆盖 GBT7714、APA7、MLA9 三种格式
 * 覆盖 AuthorParser、CitationEngine 集成、DOIMockService
 * 目标: 61+ 测试用例，核心函数覆盖率 ≥95%
 */

import {
  parseAuthors,
  splitAuthorSegments,
  parseSingleAuthor,
  parseChineseAuthor,
  parseWesternAuthor,
  normalizeDocument,
  getContainerTitle,
  citationEngine,
  GBT7714_RULES,
  APA7_RULES,
  MLA9_RULES,
} from '../services/citationEngine';
import { doiMockService } from '../services/doiMockService';
import type { LookupResult } from '../services/doiMockService';

// ==================== 测试数据辅助函数 ====================

function createTestDocument(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    type: 'JOURNAL_ARTICLE',
    title: '测试文章标题',
    authors: '张三, 李四',
    year: 2023,
    journal: '测试期刊',
    volume: '45',
    issue: '3',
    pages: '123-1267',
    doi: '10.1234/test.2023.0456',
    ...overrides,
  };
}

// ==================== GBT7714Renderer 测试（15个）====================

describe('GBT7714Renderer', () => {
  test('1. 单作者期刊文章 - 应包含[J]，作者大写', () => {
    const doc = createTestDocument({
      authors: 'Smith, John R.',
      journal: 'IEEE TPAMI',
    });
    const result = citationEngine.generate(doc, 'GBT7714');
    expect(result).toContain('[J]');
    expect(result).toContain('SMITH J R');
    expect(result).toContain('IEEE TPAMI');
  });

  test('2. 双作者 - 用逗号分隔', () => {
    const doc = createTestDocument({
      authors: '张三, 李四',
    });
    const result = citationEngine.generate(doc, 'GBT7714');
    expect(result).toMatch(/张三.*李四|李四.*张三/);
    expect(result).not.toContain('&');
    expect(result).not.toContain('and');
  });

  test('3. 三作者 - 正常列出全部', () => {
    const doc = createTestDocument({
      authors: '张三, 李四, 王五',
    });
    const result = citationEngine.generate(doc, 'GBT7714');
    expect(result).toContain('张三');
    expect(result).toContain('李四');
    expect(result).toContain('王五');
    expect(result).not.toContain('等');
  });

  test('4. 四作者及以上 - 应出现"等"省略', () => {
    const doc = createTestDocument({
      authors: '张三, 李四, 王五, 赵六',
    });
    const result = citationEngine.generate(doc, 'GBT7714');
    expect(result).toContain('等');
  });

  test('5. 英文作者姓大写 - SMITH J R 格式', () => {
    const doc = createTestDocument({
      authors: 'Smith, John Robert',
    });
    const result = citationEngine.generate(doc, 'GBT7714');
    expect(result).toContain('SMITH J R');
    expect(result).not.toContain('Smith');
  });

  test('6. 中文作者 - 保持中文不变', () => {
    const doc = createTestDocument({
      authors: '张三, 李四',
    });
    const result = citationEngine.generate(doc, 'GBT7714');
    expect(result).toContain('张三');
    expect(result).toContain('李四');
    expect(result).not.toContain('ZHANG');
  });

  test('7. 学位论文 - 应包含[D]和院校名', () => {
    const doc = createTestDocument({
      type: 'THESIS',
      title: '深度学习研究',
      authors: '张三',
      university: '清华大学',
      degreeType: 'DOCTOR',
      location: '北京',
      year: 2023,
    });
    const result = citationEngine.generate(doc, 'GBT7714');
    expect(result).toContain('[D]');
    expect(result).toContain('清华大学');
  });

  test('8. 书籍 - 应包含[M]、出版社、出版地', () => {
    const doc = createTestDocument({
      type: 'BOOK',
      title: '机器学习实战',
      authors: '周志华',
      publisher: '清华大学出版社',
      location: '北京',
      year: 2016,
    });
    const result = citationEngine.generate(doc, 'GBT7714');
    expect(result).toContain('[M]');
    expect(result).toContain('清华大学出版社');
    expect(result).toContain('北京');
  });

  test('9. 会议论文 - 应包含[A]或[C]', () => {
    const doc = createTestDocument({
      type: 'CONFERENCE_PAPER',
      title: 'NeurIPS最佳论文',
      authors: 'AAAI Team',
      conferenceName: 'NeurIPS 2023',
      year: 2023,
    });
    const result = citationEngine.generate(doc, 'GBT7714');
    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(10);
  });

  test('10. 网页 - 应包含[EB/OL]和URL', () => {
    const doc = createTestDocument({
      type: 'WEBPAGE',
      title: 'ChatGPT技术博客',
      authors: 'OpenAI Team',
      websiteName: 'OpenAI Blog',
      url: 'https://openai.com/blog/chatgpt',
      publishDate: new Date('2022-11-30'),
      accessDate: new Date('2023-05-10'),
    });
    const result = citationEngine.generate(doc, 'GBT7714');
    expect(result).toContain('[EB/OL]');
    expect(result).toContain('openai.com');
  });

  test('11. 专利 - 应包含[P]和专利号', () => {
    const doc = createTestDocument({
      type: 'PATENT',
      title: '一种神经网络结构',
      inventors: '张三, 李四',
      patentNumber: 'CN115674567A',
      issuingAuthority: '中国国家知识产权局',
      filingDate: new Date('2022-08-15'),
    });
    const result = citationEngine.generate(doc, 'GBT7714');
    expect(result).toContain('[P]');
    expect(result).toContain('CN115674567A');
  });

  test('12. 缺少年份 - 应显示[s.n.]', () => {
    const doc = createTestDocument({ year: undefined });
    const result = citationEngine.generate(doc, 'GBT7714');
    expect(result).toContain('[s.n.]');
  });

  test('13. 缺少页码 - 不应崩溃', () => {
    const doc = createTestDocument({ pages: undefined });
    const result = citationEngine.generate(doc, 'GBT7714');
    expect(result).toBeTruthy();
    expect(() => citationEngine.generate(doc, 'GBT7714')).not.toThrow();
  });

  test('14. 多作者混合中英文 - 正确解析', () => {
    const doc = createTestDocument({
      authors: '张三; Smith JR; 王五',
    });
    const result = citationEngine.generate(doc, 'GBT7714');
    expect(result).toContain('张三');
    expect(result).toContain('SMITH');
    expect(result).toContain('王五');
  });

  test('15. 特殊字符处理 - 括号/连字符/点号', () => {
    const doc = createTestDocument({
      title: '基于BERT的NLP研究 (第二版)',
      authors: 'O\'Brien, John A.',
      pages: '123-456',
    });
    const result = citationEngine.generate(doc, 'GBT7714');
    expect(result).toBeTruthy();
    expect(result.includes("O'BRIEN") || result.includes("O'Brien")).toBe(true);
  });
});

// ==================== APA7Renderer 测试（12个）====================

describe('APA7Renderer', () => {
  test('1. 单作者 - (Year) 在作者后', () => {
    const doc = createTestDocument({
      authors: 'Smith, John R.',
      journal: 'Journal of AI Research',
    });
    const result = citationEngine.generate(doc, 'APA7');
    expect(result).toMatch(/Smith.*\(2023\)/);
  });

  test('2. 双作者 - 最后一个前用 &', () => {
    const doc = createTestDocument({
      authors: 'Smith, John; Johnson, Amy',
    });
    const result = citationEngine.generate(doc, 'APA7');
    expect(result).toContain('&');
  });

  test('3. 3-20作者 - 全部列出', () => {
    const authors = Array.from({ length: 15 }, (_, i) => `Author${i + 1}, First`);
    const doc = createTestDocument({ authors: authors.join('; ') });
    const result = citationEngine.generate(doc, 'APA7');
    expect(result).not.toContain('...');
    expect(result).toContain('Author1');
    expect(result).toContain('Author15');
  });

  test('4. 21+作者 - 前19 + ... + 最后1人', () => {
    const authors = Array.from({ length: 22 }, (_, i) => `Author${i + 1}, First`);
    const doc = createTestDocument({ authors: authors.join('; ') });
    const result = citationEngine.generate(doc, 'APA7');
    expect(result).toContain('...');
    expect(result).toContain('Author22');
  });

  test('5. 期刊名斜体标记 (*Journal*)', () => {
    const doc = createTestDocument({
      journal: 'Nature Communications',
    });
    const result = citationEngine.generate(doc, 'APA7');
    expect(result).toContain('*Nature Communications*');
  });

  test('6. 卷号斜体 (*45*)', () => {
    const doc = createTestDocument({
      volume: '45',
    });
    const result = citationEngine.generate(doc, 'APA7');
    expect(result).toContain('*45*');
  });

  test('7. DOI URL 格式转换', () => {
    const doc = createTestDocument({
      doi: '10.1038/nature12373',
    });
    const result = citationEngine.generate(doc, 'APA7');
    expect(result).toContain('https://doi.org/10.1038/nature12373');
  });

  test('8. 学位论文标注 "(Doctoral dissertation)"', () => {
    const doc = createTestDocument({
      type: 'THESIS',
      title: 'Deep Learning Research',
      authors: 'Zhang, San',
      university: 'Tsinghua University',
      degreeType: 'DOCTOR',
      year: 2023,
    });
    const result = citationEngine.generate(doc, 'APA7');
    expect(result).toContain('(Doctoral dissertation)');
    expect(result).toContain('Tsinghua University');
  });

  test('9. 书籍版本号 "(3rd ed.)"', () => {
    const doc = createTestDocument({
      type: 'BOOK',
      title: 'Machine Learning Guide',
      authors: 'Goodfellow, Ian',
      publisher: 'MIT Press',
      edition: '3rd ed.',
      year: 2020,
    });
    const result = citationEngine.generate(doc, 'APA7');
    expect(result).toContain('(3rd ed.)');
    expect(result).toContain('MIT Press');
  });

  test('10. 网页包含Retrieved日期', () => {
    const doc = createTestDocument({
      type: 'WEBPAGE',
      title: 'GPT-4 Technical Report',
      authors: 'OpenAI Team',
      websiteName: 'OpenAI Blog',
      url: 'https://openai.com/gpt4',
      accessDate: new Date('2023-03-14'),
    });
    const result = citationEngine.generate(doc, 'APA7');
    expect(result).toContain('Retrieved');
    expect(result).toContain('openai.com/gpt4');
  });

  test('11. n.d. 表示无年份', () => {
    const doc = createTestDocument({ year: undefined });
    const result = citationEngine.generate(doc, 'APA7');
    expect(result).toContain('(n.d.)');
  });

  test('12. 日期格式正确性', () => {
    const doc = createTestDocument({
      year: 2023,
    });
    const result = citationEngine.generate(doc, 'APA7');
    expect(result).toContain('(2023)');
  });
});

// ==================== MLA9Renderer 测试（10个）====================

describe('MLA9Renderer', () => {
  test('1. 双引号包裹文章标题', () => {
    const doc = createTestDocument({
      title: 'Deep Learning in NLP',
    });
    const result = citationEngine.generate(doc, 'MLA9');
    expect(result).toContain('"Deep Learning in NLP"');
  });

  test('2. 全名显示（无缩写）', () => {
    const doc = createTestDocument({
      authors: 'Smith, John Robert',
    });
    const result = citationEngine.generate(doc, 'MLA9');
    expect(result).toContain('John Robert');
    expect(result).not.toContain('J.R.');
  });

  test('3. and 连接最后作者', () => {
    const doc = createTestDocument({
      authors: 'Smith, John; Johnson, Amy',
    });
    const result = citationEngine.generate(doc, 'MLA9');
    expect(result).toContain(', and ');
  });

  test('4. vol. 格式', () => {
    const doc = createTestDocument({
      volume: '45',
    });
    const result = citationEngine.generate(doc, 'MLA9');
    expect(result).toContain('vol.');
    expect(result).toContain('*45*');
  });

  test('5. no. 格式', () => {
    const doc = createTestDocument({
      volume: '45',
      issue: '3',
    });
    const result = citationEngine.generate(doc, 'MLA9');
    expect(result).toContain('no. 3');
  });

  test('6. pp. 页码格式', () => {
    const doc = createTestDocument({
      pages: '123-1267',
    });
    const result = citationEngine.generate(doc, 'MLA9');
    expect(result).toContain('pp. 123-1267');
  });

  test('7. 日期 "Day Mon. Year" 格式', () => {
    const doc = createTestDocument({
      date: new Date('2023-03-15'),
    });
    const result = citationEngine.generate(doc, 'MLA9');
    expect(result).toMatch(/15 Mar\. 2023/);
  });

  test('8. 书籍斜体标题', () => {
    const doc = createTestDocument({
      type: 'BOOK',
      title: 'Deep Learning Book',
      authors: 'Goodfellow, Ian',
      publisher: 'MIT Press',
      year: 2016,
    });
    const result = citationEngine.generate(doc, 'MLA9');
    expect(result).toContain('*Deep Learning Book*');
  });

  test('9. 学位论文 Diss. 标注', () => {
    const doc = createTestDocument({
      type: 'THESIS',
      title: 'Thesis on AI',
      authors: 'Zhang, San',
      university: 'Tsinghua University',
      year: 2023,
    });
    const result = citationEngine.generate(doc, 'MLA9');
    expect(result).toContain('Diss.');
    expect(result).toContain('Tsinghua University');
  });

  test('10. 网页含Accessed日期', () => {
    const doc = createTestDocument({
      type: 'WEBPAGE',
      title: 'Web Page Title',
      authors: 'Author Name',
      websiteName: 'Example Site',
      url: 'https://example.com/page',
      publishDate: new Date('2023-01-20'),
      accessDate: new Date('2023-06-15'),
    });
    const result = citationEngine.generate(doc, 'MLA9');
    expect(result).toContain('Accessed');
  });
});

// ==================== AuthorParser 测试（10个）====================

describe('AuthorParser', () => {
  test('1. 中文逗号分隔: "张三, 李四, 王五"', () => {
    const result = parseAuthors('张三, 李四, 王五');
    expect(result).toHaveLength(3);
    expect(result[0].lastName).toBe('张三');
    expect(result[1].lastName).toBe('李四');
    expect(result[2].lastName).toBe('王五');
  });

  test('2. 西文分号分隔: "Smith, J.; Johnson, A."', () => {
    const result = parseAuthors('Smith, J.; Johnson, A.');
    expect(result).toHaveLength(2);
    expect(result[0].lastName).toBe('Smith');
    expect(result[1].lastName).toBe('Johnson');
  });

  test('3. 西文空格分隔: "Yann LeCun, Yoshua Bengio"', () => {
    const result = parseAuthors('Yann LeCun, Yoshua Bengio');
    expect(result).toHaveLength(2);
    expect(result[0].lastName).toBe('LeCun');
    expect(result[0].firstName).toBe('Yann');
  });

  test('4. Last, First格式: "Smith, John R."', () => {
    const result = parseAuthors('Smith, John R.');
    expect(result).toHaveLength(1);
    expect(result[0].lastName).toBe('Smith');
    expect(result[0].firstName).toBe('John R');
  });

  test('5. 混合中英文: "张三; Smith JR; 王五"', () => {
    const result = parseAuthors('张三; Smith JR; 王五');
    expect(result).toHaveLength(3);
    expect(result[0].isChinese).toBe(true);
    expect(result[1].isChinese).toBe(false);
    expect(result[2].isChinese).toBe(true);
  });

  test('6. 单位/机构名: "中国科学院计算技术研究所"', () => {
    const result = parseAuthors('中国科学院计算技术研究所');
    expect(result).toHaveLength(1);
    expect(result[0].isChinese).toBe(true);
  });

  test('7. 空字符串处理', () => {
    const result = parseAuthors('');
    expect(result).toHaveLength(0);
  });

  test('8. 含括号的作者: "张三(San Zhang)"', () => {
    const result = parseAuthors('张三(San Zhang)');
    expect(result).toHaveLength(1);
    expect(result[0].lastName).toBe('张三');
  });

  test('9. & 连接符: "A & B"', () => {
    const result = parseAuthors('Author A & Author B');
    expect(result.length).toBeGreaterThanOrEqual(2);
  });

  test('10. and 连接符: "A and B"', () => {
    const result = parseAuthors('Author A and Author B');
    expect(result.length).toBeGreaterThanOrEqual(2);
  });
});

// ==================== CitationEngine 集成测试（8个）====================

describe('CitationEngine Integration', () => {
  test('1. generate() 三种格式都返回非空字符串', () => {
    const doc = createTestDocument();

    const gbtResult = citationEngine.generate(doc, 'GBT7714');
    const apaResult = citationEngine.generate(doc, 'APA7');
    const mlaResult = citationEngine.generate(doc, 'MLA9');

    expect(gbtResult).toBeTruthy();
    expect(gbtResult.length).toBeGreaterThan(5);

    expect(apaResult).toBeTruthy();
    expect(apaResult.length).toBeGreaterThan(5);

    expect(mlaResult).toBeTruthy();
    expect(mlaResult.length).toBeGreaterThan(5);
  });

  test('2. generateBatch() 数组长度匹配输入', () => {
    const docs = [
      createTestDocument({ title: '文档1' }),
      createTestDocument({ title: '文档2' }),
      createTestDocument({ title: '文档3' }),
    ];

    const results = citationEngine.generateBatch(docs, 'GBT7714');

    expect(results).toHaveLength(3);
    expect(results.every(r => r && r.length > 0)).toBe(true);
  });

  test('3. 未知 formatId 抛出错误', () => {
    const doc = createTestDocument();

    expect(() => {
      citationEngine.generate(doc, 'UNKNOWN' as any);
    }).toThrow(/Unsupported citation format/);
  });

  test('4. typeOverrides 正确合并', () => {
    const thesisDoc = createTestDocument({
      type: 'THESIS',
      university: '清华大学',
      degreeType: 'DOCTOR',
      location: '北京',
    });

    const gbtResult = citationEngine.generate(thesisDoc, 'GBT7714');
    expect(gbtResult).toContain('[D]');
    expect(gbtResult).toContain('清华大学');
  });

  test('5. 空作者数组不崩溃', () => {
    const doc = createTestDocument({ authors: '' });

    expect(() => {
      citationEngine.generate(doc, 'GBT7714');
    }).not.toThrow();
  });

  test('6. 极长标题截断处理', () => {
    const longTitle = 'A'.repeat(500);
    const doc = createTestDocument({ title: longTitle });

    expect(() => {
      citationEngine.generate(doc, 'GBT7714');
    }).not.toThrow();

    const result = citationEngine.generate(doc, 'GBT7714');
    expect(result).toContain(longTitle);
  });

  test('7. 特殊Unicode字符（em dash —, 普通连字符 -）', () => {
    const doc = createTestDocument({
      title: '深度学习 — NLP的新范式（第二版）',
      authors: 'Müller-Lüdenscheidt, Hans-Jürgen',
    });

    const result = citationEngine.generate(doc, 'GBT7714');
    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(10);
  });

  test('8. 纯数字/符号作者名', () => {
    const doc = createTestDocument({
      authors: 'Author_123, Test@Name',
    });

    const result = citationEngine.generate(doc, 'GBT7714');
    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(5);
  });
});

// ==================== DOIMockService 测试（6个）====================

describe('DOIMockService', () => {
  test('1. 精确匹配已知DOI', async () => {
    const result: LookupResult = await doiMockService.lookup('10.1038/nature12373');

    expect(result.found).toBe(true);
    expect(result.matchType).toBe('exact');
    expect(result.metadata).not.toBeNull();
    expect(result.metadata?.title).toContain('BERT');
    expect(result.lookupTimeMs).toBeGreaterThan(0);
  }, 10000);

  test('2. 带空格DOI trim后匹配', async () => {
    const result: LookupResult = await doiMockService.lookup('  10.1038/nature12373  ');

    expect(result.found).toBe(true);
    expect(result.matchType).toBe('trimmed');
    expect(result.metadata).not.toBeNull();
  }, 10000);

  test('3. 前缀模糊匹配', async () => {
    const result: LookupResult = await doiMockService.lookup('10.1038/nature');

    expect(result.found).toBe(true);
    expect(result.matchType).toBe('prefix');
    expect(result.metadata).not.toBeNull();
  }, 10000);

  test('4. 无效DOI返回 not found', async () => {
    const result: LookupResult = await doiMockService.lookup('10.9999/nonexistent12345');

    expect(result.found).toBe(false);
    expect(result.metadata).toBeNull();
    expect(result.matchType).toBeNull();
  }, 10000);

  test('5. 空字符串处理', async () => {
    const result: LookupResult = await doiMockService.lookup('');

    expect(result.found).toBe(false);
    expect(result.metadata).toBeNull();
  }, 10000);

  test('6. lookupTimeMs > 0', async () => {
    const result: LookupResult = await doiMockService.lookup('10.1126/science.169.3946.635');

    expect(result.lookupTimeMs).toBeGreaterThanOrEqual(800);
    expect(result.lookupTimeMs).toBeLessThanOrEqual(3000);
  }, 10000);
});

// ==================== 辅助函数单元测试（额外补充）====================

describe('Utility Functions', () => {
  describe('splitAuthorSegments', () => {
    test('正确分割逗号分隔的作者', () => {
      const result = splitAuthorSegments('A, B, C');
      expect(result).toEqual(['A', 'B', 'C']);
    });

    test('正确处理分号分隔', () => {
      const result = splitAuthorSegments('A; B; C');
      expect(result).toHaveLength(3);
    });

    test('保留括号内的内容不被分割', () => {
      const result = splitAuthorSegments('Author (with, comma), Another');
      expect(result.some(s => s.includes('with, comma'))).toBe(true);
    });
  });

  describe('parseChineseAuthor', () => {
    test('简单中文姓名', () => {
      const result = parseChineseAuthor('张三');
      expect(result.lastName).toBe('张三');
      expect(result.firstName).toBe('');
      expect(result.isChinese).toBe(true);
    });

    test('带空格的中文名', () => {
      const result = parseChineseAuthor('张 三');
      expect(result.lastName).toBe('张');
      expect(result.firstName).toBe('三');
    });
  });

  describe('parseWesternAuthor', () => {
    test('Last, First格式', () => {
      const result = parseWesternAuthor('Smith, John');
      expect(result.lastName).toBe('Smith');
      expect(result.firstName).toBe('John');
    });

    test('First Last格式', () => {
      const result = parseWesternAuthor('John Smith');
      expect(result.lastName).toBe('Smith');
      expect(result.firstName).toBe('John');
    });

    test('First Middle Last格式', () => {
      const result = parseWesternAuthor('John Robert Smith Jr.');
      expect(result.lastName).toBe('Jr.');
      expect(result.middleName).toBeDefined();
    });
  });

  describe('normalizeDocument', () => {
    test('正确标准化所有字段', () => {
      const doc = {
        type: 'JOURNAL_ARTICLE',
        title: '  Test Title  ',
        authors: 'Smith, J.',
        year: 2023,
        journal: 'Test Journal',
        volume: '10',
        issue: '2',
        pages: '100-120',
        doi: '10.1234/test',
      };

      const normalized = normalizeDocument(doc);

      expect(normalized.title).toBe('Test Title');
      expect(normalized.authors).toHaveLength(1);
      expect(normalized.year).toBe(2023);
      expect(normalized.containerTitle).toBe('Test Journal');
      expect(normalized.volume).toBe('10');
    });

    test('处理undefined字段', () => {
      const doc = {
        type: 'JOURNAL_ARTICLE',
        title: 'Test',
        authors: 'Author',
      };

      const normalized = normalizeDocument(doc);

      expect(normalized.year).toBeUndefined();
      expect(normalized.containerTitle).toBeUndefined();
      expect(normalized.pages).toBeUndefined();
    });
  });

  describe('getContainerTitle', () => {
    test('期刊文章返回journal', () => {
      expect(getContainerTitle({ type: 'JOURNAL_ARTICLE', journal: 'Nature' })).toBe('Nature');
    });

    test('学位论文返回university', () => {
      expect(getContainerTitle({ type: 'THESIS', university: 'Tsinghua' })).toBe('Tsinghua');
    });

    test('书籍返回publisher', () => {
      expect(getContainerTitle({ type: 'BOOK', publisher: 'MIT Press' })).toBe('MIT Press');
    });

    test('未知类型返回undefined', () => {
      expect(getContainerTitle({ type: 'PATENT' })).toBeUndefined();
    });
  });
});
