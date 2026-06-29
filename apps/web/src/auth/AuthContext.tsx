import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { AuthUser, AuthResponse, MeResponse } from '@flicksee/shared';
import { api, setAccessToken } from '../lib/api';

type BotLoginResult = 'ok' | 'expired' | 'error';

// Telegram injects window.Telegram.WebApp when the page loads inside a
// Mini-App WebView. Modern clients (TG ≥ 9 / Desktop ≥ 4) do this without
// loading telegram-web-app.js, so we read it directly.
interface TelegramWebApp {
  initData?: string;
  ready?: () => void;
  expand?: () => void;
  colorScheme?: 'light' | 'dark';
}
function getTelegramWebApp(): TelegramWebApp | null {
  if (typeof window === 'undefined') return null;
  const tg = (window as unknown as { Telegram?: { WebApp?: TelegramWebApp } }).Telegram?.WebApp;
  return tg?.initData ? tg : null;
}
export function isInTelegramWebApp(): boolean {
  return getTelegramWebApp() !== null;
}

// Telegram in-app browser (НЕ Mini-App) — это когда юзер тапнул на ссылку
// внутри чата и Telegram открыл её во встроенном WebView. Отличается от
// Mini-App тем что `window.Telegram.WebApp.initData` НЕ инжектится.
//
// На iOS Telegram НЕ выставляет "Telegram" в User-Agent (UA выглядит как
// обычный Safari) — поэтому UA-детект ненадёжен. Используем 4 сигнала
// (любой положительный = считаем что внутри Telegram):
//   1. UA содержит "Telegram/" или "TgWebView" (Android, Desktop)
//   2. window.TelegramWebviewProxy существует (iOS injection)
//   3. window.Telegram defined (любая версия)
//   4. document.referrer на t.me (юзер пришёл по ссылке из чата)
//
// Возвращает true и для Mini-App тоже (там тоже Telegram-контекст) — всегда
// сначала проверяй isInTelegramWebApp().
export function isInTelegramInAppBrowser(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent || '';
  if (/Telegram|TgWebView/.test(ua)) return true;
  const w = window as unknown as { TelegramWebviewProxy?: unknown; Telegram?: unknown };
  if (w.TelegramWebviewProxy !== undefined) return true;
  if (w.Telegram !== undefined) return true;
  const ref = document.referrer || '';
  if (/^https?:\/\/(www\.)?t\.me\//.test(ref) || /telegram\.org/.test(ref)) return true;
  return false;
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  /** True iff the page is loaded inside a Telegram Mini-App WebView. */
  isWebApp: boolean;
  /**
   * Bot deep-link login. Calls /auth/login/start, hands the bot URL to
   * `openBot` (the component opens it in a new tab to satisfy popup-blockers),
   * gives the caller a `cancel` so it can stop the loop on unmount, then polls
   * until the user taps Start in Telegram. Resolves with `ok`, `expired`, or
   * `error`.
   */
  botLogin: (
    openBot: (botUrl: string) => void,
    onPollingStart: (cancel: () => void) => void,
  ) => Promise<BotLoginResult>;
  /** Dev-only shortcut (works only when the API runs in development). */
  devLogin: () => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

const POLL_INTERVAL_MS = 2000;
const POLL_MAX_MS = 5 * 60 * 1000; // matches server-side TTL

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const isWebApp = isInTelegramWebApp();

  const adoptAuth = useCallback((data: AuthResponse) => {
    setAccessToken(data.accessToken);
    setUser(data.user);
  }, []);

  // On load: refresh cookie first; if that fails and we're in a Telegram
  // WebView, try one-shot initData login so the user never sees a "log in"
  // screen inside the mini-app.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (await api.tryRefresh()) {
          const me = await api.get('/auth/me');
          if (me.ok && active) {
            setUser(((await me.json()) as MeResponse).user);
            return;
          }
        }
        // Not logged in via cookie — try WebApp auto-login.
        const tg = getTelegramWebApp();
        if (tg?.initData) {
          // Tell Telegram we're ready (removes the loading shimmer) and
          // expand to full height for a less cramped first view.
          try { tg.ready?.(); tg.expand?.(); } catch { /* old client */ }
          const res = await api.post('/auth/telegram-webapp', { initData: tg.initData });
          if (res.ok && active) {
            adoptAuth((await res.json()) as AuthResponse);
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
  }, [adoptAuth]);

  const botLogin = useCallback<AuthState['botLogin']>(
    async (openBot, onPollingStart) => {
      // 1. Create the handshake row.
      const startRes = await api.post('/auth/login/start');
      if (!startRes.ok) return 'error';
      const { token, botUrl } = (await startRes.json()) as { token: string; botUrl: string };

      // 2. Open Telegram synchronously inside the original click handler.
      openBot(botUrl);

      // 3. Poll until the bot's /start handler attaches us, or until TTL.
      const deadline = Date.now() + POLL_MAX_MS;
      let cancelled = false;
      onPollingStart(() => {
        cancelled = true;
      });

      while (!cancelled && Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        if (cancelled) return 'error';

        const res = await api.get(`/auth/login/poll?token=${encodeURIComponent(token)}`);
        if (res.status === 410) return 'expired';
        if (!res.ok) continue; // transient 5xx / network — keep polling
        const data = (await res.json()) as
          | { status: 'pending' }
          | { status: 'ok'; accessToken: string; user: AuthUser };
        if (data.status === 'ok') {
          adoptAuth(data);
          return 'ok';
        }
      }
      return cancelled ? 'error' : 'expired';
    },
    [adoptAuth],
  );

  const devLogin = useCallback(async () => {
    const res = await api.post('/auth/dev', {});
    if (!res.ok) return false;
    adoptAuth((await res.json()) as AuthResponse);
    return true;
  }, [adoptAuth]);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, isWebApp, botLogin, devLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
