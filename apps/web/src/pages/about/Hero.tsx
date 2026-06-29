import React, { useRef, useState } from 'react';
import EmbeddedDeck from './EmbeddedDeck';
import LoginPromptModal from './LoginPromptModal';

const Hero: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [deckKey, setDeckKey] = useState(0);
  const deckAnchorRef = useRef<HTMLDivElement>(null);

  // Secondary CTA scrolls the embed deck into view — gives the "lazy" user
  // a friction-free path to try the product before committing to login.
  const scrollToDeck = () => {
    deckAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <section className="px-4 sm:px-8 pt-12 sm:pt-20 pb-8">
      <div className="max-w-3xl mx-auto text-center mb-6 sm:mb-10">
        <h1 className="text-3xl sm:text-5xl font-extrabold leading-tight mb-3">
          Стоп. Не трать ещё один час<br />
          на выбор фильма.
        </h1>
        <p className="text-xl sm:text-2xl font-semibold text-red-500 mb-4">
          Кино на вечер — за 7 минут.
        </p>
        <p className="text-base sm:text-lg opacity-80 max-w-xl mx-auto">
          Свайп-трейлеры в стиле Tinder. Совпало с другом — фильм найден.
        </p>
      </div>

      <div ref={deckAnchorRef}>
        <EmbeddedDeck
          key={deckKey}
          onIntent={() => setModalOpen(true)}
        />
      </div>

      <div className="mt-6 flex flex-col sm:flex-row gap-3 items-center justify-center">
        <button
          onClick={() => setModalOpen(true)}
          className="w-full sm:w-auto px-6 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold transition-colors"
        >
          Войти через Telegram →
        </button>
        <button
          onClick={scrollToDeck}
          className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium transition-colors"
        >
          Попробовать без регистрации
        </button>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm opacity-70">
        <span>🎬 50 000+ фильмов</span>
        <span className="opacity-40">·</span>
        <span>📺 Telegram-логин</span>
        <span className="opacity-40">·</span>
        <span>🇷🇺 Работает в РФ</span>
      </div>

      <LoginPromptModal
        open={modalOpen}
        title="Сохрани свой выбор"
        description="Войди через Telegram — займёт 5 секунд. Сохраним watchlist и пришлём матчи с друзьями."
        onClose={() => {
          setModalOpen(false);
          setDeckKey((k) => k + 1);
        }}
      />
    </section>
  );
};

export default Hero;
