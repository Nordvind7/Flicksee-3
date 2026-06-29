import type { FastifyInstance } from 'fastify';
import { requireAdmin } from '../../middleware/requireAdmin';
import dashboardRoute from './dashboard';

// All /api/admin/* routes require both a valid JWT and an allowlisted
// telegramId. authenticate populates req.user; requireAdmin checks the
// allowlist. Order matters: JWT first, then allowlist check.
export default async function adminRoutes(app: FastifyInstance) {
  app.addHook('onRequest', app.authenticate);
  app.addHook('preHandler', requireAdmin);

  await app.register(dashboardRoute);
}
