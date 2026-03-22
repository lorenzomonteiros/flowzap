import { FastifyPluginAsync } from 'fastify';
import { AuthService } from './auth.service.js';
import { registerSchema, loginSchema } from './auth.schema.js';

const authRoutes: FastifyPluginAsync = async (fastify) => {
  const authService = new AuthService(fastify.prisma);

  fastify.post('/register', async (request, reply) => {
    try {
      const input = registerSchema.parse(request.body);
      const result = await authService.register(input);

      reply.setCookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
      });

      return reply.status(201).send({
        success: true,
        data: { user: result.user, accessToken: result.accessToken },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed';
      return reply.status(400).send({ success: false, error: message });
    }
  });

  fastify.post('/login', async (request, reply) => {
    try {
      const input = loginSchema.parse(request.body);
      const result = await authService.login(input);

      reply.setCookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
      });

      return reply.send({
        success: true,
        data: { user: result.user, accessToken: result.accessToken },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      return reply.status(401).send({ success: false, error: message });
    }
  });

  fastify.post('/refresh', async (request, reply) => {
    try {
      const refreshToken = (request.cookies as Record<string, string>)['refreshToken'];
      if (!refreshToken) {
        return reply.status(401).send({ success: false, error: 'No refresh token' });
      }

      const result = await authService.refresh(refreshToken);

      reply.setCookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
      });

      return reply.send({ success: true, data: { accessToken: result.accessToken } });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Refresh failed';
      return reply.status(401).send({ success: false, error: message });
    }
  });

  fastify.get('/me', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const user = await authService.getMe(request.user.userId);
      return reply.send({ success: true, data: user });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get user';
      return reply.status(404).send({ success: false, error: message });
    }
  });

  fastify.post('/logout', async (request, reply) => {
    reply.clearCookie('refreshToken', { path: '/' });
    return reply.send({ success: true, data: null });
  });
};

export default authRoutes;
