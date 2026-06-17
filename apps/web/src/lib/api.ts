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
  tryRefresh,
};
