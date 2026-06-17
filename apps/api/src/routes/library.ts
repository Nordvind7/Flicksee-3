import type { FastifyInstance } from 'fastify';
import type { Content, SwipeAction } from '@prisma/client';
import type { ContentType as ApiContentType, LibraryMovie } from '@flicksee/shared';
import { z } from 'zod';
import { prisma } from '../db';

const swipeSchema = z.object({
  tmdbId: z.number().int().positive(),
  contentType: z.enum(['movie', 'tv']),
  action: z.enum(['LIKE', 'DISLIKE', 'SEEN']),
  content: z
    .object({
      title: z.string().min(1).max(500),
      overview: z.string().max(5000).optional(),
      posterPath: z.string().max(300).optional(),
      backdropPath: z.string().max(300).optional(),
      voteAverage: z.number().optional(),
      releaseDate: z.string().max(20).optional(),
      genreIds: z.array(z.number().int()).max(50).optional(),
    })
    .optional(),
});

type DbType = 'MOVIE' | 'TV';

function toDbType(ct: ApiContentType): DbType {
  return ct === 'movie' ? 'MOVIE' : 'TV';
}

function toApiType(dt: DbType): ApiContentType {
  return dt === 'MOVIE' ? 'movie' : 'tv';
}

function toLibraryMovie(tmdbId: number, dbType: DbType, c: Content): LibraryMovie {
  return {
    id: tmdbId,
    contentType: toApiType(dbType),
    title: c.title,
    overview: c.overview ?? '',
    poster_path: c.posterPath ?? '',
    backdrop_path: c.backdropPath ?? '',
    vote_average: c.voteAverage ?? 0,
    release_date: c.releaseDate ?? undefined,
    genre_ids: c.genreIds ?? [],
  };
}

// Fetches a user's titles for a given action, newest first, joined to cached
// content (titles without cached content are skipped — they can't be shown).
async function listByAction(userId: string, action: SwipeAction): Promise<LibraryMovie[]> {
  const swipes = await prisma.swipe.findMany({
    where: { userId, action },
    orderBy: { createdAt: 'desc' },
    select: { tmdbId: true, contentType: true },
  });
  if (swipes.length === 0) return [];

  const contents = await prisma.content.findMany({
    where: { OR: swipes.map((s) => ({ tmdbId: s.tmdbId, type: s.contentType })) },
  });
  const byKey = new Map(contents.map((c) => [`${c.tmdbId}:${c.type}`, c]));

  const items: LibraryMovie[] = [];
  for (const s of swipes) {
    const content = byKey.get(`${s.tmdbId}:${s.contentType}`);
    if (content) items.push(toLibraryMovie(s.tmdbId, s.contentType as DbType, content));
  }
  return items;
}

export default async function libraryRoutes(app: FastifyInstance) {
  // Record (or update) the current user's verdict on a title, caching its
  // display data so lists can be rebuilt on any device.
  app.post('/swipes', { onRequest: [app.authenticate] }, async (req, reply) => {
    const parsed = swipeSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'invalid swipe payload' });
    }
    const { tmdbId, contentType, action, content } = parsed.data;
    const userId = req.user.sub;
    const dbType = toDbType(contentType);

    await prisma.$transaction(async (tx) => {
      if (content) {
        const data = {
          title: content.title,
          overview: content.overview,
          posterPath: content.posterPath,
          backdropPath: content.backdropPath,
          voteAverage: content.voteAverage,
          releaseDate: content.releaseDate,
          genreIds: content.genreIds ?? [],
        };
        // Create-only: the Content cache is shared across users, so we never
        // let one user overwrite another's cached title metadata. (When the
        // server-side TMDB proxy lands, it becomes the authoritative writer.)
        await tx.content.upsert({
          where: { tmdbId_type: { tmdbId, type: dbType } },
          create: { tmdbId, type: dbType, ...data },
          update: {},
        });
      }
      await tx.swipe.upsert({
        where: { userId_tmdbId_contentType: { userId, tmdbId, contentType: dbType } },
        create: { userId, tmdbId, contentType: dbType, action },
        update: { action },
      });
    });

    return { ok: true };
  });

  // All tmdb ids the user has already acted on, grouped by type — used to keep
  // them out of the swipe deck.
  app.get('/swipes/excluded', { onRequest: [app.authenticate] }, async (req) => {
    const rows = await prisma.swipe.findMany({
      where: { userId: req.user.sub },
      select: { tmdbId: true, contentType: true },
    });
    const out = { movie: [] as number[], tv: [] as number[] };
    for (const r of rows) {
      (r.contentType === 'MOVIE' ? out.movie : out.tv).push(r.tmdbId);
    }
    return out;
  });

  // "Хочу посмотреть" — liked titles.
  app.get('/watchlist', { onRequest: [app.authenticate] }, async (req) => {
    return { items: await listByAction(req.user.sub, 'LIKE') };
  });

  // "Просмотрено" — titles marked as already seen.
  app.get('/watched', { onRequest: [app.authenticate] }, async (req) => {
    return { items: await listByAction(req.user.sub, 'SEEN') };
  });
}
