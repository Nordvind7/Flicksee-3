// Shared domain + API-contract types used by both the web client and the API.

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

/** Response of POST /auth/telegram. */
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

/** Standard error envelope returned by the API. */
export interface ApiError {
  error: string;
  details?: unknown;
}
