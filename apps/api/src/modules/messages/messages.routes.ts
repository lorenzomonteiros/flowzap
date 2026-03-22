import { FastifyPluginAsync } from 'fastify';

const messagesRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate);

  fastify.get('/', async (request, reply) => {
    try {
      const query = request.query as Record<string, string>;
      const page = query['page'] ? parseInt(query['page']) : 1;
      const limit = query['limit'] ? parseInt(query['limit']) : 50;
      const instanceId = query['instanceId'];
      const skip = (page - 1) * limit;

      const where = {
        instance: { userId: request.user.userId },
        ...(instanceId && { instanceId }),
      };

      const [messages, total] = await Promise.all([
        fastify.prisma.message.findMany({
          where,
          include: {
            contact: { select: { name: true, phone: true } },
            instance: { select: { name: true } },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        fastify.prisma.message.count({ where }),
      ]);

      return reply.send({
        success: true,
        data: { messages, total, page, limit, pages: Math.ceil(total / limit) },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to list messages';
      return reply.status(500).send({ success: false, error: message });
    }
  });

  fastify.get('/conversations', async (request, reply) => {
    try {
      const instances = await fastify.prisma.whatsAppInstance.findMany({
        where: { userId: request.user.userId },
        select: { id: true },
      });

      const instanceIds = instances.map((i) => i.id);

      const conversations = await fastify.prisma.contact.findMany({
        where: { userId: request.user.userId },
        include: {
          messages: {
            where: { instanceId: { in: instanceIds } },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      return reply.send({ success: true, data: conversations });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get conversations';
      return reply.status(500).send({ success: false, error: message });
    }
  });

  fastify.get('/contact/:contactId', async (request, reply) => {
    try {
      const { contactId } = request.params as { contactId: string };
      const query = request.query as Record<string, string>;
      const page = query['page'] ? parseInt(query['page']) : 1;
      const limit = query['limit'] ? parseInt(query['limit']) : 50;
      const skip = (page - 1) * limit;

      const contact = await fastify.prisma.contact.findFirst({
        where: { id: contactId, userId: request.user.userId },
      });
      if (!contact) {
        return reply.status(404).send({ success: false, error: 'Contact not found' });
      }

      const messages = await fastify.prisma.message.findMany({
        where: { contactId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      });

      return reply.send({ success: true, data: messages });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get messages';
      return reply.status(500).send({ success: false, error: message });
    }
  });
};

export default messagesRoutes;
