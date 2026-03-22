import fp from 'fastify-plugin';
import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { verifyAccessToken, JwtPayload } from '../lib/jwt.js';

declare module 'fastify' {
  interface FastifyRequest {
    user: JwtPayload;
  }
}

const authPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.status(401).send({ success: false, error: 'Unauthorized' });
      }
      const token = authHeader.substring(7);
      const payload = verifyAccessToken(token);
      request.user = payload;
    } catch {
      return reply.status(401).send({ success: false, error: 'Invalid or expired token' });
    }
  });
};

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export default fp(authPlugin);
