// Shared domain + API-contract types used by both the web client and the API.
// Phase 2 will migrate the full domain model (Movie, Genre, …) here so the
// client and server share one source of truth. For now this proves the wiring.

export const APP_NAME = 'Flicksee';

export type ContentType = 'movie' | 'tv';

/** Authenticated user, as returned by the API after Telegram login. */
export interface AuthUser {
  id: string;
  telegramId: number;
  username?: string;
  firstName?: string;
  photoUrl?: string;
}

/** Standard error envelope returned by the API. */
export interface ApiError {
  error: string;
  details?: unknown;
}
