// The TMDB API key now lives only on the server; the client talks to the
// /api/tmdb proxy, which injects the key.
//
// Image host is publicly served by TMDB (no key), but TMDB blocks RU IPs,
// so on production we route through a Cloudflare Worker. Set VITE_TMDB_IMG_HOST
// at build time to e.g. https://flicksee-proxy.<account>.workers.dev/tmdb-img
// and the worker forwards to image.tmdb.org. Default falls back to the direct
// host (works in dev outside RU).
export const TMDB_API_BASE_URL = '/api/tmdb';

const RAW_IMG_HOST = import.meta.env.VITE_TMDB_IMG_HOST ?? 'https://image.tmdb.org';
export const TMDB_IMG_HOST = RAW_IMG_HOST.replace(/\/$/, '');

export const TMDB_IMAGE_BASE_URL = `${TMDB_IMG_HOST}/t/p/w500`;
export const TMDB_BACKDROP_BASE_URL = `${TMDB_IMG_HOST}/t/p/original`;

// Build a TMDB image URL at any size. Returns empty string for missing paths
// so callers can do <img src={tmdbImg(...)} /> without null checks.
export function tmdbImg(size: string, path: string | null | undefined): string {
  if (!path) return '';
  return `${TMDB_IMG_HOST}/t/p/${size}${path}`;
}
