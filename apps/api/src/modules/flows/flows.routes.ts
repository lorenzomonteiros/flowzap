import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { FlowsService } from './flows.service.js';

const createFlowSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  trigger: z.object({
    type: z.string(),
    config: z.record(z.unknown()),
  }),
  nodes: z.array(z.unknown()),
  edges: z.array(z.unknown()),
});

const updateFlowSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  trigger: z.object({ type: z.string(), config: z.record(z.unknown()) }).optional(),
  nodes: z.array(z.unknown()).optional(),
  edges: z.array(z.unknown()).optional(),
  isActive: z.boolean().optional(),
});

const flowsRoutes: FastifyPluginAsync = async (fastify) => {
  const service = new FlowsService(fastify.prisma);

  fastify.addHook('preHandler', fastify.authenticate);

  fastify.get('/dashboard', async (request, reply) => {
    try {
      const stats = await service.getDashboardStats(request.user.userId);
      return reply.send({ success: true, data: stats });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get stats';
      return reply.status(500).send({ success: false, error: message });
    }
  });

  fastify.get('/', async (request, reply) => {
    try {
      const flows = await service.listFlows(request.user.userId);
      return reply.send({ success: true, data: flows });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to list flows';
      return reply.status(500).send({ success: false, error: message });
    }
  });

  fastify.post('/', async (request, reply) => {
    try {
      const input = createFlowSchema.parse(request.body);
      const flow = await service.createFlow(request.user.userId, {
        name: input.name,
        description: input.description,
        trigger: input.trigger,
        nodes: input.nodes as Parameters<typeof service.createFlow>[1]['nodes'],
        edges: input.edges as Parameters<typeof service.createFlow>[1]['edges'],
      });
      return reply.status(201).send({ success: true, data: flow });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create flow';
      return reply.status(400).send({ success: false, error: message });
    }
  });

  fastify.get('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const flow = await service.getFlow(id, request.user.userId);
      return reply.send({ success: true, data: flow });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Flow not found';
      return reply.status(404).send({ success: false, error: message });
    }
  });

  fastify.put('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const input = updateFlowSchema.parse(request.body);
      const flow = await service.updateFlow(id, request.user.userId, {
        ...input,
        nodes: input.nodes as Parameters<typeof service.updateFlow>[2]['nodes'],
        edges: input.edges as Parameters<typeof service.updateFlow>[2]['edges'],
      });
      return reply.send({ success: true, data: flow });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update flow';
      return reply.status(400).send({ success: false, error: message });
    }
  });

  fastify.delete('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      await service.deleteFlow(id, request.user.userId);
      return reply.send({ success: true, data: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete flow';
      return reply.status(400).send({ success: false, error: message });
    }
  });

  fastify.post('/:id/toggle', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const flow = await service.toggleFlow(id, request.user.userId);
      return reply.send({ success: true, data: flow });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to toggle flow';
      return reply.status(400).send({ success: false, error: message });
    }
  });

  fastify.get('/:id/executions', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const executions = await service.getFlowExecutions(id, request.user.userId);
      return reply.send({ success: true, data: executions });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get executions';
      return reply.status(400).send({ success: false, error: message });
    }
  });
};

export default flowsRoutes;
