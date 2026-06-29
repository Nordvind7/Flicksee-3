// Thin API client. The web app talks to the backend through the same-origin
// `/api` prefix (proxied in dev, reverse-proxied in prod), so the httpOnly
// refresh cookie is sent automatically. The short-lived access token is held
// in memory and refreshed transparently on 401.

let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

let refreshing: Promise<boolean> | null = null;

function tryRefresh(): Promise<boolean> {
  // Single-flight: concurrent 401s share one refresh round-trip so the same
  // refresh cookie is never presented twice (the server treats reuse of a
  // rotated token as a breach and revokes the whole session).
  if (refreshing) return refreshing;
  refreshing = (async () => {
    try {
      const res = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' });
      if (!res.ok) {
        accessToken = null;
        return false;
      }
      const data = (await res.json()) as { accessToken: string };
      accessToken = data.accessToken;
      return true;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

async function request(path: string, options: RequestInit = {}, allowRetry = true): Promise<Response> {
  const headers = new Headers(options.headers);
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

  const res = await fetch(`/api${path}`, { ...options, headers, credentials: 'include' });

  // One transparent refresh-and-retry on expiry (never for the refresh call itself).
  if (res.status === 401 && allowRetry && path !== '/auth/refresh') {
    if (await tryRefresh()) {
      return request(path, options, false);
    }
  }
  return res;
}

export const api = {
  get: (path: string) => request(path, { method: 'GET' }),
  post: (path: string, body?: unknown) =>
    request(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) }),
  del: (path: string) => request(path, { method: 'DELETE' }),
  tryRefresh,
};

// ─────────────────────── Phase 7 — Friends & Matches ───────────────────────

export interface FriendSummary {
  id: string;
  username: string | null;
  firstName: string | null;
  photoUrl: string | null;
  unseenCount: number;
}
export interface InviteResponse {
  token: string;
  deeplink: string;
  expiresAt: string;
}
export interface FriendProfile {
  friend: { id: string; username: string | null; firstName: string | null; photoUrl: string | null };
  watchlist: Array<{
    id: number;
    contentType: 'movie' | 'tv';
    title: string;
    overview: string;
    poster_path: string;
    backdrop_path: string;
    vote_average: number;
    release_date?: string;
    genre_ids: number[];
    recommended: boolean;
  }>;
  matchedTmdbIds: number[];
}
export interface MatchDetail {
  match: { id: string; tmdbId: number; contentType: 'MOVIE' | 'TV'; matchedAt: string };
  content: {
    title: string;
    posterPath: string | null;
    overview: string | null;
    releaseDate: string | null;
  } | null;
  friend: { id: string; firstName: string | null; username: string | null; photoUrl: string | null } | null;
}

async function jsonOrThrow<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`api ${res.status}: ${await res.text()}`);
  return (await res.json()) as T;
}

export async function createInvite(): Promise<InviteResponse> {
  return jsonOrThrow(await api.post('/friends/invite', {}));
}
export async function getFriends(): Promise<FriendSummary[]> {
  const data = await jsonOrThrow<{ items: FriendSummary[] }>(await api.get('/friends'));
  return data.items;
}
export async function getFriendProfile(id: string): Promise<FriendProfile> {
  return jsonOrThrow(await api.get(`/friends/${id}`));
}
export async function deleteFriend(id: string): Promise<void> {
  await api.del(`/friends/${id}`);
}
export async function getMatch(id: string): Promise<MatchDetail> {
  return jsonOrThrow(await api.get(`/matches/${id}`));
}
export async function markMatchSeen(id: string): Promise<void> {
  await api.post(`/matches/${id}/seen`, {});
}
export async function getUnseenMatchCount(): Promise<number> {
  const data = await jsonOrThrow<{ count: number }>(await api.get('/matches/unseen-count'));
  return data.count;
}
