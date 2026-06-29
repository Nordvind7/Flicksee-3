import React from 'react';

interface QA {
  q: string;
  a: string;
}

const ITEMS: QA[] = [
  { q: 'Это бесплатно?', a: 'Да, полностью. Никаких подписок и pay-to-watch.' },
  {
    q: 'Где смотреть фильм после матча?',
    a: 'Покажем где: КиноПоиск, ivi, Wink, Okko — что доступно в России.',
  },
  {
    q: 'Зачем Telegram?',
    a: 'Через бота приходят матчи с друзьями, и сохраняется твой watchlist между устройствами.',
  },
  {
    q: 'Можно без друзей?',
    a: 'Можно. Тогда это просто личный watchlist с трейлерами вместо описаний.',
  },
  {
    q: 'Это для мобилы или десктопа?',
    a: 'И там, и там. Открывается в любом браузере, а сохраняется в Telegram.',
  },
];

const FAQ: React.FC = () => (
  <section className="px-4 sm:px-8 py-16 sm:py-24 bg-ink-800/40">
    <div className="max-w-2xl mx-auto">
      <h2 className="text-center text-2xl sm:text-3xl font-bold mb-10">FAQ</h2>
      <div className="space-y-2">
        {ITEMS.map((item) => (
          <details
            key={item.q}
            className="rounded-xl bg-white/5 border border-white/10 overflow-hidden group"
          >
            <summary className="cursor-pointer list-none px-5 py-4 flex items-center justify-between hover:bg-white/[0.07]">
              <span className="font-medium text-sm sm:text-base">{item.q}</span>
              <span className="opacity-50 group-open:rotate-180 transition-transform">▾</span>
            </summary>
            <div className="px-5 pb-4 text-sm opacity-80">{item.a}</div>
          </details>
        ))}
      </div>
    </div>
  </section>
);

export default FAQ;
