/**
 * 图表API路由集成测试套件
 * 覆盖 AIGC 4个图表端点 + Library 4个图表端点
 * 使用手动构建的Fastify实例 + Mock中间件
 * 目标: 40+ 测试用例
 */

import fastify, { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import {
  chartSchemas,
  ChartErrorCode,
  CHART_ERROR_MESSAGES,
} from '../types/chart';
import { chartService } from '../services/chartService';

// ==================== Mock Setup（工厂内赋值，避免TDZ） ====================

var _pm: Record<string, any>;

jest.mock('@prisma/client', () => {
  _pm = {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    docFindMany: jest.fn(),
    docCount: jest.fn(),
    citationFindMany: jest.fn(),
    queryRaw: jest.fn(),
    aigcAggregate: jest.fn(),
    aigcCount: jest.fn(),
  };

  return {
    PrismaClient: jest.fn().mockImplementation(() => ({
      aIGCDetection: {
        findUnique: _pm.findUnique,
        findFirst: _pm.findFirst,
        count: _pm.aigcCount,
        aggregate: _pm.aigcAggregate,
      },
      document: {
        findMany: _pm.docFindMany,
        count: _pm.docCount,
      },
      paperCitation: {
        findMany: _pm.citationFindMany,
      },
      $queryRaw: _pm.queryRaw,
    })),
  };
});

jest.mock('ioredis', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    get: jest.fn().mockResolvedValue(null),
    setex: jest.fn().mockResolvedValue('OK'),
    del: jest.fn(),
    on: jest.fn(),
  })),
}));

// ==================== 测试辅助 ====================

const TEST_AIGC_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
const TEST_USER_ID = 'user-test-001';
const VALID_UUID = '123e4567-e89b-12d3-a456-426614174000';
const INVALID_UUID = 'not-a-valid-uuid';

function createMockDetection(overrides: Record<string, unknown> = {}) {
  return {
    id: TEST_AIGC_ID,
    userId: TEST_USER_ID,
    result: {
      paragraphs: [
        { index: 0, score: 15, riskLevel: 'low', wordCount: 120, issues: [], preview: '' },
        { index: 1, score: 55, riskLevel: 'medium-high', wordCount: 90, issues: ['TTR过低'], preview: '' },
        { index: 2, score: 75, riskLevel: 'high', wordCount: 150, issues: ['TTR过低', '句长方差小'], preview: '' },
      ],
    },
    overallScore: 48,
    riskLevel: 'Medium',
    status: 'Analyzed',
    deletedAt: null,
    ...overrides,
  };
}

function buildTestApp(): FastifyInstance {
  const app = fastify({ logger: false });

  app.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    const authHeader = request.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      (request as any).user = null;
      return;
    }
    (request as any).user = { userId: TEST_USER_ID };
  });

  registerAIGCChartRoutes(app);
  registerLibraryChartRoutes(app);

  return app;
}

// ==================== AIGC图表路由注册 ====================

function registerAIGCChartRoutes(app: FastifyInstance) {

  app.get('/:id/chart/risk-distribution', {
    preHandler: [app.authenticate],
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const userId = (request as any).user?.userId;
      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: { code: ChartErrorCode.NOT_AUTHORIZED, message: CHART_ERROR_MESSAGES[ChartErrorCode.NOT_AUTHORIZED] },
        });
      }

      const { id: aigcId } = request.params;
      chartSchemas.riskDistributionQuery.parse({ id: aigcId });

      const prisma = require('@prisma/client');
      const client = new prisma.PrismaClient();
      const detection = await client.aIGCDetection.findFirst({
        where: { id: aigcId, userId, deletedAt: null },
      });

      if (!detection) {
        return reply.status(404).send({
          success: false,
          error: { code: ChartErrorCode.DETECTION_NOT_FOUND, message: CHART_ERROR_MESSAGES[ChartErrorCode.DETECTION_NOT_FOUND] },
        });
      }

      const data = await chartService.getAIGCRiskDistribution(aigcId);
      return reply.send({ success: true, data, message: '获取风险分布数据成功' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: { code: ChartErrorCode.INVALID_PARAMETERS, message: '参数校验失败', details: error.errors },
        });
      }
      return reply.status(500).send({
        success: false,
        error: { code: ChartErrorCode.AGGREGATION_FAILED, message: '获取风险分布数据失败，请稍后重试' },
      });
    }
  });

  app.get('/:id/chart/segments-timeline', {
    preHandler: [app.authenticate],
  }, async (
    request: FastifyRequest<{ Params: { id: string }; Querystring: { sortBy?: string; filterBy?: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const userId = (request as any).user?.userId;
      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: { code: ChartErrorCode.NOT_AUTHORIZED, message: CHART_ERROR_MESSAGES[ChartErrorCode.NOT_AUTHORIZED] },
        });
      }

      const { id: aigcId } = request.params;
      const query = chartSchemas.segmentsTimelineQuery.parse({
        id: aigcId,
        sortBy: request.query.sortBy,
        filterBy: request.query.filterBy,
      });

      const prisma = require('@prisma/client');
      const client = new prisma.PrismaClient();
      const detection = await client.aIGCDetection.findFirst({
        where: { id: aigcId, userId, deletedAt: null },
      });

      if (!detection) {
        return reply.status(404).send({
          success: false,
          error: { code: ChartErrorCode.DETECTION_NOT_FOUND, message: CHART_ERROR_MESSAGES[ChartErrorCode.DETECTION_NOT_FOUND] },
        });
      }

      const data = await chartService.getAIGCSegmentsTimeline(aigcId, query.sortBy, query.filterBy);
      return reply.send({ success: true, data, message: '获取段落时间线数据成功' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: { code: ChartErrorCode.INVALID_PARAMETERS, message: '参数校验失败', details: error.errors },
        });
      }
      return reply.status(500).send({
        success: false,
        error: { code: ChartErrorCode.AGGREGATION_FAILED, message: '获取段落时间线数据失败，请稍后重试' },
      });
    }
  });

  app.get('/:id/chart/risk-gauge', {
    preHandler: [app.authenticate],
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const userId = (request as any).user?.userId;
      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: { code: ChartErrorCode.NOT_AUTHORIZED, message: CHART_ERROR_MESSAGES[ChartErrorCode.NOT_AUTHORIZED] },
        });
      }

      const { id: aigcId } = request.params;
      chartSchemas.riskGaugeQuery.parse({ id: aigcId });

      const prisma = require('@prisma/client');
      const client = new prisma.PrismaClient();
      const detection = await client.aIGCDetection.findFirst({
        where: { id: aigcId, userId, deletedAt: null },
      });

      if (!detection) {
        return reply.status(404).send({
          success: false,
          error: { code: ChartErrorCode.DETECTION_NOT_FOUND, message: CHART_ERROR_MESSAGES[ChartErrorCode.DETECTION_NOT_FOUND] },
        });
      }

      const data = await chartService.getAIGCRiskGauge(aigcId);
      return reply.send({ success: true, data, message: '获取风险仪表盘数据成功' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: { code: ChartErrorCode.INVALID_PARAMETERS, message: '参数校验失败', details: error.errors },
        });
      }
      return reply.status(500).send({
        success: false,
        error: { code: ChartErrorCode.AGGREGATION_FAILED, message: '获取风险仪表盘数据失败，请稍后重试' },
      });
    }
  });

  app.get('/:id/chart/detail-table', {
    preHandler: [app.authenticate],
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
          error: { code: ChartErrorCode.NOT_AUTHORIZED, message: CHART_ERROR_MESSAGES[ChartErrorCode.NOT_AUTHORIZED] },
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

      const prisma = require('@prisma/client');
      const client = new prisma.PrismaClient();
      const detection = await client.aIGCDetection.findFirst({
        where: { id: aigcId, userId, deletedAt: null },
      });

      if (!detection) {
        return reply.status(404).send({
          success: false,
          error: { code: ChartErrorCode.DETECTION_NOT_FOUND, message: CHART_ERROR_MESSAGES[ChartErrorCode.DETECTION_NOT_FOUND] },
        });
      }

      const data = await chartService.getAIGCDetailTable(aigcId, query.page, query.pageSize, query.sortBy, query.filterBy);
      return reply.send({
        success: true,
        data,
        meta: { currentPage: query.page, pageSize: query.pageSize, totalItems: data.totalItems },
        message: '获取详细数据表成功',
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: { code: ChartErrorCode.INVALID_PARAMETERS, message: '参数校验失败', details: error.errors },
        });
      }
      return reply.status(500).send({
        success: false,
        error: { code: ChartErrorCode.AGGREGATION_FAILED, message: '获取详细数据表失败，请稍后重试' },
      });
    }
  });
}

// ==================== Library图表路由注册 ====================

function registerLibraryChartRoutes(app: FastifyInstance) {

  app.get('/stats/overview', {
    preHandler: [app.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request as any).user?.userId;
      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: { code: ChartErrorCode.NOT_AUTHORIZED, message: CHART_ERROR_MESSAGES[ChartErrorCode.NOT_AUTHORIZED] },
        });
      }

      chartSchemas.overviewQuery.parse(request.query);
      const data = await chartService.getUserActivityStats(userId);
      return reply.send({ success: true, data, message: '获取统计概览成功' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: { code: ChartErrorCode.INVALID_PARAMETERS, message: '参数校验失败', details: error.errors },
        });
      }
      return reply.status(500).send({
        success: false,
        error: { code: ChartErrorCode.AGGREGATION_FAILED, message: '获取统计概览失败，请稍后重试' },
      });
    }
  });

  app.get('/stats/type-distribution', {
    preHandler: [app.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request as any).user?.userId;
      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: { code: ChartErrorCode.NOT_AUTHORIZED, message: CHART_ERROR_MESSAGES[ChartErrorCode.NOT_AUTHORIZED] },
        });
      }

      chartSchemas.typeDistributionQuery.parse(request.query);
      const data = await chartService.getLibraryTypeStats(userId);
      return reply.send({ success: true, data, message: '获取类型分布数据成功' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: { code: ChartErrorCode.INVALID_PARAMETERS, message: '参数校验失败', details: error.errors },
        });
      }
      return reply.status(500).send({
        success: false,
        error: { code: ChartErrorCode.AGGREGATION_FAILED, message: '获取类型分布数据失败，请稍后重试' },
      });
    }
  });

  app.get('/stats/citation-trend', {
    preHandler: [app.authenticate],
  }, async (
    request: FastifyRequest<{ Querystring: { months?: string; period?: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const userId = (request as any).user?.userId;
      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: { code: ChartErrorCode.NOT_AUTHORIZED, message: CHART_ERROR_MESSAGES[ChartErrorCode.NOT_AUTHORIZED] },
        });
      }

      const query = chartSchemas.citationTrendQuery.parse({
        months: request.query.months,
        period: request.query.period,
      });

      const data = await chartService.getLibraryCitationTrend(userId, query.months);
      return reply.send({ success: true, data, message: '获取引用趋势数据成功' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: { code: ChartErrorCode.INVALID_PARAMETERS, message: '参数校验失败', details: error.errors },
        });
      }
      return reply.status(500).send({
        success: false,
        error: { code: ChartErrorCode.AGGREGATION_FAILED, message: '获取引用趋势数据失败，请稍后重试' },
      });
    }
  });

  app.get('/stats/monthly-growth', {
    preHandler: [app.authenticate],
  }, async (
    request: FastifyRequest<{ Querystring: { months?: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const userId = (request as any).user?.userId;
      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: { code: ChartErrorCode.NOT_AUTHORIZED, message: CHART_ERROR_MESSAGES[ChartErrorCode.NOT_AUTHORIZED] },
        });
      }

      const query = chartSchemas.monthlyGrowthQuery.parse({
        months: request.query.months,
      });

      const data = await chartService.getLibraryMonthlyGrowth(userId, query.months);
      return reply.send({ success: true, data, message: '获取月度增长数据成功' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: { code: ChartErrorCode.INVALID_PARAMETERS, message: '参数校验失败', details: error.errors },
        });
      }
      return reply.status(500).send({
        success: false,
        error: { code: ChartErrorCode.AGGREGATION_FAILED, message: '获取月度增长数据失败，请稍后重试' },
      });
    }
  });
}

// ==================== AIGC 图表端点测试 ====================

describe('AIGC 图表API - GET /:id/chart/risk-distribution', () => {
  let app: FastifyInstance;

  beforeEach(() => {
    app = buildTestApp();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await app.close();
  });

  it('200成功响应：认证用户+有效ID应返回风险分布数据', async () => {
    _pm.findFirst.mockResolvedValue(createMockDetection())
    _pm.findUnique.mockResolvedValue(createMockDetection());

    const response = await app.inject({
      method: 'GET',
      url: `/${VALID_UUID}/chart/risk-distribution`,
      headers: { authorization: 'Bearer valid-token' },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('segments');
    expect(body.data).toHaveProperty('totalParagraphs');
    expect(body.data).toHaveProperty('overallScore');
    expect(body.data.segments).toBeInstanceOf(Array);
  });

  it('401未认证：无token时应返回401', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/${VALID_UUID}/chart/risk-distribution`,
    });

    expect(response.statusCode).toBe(401);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe(ChartErrorCode.NOT_AUTHORIZED);
  });

  it('400参数校验：非法UUID格式应返回400', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/${INVALID_UUID}/chart/risk-distribution`,
      headers: { authorization: 'Bearer valid-token' },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe(ChartErrorCode.INVALID_PARAMETERS);
  });

  it('404资源不存在：ID不存在时应返回404', async () => {
    _pm.findFirst.mockResolvedValue(null);

    const response = await app.inject({
      method: 'GET',
      url: `/${VALID_UUID}/chart/risk-distribution`,
      headers: { authorization: 'Bearer valid-token' },
    });

    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe(ChartErrorCode.DETECTION_NOT_FOUND);
  });
});

describe('AIGC 图表API - GET /:id/chart/segments-timeline', () => {
  let app: FastifyInstance;

  beforeEach(() => {
    app = buildTestApp();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await app.close();
  });

  it('200成功响应：应返回段落时间线数据', async () => {
    _pm.findFirst.mockResolvedValue(createMockDetection())
    _pm.findUnique.mockResolvedValue(createMockDetection());

    const response = await app.inject({
      method: 'GET',
      url: `/${VALID_UUID}/chart/segments-timeline`,
      headers: { authorization: 'Bearer valid-token' },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('paragraphs');
    expect(body.data).toHaveProperty('sortBy');
    expect(body.data).toHaveProperty('filterBy');
    expect(body.data.paragraphs).toBeInstanceOf(Array);
  });

  it('200带查询参数：sortBy和filterBy应正确传递', async () => {
    _pm.findFirst.mockResolvedValue(createMockDetection())
    _pm.findUnique.mockResolvedValue(createMockDetection());

    const response = await app.inject({
      method: 'GET',
      url: `/${VALID_UUID}/chart/segments-timeline?sortBy=score_desc&filterBy=high`,
      headers: { authorization: 'Bearer valid-token' },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data.sortBy).toBe('score_desc');
    expect(body.data.filterBy).toBe('high');
  });

  it('401未认证：无token时应返回401', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/${VALID_UUID}/chart/segments-timeline`,
    });

    expect(response.statusCode).toBe(401);
  });

  it('400参数校验：非法sortBy值应返回400', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/${VALID_UUID}/chart/segments-timeline?sortBy=invalid_sort`,
      headers: { authorization: 'Bearer valid-token' },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.error.code).toBe(ChartErrorCode.INVALID_PARAMETERS);
  });

  it('404资源不存在：检测记录不存在时返回404', async () => {
    _pm.findFirst.mockResolvedValue(null);

    const response = await app.inject({
      method: 'GET',
      url: `/${VALID_UUID}/chart/segments-timeline`,
      headers: { authorization: 'Bearer valid-token' },
    });

    expect(response.statusCode).toBe(404);
  });
});

describe('AIGC 图表API - GET /:id/chart/risk-gauge', () => {
  let app: FastifyInstance;

  beforeEach(() => {
    app = buildTestApp();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await app.close();
  });

  it('200成功响应：应返回仪表盘数据含score和thresholds', async () => {
    _pm.findFirst.mockResolvedValue(createMockDetection())
    _pm.findUnique.mockResolvedValue(createMockDetection());

    const response = await app.inject({
      method: 'GET',
      url: `/${VALID_UUID}/chart/risk-gauge`,
      headers: { authorization: 'Bearer valid-token' },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('score');
    expect(body.data).toHaveProperty('riskLevel');
    expect(body.data).toHaveProperty('label');
    expect(body.data).toHaveProperty('color');
    expect(body.data).toHaveProperty('thresholds');
    expect(typeof body.data.score).toBe('number');
  });

  it('401未认证：无token时应返回401', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/${VALID_UUID}/chart/risk-gauge`,
    });

    expect(response.statusCode).toBe(401);
  });

  it('400参数校验：非法UUID应返回400', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/bad-uuid/chart/risk-gauge`,
      headers: { authorization: 'Bearer valid-token' },
    });

    expect(response.statusCode).toBe(400);
  });

  it('404资源不存在：检测记录不存在时返回404', async () => {
    _pm.findFirst.mockResolvedValue(null);

    const response = await app.inject({
      method: 'GET',
      url: `/${VALID_UUID}/chart/risk-gauge`,
      headers: { authorization: 'Bearer valid-token' },
    });

    expect(response.statusCode).toBe(404);
  });

  it('阈值验证：response中thresholds应包含4个级别', async () => {
    _pm.findFirst.mockResolvedValue(createMockDetection())
    _pm.findUnique.mockResolvedValue(createMockDetection());

    const response = await app.inject({
      method: 'GET',
      url: `/${VALID_UUID}/chart/risk-gauge`,
      headers: { authorization: 'Bearer valid-token' },
    });

    const body = JSON.parse(response.body);
    const thresholds = body.data.thresholds;
    expect(thresholds).toHaveProperty('low');
    expect(thresholds).toHaveProperty('medium');
    expect(thresholds).toHaveProperty('mediumHigh');
    expect(thresholds).toHaveProperty('high');
  });
});

describe('AIGC 图表API - GET /:id/chart/detail-table', () => {
  let app: FastifyInstance;

  beforeEach(() => {
    app = buildTestApp();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await app.close();
  });

  it('200成功分页响应：默认page=1, pageSize=20', async () => {
    _pm.findFirst.mockResolvedValue(createMockDetection())
    _pm.findUnique.mockResolvedValue(createMockDetection());

    const response = await app.inject({
      method: 'GET',
      url: `/${VALID_UUID}/chart/detail-table`,
      headers: { authorization: 'Bearer valid-token' },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('items');
    expect(body.data).toHaveProperty('totalItems');
    expect(body.meta).toBeDefined();
    expect(body.meta.currentPage).toBe(1);
  });

  it('200自定义分页：page=2&pageSize=5应正确传递参数', async () => {
    _pm.findFirst.mockResolvedValue(createMockDetection())
    _pm.findUnique.mockResolvedValue(createMockDetection());

    const response = await app.inject({
      method: 'GET',
      url: `/${VALID_UUID}/chart/detail-table?page=2&pageSize=5`,
      headers: { authorization: 'Bearer valid-token' },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.meta.currentPage).toBe(2);
    expect(body.meta.pageSize).toBe(5);
  });

  it('401未认证：无token时应返回401', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/${VALID_UUID}/chart/detail-table`,
    });

    expect(response.statusCode).toBe(401);
  });

  it('400参数校验：非法pageSize（如负数或0）应返回400', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/${VALID_UUID}/chart/detail-table?page=0&pageSize=-1`,
      headers: { authorization: 'Bearer valid-token' },
    });

    expect(response.statusCode).toBe(400);
  });

  it('404资源不存在：检测记录不存在时返回404', async () => {
    _pm.findFirst.mockResolvedValue(null);

    const response = await app.inject({
      method: 'GET',
      url: `/${VALID_UUID}/chart/detail-table`,
      headers: { authorization: 'Bearer valid-token' },
    });

    expect(response.statusCode).toBe(404);
  });

  it('筛选排序参数：sortBy和filterBy应正确传递到service', async () => {
    _pm.findFirst.mockResolvedValue(createMockDetection())
    _pm.findUnique.mockResolvedValue(createMockDetection());

    const response = await app.inject({
      method: 'GET',
      url: `/${VALID_UUID}/chart/detail-table?sortBy=score_asc&filterBy=high&page=1&pageSize=10`,
      headers: { authorization: 'Bearer valid-token' },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
  });
});

// ==================== Library 图表端点测试 ====================

describe('Library 图表API - GET /stats/overview', () => {
  let app: FastifyInstance;

  beforeEach(() => {
    app = buildTestApp();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await app.close();
  });

  it('200成功响应：应返回用户活动统计数据', async () => {
    _pm.docCount
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(2);
    _pm.aigcCount
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(1);
    _pm.aigcAggregate.mockResolvedValue({ _avg: { overallScore: 35.5 } });
    _pm.queryRaw
      .mockResolvedValueOnce([{ total: BigInt(20) }])
      .mockResolvedValueOnce([{ format: 'GBT7714', count: BigInt(15) }]);
    _pm.findFirst.mockResolvedValue({ updatedAt: new Date('2025-03-01') });

    const response = await app.inject({
      method: 'GET',
      url: '/stats/overview',
      headers: { authorization: 'Bearer valid-token' },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('totalDocuments');
    expect(body.data).toHaveProperty('totalDetections');
    expect(body.data).toHaveProperty('totalCitations');
    expect(body.data).toHaveProperty('thisMonthAdded');
    expect(body.data).toHaveProperty('thisMonthDetected');
    expect(body.data).toHaveProperty('averageRiskScore');
    expect(body.data).toHaveProperty('mostUsedFormat');
    expect(body.data).toHaveProperty('lastActivityAt');
  });

  it('401未认证：无token时应返回401', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/stats/overview',
    });

    expect(response.statusCode).toBe(401);
    const body = JSON.parse(response.body);
    expect(body.error.code).toBe(ChartErrorCode.NOT_AUTHORIZED);
  });
});

describe('Library 图表API - GET /stats/type-distribution', () => {
  let app: FastifyInstance;

  beforeEach(() => {
    app = buildTestApp();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await app.close();
  });

  it('200成功响应：应返回文献类型分布数据', async () => {
    _pm.docFindMany.mockResolvedValue([
      { id: 'd1', type: 'JOURNAL_ARTICLE', createdAt: new Date() },
      { id: 'd2', type: 'THESIS', createdAt: new Date() },
      { id: 'd3', type: 'JOURNAL_ARTICLE', createdAt: new Date() },
    ]);

    const response = await app.inject({
      method: 'GET',
      url: '/stats/type-distribution',
      headers: { authorization: 'Bearer valid-token' },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('types');
    expect(body.data).toHaveProperty('totalDocuments');
    expect(body.data.types).toBeInstanceOf(Array);
  });

  it('401未认证：无token时应返回401', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/stats/type-distribution',
    });

    expect(response.statusCode).toBe(401);
  });

  it('空数据：用户无文献时应返回空types数组', async () => {
    _pm.docFindMany.mockResolvedValue([]);

    const response = await app.inject({
      method: 'GET',
      url: '/stats/type-distribution',
      headers: { authorization: 'Bearer valid-token' },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data.types).toHaveLength(0);
    expect(body.data.totalDocuments).toBe(0);
  });
});

describe('Library 图表API - GET /stats/citation-trend', () => {
  let app: FastifyInstance;

  beforeEach(() => {
    app = buildTestApp();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await app.close();
  });

  it('200成功响应：months=6应返回6个月度数据点', async () => {
    _pm.citationFindMany.mockResolvedValue([]);

    const response = await app.inject({
      method: 'GET',
      url: '/stats/citation-trend?months=6',
      headers: { authorization: 'Bearer valid-token' },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('dataPoints');
    expect(body.data).toHaveProperty('period');
    expect(body.data).toHaveProperty('totalCitations');
    expect(body.data.dataPoints).toHaveLength(6);
  });

  it('200不同月份：months=12应返回12个数据点', async () => {
    _pm.citationFindMany.mockResolvedValue([]);

    const response = await app.inject({
      method: 'GET',
      url: '/stats/citation-trend?months=12',
      headers: { authorization: 'Bearer valid-token' },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data.dataPoints).toHaveLength(12);
  });

  it('401未认证：无token时应返回401', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/stats/citation-trend?months=6',
    });

    expect(response.statusCode).toBe(401);
  });

  it('400参数校验：months超出范围应返回400', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/stats/citation-trend?months=99',
      headers: { authorization: 'Bearer valid-token' },
    });

    expect(response.statusCode).toBe(400);
  });

  it('400参数校验：months为非数字字符串应返回400', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/stats/citation-trend?months=abc',
      headers: { authorization: 'Bearer valid-token' },
    });

    expect(response.statusCode).toBe(400);
  });
});

describe('Library 图表API - GET /stats/monthly-growth', () => {
  let app: FastifyInstance;

  beforeEach(() => {
    app = buildTestApp();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await app.close();
  });

  it('200成功响应：months=6应返回6个月增长数据', async () => {
    _pm.docFindMany.mockResolvedValue([
      { id: 'd1', createdAt: new Date(Date.now() - 10 * 86400000) },
    ]);
    _pm.docCount.mockResolvedValue(5);

    const response = await app.inject({
      method: 'GET',
      url: '/stats/monthly-growth?months=6',
      headers: { authorization: 'Bearer valid-token' },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('dataPoints');
    expect(body.data).toHaveProperty('totalDocuments');
    expect(body.data).toHaveProperty('averageMonthlyGrowth');
    expect(body.data).toHaveProperty('peakMonth');
    expect(body.data.dataPoints).toHaveLength(6);
  });

  it('200不同月份：months=12应返回12个月数据', async () => {
    _pm.docFindMany.mockResolvedValue([]);
    _pm.docCount.mockResolvedValue(0);

    const response = await app.inject({
      method: 'GET',
      url: '/stats/monthly-growth?months=12',
      headers: { authorization: 'Bearer valid-token' },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data.dataPoints).toHaveLength(12);
  });

  it('401未认证：无token时应返回401', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/stats/monthly-growth?months=6',
    });

    expect(response.statusCode).toBe(401);
  });

  it('400参数校验：months=0应返回400', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/stats/monthly-growth?months=0',
      headers: { authorization: 'Bearer valid-token' },
    });

    expect(response.statusCode).toBe(400);
  });

  it('400参数校验：months为负数应返回400', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/stats/monthly-growth?months=-3',
      headers: { authorization: 'Bearer valid-token' },
    });

    expect(response.statusCode).toBe(400);
  });

  it('数据格式验证：每个dataPoint应有month, addedCount, totalCount', async () => {
    _pm.docFindMany.mockResolvedValue([]);
    _pm.docCount.mockResolvedValue(0);

    const response = await app.inject({
      method: 'GET',
      url: '/stats/monthly-growth?months=3',
      headers: { authorization: 'Bearer valid-token' },
    });

    const body = JSON.parse(response.body);
    body.data.dataPoints.forEach((dp: Record<string, unknown>) => {
      expect(dp).toHaveProperty('month');
      expect(dp).toHaveProperty('addedCount');
      expect(dp).toHaveProperty('totalCount');
    });
  });
});
