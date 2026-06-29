import Fastify, { type FastifyError, type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { APP_NAME } from '@flicksee/shared';
import { config } from './config';
import { prisma } from './db';
import authPlugin from './auth/plugin';
import authRoutes from './routes/auth';
import libraryRoutes from './routes/library';
import tmdbRoutes from './routes/tmdb';
import friendsRoutes from './routes/friends';
import botRoutes from './routes/bot';
import adminRoutes from './routes/admin';

export interface BuildAppOptions {
  logger?: boolean;
}

// Browser origins allowed to make credentialed CORS calls in dev. In
// production the web app proxies /api same-origin and config.WEB_ORIGIN is the
// only allowed cross-origin caller.
const DEV_ORIGINS = ['http://localhost:3000', 'http://localhost:5173'];

// Assembles the Fastify app with all plugins and routes. Kept separate from
// server start-up so tests can drive it in-process via `app.inject()`.
export async function buildApp(opts: BuildAppOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({
    logger: opts.logger ?? true,
    bodyLimit: 64 * 1024, // 64 KB — payloads here are small JSON objects
  });

  await app.register(helmet);
  await app.register(rateLimit, { max: 100, timeWindow: '1 minute' });
  await app.register(cors, {
    origin:
      config.NODE_ENV === 'production'
        ? config.WEB_ORIGIN
          ? [config.WEB_ORIGIN]
          : false
        : DEV_ORIGINS,
    credentials: true,
  });
  await app.register(authPlugin);

  // Sanitized error handler — never leak internals/stack traces on 5xx.
  app.setErrorHandler((err: FastifyError, req, reply) => {
    req.log.error(err);
    const status =
      typeof err.statusCode === 'number' && err.statusCode >= 400 ? err.statusCode : 500;
    reply.status(status).send({ error: status >= 500 ? 'internal server error' : err.message });
  });

  // Liveness.
  app.get('/health', async () => ({
    status: 'ok',
    app: APP_NAME,
    time: new Date().toISOString(),
  }));

  // Readiness: database reachable.
  app.get('/health/db', async (_req, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', db: 'up' };
    } catch (err) {
      app.log.error(err);
      return reply.status(503).send({ status: 'error', db: 'down' });
    }
  });

  await app.register(authRoutes);
  await app.register(libraryRoutes);
  await app.register(tmdbRoutes);
  await app.register(friendsRoutes);
  await app.register(botRoutes);
  // Client calls /api/admin/* — Vite (dev) and nginx (prod) strip /api before
  // hitting the API, matching the convention used by /auth, /swipes, etc.
  await app.register(adminRoutes, { prefix: '/admin' });

  return app;
}
