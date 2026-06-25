import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const STORAGE_KEY = 'flicksee_cookie_consent_v1';

// Floating bottom-banner. Appears once on first visit, dismissed
// permanently when user accepts. localStorage scope is intentional —
// per-device, not per-account; that's how RU legal practice typically
// handles cookie notice.
const CookieNotice: React.FC = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        // Tiny delay so the banner appears AFTER the page hero, not
        // mid-paint — feels less jarring on first impression.
        const t = setTimeout(() => setShow(true), 800);
        return () => clearTimeout(t);
      }
    } catch {
      /* localStorage blocked — show banner each visit, not the end of the world */
      setShow(true);
    }
  }, []);

  const accept = () => {
    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
    setShow(false);
  };

  if (!show) return null;

  return (
    <div
      className="fixed inset-x-3 bottom-3 sm:inset-x-auto sm:right-5 sm:bottom-5 sm:max-w-sm z-50 rounded-2xl ring-1 ring-white/10 shadow-card-lg backdrop-blur-md"
      style={{ backgroundColor: 'rgba(22, 22, 26, 0.95)' }}
      role="dialog"
      aria-label="Уведомление об использовании cookies"
    >
      <div className="p-4">
        <p className="text-sm text-ink-50 font-semibold mb-1.5">🍪 Используем cookies</p>
        <p className="text-xs text-ink-200 leading-relaxed mb-3">
          Чтобы сохранять твой watchlist, помнить вход и считать посещения. Подробнее в{' '}
          <Link
            to="/privacy"
            className="underline hover:text-white"
            style={{ color: '#fff' }}
          >
            политике конфиденциальности
          </Link>
          .
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={accept}
            className="flex-1 text-sm font-bold text-white py-2 rounded-full transition-all hover:scale-[1.02] active:scale-95"
            style={{
              backgroundColor: '#E50914',
              boxShadow: '0 4px 12px rgba(229, 9, 20, 0.4)',
            }}
          >
            Принять
          </button>
          <Link
            to="/privacy"
            className="text-xs text-ink-200 hover:text-white px-3 py-2 rounded-full transition-colors"
          >
            Подробнее
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CookieNotice;
