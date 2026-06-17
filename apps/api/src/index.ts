import Fastify from 'fastify';
import cors from '@fastify/cors';
import { APP_NAME } from '@flicksee/shared';

const app = Fastify({
  logger: true,
});

await app.register(cors, {
  origin: true,
  credentials: true,
});

app.get('/health', async () => ({
  status: 'ok',
  app: APP_NAME,
  time: new Date().toISOString(),
}));

const port = Number(process.env.PORT ?? 3001);

try {
  await app.listen({ port, host: '0.0.0.0' });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
