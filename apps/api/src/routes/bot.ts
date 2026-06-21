import type { FastifyInstance } from 'fastify';
import { config } from '../config';
import { getBot } from '../bot';

export default async function botRoutes(app: FastifyInstance) {
  if (config.BOT_MODE !== 'webhook') return; // only mount in webhook mode

  app.post<{ Querystring: { secret?: string } }>(
    '/bot/webhook',
    {
      preHandler: async (req, reply) => {
        const headerSecret = req.headers['x-telegram-bot-api-secret-token'];
        const ok =
          config.TELEGRAM_BOT_WEBHOOK_SECRET &&
          (req.query.secret === config.TELEGRAM_BOT_WEBHOOK_SECRET ||
            headerSecret === config.TELEGRAM_BOT_WEBHOOK_SECRET);
        if (!ok) return reply.status(401).send({ error: 'unauthorized' });
      },
      config: { rateLimit: false }, // Telegram bursts; trust the secret instead
    },
    async (req, reply) => {
      await getBot().handleUpdate(
        req.body as Parameters<ReturnType<typeof getBot>['handleUpdate']>[0],
      );
      return reply.status(200).send();
    },
  );
}
