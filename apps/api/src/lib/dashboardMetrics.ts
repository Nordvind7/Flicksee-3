import type {
  UsersBlock,
  ActivityBlock,
  TopContentBlock,
  TopContentRow,
  FunnelBlock,
} from '@flicksee/shared';
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

// Helper: fetch Content rows for a list of (tmdbId, type) pairs in one shot.
async function fetchContentMap(
  pairs: Array<{ tmdbId: number; contentType: 'MOVIE' | 'TV' }>,
): Promise<Map<string, { title: string; posterPath: string | null }>> {
  if (pairs.length === 0) return new Map();
  const rows = await prisma.content.findMany({
    where: { OR: pairs.map((p) => ({ tmdbId: p.tmdbId, type: p.contentType })) },
    select: { tmdbId: true, type: true, title: true, posterPath: true },
  });
  const map = new Map<string, { title: string; posterPath: string | null }>();
  for (const r of rows) {
    map.set(`${r.type}:${r.tmdbId}`, { title: r.title, posterPath: r.posterPath });
  }
  return map;
}

export async function getTopContent(): Promise<TopContentBlock> {
  const [likes, dislikes, recommends] = await Promise.all([
    prisma.swipe.groupBy({
      by: ['tmdbId', 'contentType'],
      where: { action: 'LIKE', createdAt: { gt: daysAgo(7) } },
      _count: { tmdbId: true },
      orderBy: { _count: { tmdbId: 'desc' } },
      take: 10,
    }),
    prisma.swipe.groupBy({
      by: ['tmdbId', 'contentType'],
      where: { action: 'DISLIKE', createdAt: { gt: daysAgo(7) } },
      _count: { tmdbId: true },
      orderBy: { _count: { tmdbId: 'desc' } },
      take: 10,
    }),
    prisma.swipe.groupBy({
      by: ['tmdbId', 'contentType'],
      where: { action: 'RECOMMEND', createdAt: { gt: daysAgo(30) } },
      _count: { tmdbId: true },
      orderBy: { _count: { tmdbId: 'desc' } },
      take: 10,
    }),
  ]);

  const allPairs = [...likes, ...dislikes, ...recommends].map((r) => ({
    tmdbId: r.tmdbId,
    contentType: r.contentType as 'MOVIE' | 'TV',
  }));
  const contentMap = await fetchContentMap(allPairs);

  // For likes, also fetch dislike counts in the same period for ratio.
  const likePairs = likes.map((l) => ({ tmdbId: l.tmdbId, contentType: l.contentType }));
  const dislikeCounts = likePairs.length
    ? await prisma.swipe.groupBy({
        by: ['tmdbId', 'contentType'],
        where: {
          action: 'DISLIKE',
          createdAt: { gt: daysAgo(7) },
          OR: likePairs.map((p) => ({ tmdbId: p.tmdbId, contentType: p.contentType })),
        },
        _count: { tmdbId: true },
      })
    : [];
  const dislikeMap = new Map<string, number>();
  for (const d of dislikeCounts) {
    dislikeMap.set(`${d.contentType}:${d.tmdbId}`, d._count.tmdbId);
  }

  const toRow = (
    r: { tmdbId: number; contentType: string; _count: { tmdbId: number } },
    includeRatio: boolean,
  ): TopContentRow => {
    const key = `${r.contentType}:${r.tmdbId}`;
    const content = contentMap.get(key);
    const row: TopContentRow = {
      tmdbId: r.tmdbId,
      contentType: r.contentType as 'MOVIE' | 'TV',
      title: content?.title ?? `#${r.tmdbId}`,
      posterPath: content?.posterPath ?? null,
      count: r._count.tmdbId,
    };
    if (includeRatio) {
      const d = dislikeMap.get(key) ?? 0;
      row.likeRatio = r._count.tmdbId / (r._count.tmdbId + d);
    }
    return row;
  };

  return {
    likes7d: likes.map((r) => toRow(r, true)),
    dislikes7d: dislikes.map((r) => toRow(r, false)),
    recommend30d: recommends.map((r) => toRow(r, false)),
  };
}

// Cohort = users created in last 7d. Funnel measures their progress through
// engagement steps. Each step is a SUBSET of the previous.
export async function getFunnel7d(): Promise<FunnelBlock> {
  const since = daysAgo(7);

  const cohort = await prisma.user.findMany({
    where: { createdAt: { gt: since } },
    select: {
      id: true,
      isBotStarted: true,
      _count: { select: { swipes: true } },
      matchesA: { select: { id: true }, take: 1 },
      matchesB: { select: { id: true }, take: 1 },
    },
  });

  const cohortSize = cohort.length;
  let botStarted = 0;
  let openedWeb = 0;
  let fivePlusSwipes = 0;
  let gotMatch = 0;

  for (const u of cohort) {
    if (u.isBotStarted) botStarted++;
    if (u._count.swipes > 0) openedWeb++;
    if (u._count.swipes >= 5) fivePlusSwipes++;
    if (u.matchesA.length > 0 || u.matchesB.length > 0) gotMatch++;
  }

  return { cohortSize, botStarted, openedWeb, fivePlusSwipes, gotMatch };
}
