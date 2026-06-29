import React from 'react';

interface Step {
  emoji: string;
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    emoji: '🎬',
    title: 'Смотри трейлер 30 сек',
    body: 'Без скучных описаний — сразу видно, зайдёт или нет.',
  },
  {
    emoji: '❤️',
    title: 'Свайпай как в Tinder',
    body: 'Хочу / Не моё / Уже видел / Рекомендую.',
  },
  {
    emoji: '🍿',
    title: 'Кино — найдено',
    body: 'Match с другом — оба хотим одно и то же.',
  },
];

const HowItWorks: React.FC = () => (
  <section className="px-4 sm:px-8 py-16 sm:py-24 bg-ink-800/40">
    <div className="max-w-5xl mx-auto">
      <h2 className="text-center text-2xl sm:text-3xl font-bold mb-10">
        Как это работает
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {STEPS.map((s) => (
          <div
            key={s.title}
            className="rounded-xl bg-white/5 border border-white/10 p-6 text-center"
          >
            <div className="text-5xl mb-4">{s.emoji}</div>
            <h3 className="text-lg font-bold mb-2">{s.title}</h3>
            <p className="text-sm opacity-75">{s.body}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default HowItWorks;
