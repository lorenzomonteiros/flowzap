import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { WhatsAppService } from './whatsapp.service.js';

const createInstanceSchema = z.object({
  name: z.string().min(1, 'Name is required'),
});

const sendMessageSchema = z.object({
  to: z.string().min(1),
  text: z.string().min(1),
});

const whatsappRoutes: FastifyPluginAsync = async (fastify) => {
  const service = fastify.whatsappService as WhatsAppService;

  fastify.addHook('preHandler', fastify.authenticate);

  fastify.get('/', async (request, reply) => {
    try {
      const instances = await service.listInstances(request.user.userId);
      return reply.send({ success: true, data: instances });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to list instances';
      return reply.status(500).send({ success: false, error: message });
    }
  });

  fastify.post('/', async (request, reply) => {
    try {
      const input = createInstanceSchema.parse(request.body);
      const instance = await service.createInstance(request.user.userId, input.name);
      return reply.status(201).send({ success: true, data: instance });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create instance';
      return reply.status(400).send({ success: false, error: message });
    }
  });

  fastify.get('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const instance = await service.getInstance(id, request.user.userId);
      return reply.send({ success: true, data: instance });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Instance not found';
      return reply.status(404).send({ success: false, error: message });
    }
  });

  fastify.post('/:id/connect', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const result = await service.connectInstance(id, request.user.userId);
      return reply.send({ success: true, data: result });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to connect';
      return reply.status(400).send({ success: false, error: message });
    }
  });

  fastify.post('/:id/disconnect', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const result = await service.disconnectInstance(id, request.user.userId);
      return reply.send({ success: true, data: result });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to disconnect';
      return reply.status(400).send({ success: false, error: message });
    }
  });

  fastify.delete('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      await service.deleteInstance(id, request.user.userId);
      return reply.send({ success: true, data: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete instance';
      return reply.status(400).send({ success: false, error: message });
    }
  });

  fastify.post('/:id/send', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const input = sendMessageSchema.parse(request.body);
      await service.sendMessage(id, request.user.userId, input.to, input.text);
      return reply.send({ success: true, data: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send message';
      return reply.status(400).send({ success: false, error: message });
    }
  });
};

export default whatsappRoutes;
