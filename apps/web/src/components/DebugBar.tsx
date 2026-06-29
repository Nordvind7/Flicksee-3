import React from 'react';
import { useAuth, isInTelegramInAppBrowser } from '../auth/AuthContext';

/**
 * Минимальная диагностика для удалённой отладки. Активируется ТОЛЬКО когда
 * URL содержит ?debug=1 — обычные юзеры её никогда не видят. Показывает
 * критичные флаги что часто ломаются в Telegram WebView / in-app browser:
 *   - user логинизирован или нет
 *   - isWebApp (Mini-App)
 *   - isInAppBrowser (TG in-app)
 *   - initData length (если есть)
 *
 * Юзер посылает скрин — я сразу вижу состояние без F12.
 */
const DebugBar: React.FC = () => {
  const { user, isWebApp, loading } = useAuth();
  const search = typeof window !== 'undefined' ? window.location.search : '';
  if (!/[?&]debug=1\b/.test(search)) return null;

  const tg =
    typeof window !== 'undefined'
      ? (window as unknown as { Telegram?: { WebApp?: { initData?: string } } }).Telegram?.WebApp
      : null;
  const initDataLen = tg?.initData?.length ?? 0;
  const inAppBrowser = isInTelegramInAppBrowser();
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 80) : '';

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[200] text-[10px] font-mono leading-tight px-2 py-1.5"
      style={{ background: '#000', color: '#0f0', borderTop: '1px solid #0f0' }}
    >
      <div>auth: user={user ? user.firstName || user.username || 'yes' : 'no'} loading={loading ? 'Y' : 'N'}</div>
      <div>isWebApp={isWebApp ? 'Y' : 'N'} inAppBrowser={inAppBrowser ? 'Y' : 'N'} initData={initDataLen}</div>
      <div className="truncate">ua: {ua}</div>
    </div>
  );
};

export default DebugBar;
