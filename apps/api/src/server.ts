import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import 'dotenv/config';

import prismaPlugin from './plugins/prisma.js';
import authPlugin from './plugins/auth.js';
import socketPlugin from './plugins/socket.js';
import corsPlugin from './plugins/cors.js';

import authRoutes from './modules/auth/auth.routes.js';
import whatsappRoutes from './modules/whatsapp/whatsapp.routes.js';
import flowsRoutes from './modules/flows/flows.routes.js';
import contactsRoutes from './modules/contacts/contacts.routes.js';
import messagesRoutes from './modules/messages/messages.routes.js';
import webhooksRoutes from './modules/webhooks/webhooks.routes.js';
import { WhatsAppManager } from './modules/whatsapp/whatsapp.manager.js';
import { WhatsAppService } from './modules/whatsapp/whatsapp.service.js';
import { createFlowExecutionWorker } from './queues/flowExecution.worker.js';

declare module 'fastify' {
  interface FastifyInstance {
    whatsappService: WhatsAppService;
  }
}

const PORT = parseInt(process.env.PORT || '3001');
const HOST = process.env.HOST || '0.0.0.0';

async function buildServer() {
  const fastify = Fastify({
    logger: {
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
      transport: process.env.NODE_ENV !== 'production'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
    },
  });

  // Register plugins
  await fastify.register(corsPlugin);
  await fastify.register(cookie, { secret: process.env.JWT_SECRET || 'cookie-secret' });
  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });
  await fastify.register(prismaPlugin);
  await fastify.register(authPlugin);
  await fastify.register(socketPlugin);

  // Health check
  fastify.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  // Initialize WhatsApp manager
  const whatsappManager = new WhatsAppManager(fastify.io, fastify.prisma);
  const whatsappService = new WhatsAppService(fastify.prisma, whatsappManager);
  fastify.decorate('whatsappService', whatsappService);

  // Initialize flow execution worker if Redis is available
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    try {
      createFlowExecutionWorker(fastify.prisma, whatsappManager, redisUrl);
      fastify.log.info('Flow execution worker started');
    } catch (error) {
      fastify.log.warn({ err: error }, 'Failed to start flow execution worker');
    }
  }

  // Register routes
  await fastify.register(authRoutes, { prefix: '/api/auth' });
  await fastify.register(whatsappRoutes, { prefix: '/api/instances' });
  await fastify.register(flowsRoutes, { prefix: '/api/flows' });
  await fastify.register(contactsRoutes, { prefix: '/api/contacts' });
  await fastify.register(messagesRoutes, { prefix: '/api/messages' });
  await fastify.register(webhooksRoutes, { prefix: '/api/webhooks' });

  // Init existing WhatsApp instances on startup
  fastify.addHook('onReady', async () => {
    try {
      await whatsappManager.initAllInstances();
    } catch (error) {
      fastify.log.warn({ err: error }, 'Failed to init WhatsApp instances');
    }
  });

  return fastify;
}

async function main() {
  try {
    const server = await buildServer();
    await server.listen({ port: PORT, host: HOST });
    console.log(`FlowZap API running on http://${HOST}:${PORT}`);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

void main();

export { buildServer };
