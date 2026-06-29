// Shared domain + API-contract types used by both the web client and the API.

export const APP_NAME = 'Flicksee';

export type ContentType = 'movie' | 'tv';

export type SwipeActionType = 'LIKE' | 'DISLIKE' | 'SEEN' | 'RECOMMEND';

/** Authenticated user, as returned by the API after Telegram login. */
export interface AuthUser {
  id: string;
  telegramId: number;
  username?: string;
  firstName?: string;
  photoUrl?: string;
  /** True if this user's telegramId is in the server's ADMIN_TG_IDS allowlist. */
  isAdmin: boolean;
}

/** Response of POST /auth/telegram and POST /auth/dev. */
export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

/** Response of POST /auth/refresh. */
export interface RefreshResponse {
  accessToken: string;
}

/** Response of GET /auth/me. */
export interface MeResponse {
  user: AuthUser | null;
}

/** Minimal title data the client sends so the server can cache it for display. */
export interface SwipeContentInput {
  title: string;
  overview?: string;
  posterPath?: string;
  backdropPath?: string;
  voteAverage?: number;
  releaseDate?: string;
  genreIds?: number[];
}

/** Body of POST /swipes. */
export interface SwipeInput {
  tmdbId: number;
  contentType: ContentType;
  action: SwipeActionType;
  content?: SwipeContentInput;
}

/**
 * A title as returned by the library endpoints. Uses TMDB-style snake_case so
 * it slots directly into the client's existing Movie shape.
 */
export interface LibraryMovie {
  id: number;
  contentType: ContentType;
  title: string;
  overview: string;
  poster_path: string;
  backdrop_path: string;
  vote_average: number;
  release_date?: string;
  genre_ids: number[];
}

/** Response of GET /watchlist and GET /watched. */
export interface LibraryResponse {
  items: LibraryMovie[];
}

/** Response of GET /swipes/excluded — tmdb ids already acted on, per type. */
export interface ExcludedIds {
  movie: number[];
  tv: number[];
}

/** Standard error envelope returned by the API. */
export interface ApiError {
  error: string;
  details?: unknown;
}

// ──── Admin dashboard ────────────────────────────────────────────────

export interface UsersBlock {
  total: number;
  dau: number;
  wau: number;
  mau: number;
  new24h: number;
  new7d: number;
  new30d: number;
  botStarted: number;
}

export interface ActivityBlock {
  swipes: { d24: number; d7: number; d30: number };
  swipesByAction7d: { LIKE: number; DISLIKE: number; SEEN: number; RECOMMEND: number };
  matches: { d24: number; d7: number; d30: number };
  friendships7d: number;
}

export interface TopContentRow {
  tmdbId: number;
  contentType: 'MOVIE' | 'TV';
  title: string;
  posterPath: string | null;
  count: number;
  /** Only present for LIKE rows: likes / (likes + dislikes). 0..1. */
  likeRatio?: number;
}

export interface TopContentBlock {
  likes7d: TopContentRow[];
  dislikes7d: TopContentRow[];
  recommend30d: TopContentRow[];
}

export interface TrendPoint {
  date: string; // YYYY-MM-DD
  count: number;
}

export interface Trends30dBlock {
  newUsers: TrendPoint[]; // exactly 30 entries
  swipes: TrendPoint[];
  matches: TrendPoint[];
}

export interface FunnelBlock {
  cohortSize: number;
  botStarted: number;
  openedWeb: number;
  fivePlusSwipes: number;
  gotMatch: number;
}

export interface DashboardData {
  users: UsersBlock;
  activity: ActivityBlock;
  topContent: TopContentBlock;
  trends30d: Trends30dBlock;
  funnel7d: FunnelBlock;
  generatedAt: string;
}
