import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { WebhooksService } from './webhooks.service.js';

const createWebhookSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  url: z.string().url('Invalid URL'),
  secret: z.string().optional(),
  events: z.array(z.string()).min(1, 'At least one event is required'),
});

const updateWebhookSchema = z.object({
  name: z.string().min(1).optional(),
  url: z.string().url().optional(),
  secret: z.string().optional(),
  events: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

const webhooksRoutes: FastifyPluginAsync = async (fastify) => {
  const service = new WebhooksService(fastify.prisma);

  fastify.addHook('preHandler', fastify.authenticate);

  fastify.get('/', async (request, reply) => {
    try {
      const webhooks = await service.listWebhooks(request.user.userId);
      return reply.send({ success: true, data: webhooks });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to list webhooks';
      return reply.status(500).send({ success: false, error: message });
    }
  });

  fastify.post('/', async (request, reply) => {
    try {
      const input = createWebhookSchema.parse(request.body);
      const webhook = await service.createWebhook(request.user.userId, input);
      return reply.status(201).send({ success: true, data: webhook });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create webhook';
      return reply.status(400).send({ success: false, error: message });
    }
  });

  fastify.get('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const webhook = await service.getWebhook(id, request.user.userId);
      return reply.send({ success: true, data: webhook });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Webhook not found';
      return reply.status(404).send({ success: false, error: message });
    }
  });

  fastify.put('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const input = updateWebhookSchema.parse(request.body);
      const webhook = await service.updateWebhook(id, request.user.userId, input);
      return reply.send({ success: true, data: webhook });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update webhook';
      return reply.status(400).send({ success: false, error: message });
    }
  });

  fastify.delete('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      await service.deleteWebhook(id, request.user.userId);
      return reply.send({ success: true, data: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete webhook';
      return reply.status(400).send({ success: false, error: message });
    }
  });

  fastify.post('/:id/test', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      await service.testWebhook(id, request.user.userId);
      return reply.send({ success: true, data: { message: 'Test webhook sent' } });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to test webhook';
      return reply.status(400).send({ success: false, error: message });
    }
  });

  fastify.get('/:id/logs', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const logs = await service.getWebhookLogs(id, request.user.userId);
      return reply.send({ success: true, data: logs });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get webhook logs';
      return reply.status(400).send({ success: false, error: message });
    }
  });
};

export default webhooksRoutes;
