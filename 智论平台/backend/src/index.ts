import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import { PrismaClient } from '@prisma/client'
import Redis from 'ioredis'
import dotenv from 'dotenv'

dotenv.config()

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
})

const prisma = new PrismaClient()

const redis = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
})
redis.on('error', (err) => {
  fastify.log.warn({ err }, 'Redis unavailable - running in degraded mode')
})

async function main() {
  await fastify.register(helmet)
  await fastify.register(cors, {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  })

  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: '15 minutes',
  })

  await fastify.register(jwt, {
    secret: process.env.JWT_SECRET || 'super-secret-key',
  })

  await fastify.register(swagger, {
    swagger: {
      info: {
        title: '智论平台 API',
        description: 'AI论文写作助手 API文档',
        version: '1.0.0',
      },
      host: `localhost:${process.env.PORT || 5000}`,
      schemes: ['http'],
      consumes: ['application/json'],
      produces: ['application/json'],
    },
  })

  await fastify.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'full',
      deepLinking: false,
    },
  })

  fastify.decorate('prisma', prisma)
  fastify.decorate('redis', redis)

  fastify.decorate('authenticate', async function (request: any, reply: any) {
    try {
      await request.jwtVerify()
    } catch (err) {
      reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: '未授权或令牌已过期' }
      })
    }
  })

  // 注册知识库与引用管理模块
  await fastify.register(require('./routes/library').default, { prefix: '/api/v1/library' })

  // 注册AIGC检测模块（含图表端点）
  await fastify.register(require('./routes/aigc').default, { prefix: '/api/v1/aigc' })

  fastify.get('/health', async (request, reply) => {
    return { status: 'ok', timestamp: new Date().toISOString() }
  })

  fastify.get('/', async (request, reply) => {
    return { 
      message: '欢迎使用智论平台 API',
      version: '1.0.0',
      docs: '/docs'
    }
  })

  const port = parseInt(process.env.PORT || '5000')
  await fastify.listen({ port, host: '0.0.0.0' })
  console.log(`🚀 服务器运行在 http://localhost:${port}`)
  console.log(`📚 API文档: http://localhost:${port}/docs`)
}

main().catch(err => {
  fastify.log.error(err)
  process.exit(1)
})
