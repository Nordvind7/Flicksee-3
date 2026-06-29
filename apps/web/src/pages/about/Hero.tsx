import React, { useState } from 'react';
import EmbeddedDeck from './EmbeddedDeck';
import LoginPromptModal from './LoginPromptModal';

const Hero: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);
  // Bumping this resets EmbeddedDeck's internal intent flag after the user
  // closes the modal without logging in, so the modal can re-trigger later.
  const [deckKey, setDeckKey] = useState(0);

  return (
    <section className="px-4 sm:px-8 pt-12 sm:pt-20 pb-8">
      <div className="max-w-3xl mx-auto text-center mb-6 sm:mb-10">
        <h1 className="text-3xl sm:text-5xl font-extrabold leading-tight mb-4">
          Что посмотреть на вечер<br />
          <span className="text-red-500">за минуту, а не за час</span>
        </h1>
        <p className="text-base sm:text-lg opacity-80 max-w-xl mx-auto">
          Свайпай 30-секундные трейлеры. Лайкнул — сохранили. Совпало с другом — кино найдено.
        </p>
      </div>

      <EmbeddedDeck
        key={deckKey}
        onIntent={() => setModalOpen(true)}
      />

      <p className="text-center text-sm opacity-60 mt-4">
        👆 Попробуй прямо здесь — без регистрации
      </p>

      <LoginPromptModal
        open={modalOpen}
        title="Сохрани свой выбор"
        description="Войди через Telegram — займёт 5 секунд. Сохраним watchlist и пришлём матчи с друзьями."
        onClose={() => {
          setModalOpen(false);
          // Re-mount deck so the next high-intent action re-opens the modal.
          setDeckKey((k) => k + 1);
        }}
      />
    </section>
  );
};

export default Hero;
