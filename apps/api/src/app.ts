import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { APP_NAME } from '@flicksee/shared';
import { prisma } from './db';
import authPlugin from './auth/plugin';
import authRoutes from './routes/auth';

export interface BuildAppOptions {
  logger?: boolean;
}

// Assembles the Fastify app with all plugins and routes. Kept separate from
// server start-up so tests can drive it in-process via `app.inject()`.
export async function buildApp(opts: BuildAppOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({ logger: opts.logger ?? true });

  await app.register(cors, { origin: true, credentials: true });
  await app.register(authPlugin);

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

  return app;
}
