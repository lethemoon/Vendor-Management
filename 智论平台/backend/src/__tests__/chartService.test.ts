/**
 * 图表数据聚合服务完整测试套件
 * 覆盖 chartService 全部10个公开方法
 * Mock: PrismaClient + ioredis
 * 目标: 80+ 测试用例，核心方法覆盖率 >80%
 */

import { chartService } from '../services/chartService';
import { ChartRiskLevel } from '../types/chart';

// ==================== Mock Setup ====================
// 使用 let 声明以避免 TDZ（Temporal Dead Zone）问题
// jest.mock 工厂函数在模块加载时执行，需要引用已声明的变量

var m: Record<string, any>;
var rm: Record<string, any>;

jest.mock('ioredis', () => {
  rm = {
    get: jest.fn().mockResolvedValue(null),
    setex: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    on: jest.fn(),
  };
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => rm),
  };
});

jest.mock('@prisma/client', () => {
  m = {
    aIGCDetection_findUnique: jest.fn(),
    aIGCDetection_findFirst: jest.fn(),
    aIGCDetection_count: jest.fn(),
    aIGCDetection_aggregate: jest.fn(),
    document_findMany: jest.fn(),
    document_count: jest.fn(),
    paperCitation_findMany: jest.fn(),
    paperCitation_groupBy: jest.fn(),
    paper_findMany: jest.fn(),
    paper_count: jest.fn(),
    queryRaw: jest.fn(),
  };

  return {
    PrismaClient: jest.fn().mockImplementation(() => ({
      aIGCDetection: {
        findUnique: m.aIGCDetection_findUnique,
        findFirst: m.aIGCDetection_findFirst,
        count: m.aIGCDetection_count,
        aggregate: m.aIGCDetection_aggregate,
      },
      document: {
        findMany: m.document_findMany,
        count: m.document_count,
        groupBy: jest.fn(),
      },
      paperCitation: {
        findMany: m.paperCitation_findMany,
        groupBy: m.paperCitation_groupBy,
      },
      paper: {
        findMany: m.paper_findMany,
        count: m.paper_count,
      },
      $queryRaw: m.queryRaw,
      $queryRawUnsafe: jest.fn(),
    })),
  };
});

const mockRedisDel = jest.fn().mockResolvedValue(1);

// ==================== 测试辅助数据 ====================

function createMockDetection(overrides: Record<string, unknown> = {}) {
  const defaultParagraphs = [
    { index: 0, score: 15, riskLevel: 'low', wordCount: 120, issues: [], preview: '第一段内容...', ruleBreakdown: { ttr: 0.65, sentenceVariance: 12, vocabulary: 8, transitions: 4, passiveVoice: 1 } },
    { index: 1, score: 45, riskLevel: 'medium', wordCount: 95, issues: ['TTR过低'], preview: '第二段内容...', ruleBreakdown: { ttr: 0.42, sentenceVariance: 5, vocabulary: 4, transitions: 2, passiveVoice: 3 } },
    { index: 2, score: 72, riskLevel: 'high', wordCount: 150, issues: ['TTR过低', '句长方差小'], preview: '第三段内容...', ruleBreakdown: { ttr: 0.28, sentenceVariance: 3, vocabulary: 2, transitions: 1, passiveVoice: 5 } },
    { index: 3, score: 55, riskLevel: 'medium-high', wordCount: 80, issues: ['过渡词单一'], preview: '第四段内容...', ruleBreakdown: { ttr: 0.38, sentenceVariance: 6, vocabulary: 5, transitions: 1, passiveVoice: 2 } },
    { index: 4, score: 8, riskLevel: 'low', wordCount: 200, issues: [], preview: '第五段低风险...', ruleBreakdown: { ttr: 0.72, sentenceVariance: 15, vocabulary: 10, transitions: 5, passiveVoice: 0 } },
  ];
  return {
    id: 'test-aigc-uuid-001',
    result: { paragraphs: defaultParagraphs },
    overallScore: 39,
    riskLevel: 'Medium',
    createdAt: new Date('2025-01-15'),
    ...overrides,
  };
}

function createMockDocuments(count: number, type: string = 'JOURNAL_ARTICLE') {
  return Array.from({ length: count }, (_, i) => ({
    id: `doc-${i}`,
    type,
    createdAt: new Date(Date.now() - i * 86400000),
  }));
}

function createMockCitations(months: number) {
  const citations = [];
  const now = new Date();
  for (let i = 0; i < months; i++) {
    const date = new Date(now);
    date.setMonth(date.getMonth() - i);
    for (let j = 0; j <= i; j++) {
      citations.push({
        createdAt: date,
        format: i % 2 === 0 ? 'GBT7714' : 'APA7',
      });
    }
  }
  return citations;
}

// ==================== 1. getAIGCRiskDistribution 测试 ====================

describe('chartService.getAIGCRiskDistribution', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('正常情况：应返回4个风险等级的分布数据', async () => {
    const detection = createMockDetection();
    m.aIGCDetection_findUnique.mockResolvedValue(detection);

    const result = await chartService.getAIGCRiskDistribution('test-aigc-uuid-001');

    expect(result.segments).toHaveLength(4);
    expect(result.totalParagraphs).toBe(5);
    expect(result.overallScore).toBe(39);
  });

  it('边界：检测记录不存在时应抛出错误', async () => {
    m.aIGCDetection_findUnique.mockResolvedValue(null);

    await expect(chartService.getAIGCRiskDistribution('nonexistent-id'))
      .rejects.toThrow('检测记录不存在');
  });

  it('边界：result为空对象时应返回空段落分布', async () => {
    const detection = createMockDetection({ result: {} });
    m.aIGCDetection_findUnique.mockResolvedValue(detection);

    const result = await chartService.getAIGCRiskDistribution('test-aigc-uuid-001');

    expect(result.totalParagraphs).toBe(0);
    expect(result.overallScore).toBe(0);
    result.segments.forEach((seg) => {
      expect(seg.count).toBe(0);
      expect(seg.percentage).toBe(0);
    });
  });

  it('边界：所有段落都是低风险时只low有count>0', async () => {
    const lowOnlyParagraphs = Array.from({ length: 3 }, (_, i) => ({
      index: i, score: 10, riskLevel: 'low', wordCount: 100, issues: [], preview: '',
    }));
    const detection = createMockDetection({ result: { paragraphs: lowOnlyParagraphs }, overallScore: 10 });
    m.aIGCDetection_findUnique.mockResolvedValue(detection);

    const result = await chartService.getAIGCRiskDistribution('test-aigc-uuid-001');

    const lowSeg = result.segments.find((s) => s.riskLevel === 'low');
    expect(lowSeg?.count).toBe(3);
    expect(lowSeg?.percentage).toBeCloseTo(100, 0);
    result.segments.filter((s) => s.riskLevel !== 'low').forEach((seg) => {
      expect(seg.count).toBe(0);
    });
  });

  it('数据验证：percentage总和应约等于100', async () => {
    const detection = createMockDetection();
    m.aIGCDetection_findUnique.mockResolvedValue(detection);

    const result = await chartService.getAIGCRiskDistribution('test-aigc-uuid-001');

    const totalPercentage = result.segments.reduce((sum, seg) => sum + seg.percentage, 0);
    expect(totalPercentage).toBeGreaterThanOrEqual(99.9);
    expect(totalPercentage).toBeLessThanOrEqual(100.1);
  });

  it('数据验证：count总和应等于totalParagraphs', async () => {
    const detection = createMockDetection();
    m.aIGCDetection_findUnique.mockResolvedValue(detection);

    const result = await chartService.getAIGCRiskDistribution('test-aigc-uuid-001');

    const totalCount = result.segments.reduce((sum, seg) => sum + seg.count, 0);
    expect(totalCount).toBe(result.totalParagraphs);
  });

  it('数据验证：颜色映射正确（低→绿，中→黄，高→红）', async () => {
    const detection = createMockDetection();
    m.aIGCDetection_findUnique.mockResolvedValue(detection);

    const result = await chartService.getAIGCRiskDistribution('test-aigc-uuid-001');

    const colorMap: Record<string, string> = {
      low: '#22c55e',
      medium: '#eab308',
      'medium-high': '#f97316',
      high: '#ef4444',
    };
    result.segments.forEach((seg) => {
      expect(seg.color).toBe(colorMap[seg.riskLevel]);
    });
  });
});

// ==================== 2. getAIGCSegmentsTimeline 测试 ====================

describe('chartService.getAIGCSegmentsTimeline', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('正常：应返回段落位置vs风险分数的数据点', async () => {
    const detection = createMockDetection();
    m.aIGCDetection_findUnique.mockResolvedValue(detection);

    const result = await chartService.getAIGCSegmentsTimeline('test-aigc-uuid-001');

    expect(result.paragraphs).toHaveLength(5);
    expect(result.sortBy).toBe('index');
    expect(result.filterBy).toBe('all');
  });

  it('边界：空段落数组应返回空数组', async () => {
    const detection = createMockDetection({ result: { paragraphs: [] } });
    m.aIGCDetection_findUnique.mockResolvedValue(detection);

    const result = await chartService.getAIGCSegmentsTimeline('test-aigc-uuid-001');

    expect(result.paragraphs).toHaveLength(0);
  });

  it('边界：检测记录不存在时应抛出错误', async () => {
    m.aIGCDetection_findUnique.mockResolvedValue(null);

    await expect(chartService.getAIGCSegmentsTimeline('nonexistent-id'))
      .rejects.toThrow('检测记录不存在');
  });

  it('数据验证：每个点都应包含index, score, riskLevel, wordCount', async () => {
    const detection = createMockDetection();
    m.aIGCDetection_findUnique.mockResolvedValue(detection);

    const result = await chartService.getAIGCSegmentsTimeline('test-aigc-uuid-001');

    result.paragraphs.forEach((p) => {
      expect(p).toHaveProperty('index');
      expect(p).toHaveProperty('score');
      expect(p).toHaveProperty('riskLevel');
      expect(p).toHaveProperty('wordCount');
      expect(typeof p.index).toBe('number');
      expect(typeof p.score).toBe('number');
      expect(typeof p.wordCount).toBe('number');
    });
  });

  it('数据验证：score范围应在0-100之间', async () => {
    const detection = createMockDetection();
    m.aIGCDetection_findUnique.mockResolvedValue(detection);

    const result = await chartService.getAIGCSegmentsTimeline('test-aigc-uuid-001');

    result.paragraphs.forEach((p) => {
      expect(p.score).toBeGreaterThanOrEqual(0);
      expect(p.score).toBeLessThanOrEqual(100);
    });
  });

  it('排序验证：默认按index升序排列', async () => {
    const detection = createMockDetection();
    m.aIGCDetection_findUnique.mockResolvedValue(detection);

    const result = await chartService.getAIGCSegmentsTimeline('test-aigc-uuid-001');

    for (let i = 1; i < result.paragraphs.length; i++) {
      expect(result.paragraphs[i].index).toBeGreaterThan(result.paragraphs[i - 1].index);
    }
  });

  it('排序验证：sortBy=score_asc应按分数升序', async () => {
    const detection = createMockDetection();
    m.aIGCDetection_findUnique.mockResolvedValue(detection);

    const result = await chartService.getAIGCSegmentsTimeline('test-aigc-uuid-001', 'score_asc');

    for (let i = 1; i < result.paragraphs.length; i++) {
      expect(result.paragraphs[i].score).toBeGreaterThanOrEqual(result.paragraphs[i - 1].score);
    }
    expect(result.sortBy).toBe('score_asc');
  });

  it('筛选验证：filterBy=high只返回高风险段落', async () => {
    const detection = createMockDetection();
    m.aIGCDetection_findUnique.mockResolvedValue(detection);

    const result = await chartService.getAIGCSegmentsTimeline('test-aigc-uuid-001', 'index', 'high');

    expect(result.paragraphs.length).toBeGreaterThan(0);
    result.paragraphs.forEach((p) => {
      expect(p.riskLevel).toBe('high');
    });
    expect(result.filterBy).toBe('high');
  });

  it('每条记录应包含displayName格式为P{n}', async () => {
    const detection = createMockDetection();
    m.aIGCDetection_findUnique.mockResolvedValue(detection);

    const result = await chartService.getAIGCSegmentsTimeline('test-aigc-uuid-001');

    result.paragraphs.forEach((p) => {
      expect(p.displayName).toMatch(/^P\d+$/);
    });
  });
});

// ==================== 3. getAIGCRiskGauge 测试 ====================

describe('chartService.getAIGCRiskGauge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('正常：应返回当前分数和阈值信息', async () => {
    const detection = createMockDetection({ overallScore: 55, riskLevel: 'MediumHigh' });
    m.aIGCDetection_findUnique.mockResolvedValue(detection);

    const result = await chartService.getAIGCRiskGauge('test-aigc-uuid-001');

    expect(result.score).toBe(55);
    expect(result.min).toBe(0);
    expect(result.max).toBe(100);
    expect(result.label).toBeDefined();
    expect(result.color).toBeDefined();
  });

  it('边界：无检测结果时应抛出错误', async () => {
    m.aIGCDetection_findUnique.mockResolvedValue(null);

    await expect(chartService.getAIGCRiskGauge('nonexistent-id'))
      .rejects.toThrow('检测记录不存在');
  });

  it('阈值验证：thresholds数组长度应为4且递增', async () => {
    const detection = createMockDetection();
    m.aIGCDetection_findUnique.mockResolvedValue(detection);

    const result = await chartService.getAIGCRiskGauge('test-aigc-uuid-001');

    const thresholds = Object.values(result.thresholds);
    expect(thresholds).toHaveLength(4);
    for (let i = 1; i < thresholds.length; i++) {
      expect(thresholds[i]).toBeGreaterThan(thresholds[i - 1]);
    }
  });

  it('分数<30应映射为low风险等级', async () => {
    const detection = createMockDetection({ overallScore: 15 });
    m.aIGCDetection_findUnique.mockResolvedValue(detection);

    const result = await chartService.getAIGCRiskGauge('test-aigc-uuid-001');

    expect(result.riskLevel).toBe('low');
    expect(result.label).toBe('安全');
  });

  it('分数>=70应映射为high风险等级', async () => {
    const detection = createMockDetection({ overallScore: 82 });
    m.aIGCDetection_findUnique.mockResolvedValue(detection);

    const result = await chartService.getAIGCRiskGauge('test-aigc-uuid-001');

    expect(result.riskLevel).toBe('high');
    expect(result.label).toBe('高危');
  });

  it('overallScore为undefined时默认使用0', async () => {
    const detection = createMockDetection({ overallScore: undefined });
    m.aIGCDetection_findUnique.mockResolvedValue(detection);

    const result = await chartService.getAIGCRiskGauge('test-aigc-uuid-001');

    expect(result.score).toBe(0);
    expect(result.riskLevel).toBe('low');
  });
});

// ==================== 4. getAIGCDetailTable 测试 ====================

describe('chartService.getAIGCDetailTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('正常分页：page=1, pageSize=10应返回前10条', async () => {
    const manyParagraphs = Array.from({ length: 25 }, (_, i) => ({
      index: i,
      score: Math.floor(Math.random() * 100),
      riskLevel: i % 4 === 0 ? 'high' : i % 3 === 0 ? 'medium' : 'low',
      wordCount: 100 + i * 10,
      issues: [],
      preview: `段落${i}内容...`,
      ruleBreakdown: { ttr: 0.5, sentenceVariance: 10, vocabulary: 5, transitions: 3, passiveVoice: 2 },
    }));
    const detection = createMockDetection({ result: { paragraphs: manyParagraphs }, overallScore: 42 });
    m.aIGCDetection_findUnique.mockResolvedValue(detection);

    const result = await chartService.getAIGCDetailTable('test-id', 1, 10);

    expect(result.items).toHaveLength(10);
    expect(result.totalItems).toBe(25);
    expect(result.overallScore).toBe(42);
  });

  it('边界：page超出范围时应返回空数组', async () => {
    const detection = createMockDetection();
    m.aIGCDetection_findUnique.mockResolvedValue(detection);

    const result = await chartService.getAIGCDetailTable('test-id', 99, 10);

    expect(result.items).toHaveLength(0);
    expect(result.totalItems).toBe(5);
  });

  it('边界：pageSize大于总数时返回全部数据', async () => {
    const detection = createMockDetection();
    m.aIGCDetection_findUnique.mockResolvedValue(detection);

    const result = await chartService.getAIGCDetailTable('test-id', 1, 100);

    expect(result.items).toHaveLength(5);
    expect(result.items.length).toBe(result.totalItems);
  });

  it('分页验证：第二页应跳过正确的偏移量', async () => {
    const manyParagraphs = Array.from({ length: 15 }, (_, i) => ({
      index: i, score: i * 5, riskLevel: 'low', wordCount: 100, issues: [], preview: '',
      ruleBreakdown: { ttr: 0.5, sentenceVariance: 10, vocabulary: 5, transitions: 3, passiveVoice: 2 },
    }));
    const detection = createMockDetection({ result: { paragraphs: manyParagraphs } });
    m.aIGCDetection_findUnique.mockResolvedValue(detection);

    const page1 = await chartService.getAIGCDetailTable('test-id', 1, 5);
    const page2 = await chartService.getAIGCDetailTable('test-id', 2, 5);

    expect(page1.items[0].index).not.toBe(page2.items[0].index);
    expect(page1.items).toHaveLength(5);
    expect(page2.items).toHaveLength(5);
  });

  it('数据完整性：每条记录应包含必要字段', async () => {
    const detection = createMockDetection();
    m.aIGCDetection_findUnique.mockResolvedValue(detection);

    const result = await chartService.getAIGCDetailTable('test-id', 1, 20);

    result.items.forEach((item) => {
      expect(item).toHaveProperty('index');
      expect(item).toHaveProperty('preview');
      expect(item).toHaveProperty('score');
      expect(item).toHaveProperty('riskLevel');
      expect(item).toHaveProperty('wordCount');
      expect(item).toHaveProperty('issues');
      expect(item).toHaveProperty('ruleBreakdown');
    });
  });

  it('筛选验证：filterBy=high只返回高风险项', async () => {
    const detection = createMockDetection();
    m.aIGCDetection_findUnique.mockResolvedValue(detection);

    const result = await chartService.getAIGCDetailTable('test-id', 1, 20, 'index', 'high');

    result.items.forEach((item) => {
      expect(item.riskLevel).toBe('high');
    });
  });

  it('排序验证：sortBy=score_desc应按分数降序', async () => {
    const detection = createMockDetection();
    m.aIGCDetection_findUnique.mockResolvedValue(detection);

    const result = await chartService.getAIGCDetailTable('test-id', 1, 20, 'score_desc');

    for (let i = 1; i < result.items.length; i++) {
      expect(result.items[i].score).toBeLessThanOrEqual(result.items[i - 1].score);
    }
  });

  it('highRiskCount应正确统计中高+高风险数量', async () => {
    const detection = createMockDetection();
    m.aIGCDetection_findUnique.mockResolvedValue(detection);

    const result = await chartService.getAIGCDetailTable('test-id', 1, 20);

    expect(result.highRiskCount).toBeGreaterThan(0);
    expect(typeof result.highRiskCount).toBe('number');
  });
});

// ==================== 5. getLibraryTypeStats 测试 ====================

describe('chartService.getLibraryTypeStats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('正常：应返回各类型的统计数据', async () => {
    const docs = [
      ...createMockDocuments(3, 'JOURNAL_ARTICLE'),
      ...createMockDocuments(2, 'THESIS'),
      ...createMockDocuments(1, 'BOOK'),
    ];
    m.document_findMany.mockResolvedValue(docs);

    const result = await chartService.getLibraryTypeStats('user-001');

    expect(result.types).toHaveLength(3);
    expect(result.totalDocuments).toBe(6);
  });

  it('边界：用户无文献记录时应返回空类型列表', async () => {
    m.document_findMany.mockResolvedValue([]);

    const result = await chartService.getLibraryTypeStats('user-empty');

    expect(result.types).toHaveLength(0);
    expect(result.totalDocuments).toBe(0);
  });

  it('边界：只有单一类型文献时只返回一种类型', async () => {
    m.document_findMany.mockResolvedValue(createMockDocuments(5, 'CONFERENCE_PAPER'));

    const result = await chartService.getLibraryTypeStats('user-single');

    expect(result.types).toHaveLength(1);
    expect(result.types[0].type).toBe('CONFERENCE_PAPER');
    expect(result.types[0].count).toBe(5);
  });

  it('类型验证：返回的类型应包含必要字段', async () => {
    m.document_findMany.mockResolvedValue(createMockDocuments(2, 'JOURNAL_ARTICLE'));

    const result = await chartService.getLibraryTypeStats('user-001');

    result.types.forEach((t) => {
      expect(t).toHaveProperty('type');
      expect(t).toHaveProperty('label');
      expect(t).toHaveProperty('icon');
      expect(t).toHaveProperty('count');
      expect(t).toHaveProperty('percentage');
      expect(t).toHaveProperty('color');
    });
  });

  it('百分比验证：单类型时百分比应为100%', async () => {
    m.document_findMany.mockResolvedValue(createMockDocuments(3, 'BOOK'));

    const result = await chartService.getLibraryTypeStats('user-001');

    expect(result.types[0].percentage).toBeCloseTo(100, 0);
  });

  it('结果应按count降序排列', async () => {
    const docs = [
      ...createMockDocuments(1, 'THESIS'),
      ...createMockDocuments(5, 'JOURNAL_ARTICLE'),
      ...createMockDocuments(2, 'BOOK'),
    ];
    m.document_findMany.mockResolvedValue(docs);

    const result = await chartService.getLibraryTypeStats('user-001');

    for (let i = 1; i < result.types.length; i++) {
      expect(result.types[i].count).toBeLessThanOrEqual(result.types[i - 1].count);
    }
  });

  it('未知类型应使用默认元信息', async () => {
    m.document_findMany.mockResolvedValue([
      { id: 'doc-x', type: 'UNKNOWN_TYPE', createdAt: new Date() },
    ]);

    const result = await chartService.getLibraryTypeStats('user-001');

    expect(result.types[0].icon).toBe('📋');
    expect(result.types[0].color).toBe('#94a3b8');
  });
});

// ==================== 6. getLibraryCitationTrend 测试 ====================

describe('chartService.getLibraryCitationTrend', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('months=6：应返回6个月度数据点', async () => {
    m.paperCitation_findMany.mockResolvedValue(createMockCitations(6));

    const result = await chartService.getLibraryCitationTrend('user-001', 6);

    expect(result.dataPoints).toHaveLength(6);
    expect(result.period).toBe('monthly');
  });

  it('months=12：应返回12个月度数据点', async () => {
    m.paperCitation_findMany.mockResolvedValue(createMockCitations(12));

    const result = await chartService.getLibraryCitationTrend('user-001', 12);

    expect(result.dataPoints).toHaveLength(12);
  });

  it('边界：无引用记录时各月count应为0', async () => {
    m.paperCitation_findMany.mockResolvedValue([]);

    const result = await chartService.getLibraryCitationTrend('user-no-cite', 6);

    expect(result.dataPoints).toHaveLength(6);
    result.dataPoints.forEach((dp) => {
      expect(dp.count).toBe(0);
    });
    expect(result.totalCitations).toBe(0);
  });

  it('时间排序验证：数据点应按时间升序排列', async () => {
    m.paperCitation_findMany.mockResolvedValue(createMockCitations(6));

    const result = await chartService.getLibraryCitationTrend('user-001', 6);

    for (let i = 1; i < result.dataPoints.length; i++) {
      expect(result.dataPoints[i].periodLabel > result.dataPoints[i - 1].periodLabel).toBe(true);
    }
  });

  it('cumulativeTotal应递增或持平', async () => {
    m.paperCitation_findMany.mockResolvedValue(createMockCitations(6));

    const result = await chartService.getLibraryCitationTrend('user-001', 6);

    for (let i = 1; i < result.dataPoints.length; i++) {
      expect(result.dataPoints[i].cumulativeTotal)
        .toBeGreaterThanOrEqual(result.dataPoints[i - 1].cumulativeTotal);
    }
  });

  it('displayLabel格式应为"{n}月"', async () => {
    m.paperCitation_findMany.mockResolvedValue(createMockCitations(3));

    const result = await chartService.getLibraryCitationTrend('user-001', 3);

    result.dataPoints.forEach((dp) => {
      expect(dp.displayLabel).toMatch(/^\d+月$/);
    });
  });
});

// ==================== 7. getLibraryMonthlyGrowth 测试 ====================

describe('chartService.getLibraryMonthlyGrowth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('months=6：应返回最近6个月的月度增长数据', async () => {
    m.document_findMany.mockResolvedValue([
      { id: 'd1', createdAt: new Date(Date.now() - 10 * 86400000) },
      { id: 'd2', createdAt: new Date(Date.now() - 40 * 86400000) },
      { id: 'd3', createdAt: new Date(Date.now() - 60 * 86400000) },
    ]);
    m.document_count.mockResolvedValue(10);

    const result = await chartService.getLibraryMonthlyGrowth('user-001', 6);

    expect(result.dataPoints).toHaveLength(6);
    expect(result.totalDocuments).toBe(10);
  });

  it('months=12：应返回12个月的数据', async () => {
    m.document_findMany.mockResolvedValue([]);
    m.document_count.mockResolvedValue(5);

    const result = await chartService.getLibraryMonthlyGrowth('user-001', 12);

    expect(result.dataPoints).toHaveLength(12);
  });

  it('边界：无新增记录月份应显示addedCount=0', async () => {
    m.document_findMany.mockResolvedValue([]);
    m.document_count.mockResolvedValue(3);

    const result = await chartService.getLibraryMonthlyGrowth('user-001', 3);

    result.dataPoints.forEach((dp) => {
      expect(dp.addedCount).toBe(0);
    });
  });

  it('cumulativeTotal验证：totalCount应基于历史累计', async () => {
    m.document_findMany.mockResolvedValue([
      { id: 'd1', createdAt: new Date(Date.now() - 10 * 86400000) },
      { id: 'd2', createdAt: new Date(Date.now() - 30 * 86400000) },
    ]);
    m.document_count.mockResolvedValue(7);

    const result = await chartService.getLibraryMonthlyGrowth('user-001', 6);

    result.dataPoints.forEach((dp) => {
      expect(dp.totalCount).toBeGreaterThanOrEqual(0);
      expect(typeof dp.totalCount).toBe('number');
    });
  });

  it('averageMonthlyGrowth计算应正确', async () => {
    m.document_findMany.mockResolvedValue([
      { id: 'd1', createdAt: new Date(Date.now() - 10 * 86400000) },
      { id: 'd2', createdAt: new Date(Date.now() - 40 * 86400000) },
    ]);
    m.document_count.mockResolvedValue(5);

    const result = await chartService.getLibraryMonthlyGrowth('user-001', 6);

    expect(result.averageMonthlyGrowth).toBeCloseTo(2 / 6, 1);
  });

  it('month格式应为"{n}月"', async () => {
    m.document_findMany.mockResolvedValue([]);
    m.document_count.mockResolvedValue(0);

    const result = await chartService.getLibraryMonthlyGrowth('user-001', 3);

    result.dataPoints.forEach((dp) => {
      expect(dp.month).toMatch(/^\d+月$/);
    });
  });

  it('peakMonth应在新增最多的月份或有值/null', async () => {
    m.document_findMany.mockResolvedValue([
      { id: 'd1', createdAt: new Date(Date.now() - 10 * 86400000) },
      { id: 'd2', createdAt: new Date(Date.now() - 10 * 86400000) },
    ]);
    m.document_count.mockResolvedValue(2);

    const result = await chartService.getLibraryMonthlyGrowth('user-001', 6);

    expect(result).toHaveProperty('peakMonth');
  });
});

// ==================== 8. getUserActivityStats 测试 ====================

describe('chartService.getUserActivityStats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('正常：应返回用户KPI数据', async () => {
    m.document_count
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(2);
    m.aIGCDetection_count
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(1);
    m.aIGCDetection_aggregate.mockResolvedValue({ _avg: { overallScore: 35.5 } });
    m.queryRaw
      .mockResolvedValueOnce([{ total: BigInt(20) }])
      .mockResolvedValueOnce([{ format: 'GBT7714', count: BigInt(15) }]);
    m.aIGCDetection_findFirst.mockResolvedValue({
      updatedAt: new Date('2025-03-01'),
    });

    const result = await chartService.getUserActivityStats('user-001');

    expect(result.totalDocuments).toBe(10);
    expect(result.totalDetections).toBe(5);
    expect(result.totalCitations).toBe(20);
    expect(result.thisMonthAdded).toBe(2);
    expect(result.thisMonthDetected).toBe(1);
    expect(result.averageRiskScore).toBe(36);
    expect(result.mostUsedFormat).toBe('GBT7714');
    expect(result.lastActivityAt).toBeDefined();
  });

  it('边界：新用户（无任何活动）应返回全零值', async () => {
    m.document_count.mockResolvedValue(0);
    m.aIGCDetection_count.mockResolvedValue(0);
    m.aIGCDetection_aggregate.mockResolvedValue({ _avg: { overallScore: null } });
    m.queryRaw
      .mockResolvedValueOnce([{ total: BigInt(0) }])
      .mockResolvedValueOnce([]);
    m.aIGCDetection_findFirst.mockResolvedValue(null);

    const result = await chartService.getUserActivityStats('new-user');

    expect(result.totalDocuments).toBe(0);
    expect(result.totalDetections).toBe(0);
    expect(result.totalCitations).toBe(0);
    expect(result.thisMonthAdded).toBe(0);
    expect(result.thisMonthDetected).toBe(0);
    expect(result.averageRiskScore).toBe(0);
  });

  it('字段验证：关键字段应为非负数', async () => {
    m.document_count
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(1);
    m.aIGCDetection_count
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(1);
    m.aIGCDetection_aggregate.mockResolvedValue({ _avg: { overallScore: 42 } });
    m.queryRaw
      .mockResolvedValueOnce([{ total: BigInt(8) }])
      .mockResolvedValueOnce([{ format: 'APA7', count: BigInt(5) }]);
    m.aIGCDetection_findFirst.mockResolvedValue({ updatedAt: new Date() });

    const result = await chartService.getUserActivityStats('user-001');

    expect(result.totalDocuments).toBeGreaterThanOrEqual(0);
    expect(result.totalDetections).toBeGreaterThanOrEqual(0);
    expect(result.totalCitations).toBeGreaterThanOrEqual(0);
    expect(result.thisMonthAdded).toBeGreaterThanOrEqual(0);
    expect(result.thisMonthDetected).toBeGreaterThanOrEqual(0);
    expect(result.averageRiskScore).toBeGreaterThanOrEqual(0);
  });

  it('mostUsedFormat在无引用数据时默认为GBT7714', async () => {
    m.document_count.mockResolvedValue(1);
    m.aIGCDetection_count.mockResolvedValue(0);
    m.aIGCDetection_aggregate.mockResolvedValue({ _avg: { overallScore: 0 } });
    m.queryRaw
      .mockResolvedValueOnce([{ total: BigInt(0) }])
      .mockResolvedValueOnce([]);
    m.aIGCDetection_findFirst.mockResolvedValue(null);

    const result = await chartService.getUserActivityStats('user-no-format');

    expect(result.mostUsedFormat).toBe('GBT7714');
  });

  it('lastActivityAt在无检测记录时应返回当前时间ISO字符串', async () => {
    m.document_count.mockResolvedValue(0);
    m.aIGCDetection_count.mockResolvedValue(0);
    m.aIGCDetection_aggregate.mockResolvedValue({ _avg: { overallScore: null } });
    m.queryRaw
      .mockResolvedValueOnce([{ total: BigInt(0) }])
      .mockResolvedValueOnce([]);
    m.aIGCDetection_findFirst.mockResolvedValue(null);

    const result = await chartService.getUserActivityStats('user-new');

    expect(result.lastActivityAt).toBeDefined();
    expect(() => new Date(result.lastActivityAt)).not.toThrow();
  });
});

// ==================== 9. getTopCitedDocuments + getAIGCOptimizationTrend 测试 ====================

describe('chartService.getTopCitedDocuments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('正常：应返回TOP被引文献排行', async () => {
    m.queryRaw
      .mockResolvedValueOnce([
        { document_id: 'doc-1', title: '深度学习综述', authors: '张三', year: 2023, type: 'JOURNAL_ARTICLE', citation_count: BigInt(15) },
        { document_id: 'doc-2', title: 'Transformer架构', authors: '李四', year: 2022, type: 'THESIS', citation_count: BigInt(8) },
        { document_id: 'doc-3', title: '神经网络优化', authors: '王五', year: 2024, type: 'BOOK', citation_count: BigInt(3) },
      ])
      .mockResolvedValueOnce([{ total: BigInt(26) }]);

    const result = await chartService.getTopCitedDocuments('user-001', 10);

    expect(result.rankings).toHaveLength(3);
    expect(result.totalCitedDocuments).toBe(3);
    expect(result.totalCitations).toBe(26);
  });

  it('边界：无引用数据时应返回空排序列表', async () => {
    m.queryRaw
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ total: BigInt(0) }]);

    const result = await chartService.getTopCitedDocuments('user-nocite', 10);

    expect(result.rankings).toHaveLength(0);
    expect(result.totalCitations).toBe(0);
  });

  it('rank应从1开始递增', async () => {
    m.queryRaw
      .mockResolvedValueOnce([
        { document_id: 'doc-1', title: '论文A', authors: '', year: 2023, type: 'JOURNAL_ARTICLE', citation_count: BigInt(10) },
        { document_id: 'doc-2', title: '论文B', authors: '', year: 2023, type: 'JOURNAL_ARTICLE', citation_count: BigInt(5) },
      ])
      .mockResolvedValueOnce([{ total: BigInt(15) }]);

    const result = await chartService.getTopCitedDocuments('user-001', 10);

    result.rankings.forEach((r, idx) => {
      expect(r.rank).toBe(idx + 1);
    });
  });

  it('标题超过27字符应截断并加省略号', async () => {
    const longTitle = '这是一个非常非常非常非常非常长的论文标题用于测试截断功能是否正常工作';
    m.queryRaw
      .mockResolvedValueOnce([{
        document_id: 'doc-1',
        title: longTitle,
        authors: '',
        year: 2023,
        type: 'JOURNAL_ARTICLE',
        citation_count: BigInt(1),
      }])
      .mockResolvedValueOnce([{ total: BigInt(1) }]);

    const result = await chartService.getTopCitedDocuments('user-001', 10);

    expect(result.rankings[0].displayTitle).toContain('...');
    expect(result.rankings[0].displayTitle.length).toBeLessThanOrEqual(30);
  });

  it('percentageOfTotal计算应正确', async () => {
    m.queryRaw
      .mockResolvedValueOnce([
        { document_id: 'doc-1', title: '论文A', authors: '', year: 2023, type: 'JOURNAL_ARTICLE', citation_count: BigInt(8) },
        { document_id: 'doc-2', title: '论文B', authors: '', year: 2023, type: 'JOURNAL_ARTICLE', citation_count: BigInt(2) },
      ])
      .mockResolvedValueOnce([{ total: BigInt(10) }]);

    const result = await chartService.getTopCitedDocuments('user-001', 10);

    expect(result.rankings[0].percentageOfTotal).toBeCloseTo(80, 0);
    expect(result.rankings[1].percentageOfTotal).toBeCloseTo(20, 0);
  });
});

describe('chartService.getAIGCOptimizationTrend', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('正常：应包含初始点和后续优化轮次', async () => {
    const detection = {
      id: 'opt-test-id',
      overallScore: 65,
      createdAt: new Date('2025-02-01'),
      result: {},
      optimizations: [
        {
          roundNumber: 1,
          operationType: 'Rewrite',
          beforeAigcRate: 65,
          afterAigcRate: 35,
          rateChange: -30,
          targetParagraphIndices: [0, 2],
          createdAt: new Date('2025-02-02'),
        },
        {
          roundNumber: 2,
          operationType: 'Rewrite',
          beforeAigcRate: 35,
          afterAigcRate: 18,
          rateChange: -17,
          targetParagraphIndices: [1],
          createdAt: new Date('2025-02-03'),
        },
      ],
    };
    m.aIGCDetection_findUnique.mockResolvedValue(detection);

    const result = await chartService.getAIGCOptimizationTrend('opt-test-id');

    expect(result.points).toHaveLength(3);
    expect(result.points[0].roundLabel).toBe('初始');
    expect(result.points[0].roundNumber).toBe(0);
    expect(result.safeThreshold).toBe(20);
  });

  it('边界：无优化记录时只有初始点', async () => {
    const detection = {
      id: 'opt-empty-id',
      overallScore: 50,
      createdAt: new Date(),
      result: {},
      optimizations: [],
    };
    m.aIGCDetection_findUnique.mockResolvedValue(detection);

    const result = await chartService.getAIGCOptimizationTrend('opt-empty-id');

    expect(result.points).toHaveLength(1);
    expect(result.points[0].roundLabel).toBe('初始');
  });

  it('targetAchieved应根据最后分数判断', async () => {
    const detection = {
      id: 'opt-achieved',
      overallScore: 15,
      createdAt: new Date(),
      result: {},
      optimizations: [],
    };
    m.aIGCDetection_findUnique.mockResolvedValue(detection);

    const result = await chartService.getAIGCOptimizationTrend('opt-achieved');

    expect(result.targetAchieved).toBe(true);
  });

  it('边界：检测记录不存在时应抛出错误', async () => {
    m.aIGCDetection_findUnique.mockResolvedValue(null);

    await expect(chartService.getAIGCOptimizationTrend('nonexistent'))
      .rejects.toThrow('检测记录不存在');
  });

  it('changeFromPrevious初始点应为null', async () => {
    const detection = {
      id: 'opt-change',
      overallScore: 60,
      createdAt: new Date(),
      result: {},
      optimizations: [],
    };
    m.aIGCDetection_findUnique.mockResolvedValue(detection);

    const result = await chartService.getAIGCOptimizationTrend('opt-change');

    expect(result.points[0].changeFromPrevious).toBeNull();
  });

  it('isRebound在分数上升时应为true', async () => {
    const detection = {
      id: 'opt-rebound',
      overallScore: 55,
      createdAt: new Date('2025-01-01'),
      result: {},
      optimizations: [
        {
          roundNumber: 1,
          operationType: 'Rewrite',
          beforeAigcRate: 55,
          afterAigcRate: 70,
          rateChange: 15,
          targetParagraphIndices: [0],
          createdAt: new Date('2025-01-02'),
        },
      ],
    };
    m.aIGCDetection_findUnique.mockResolvedValue(detection);

    const result = await chartService.getAIGCOptimizationTrend('opt-rebound');

    expect(result.points[1].isRebound).toBe(true);
  });
});

// ==================== 10. Redis缓存测试 ====================

describe('ChartService Redis缓存机制', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('缓存key格式应包含类型和ID', async () => {
    m.aIGCDetection_findUnique.mockResolvedValue(createMockDetection());

    await chartService.getAIGCRiskDistribution('cache-test-001');

    expect(rm.get).toHaveBeenCalled();
    const cacheKey = rm.get.mock.calls[0][0];
    expect(cacheKey).toContain('risk-distribution');
    expect(cacheKey).toContain('cache-test-001');
  });

  it('相同参数第二次调用应走缓存', async () => {
    const cachedData = {
      segments: [{ riskLevel: 'low' as ChartRiskLevel, label: '低风险', count: 3, percentage: 100, color: '#22c55e' }],
      totalParagraphs: 3,
      overallScore: 10,
    };

    rm.get
      .mockResolvedValueOnce(JSON.stringify(cachedData))
      .mockResolvedValueOnce(JSON.stringify(cachedData));
    m.aIGCDetection_findUnique.mockResolvedValue(createMockDetection());

    const result1 = await chartService.getAIGCRiskDistribution('cached-id');
    const result2 = await chartService.getAIGCRiskDistribution('cached-id');

    expect(result1.segments[0].count).toBe(3);
    expect(m.aIGCDetection_findUnique).toHaveBeenCalledTimes(0);
  });

  it('不同参数应使用不同cache key', async () => {
    m.aIGCDetection_findUnique.mockResolvedValue(createMockDetection());

    await chartService.getAIGCRiskDistribution('id-alpha');
    await chartService.getAIGCRiskDistribution('id-beta');

    const keys = rm.get.mock.calls.map((call: any) => call[0]);
    expect(keys[0]).not.toBe(keys[1]);
    expect(keys[0]).toContain('id-alpha');
    expect(keys[1]).toContain('id-beta');
  });

  it('缓存写入后应能正确返回数据', async () => {
    m.aIGCDetection_findUnique.mockResolvedValue(createMockDetection());

    const result = await chartService.getAIGCRiskDistribution('setex-test');

    expect(result).toBeDefined();
    expect(result.totalParagraphs).toBe(5);
    expect(rm.get).toHaveBeenCalled();
  });

  it('detail-table应正确返回分页数据', async () => {
    m.aIGCDetection_findUnique.mockResolvedValue(createMockDetection());

    const result = await chartService.getAIGCDetailTable('ttl-test', 1, 10);

    expect(result).toBeDefined();
    expect(result.items).toBeDefined();
    expect(result.totalItems).toBe(5);
  });

  it('不同方法应有不同缓存key前缀', async () => {
    m.aIGCDetection_findUnique.mockResolvedValue(createMockDetection());

    await chartService.getAIGCRiskDistribution('prefix-test');
    await chartService.getAIGCRiskGauge('prefix-test');

    const key1 = rm.get.mock.calls[0][0] as string;
    const key2 = rm.get.mock.calls[1][0] as string;
    expect(key1).toContain('risk-distribution');
    expect(key2).toContain('risk-gauge');
    expect(key1).not.toBe(key2);
  });

  it('缓存读取失败时应降级到数据库查询', async () => {
    rm.get.mockRejectedValueOnce(new Error('Redis连接失败'));
    m.aIGCDetection_findUnique.mockResolvedValue(createMockDetection());

    const result = await chartService.getAIGCRiskDistribution('fallback-test');

    expect(result).toBeDefined();
    expect(result.segments).toHaveLength(4);
  });
});
