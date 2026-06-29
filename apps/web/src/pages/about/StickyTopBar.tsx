import React, { useEffect, useState } from 'react';
import LoginPromptModal from './LoginPromptModal';
import { useLiveStats } from './useLiveStats';

const StickyTopBar: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const { swipes24h } = useLiveStats();

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 200);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const counterText =
    swipes24h === null ? '—' : swipes24h.toLocaleString('ru-RU');

  return (
    <>
      <div
        className={`fixed top-0 left-0 right-0 z-50 transition-transform duration-200 ${
          visible ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div className="backdrop-blur-sm bg-ink-900/80 border-b border-white/10 px-4 sm:px-8 py-3 flex items-center justify-between gap-2">
          <a href="/" className="font-bold text-lg text-white">
            Flicksee
          </a>
          {/* Hidden on very narrow screens — keep the bar tight there.
              Visible from sm: up, where it's the social-proof anchor. */}
          <div className="hidden sm:flex items-center gap-2 text-sm opacity-80">
            <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="tabular-nums">{counterText}</span>
            <span className="opacity-70">свайпов сегодня</span>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-semibold whitespace-nowrap"
          >
            Войти через Telegram
          </button>
        </div>
      </div>
      <LoginPromptModal
        open={modalOpen}
        title="Войти через Telegram"
        description="Откроется @Flicksee_bot. Нажми «Start» — автоматически залогинимся."
        onClose={() => setModalOpen(false)}
      />
    </>
  );
};

export default StickyTopBar;
