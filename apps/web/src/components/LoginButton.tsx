import React, { useEffect, useRef } from 'react';
import { useAuth } from '../auth/AuthContext';

const BOT_USERNAME = import.meta.env.VITE_BOT_USERNAME ?? 'Flicksee_bot';

// Renders the official Telegram Login Widget. Telegram only serves the widget
// on the domain configured via BotFather /setdomain (not localhost), so in dev
// we additionally expose a "Dev login" button backed by the API's /auth/dev.
const LoginButton: React.FC = () => {
  const { user, login, devLogin, logout } = useAuth();
  const widgetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user || !widgetRef.current) return;

    // Global callback the Telegram widget invokes on success.
    (window as unknown as { onTelegramAuth?: (u: Record<string, unknown>) => void }).onTelegramAuth =
      (tgUser) => {
        void login(tgUser);
      };

    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.async = true;
    script.setAttribute('data-telegram-login', BOT_USERNAME);
    script.setAttribute('data-size', 'medium');
    script.setAttribute('data-onauth', 'onTelegramAuth(user)');
    script.setAttribute('data-request-access', 'write');
    script.setAttribute('data-radius', '20');
    const host = widgetRef.current;
    host.appendChild(script);

    return () => {
      host.innerHTML = '';
      delete (window as unknown as { onTelegramAuth?: unknown }).onTelegramAuth;
    };
  }, [user, login]);

  if (user) {
    return (
      <button
        onClick={() => void logout()}
        className="flex items-center gap-2 text-sm text-brand-muted hover:text-white transition-colors"
        aria-label="Выйти"
      >
        {user.photoUrl && (
          <img src={user.photoUrl} alt="" className="w-7 h-7 rounded-full object-cover" />
        )}
        <span className="max-w-[8rem] truncate">{user.firstName ?? user.username ?? 'Профиль'}</span>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div ref={widgetRef} />
      {import.meta.env.DEV && (
        <button
          onClick={() => void devLogin()}
          className="text-xs bg-white/10 text-white px-3 py-1 rounded-full hover:bg-white/20 transition-colors"
        >
          Dev вход
        </button>
      )}
    </div>
  );
};

export default LoginButton;
