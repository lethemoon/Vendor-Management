import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const updateProfileSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  avatar: z.string().url().optional(),
});

export default async function userRoutes(fastify: FastifyInstance) {
  fastify.get('/profile', {
    schema: {
      tags: ['用户'],
      summary: '获取个人信息',
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                email: { type: 'string' },
                phone: { type: 'string' },
                name: { type: 'string' },
                avatar: { type: 'string' },
                role: { type: 'string' },
                status: { type: 'string' },
                createdAt: { type: 'string' },
              },
            },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).userId;
      
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          phone: true,
          name: true,
          avatar: true,
          role: true,
          status: true,
          createdAt: true,
        },
      });
      
      if (!user) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: '用户不存在',
          },
        });
      }
      
      return reply.send({
        success: true,
        data: user,
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

  fastify.put('/profile', {
    schema: {
      tags: ['用户'],
      summary: '更新个人信息',
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          avatar: { type: 'string' },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).userId;
      const body = updateProfileSchema.parse(request.body);
      
      const user = await prisma.user.update({
        where: { id: userId },
        data: body,
        select: {
          id: true,
          name: true,
          avatar: true,
          updatedAt: true,
        },
      });
      
      return reply.send({
        success: true,
        data: user,
        message: '更新成功',
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
}
