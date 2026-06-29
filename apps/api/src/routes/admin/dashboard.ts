import type { FastifyInstance } from 'fastify';
import type { DashboardData } from '@flicksee/shared';
import { cached } from '../../lib/adminCache';
import {
  getUsersMetrics,
  getActivityMetrics,
  getTopContent,
  getFunnel7d,
  getTrends30d,
} from '../../lib/dashboardMetrics';

const CACHE_KEY = 'dashboard:v1';
const CACHE_TTL_MS = 30 * 1000;

export default async function dashboardRoute(app: FastifyInstance) {
  app.get('/dashboard', async () => {
    return cached<DashboardData>(CACHE_KEY, CACHE_TTL_MS, async () => {
      const [users, activity, topContent, funnel7d, trends30d] = await Promise.all([
        getUsersMetrics(),
        getActivityMetrics(),
        getTopContent(),
        getFunnel7d(),
        getTrends30d(),
      ]);
      return {
        users,
        activity,
        topContent,
        trends30d,
        funnel7d,
        generatedAt: new Date().toISOString(),
      };
    });
  });
}
