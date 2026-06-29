import type { UsersBlock, ActivityBlock } from '@flicksee/shared';
import { prisma } from '../db';

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

export async function getUsersMetrics(): Promise<UsersBlock> {
  const [total, dau, wau, mau, new24h, new7d, new30d, botStarted] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { lastSeenAt: { gt: daysAgo(1) } } }),
    prisma.user.count({ where: { lastSeenAt: { gt: daysAgo(7) } } }),
    prisma.user.count({ where: { lastSeenAt: { gt: daysAgo(30) } } }),
    prisma.user.count({ where: { createdAt: { gt: daysAgo(1) } } }),
    prisma.user.count({ where: { createdAt: { gt: daysAgo(7) } } }),
    prisma.user.count({ where: { createdAt: { gt: daysAgo(30) } } }),
    prisma.user.count({ where: { isBotStarted: true } }),
  ]);
  return { total, dau, wau, mau, new24h, new7d, new30d, botStarted };
}

export async function getActivityMetrics(): Promise<ActivityBlock> {
  const [s24, s7, s30, byAction, m24, m7, m30, f7] = await Promise.all([
    prisma.swipe.count({ where: { createdAt: { gt: daysAgo(1) } } }),
    prisma.swipe.count({ where: { createdAt: { gt: daysAgo(7) } } }),
    prisma.swipe.count({ where: { createdAt: { gt: daysAgo(30) } } }),
    prisma.swipe.groupBy({
      by: ['action'],
      where: { createdAt: { gt: daysAgo(7) } },
      _count: { _all: true },
    }),
    prisma.match.count({ where: { matchedAt: { gt: daysAgo(1) } } }),
    prisma.match.count({ where: { matchedAt: { gt: daysAgo(7) } } }),
    prisma.match.count({ where: { matchedAt: { gt: daysAgo(30) } } }),
    prisma.friendship.count({ where: { createdAt: { gt: daysAgo(7) } } }),
  ]);

  const swipesByAction7d = { LIKE: 0, DISLIKE: 0, SEEN: 0, RECOMMEND: 0 };
  for (const row of byAction) {
    swipesByAction7d[row.action as keyof typeof swipesByAction7d] = row._count._all;
  }

  return {
    swipes: { d24: s24, d7: s7, d30: s30 },
    swipesByAction7d,
    matches: { d24: m24, d7: m7, d30: m30 },
    friendships7d: f7,
  };
}
