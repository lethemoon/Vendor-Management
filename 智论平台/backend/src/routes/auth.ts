import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

const prisma = new PrismaClient();

const registerSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().regex(/^1[3-9]\d{9}$/).optional(),
  password: z.string()
    .min(8, '密码至少8位')
    .max(32, '密码最多32位')
    .regex(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]+$/, '密码必须包含字母和数字'),
  name: z.string().min(2).max(50),
}).refine(data => data.email || data.phone, {
  message: '邮箱或手机号至少填写一个',
});

const loginSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().regex(/^1[3-9]\d{9}$/).optional(),
  password: z.string(),
}).refine(data => data.email || data.phone, {
  message: '邮箱或手机号至少填写一个',
});

export default async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/register', {
    schema: {
      tags: ['认证'],
      summary: '用户注册',
      body: {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' },
          phone: { type: 'string' },
          password: { type: 'string' },
          name: { type: 'string' },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                user: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    email: { type: 'string' },
                    phone: { type: 'string' },
                    name: { type: 'string' },
                    role: { type: 'string' },
                    createdAt: { type: 'string' },
                  },
                },
                token: { type: 'string' },
              },
            },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = registerSchema.parse(request.body);
      
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { email: body.email },
            { phone: body.phone },
          ],
        },
      });
      
      if (existingUser) {
        return reply.status(409).send({
          success: false,
          error: {
            code: 'CONFLICT',
            message: '邮箱或手机号已被注册',
          },
        });
      }
      
      const hashedPassword = await bcrypt.hash(body.password, 12);
      
      const user = await prisma.user.create({
        data: {
          email: body.email,
          phone: body.phone,
          password: hashedPassword,
          name: body.name,
          role: 'Student',
          status: 'Active',
        },
      });
      
      const token = fastify.jwt.sign({
        userId: user.id,
        email: user.email,
        phone: user.phone,
        role: user.role,
      }, {
        expiresIn: '7d',
      });
      
      return reply.status(201).send({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            phone: user.phone,
            name: user.name,
            role: user.role,
            createdAt: user.createdAt.toISOString(),
          },
          token,
        },
        message: '注册成功',
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
      
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '服务器错误',
        },
      });
    }
  });

  fastify.post('/login', {
    schema: {
      tags: ['认证'],
      summary: '用户登录',
      body: {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' },
          phone: { type: 'string' },
          password: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                user: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    email: { type: 'string' },
                    phone: { type: 'string' },
                    name: { type: 'string' },
                    role: { type: 'string' },
                    avatar: { type: 'string' },
                  },
                },
                token: { type: 'string' },
              },
            },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = loginSchema.parse(request.body);
      
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { email: body.email },
            { phone: body.phone },
          ],
        },
      });
      
      if (!user) {
        return reply.status(401).send({
          success: false,
          error: {
            code: 'AUTHENTICATION_ERROR',
            message: '账号或密码错误',
          },
        });
      }
      
      const isValidPassword = await bcrypt.compare(body.password, user.password);
      
      if (!isValidPassword) {
        return reply.status(401).send({
          success: false,
          error: {
            code: 'AUTHENTICATION_ERROR',
            message: '账号或密码错误',
          },
        });
      }
      
      const token = fastify.jwt.sign({
        userId: user.id,
        email: user.email,
        phone: user.phone,
        role: user.role,
      }, {
        expiresIn: '7d',
      });
      
      return reply.send({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            phone: user.phone,
            name: user.name,
            role: user.role,
            avatar: user.avatar,
          },
          token,
        },
        message: '登录成功',
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
      
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '服务器错误',
        },
      });
    }
  });

  fastify.post('/logout', {
    schema: {
      tags: ['认证'],
      summary: '用户登出',
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      return reply.send({
        success: true,
        message: '登出成功',
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '服务器错误',
        },
      });
    }
  });
}
