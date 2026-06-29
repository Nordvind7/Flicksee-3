import React from 'react';

interface Pain {
  emoji: string;
  text: string;
}

const PAINS: Pain[] = [
  { emoji: '⏱', text: '30 минут листаешь «что посмотреть» на КиноПоиске и iVi' },
  { emoji: '😩', text: 'Постеры — это маркетинг. Не суть фильма' },
  { emoji: '⭐', text: 'Рейтинги — усреднённое мнение, не твоё' },
  { emoji: '📝', text: 'Описания пишут маркетологи. Слабости прячут' },
  { emoji: '💢', text: 'С девушкой / другом полчаса спорите, что включить' },
  { emoji: '🍿', text: 'В итоге включаете то же что в прошлый раз. Или вообще ничего' },
];

const ProblemAgitation: React.FC = () => (
  <section className="px-4 sm:px-8 py-16 sm:py-24">
    <div className="max-w-2xl mx-auto">
      <h2 className="text-center text-3xl sm:text-4xl font-extrabold mb-10">
        Знакомо?
      </h2>
      <ul className="space-y-3">
        {PAINS.map((p) => (
          <li
            key={p.text}
            className="flex items-start gap-4 rounded-xl bg-white/5 border border-white/10 p-4"
          >
            <span className="text-2xl shrink-0">{p.emoji}</span>
            <span className="text-base opacity-90 pt-0.5">{p.text}</span>
          </li>
        ))}
      </ul>
      <p className="text-center text-lg sm:text-xl font-bold mt-10 text-red-500">
        Flicksee ломает эту систему. ↓
      </p>
    </div>
  </section>
);

export default ProblemAgitation;
