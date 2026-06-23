import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { TelegramIcon } from './icons';

const BOT_USERNAME = import.meta.env.VITE_BOT_USERNAME ?? 'Flicksee_bot';
const IS_DEV = import.meta.env.DEV;

// In dev the Telegram widget's iframe can't load (BotFather /setdomain only
// whitelists prod domains, not localhost), and it leaves a noisy "Bot domain
// invalid" message in the header. We hide the widget entirely in dev and
// render only the clean "Dev вход" button.
//
// In prod we render a styled "Войти через Telegram" CTA; on click it mounts
// the official Telegram widget (real iframe) which handles the OAuth flow.
const LoginButton: React.FC = () => {
  const { user, login, devLogin, logout } = useAuth();
  const widgetRef = useRef<HTMLDivElement>(null);
  const [widgetOpen, setWidgetOpen] = useState(false);

  useEffect(() => {
    if (user || !widgetOpen || !widgetRef.current) return;

    (window as unknown as { onTelegramAuth?: (u: Record<string, unknown>) => void }).onTelegramAuth =
      (tgUser) => {
        void login(tgUser);
        setWidgetOpen(false);
      };

    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.async = true;
    script.setAttribute('data-telegram-login', BOT_USERNAME);
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-onauth', 'onTelegramAuth(user)');
    script.setAttribute('data-request-access', 'write');
    script.setAttribute('data-radius', '12');
    const host = widgetRef.current;
    host.appendChild(script);

    return () => {
      host.innerHTML = '';
      delete (window as unknown as { onTelegramAuth?: unknown }).onTelegramAuth;
    };
  }, [user, login, widgetOpen]);

  if (user) {
    return (
      <button
        onClick={() => void logout()}
        className="flex items-center gap-2 text-sm text-ink-200 hover:text-white transition-colors rounded-full pl-1 pr-3 py-1 hover:bg-white/5"
        aria-label="Выйти"
      >
        {user.photoUrl ? (
          <img src={user.photoUrl} alt="" className="w-7 h-7 rounded-full object-cover ring-1 ring-white/10" />
        ) : (
          <div className="w-7 h-7 rounded-full bg-ink-500 flex items-center justify-center text-xs font-semibold ring-1 ring-white/10">
            {(user.firstName ?? user.username ?? '?').charAt(0).toUpperCase()}
          </div>
        )}
        <span className="max-w-[8rem] truncate font-medium">{user.firstName ?? user.username ?? 'Профиль'}</span>
      </button>
    );
  }

  // Dev mode: skip the broken Telegram widget entirely.
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

  // Prod: styled CTA that opens the Telegram widget on click.
  return (
    <div className="relative">
      {!widgetOpen ? (
        <button
          onClick={() => setWidgetOpen(true)}
          className="inline-flex items-center gap-2 bg-[#229ED9] hover:bg-[#2aa5dd] text-white text-sm font-medium px-4 py-2 rounded-full transition-colors shadow-md"
        >
          <TelegramIcon />
          Войти через Telegram
        </button>
      ) : (
        <div ref={widgetRef} />
      )}
    </div>
  );
};

export default LoginButton;
