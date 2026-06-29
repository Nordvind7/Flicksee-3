import React, { useState } from 'react';

interface Props {
  hasMore: boolean;
  /** TMDB next-page fetch. Returns true if loaded any, false otherwise. */
  onLoadMore: () => Promise<void> | void;
  /** Wipe all swipes server-side + clear local excludedIds. */
  onResetHistory: () => Promise<void> | void;
  /** Scroll to QuickFilters / open advanced FilterModal. */
  onChangeFilters: () => void;
}

/**
 * Замена тупикового текста "Вы посмотрели всё! Попробуйте изменить фильтры."
 *
 * Юзер свайпнул всю текущую пачку и оказался в empty state. Раньше это был
 * dead-end: только текст, никакого действия. Теперь — три понятных пути:
 *
 *   1. Подгрузить ещё (если у TMDB остались страницы) — самое лёгкое
 *   2. Изменить жанр (через QuickFilters сверху) — мгновенный pivot
 *   3. Сбросить историю (destructive, с подтверждением) — чистый старт
 *
 * Это превращает empty-state из "приложение кончилось" в "что бы ты ещё хотел".
 */
const EmptyDeck: React.FC<Props> = ({ hasMore, onLoadMore, onResetHistory, onChangeFilters }) => {
  const [busy, setBusy] = useState<'load' | 'reset' | null>(null);

  const loadMore = async () => {
    setBusy('load');
    try {
      await onLoadMore();
    } finally {
      setBusy(null);
    }
  };

  const resetHistory = async () => {
    const ok = window.confirm(
      'Удалить всю историю свайпов? Эти фильмы снова начнут попадаться в карточках.\n\nДейcтвие необратимо.',
    );
    if (!ok) return;
    setBusy('reset');
    try {
      await onResetHistory();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6 py-8 max-w-md mx-auto">
      {/* Красный круг вместо эмодзи. Telegram WebView частично подавляет
          emoji-рендер на старых клиентах → юзер видел "чёрный экран"
          вместо EmptyDeck. SVG/CSS работает везде. */}
      <div
        className="w-20 h-20 rounded-full mb-5 flex items-center justify-center"
        style={{
          background: 'linear-gradient(135deg, #E50914 0%, #ff6a3d 100%)',
          boxShadow: '0 0 40px rgba(229,9,20,0.5)',
        }}
        aria-hidden="true"
      >
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
          <path d="M3 6h18M3 12h18M3 18h18" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </div>

      <h2 className="text-2xl sm:text-3xl font-black text-white mb-2">
        Карточки кончились
      </h2>
      <p className="text-sm text-ink-200 mb-7 leading-relaxed">
        Можешь подгрузить ещё, сменить жанр сверху или начать с чистого листа.
      </p>

      <div className="flex flex-col gap-2 w-full">
        {hasMore && (
          <button
            onClick={() => void loadMore()}
            disabled={busy !== null}
            className="w-full py-3 rounded-full font-bold text-white text-sm transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: 'linear-gradient(135deg, #E50914 0%, #ff6a3d 100%)',
              boxShadow: '0 6px 20px rgba(229,9,20,0.45)',
            }}
          >
            {busy === 'load' ? 'Загружаем…' : '➡️ Подгрузить ещё'}
          </button>
        )}

        <button
          onClick={onChangeFilters}
          disabled={busy !== null}
          className="w-full py-3 rounded-full font-semibold text-white text-sm bg-white/8 hover:bg-white/12 transition-colors disabled:opacity-50"
          style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
        >
          🎛️ Изменить жанр
        </button>

        <button
          onClick={() => void resetHistory()}
          disabled={busy !== null}
          className="w-full py-3 rounded-full font-semibold text-rose-300 text-sm hover:bg-rose-500/10 transition-colors disabled:opacity-50"
        >
          {busy === 'reset' ? 'Сбрасываю…' : '🔄 Сбросить историю'}
        </button>
      </div>
    </div>
  );
};

export default EmptyDeck;
