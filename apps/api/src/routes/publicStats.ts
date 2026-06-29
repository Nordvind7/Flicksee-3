import type { FastifyInstance } from 'fastify';
import { prisma } from '../db';
import { cached } from '../lib/adminCache';

const CACHE_KEY = 'public:live-stats:v1';
const CACHE_TTL_MS = 60 * 1000;

function dayAgo(): Date {
  return new Date(Date.now() - 24 * 60 * 60 * 1000);
}

// Public — no auth, no allowlist. The only thing exposed is an aggregate
// count, so there's nothing to leak. Cached for 60s so the F5-storm from a
// landing page hitting it on mount doesn't touch Postgres.
export default async function publicStatsRoute(app: FastifyInstance) {
  app.get('/live-stats', async () => {
    const swipes24h = await cached<number>(CACHE_KEY, CACHE_TTL_MS, () =>
      prisma.swipe.count({ where: { createdAt: { gt: dayAgo() } } }),
    );
    return { swipes24h };
  });
}
