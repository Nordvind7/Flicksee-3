import React, { useState } from 'react';
import LoginPromptModal from './LoginPromptModal';

const FinalCTA: React.FC = () => {
  const [open, setOpen] = useState(false);
  return (
    <section className="px-4 sm:px-8 py-20 sm:py-28 text-center">
      <div className="max-w-xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">
          Хватит листать.
        </h2>
        <p className="text-base sm:text-lg opacity-80 mb-8">
          Найди что посмотреть за 7 минут.
        </p>
        <button
          onClick={() => setOpen(true)}
          className="inline-block px-8 py-4 rounded-xl bg-red-500 hover:bg-red-600 text-white text-lg font-semibold transition-colors"
        >
          Войти через Telegram →
        </button>
        <p className="text-xs opacity-50 mt-4">
          Бесплатно. Без email. Без подписки.
          <br />
          Регистрация — один тап в Telegram.
        </p>
      </div>
      <LoginPromptModal
        open={open}
        title="Войти через Telegram"
        description="Откроется @Flicksee_bot. Нажми «Start» — автоматически залогинимся."
        onClose={() => setOpen(false)}
      />
    </section>
  );
};

export default FinalCTA;
