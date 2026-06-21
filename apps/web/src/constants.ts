// The TMDB API key now lives only on the server; the client talks to the
// /api/tmdb proxy, which injects the key. Image hosts are public (no key).
export const TMDB_API_BASE_URL = '/api/tmdb';
export const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
export const TMDB_BACKDROP_BASE_URL = 'https://image.tmdb.org/t/p/original';
