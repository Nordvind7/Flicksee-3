import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, isInTelegramInAppBrowser } from '../auth/AuthContext';
import { TelegramIcon } from './icons';

const IS_DEV = import.meta.env.DEV;
const POLL_INTERVAL_MS = 2000;

/**
 * Header auth surface. Three states:
 *   • logged in   → user chip → opens dropdown (Профиль / Выйти)
 *   • in WebApp + not logged → tiny spinner (auto-login is racing in AuthProvider)
 *   • dev mode    → /auth/dev shortcut
 *   • prod, browser → "Войти" CTA → bot deep-link + polling
 *
 * On narrow viewports the CTA collapses to an icon + short label so it
 * never breaks the header row.
 */
const LoginButton: React.FC = () => {
  const { user, isWebApp, loading, botLogin, devLogin, logout } = useAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  // Сохраняем активную bot-ссылку чтобы под спиннером показывать
  // явную fallback-кнопку «Открыть в Telegram» — если auto-открытие
  // не сработало (что часто на iOS Telegram in-app browser).
  const [activeBotUrl, setActiveBotUrl] = useState<string | null>(null);
  const cancelRef = useRef<(() => void) | null>(null);
  const menuWrapRef = useRef<HTMLDivElement | null>(null);

  // Cancel polling on unmount or when the user signs in by other means.
  useEffect(() => {
    if (user && cancelRef.current) {
      cancelRef.current();
      cancelRef.current = null;
      setPending(false);
    }
    return () => {
      if (cancelRef.current) cancelRef.current();
    };
  }, [user]);

  // Close the profile dropdown on outside click / Esc.
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!menuWrapRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const startLogin = async () => {
    setError(null);
    setPending(true);
    setActiveBotUrl(null);
    const result = await botLogin(
      (botUrl) => {
        setActiveBotUrl(botUrl);
        // Если мы внутри Telegram in-app браузера, https://t.me/ открывается
        // в том же WebView (бесконечный цикл). tg://resolve триггерит native
        // Telegram URL scheme → бот открывается в нативном чате поверх
        // WebView. Юзер тапает Start → возвращается на эту вкладку → poll
        // догоняет.
        // Внутри Telegram in-app browser https://t.me/... ведёт в тот же
        // WebView — бесконечный цикл. tg://resolve триггерит native URL
        // scheme и открывает чат с ботом поверх browser. Используем
        // программный клик по <a> — window.location.href не всегда работает
        // в Telegram WebView (URL scheme игнорируется).
        if (isInTelegramInAppBrowser()) {
          const m = botUrl.match(/^https:\/\/t\.me\/([^?]+)\?start=(.+)$/);
          if (m) {
            const tgUrl = `tg://resolve?domain=${m[1]}&start=${m[2]}`;
            const a = document.createElement('a');
            a.href = tgUrl;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            // На случай если tg:// не сработал (старый клиент) — через
            // небольшую задержку fallback на https://t.me/ в новом окне.
            window.setTimeout(() => {
              window.open(botUrl, '_blank', 'noopener,noreferrer');
            }, 800);
            return;
          }
        }
        window.open(botUrl, '_blank', 'noopener,noreferrer');
      },
      (cancel) => {
        cancelRef.current = cancel;
      },
    );
    setPending(false);
    setActiveBotUrl(null);
    cancelRef.current = null;
    if (result === 'expired') setError('Ссылка истекла, попробуй ещё раз.');
    else if (result === 'error') setError('Что-то пошло не так. Попробуй ещё раз.');
  };

  if (user) {
    const displayName = user.firstName ?? user.username ?? 'Профиль';
    return (
      <div ref={menuWrapRef} className="relative">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-2 text-sm text-ink-200 hover:text-white transition-colors rounded-full pl-1 pr-2 sm:pr-3 py-1 hover:bg-white/5"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-label="Меню профиля"
        >
          {user.photoUrl ? (
            <img src={user.photoUrl} alt="" className="w-7 h-7 rounded-full object-cover ring-1 ring-white/10" />
          ) : (
            <div className="w-7 h-7 rounded-full bg-ink-500 flex items-center justify-center text-xs font-semibold ring-1 ring-white/10">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="max-w-[6rem] sm:max-w-[8rem] truncate font-medium hidden xs:inline">{displayName}</span>
          <span className="text-ink-300 text-xs">▾</span>
        </button>
        {menuOpen && (
          <div
            role="menu"
            className="absolute right-0 mt-2 w-48 rounded-2xl ring-1 ring-white/10 shadow-2xl py-1 z-50"
            style={{ backgroundColor: '#16161a' }}
          >
            <div className="px-3 py-2 border-b border-white/5">
              <div className="text-sm font-semibold text-white truncate">{displayName}</div>
              {user.username && (
                <div className="text-xs text-ink-300 truncate">@{user.username}</div>
              )}
            </div>
            <Link
              to="/?view=watched"
              role="menuitem"
              className="block px-3 py-2 text-sm text-ink-100 hover:bg-white/5 transition-colors"
              onClick={() => setMenuOpen(false)}
            >
              👁  Уже видел
            </Link>
            <Link
              to="/blog"
              role="menuitem"
              className="block px-3 py-2 text-sm text-ink-100 hover:bg-white/5 transition-colors"
              onClick={() => setMenuOpen(false)}
            >
              📰  Блог
            </Link>
            <a
              href="https://t.me/Flicksee_bot"
              target="_blank"
              rel="noopener noreferrer"
              role="menuitem"
              className="block px-3 py-2 text-sm text-ink-100 hover:bg-white/5 transition-colors"
              onClick={() => setMenuOpen(false)}
            >
              💬  Бот в Telegram
            </a>
            <div className="my-1 border-t border-white/5" />
            <button
              role="menuitem"
              onClick={() => {
                setMenuOpen(false);
                void logout();
              }}
              className="block w-full text-left px-3 py-2 text-sm text-rose-300 hover:bg-rose-500/10 transition-colors"
            >
              Выйти
            </button>
          </div>
        )}
      </div>
    );
  }

  // Inside a Telegram WebView: AuthProvider is racing initData login.
  // Show a tiny spinner instead of a CTA so the user doesn't tap something
  // that would conflict with the auto-flow.
  if (isWebApp && loading) {
    return (
      <span className="w-5 h-5 rounded-full border-2 border-ink-300 border-t-transparent animate-spin" />
    );
  }

  if (IS_DEV) {
    return (
      <button
        onClick={() => void devLogin()}
        className="flex items-center gap-2 text-sm bg-white/10 hover:bg-white/15 text-white px-3 py-1.5 rounded-full transition-colors font-medium"
      >
        <span className="text-[10px] uppercase tracking-wider bg-yellow-500/20 text-yellow-300 px-1.5 py-0.5 rounded">dev</span>
        Войти
      </button>
    );
  }

  if (pending) {
    // Преобразуем https://t.me/<bot>?start=<token> → tg://resolve URL.
    // Telegram in-app browser на iOS не сообщает в UA что он Telegram,
    // поэтому надёжный детект невозможен — всегда показываем fallback.
    let tgUrl: string | null = null;
    if (activeBotUrl) {
      const m = activeBotUrl.match(/^https:\/\/t\.me\/([^?]+)\?start=(.+)$/);
      if (m) tgUrl = `tg://resolve?domain=${m[1]}&start=${m[2]}`;
    }
    return (
      <div className="flex flex-col items-end gap-1.5">
        <div className="flex items-center gap-2 text-xs sm:text-sm bg-[#229ED9]/20 text-[#9bd3ee] px-3 sm:px-4 py-2 rounded-full whitespace-nowrap">
          <span className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin shrink-0" />
          <span className="hidden xs:inline">Жду подтверждения…</span>
          <span className="xs:hidden">Жду…</span>
        </div>
        {activeBotUrl && (
          <a
            href={tgUrl ?? activeBotUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-[#9bd3ee] underline opacity-80 hover:opacity-100"
          >
            Не открылось? Тапни сюда
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={() => void startLogin()}
        className="inline-flex items-center justify-center gap-2 bg-[#229ED9] hover:bg-[#2aa5dd] text-white text-sm font-semibold rounded-full transition-colors shadow-md whitespace-nowrap h-9 px-3 md:px-4"
        aria-label="Войти через Telegram"
        title="Войти через Telegram"
      >
        <TelegramIcon />
        <span className="hidden md:inline">Войти</span>
      </button>
      {error && <span className="text-[10px] text-rose-300 max-w-[10rem] text-right">{error}</span>}
    </div>
  );
};

export default LoginButton;
