import Fastify from 'fastify';
import cors from '@fastify/cors';
import { APP_NAME } from '@flicksee/shared';
import { prisma, disconnectDb } from './db';

const app = Fastify({
  logger: true,
});

await app.register(cors, {
  origin: true,
  credentials: true,
});

// Liveness: the process is up.
app.get('/health', async () => ({
  status: 'ok',
  app: APP_NAME,
  time: new Date().toISOString(),
}));

// Readiness: the database is reachable.
app.get('/health/db', async (_req, reply) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'ok', db: 'up' };
  } catch (err) {
    app.log.error(err);
    return reply.status(503).send({ status: 'error', db: 'down' });
  }
});

const port = Number(process.env.PORT ?? 3001);

async function shutdown(signal: string) {
  app.log.info({ signal }, 'shutting down');
  await app.close();
  await disconnectDb();
  process.exit(0);
}
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

try {
  await app.listen({ port, host: '0.0.0.0' });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
