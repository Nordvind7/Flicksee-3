import React from 'react';

interface Persona {
  emoji: string;
  title: string;
  body: string;
}

const PERSONAS: Persona[] = [
  {
    emoji: '🧑‍🦰',
    title: 'Один смотришь',
    body: 'Свайпай между делом — копит watchlist пока едешь в метро.',
  },
  {
    emoji: '👫',
    title: 'С парой',
    body: 'Match решает за вас. Без часовых переговоров.',
  },
  {
    emoji: '👯',
    title: 'Компанией',
    body: 'Каждый свайпает — пересечения всплывают автоматически.',
  },
];

const UseCases: React.FC = () => (
  <section className="px-4 sm:px-8 py-16 sm:py-24 bg-ink-800/40">
    <div className="max-w-5xl mx-auto">
      <h2 className="text-center text-2xl sm:text-3xl font-bold mb-10">
        Для кого Flicksee?
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {PERSONAS.map((p) => (
          <div
            key={p.title}
            className="rounded-xl bg-white/5 border border-white/10 p-6 text-center"
          >
            <div className="text-5xl mb-4">{p.emoji}</div>
            <h3 className="text-lg font-bold mb-2">{p.title}</h3>
            <p className="text-sm opacity-75">{p.body}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default UseCases;
