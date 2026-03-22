import fp from 'fastify-plugin';
import { FastifyPluginAsync } from 'fastify';
import { Server as SocketServer } from 'socket.io';

declare module 'fastify' {
  interface FastifyInstance {
    io: SocketServer;
  }
}

const socketPlugin: FastifyPluginAsync = async (fastify) => {
  const io = new SocketServer(fastify.server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    fastify.log.info(`Socket connected: ${socket.id}`);

    socket.on('join-instance', (instanceId: string) => {
      void socket.join(`instance:${instanceId}`);
      fastify.log.info(`Socket ${socket.id} joined instance:${instanceId}`);
    });

    socket.on('leave-instance', (instanceId: string) => {
      void socket.leave(`instance:${instanceId}`);
    });

    socket.on('disconnect', () => {
      fastify.log.info(`Socket disconnected: ${socket.id}`);
    });
  });

  fastify.decorate('io', io);

  fastify.addHook('onClose', async () => {
    await new Promise<void>((resolve) => {
      io.close(() => resolve());
    });
  });
};

export default fp(socketPlugin);
