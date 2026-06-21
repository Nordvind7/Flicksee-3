import type { FastifyInstance } from 'fastify';
import { config } from '../config';

const TMDB_BASE = 'https://api.themoviedb.org/3';

// Public proxy for TMDB. The client calls /api/tmdb/<path> and we forward to
// TMDB with the server-side api_key injected — so the key never ships to the
// browser. The host is fixed (no SSRF) and the client cannot override api_key
// because we set it after copying the incoming query.
export default async function tmdbRoutes(app: FastifyInstance) {
  app.get('/tmdb/*', async (req, reply) => {
    const path = (req.params as Record<string, string>)['*'];
    const url = new URL(`${TMDB_BASE}/${path}`);

    for (const [key, value] of Object.entries(req.query as Record<string, unknown>)) {
      if (typeof value === 'string' && key !== 'api_key') {
        url.searchParams.set(key, value);
      }
    }
    url.searchParams.set('api_key', config.TMDB_API_KEY);

    try {
      const upstream = await fetch(url.toString());
      const data = await upstream.json();
      return reply.status(upstream.status).send(data);
    } catch (err) {
      app.log.error(err);
      return reply.status(502).send({ error: 'TMDB upstream error' });
    }
  });
}
