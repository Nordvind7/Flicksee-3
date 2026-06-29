/**
 * Flicksee proxy worker (Cloudflare Workers).
 *
 * The Russian VPS hosting flicksee.ru cannot reach:
 *   - api.themoviedb.org   (TMDB blocks RU IPs since 2022)
 *   - image.tmdb.org       (same)
 *   - api.telegram.org     (blocked by RKN)
 *
 * This worker sits on Cloudflare's edge (reachable from RU) and forwards
 * traffic to those hosts. Three path prefixes:
 *
 *   /tmdb-api/<path>  ->  https://api.themoviedb.org/<path>
 *   /tmdb-img/<path>  ->  https://image.tmdb.org/<path>     (edge-cached)
 *   /tg/<path>        ->  https://api.telegram.org/<path>
 *
 * Free plan limit: 100k requests/day. Images use the Cache API so repeat
 * loads do not consume the upstream fetch quota.
 */

const UPSTREAMS = {
  'tmdb-api': 'https://api.themoviedb.org',
  'tmdb-img': 'https://image.tmdb.org',
  tg: 'https://api.telegram.org',
};

// CORS: allowed origins for browser-facing endpoints (images). The server
// endpoints (tmdb-api, tg) are called server-to-server and don't need CORS,
// but allowing them costs nothing.
const ALLOWED_ORIGINS = new Set([
  'https://flicksee.ru',
  'https://www.flicksee.ru',
  'http://localhost:3000',
  'http://localhost:5173',
]);

function corsHeaders(request) {
  const origin = request.headers.get('Origin') ?? '';
  const allow = ALLOWED_ORIGINS.has(origin) ? origin : 'https://flicksee.ru';
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

async function proxyImage(request, upstreamUrl) {
  // Use Cloudflare's edge cache so the worker doesn't re-fetch every poster.
  const cache = caches.default;
  const cacheKey = new Request(upstreamUrl.toString(), { method: 'GET' });

  let response = await cache.match(cacheKey);
  if (response) {
    response = new Response(response.body, response);
    Object.entries(corsHeaders(request)).forEach(([k, v]) => response.headers.set(k, v));
    response.headers.set('X-Cache', 'HIT');
    return response;
  }

  const upstream = await fetch(upstreamUrl.toString(), {
    method: 'GET',
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; flicksee-bot/1.0)' },
    cf: { cacheTtl: 2592000, cacheEverything: true },
  });

  response = new Response(upstream.body, upstream);
  response.headers.set('Cache-Control', 'public, max-age=2592000, immutable');
  response.headers.set('X-Cache', 'MISS');
  Object.entries(corsHeaders(request)).forEach(([k, v]) => response.headers.set(k, v));

  // Cache only successful responses.
  if (upstream.ok) {
    // ctx.waitUntil would be nicer but cache.put without it is fine for our scale.
    cache.put(cacheKey, response.clone()).catch(() => {});
  }
  return response;
}

// TMDB API (api.themoviedb.org) sits behind AWS CloudFront. Cloudflare
// Workers' default DNS sometimes returns the IPv6 record, which CF's
// outbound security policy then blocks ("DNS points to local or disallowed
// IPv6 address"). resolveOverride pins us to a known-good IPv4 CloudFront
// edge so we never hit that rejection. CloudFront IPs stay within the same
// /24 for long stretches; we round-robin a handful.
const TMDB_API_IPV4 = ['65.9.175.66', '65.9.175.72', '65.9.175.84', '65.9.175.91'];

async function proxyApi(request, upstreamUrl) {
  // Forward method, headers (minus host), and body.
  const init = {
    method: request.method,
    headers: new Headers(request.headers),
    body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
    redirect: 'follow',
  };
  init.headers.delete('host');
  init.headers.set('User-Agent', 'Mozilla/5.0 (compatible; flicksee-bot/1.0)');

  if (upstreamUrl.hostname === 'api.themoviedb.org') {
    init.cf = { resolveOverride: TMDB_API_IPV4[Math.floor(Math.random() * TMDB_API_IPV4.length)] };
  }

  const upstream = await fetch(upstreamUrl.toString(), init);
  const response = new Response(upstream.body, upstream);
  Object.entries(corsHeaders(request)).forEach(([k, v]) => response.headers.set(k, v));
  return response;
}

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    // Split "/tmdb-api/3/movie/popular" -> prefix="tmdb-api", rest="3/movie/popular"
    const [, prefix, ...restParts] = url.pathname.split('/');

    // Telegraf calls /bot<token>/<method> at the configured apiRoot. The URL
    // constructor strips any path from apiRoot, so we must accept /bot* at
    // the worker root (not just under /tg/).
    let upstreamBase;
    let proxyKind = 'api';
    if (prefix.startsWith('bot')) {
      upstreamBase = UPSTREAMS.tg;
      restParts.unshift(prefix); // /bot<token>/method → keep full path downstream
    } else if (prefix === 'tg') {
      upstreamBase = UPSTREAMS.tg;
    } else if (prefix === 'tmdb-api') {
      upstreamBase = UPSTREAMS['tmdb-api'];
    } else if (prefix === 'tmdb-img') {
      upstreamBase = UPSTREAMS['tmdb-img'];
      proxyKind = 'image';
    } else {
      return new Response('Not found. Use /tmdb-api/*, /tmdb-img/*, /tg/*, or /bot<token>/*', {
        status: 404,
        headers: corsHeaders(request),
      });
    }

    const upstreamUrl = new URL(`${upstreamBase}/${restParts.join('/')}`);
    upstreamUrl.search = url.search;

    if (proxyKind === 'image') {
      return proxyImage(request, upstreamUrl);
    }
    return proxyApi(request, upstreamUrl);
  },
};
