import crypto from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { prisma } from '../db';
import { config } from '../config';
import { canonicalPair } from '../lib/canonicalPair';

// Random 10-char base36 — collision-safe для нашего scale (10к юзеров =
// 36^10 ≈ 3.7×10^15 space, шанс коллизии ничтожен). Уникальность
// гарантируется DB constraint + retry.
function newInviteCode(): string {
  return crypto.randomBytes(8).toString('base64url').slice(0, 10).toLowerCase();
}

// Resolves the friendship row for the canonical pair, or returns null.
async function getFriendship(currentUserId: string, otherId: string) {
  if (currentUserId === otherId) return null;
  const [a, b] = canonicalPair(currentUserId, otherId);
  return prisma.friendship.findUnique({ where: { userAId_userBId: { userAId: a, userBId: b } } });
}

export default async function friendsRoutes(app: FastifyInstance) {
  // Возвращает PERSONAL permanent invite link юзера. Не одноразовая, не
  // expire'ит — любой кто перейдёт станет другом. Код генерируется при
  // первом запросе и сохраняется на User.inviteCode (см. миграцию).
  app.post(
    '/friends/invite',
    {
      onRequest: [app.authenticate],
      config: { rateLimit: { max: 30, timeWindow: '1 hour' } },
    },
    async (req, reply) => {
      const userId = req.user.sub;
      let user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) return reply.status(404).send({ error: 'user not found' });

      // Lazy-init: если у юзера ещё нет кода (например, создан до миграции
      // или backfill пропустил) — генерируем и сохраняем. retry на коллизии.
      if (!user.inviteCode) {
        for (let attempt = 0; attempt < 5; attempt++) {
          const code = newInviteCode();
          try {
            user = await prisma.user.update({
              where: { id: userId },
              data: { inviteCode: code },
            });
            break;
          } catch (err) {
            const code = (err as { code?: string }).code;
            if (code !== 'P2002') throw err; // не unique-нарушение → real error
          }
        }
        if (!user.inviteCode) return reply.status(500).send({ error: 'failed to generate code' });
      }

      const token = `add_${user.inviteCode}`;
      return {
        token,
        deeplink: `https://t.me/${config.TELEGRAM_BOT_USERNAME}?start=${token}`,
        // expiresAt оставлен для backwards compat с фронтом; null = вечный.
        expiresAt: null,
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

      // Watchlist друга = LIKE + RECOMMEND. RECOMMEND-карточки идут с флагом
      // recommended:true чтобы UI смог нарисовать ✨-бейдж.
      const swipes = await prisma.swipe.findMany({
        where: { userId: friendId, action: { in: ['LIKE', 'RECOMMEND'] } },
        orderBy: { createdAt: 'desc' },
        select: { tmdbId: true, contentType: true, action: true },
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
            recommended: s.action === 'RECOMMEND',
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
