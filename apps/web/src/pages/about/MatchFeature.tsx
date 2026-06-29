import React from 'react';

const MatchFeature: React.FC = () => (
  <section className="px-4 sm:px-8 py-16 sm:py-24">
    <div className="max-w-5xl mx-auto">
      <p className="text-center text-xs uppercase tracking-widest opacity-50 mb-3">
        Главная фишка
      </p>
      <h2 className="text-center text-2xl sm:text-3xl font-bold mb-12">
        Match с другом — кино найдено
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
        {/* CSS-only mock of a Telegram bot push */}
        <div className="order-2 md:order-1 mx-auto w-full max-w-xs">
          <div className="rounded-2xl bg-ink-700 border border-white/10 p-5 shadow-2xl">
            <div className="flex items-center gap-2 mb-3 text-xs opacity-60">
              <span className="w-7 h-7 rounded-full bg-red-500/20 flex items-center justify-center text-base">
                🤖
              </span>
              <span className="font-medium">Flicksee bot</span>
            </div>
            <div className="text-2xl mb-2">🎬 МАТЧ</div>
            <div className="text-xl font-bold mb-1">Оппенгеймер</div>
            <div className="text-sm opacity-70 mb-4">Артём + Аня оба хотят</div>
            <button className="w-full px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-semibold">
              Где смотреть →
            </button>
          </div>
        </div>

        <div className="order-1 md:order-2 text-base sm:text-lg opacity-90 leading-relaxed">
          <p className="mb-4">
            Делишься ссылкой с другом → он свайпает → вы лайкнули один фильм →
            <b className="text-white"> обоим прилетает в Telegram</b>.
          </p>
          <p className="opacity-80">
            Никаких «ну выбери ты», «нет ты выбери». Решение принимают свайпы.
          </p>
        </div>
      </div>
    </div>
  </section>
);

export default MatchFeature;
