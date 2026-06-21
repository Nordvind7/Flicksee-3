import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { AuthUser, AuthResponse, MeResponse } from '@flicksee/shared';
import { api, setAccessToken } from '../lib/api';

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  /** Telegram Login Widget callback payload. */
  login: (telegramData: Record<string, unknown>) => Promise<boolean>;
  /** Dev-only shortcut (works only when the API runs in development). */
  devLogin: () => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // On load, restore the session from the refresh cookie (if any).
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (await api.tryRefresh()) {
          const me = await api.get('/auth/me');
          if (me.ok && active) {
            setUser(((await me.json()) as MeResponse).user);
          }
        }
      } catch {
        /* not logged in */
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const completeLogin = useCallback(async (res: Response): Promise<boolean> => {
    if (!res.ok) return false;
    const data = (await res.json()) as AuthResponse;
    setAccessToken(data.accessToken);
    setUser(data.user);
    return true;
  }, []);

  const login = useCallback(
    (telegramData: Record<string, unknown>) =>
      api.post('/auth/telegram', telegramData).then(completeLogin),
    [completeLogin],
  );

  const devLogin = useCallback(
    () => api.post('/auth/dev', {}).then(completeLogin),
    [completeLogin],
  );

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, devLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
