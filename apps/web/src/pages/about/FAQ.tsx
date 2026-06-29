import React from 'react';

interface QA {
  q: string;
  a: React.ReactNode;
}

const ITEMS: QA[] = [
  {
    q: 'Это правда бесплатно?',
    a: 'Да, полностью. Никаких подписок, регистрационных взносов, pay-to-watch.',
  },
  {
    q: 'А есть приложение в App Store / Google Play?',
    a: 'Нет, и не нужно. Открывается в любом браузере, mobile-friendly. Сохраняется через Telegram-аккаунт.',
  },
  {
    q: 'А моих любимых фильмов нет?',
    a: (
      <>
        50 000+ фильмов и сериалов из TMDB — всё что есть на КиноПоиске и больше.
        Если чего-то реально нет — напиши в{' '}
        <a className="underline" href="https://t.me/Flicksee_bot">
          @Flicksee_bot
        </a>
        , добавим.
      </>
    ),
  },
  {
    q: 'Зачем именно Telegram, а не email?',
    a: 'Telegram у тебя уже есть. Не нужно вводить email, придумывать пароль, ждать письмо с подтверждением. Один тап «Start» в боте — ты внутри. Плюс через бота приходят матчи с друзьями.',
  },
  {
    q: 'А если друзей нет в Flicksee?',
    a: 'Без проблем. Это просто личный watchlist с трейлерами вместо описаний. Когда позовёшь друга — match-режим включится автоматически.',
  },
  {
    q: 'Где потом смотреть фильм?',
    a: 'Покажем где: КиноПоиск, ivi, Wink, Okko — что доступно в России.',
  },
  {
    q: 'А мои данные где?',
    a: 'На серверах в РФ (152-ФЗ). От тебя нужны только: Telegram ID и имя. Никаких email, телефонов, паспортов.',
  },
  {
    q: 'Сколько занимает один сеанс?',
    a: 'В среднем 5-7 минут до решения «что смотрим». Можешь и за 2 минуты — если повезёт с первой карточкой.',
  },
  {
    q: 'Это для мобилы или десктопа?',
    a: 'И там, и там. Одинаково удобно. Сохраняется в Telegram → доступно с любого устройства.',
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
