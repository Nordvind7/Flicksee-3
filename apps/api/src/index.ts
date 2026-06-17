import 'dotenv/config';
import { buildApp } from './app';
import { config } from './config';
import { disconnectDb } from './db';

const app = await buildApp();

async function shutdown(signal: string) {
  app.log.info({ signal }, 'shutting down');
  await app.close();
  await disconnectDb();
  process.exit(0);
}
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

try {
  await app.listen({ port: config.PORT, host: '0.0.0.0' });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
