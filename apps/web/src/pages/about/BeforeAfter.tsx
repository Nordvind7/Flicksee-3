import React from 'react';

interface Pair {
  before: string;
  after: string;
}

const PAIRS: Pair[] = [
  { before: 'Час листал — ничего не выбрал', after: 'За минуту 10 свайпов — знаешь что хочешь' },
  { before: 'Описания не передают вайб', after: 'Трейлер за 30 сек — увидишь сам' },
  { before: 'Спорим с другом полчаса', after: 'Match — оба хотим одно. Без споров' },
];

const BeforeAfter: React.FC = () => (
  <section className="px-4 sm:px-8 py-16 sm:py-24">
    <div className="max-w-4xl mx-auto">
      <h2 className="text-center text-2xl sm:text-3xl font-bold mb-10">
        Почему это
      </h2>
      <div className="space-y-3">
        {PAIRS.map((p) => (
          <div
            key={p.before}
            className="grid grid-cols-1 sm:grid-cols-2 gap-3"
          >
            <div className="rounded-xl bg-white/5 border border-white/10 p-4 text-sm opacity-70">
              <div className="text-xs uppercase tracking-wide opacity-60 mb-1">Было</div>
              {p.before}
            </div>
            <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-4 text-sm">
              <div className="text-xs uppercase tracking-wide text-red-300/80 mb-1">Стало</div>
              {p.after}
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default BeforeAfter;
