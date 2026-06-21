import type { FastifyInstance } from 'fastify';
import { prisma } from '../db';
import { config } from '../config';
import { INVITE_TTL_MS, newInviteToken } from '../lib/inviteToken';
import { canonicalPair } from '../lib/canonicalPair';

// Resolves the friendship row for the canonical pair, or returns null.
async function getFriendship(currentUserId: string, otherId: string) {
  if (currentUserId === otherId) return null;
  const [a, b] = canonicalPair(currentUserId, otherId);
  return prisma.friendship.findUnique({ where: { userAId_userBId: { userAId: a, userBId: b } } });
}

export default async function friendsRoutes(app: FastifyInstance) {
  // Mint a single-use Telegram deeplink token for the current user.
  app.post(
    '/friends/invite',
    {
      onRequest: [app.authenticate],
      config: { rateLimit: { max: 10, timeWindow: '1 hour' } },
    },
    async (req) => {
      const token = newInviteToken();
      const expiresAt = new Date(Date.now() + INVITE_TTL_MS);
      await prisma.invite.create({
        data: { token, creatorId: req.user.sub, expiresAt },
      });
      return {
        token,
        deeplink: `https://t.me/${config.TELEGRAM_BOT_USERNAME}?start=${token}`,
        expiresAt: expiresAt.toISOString(),
      };
    },
  );

  // Friends list with per-friend unseen-match counts.
  app.get('/friends', { onRequest: [app.authenticate] }, async (req) => {
    const me = req.user.sub;
    const fs = await prisma.friendship.findMany({
      where: { OR: [{ userAId: me }, { userBId: me }] },
      include: { userA: true, userB: true },
    });
    const items = await Promise.all(
      fs.map(async (f) => {
        const friend = f.userAId === me ? f.userB : f.userA;
        const [a, b] = canonicalPair(me, friend.id);
        const unseenField = me === a ? { seenByA: false } : { seenByB: false };
        const unseenCount = await prisma.match.count({
          where: { userAId: a, userBId: b, ...unseenField },
        });
        return {
          id: friend.id,
          username: friend.username,
          firstName: friend.firstName,
          photoUrl: friend.photoUrl,
          unseenCount,
        };
      }),
    );
    return { items };
  });

  // Friend's watchlist with flags indicating which titles match.
  app.get<{ Params: { id: string } }>(
    '/friends/:id',
    { onRequest: [app.authenticate] },
    async (req, reply) => {
      const me = req.user.sub;
      const friendId = req.params.id;
      const f = await getFriendship(me, friendId);
      if (!f) return reply.status(404).send({ error: 'not a friend' });

      const friend = await prisma.user.findUnique({ where: { id: friendId } });
      if (!friend) return reply.status(404).send({ error: 'user not found' });

      const swipes = await prisma.swipe.findMany({
        where: { userId: friendId, action: 'LIKE' },
        orderBy: { createdAt: 'desc' },
        select: { tmdbId: true, contentType: true },
      });
      const contents = swipes.length
        ? await prisma.content.findMany({
            where: { OR: swipes.map((s) => ({ tmdbId: s.tmdbId, type: s.contentType })) },
          })
        : [];
      const byKey = new Map(contents.map((c) => [`${c.tmdbId}:${c.type}`, c]));

      const watchlist = swipes
        .map((s) => {
          const c = byKey.get(`${s.tmdbId}:${s.contentType}`);
          if (!c) return null;
          return {
            id: s.tmdbId,
            contentType: s.contentType === 'MOVIE' ? 'movie' : 'tv',
            title: c.title,
            overview: c.overview ?? '',
            poster_path: c.posterPath ?? '',
            backdrop_path: c.backdropPath ?? '',
            vote_average: c.voteAverage ?? 0,
            release_date: c.releaseDate ?? undefined,
            genre_ids: c.genreIds ?? [],
          };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null);

      const [a, b] = canonicalPair(me, friendId);
      const matches = await prisma.match.findMany({
        where: { userAId: a, userBId: b },
        select: { tmdbId: true },
      });
      const matchedTmdbIds = matches.map((m) => m.tmdbId);

      return {
        friend: {
          id: friend.id,
          username: friend.username,
          firstName: friend.firstName,
          photoUrl: friend.photoUrl,
        },
        watchlist,
        matchedTmdbIds,
      };
    },
  );

  // Cursor-paginated match list with a specific friend.
  app.get<{ Params: { id: string }; Querystring: { cursor?: string; limit?: string } }>(
    '/friends/:id/matches',
    { onRequest: [app.authenticate] },
    async (req, reply) => {
      const me = req.user.sub;
      const f = await getFriendship(me, req.params.id);
      if (!f) return reply.status(404).send({ error: 'not a friend' });
      const limit = Math.min(parseInt(req.query.limit ?? '50', 10), 100);
      const [a, b] = canonicalPair(me, req.params.id);
      const items = await prisma.match.findMany({
        where: { userAId: a, userBId: b },
        orderBy: { matchedAt: 'desc' },
        take: limit + 1,
        ...(req.query.cursor ? { cursor: { id: req.query.cursor }, skip: 1 } : {}),
      });
      const nextCursor = items.length > limit ? items[limit].id : null;
      return { items: items.slice(0, limit), nextCursor };
    },
  );

  // Unfriend: drop the Friendship row and explicitly remove the pair's matches
  // (Match isn't FK-linked to Friendship, so cascade doesn't reach them).
  app.delete<{ Params: { id: string } }>(
    '/friends/:id',
    { onRequest: [app.authenticate] },
    async (req, reply) => {
      const me = req.user.sub;
      const f = await getFriendship(me, req.params.id);
      if (!f) return reply.status(404).send({ error: 'not a friend' });
      const [a, b] = canonicalPair(me, req.params.id);
      await prisma.$transaction([
        prisma.match.deleteMany({ where: { userAId: a, userBId: b } }),
        prisma.friendship.delete({ where: { userAId_userBId: { userAId: a, userBId: b } } }),
      ]);
      return { ok: true };
    },
  );

  app.get('/matches/unseen-count', { onRequest: [app.authenticate] }, async (req) => {
    const me = req.user.sub;
    const count = await prisma.match.count({
      where: {
        OR: [
          { userAId: me, seenByA: false },
          { userBId: me, seenByB: false },
        ],
      },
    });
    return { count };
  });

  // Single-match detail — opened from bot inline button.
  app.get<{ Params: { id: string } }>(
    '/matches/:id',
    { onRequest: [app.authenticate] },
    async (req, reply) => {
      const me = req.user.sub;
      const m = await prisma.match.findUnique({ where: { id: req.params.id } });
      if (!m) return reply.status(404).send({ error: 'not found' });
      if (m.userAId !== me && m.userBId !== me) return reply.status(403).send({ error: 'forbidden' });
      const content = await prisma.content.findUnique({
        where: { tmdbId_type: { tmdbId: m.tmdbId, type: m.contentType } },
      });
      const otherId = m.userAId === me ? m.userBId : m.userAId;
      const other = await prisma.user.findUnique({ where: { id: otherId } });
      return {
        match: {
          id: m.id,
          tmdbId: m.tmdbId,
          contentType: m.contentType,
          matchedAt: m.matchedAt,
        },
        content,
        friend: other
          ? {
              id: other.id,
              firstName: other.firstName,
              username: other.username,
              photoUrl: other.photoUrl,
            }
          : null,
      };
    },
  );

  app.post<{ Params: { id: string } }>(
    '/matches/:id/seen',
    { onRequest: [app.authenticate] },
    async (req, reply) => {
      const me = req.user.sub;
      const m = await prisma.match.findUnique({ where: { id: req.params.id } });
      if (!m) return reply.status(404).send({ error: 'match not found' });
      if (m.userAId !== me && m.userBId !== me) return reply.status(403).send({ error: 'not yours' });
      const data = m.userAId === me ? { seenByA: true } : { seenByB: true };
      await prisma.match.update({ where: { id: req.params.id }, data });
      return { ok: true };
    },
  );
}
