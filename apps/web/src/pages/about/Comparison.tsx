import React from 'react';

interface Row {
  label: string;
  flicksee: string;
  feed: string;
  catalog: string;
}

const ROWS: Row[] = [
  { label: 'Видишь трейлер', flicksee: '✅', feed: '❌', catalog: '❌' },
  { label: 'Свайп-выбор', flicksee: '✅', feed: '❌', catalog: '❌' },
  { label: 'Match с другом', flicksee: '✅', feed: '❌', catalog: '❌' },
  { label: 'Без подписки', flicksee: '✅', feed: '✅', catalog: '⚠️' },
  { label: 'Работает в РФ', flicksee: '✅', feed: '✅', catalog: '✅' },
  { label: 'Время на выбор', flicksee: '7 мин', feed: '30 мин+', catalog: '30 мин+' },
];

const Comparison: React.FC = () => (
  <section className="px-4 sm:px-8 py-16 sm:py-24 bg-ink-800/40">
    <div className="max-w-4xl mx-auto">
      <h2 className="text-center text-2xl sm:text-3xl font-bold mb-10">
        Чем это лучше привычных способов?
      </h2>
      <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
        <table className="w-full min-w-[480px] text-sm sm:text-base border-separate border-spacing-0">
          <thead>
            <tr>
              <th className="text-left p-3 font-medium opacity-60"></th>
              <th className="p-3 font-bold bg-red-500/15 rounded-tl-xl rounded-tr-xl text-red-300 sm:rounded-tr-none">
                Flicksee
              </th>
              <th className="p-3 font-medium opacity-70">Лента TG / IG</th>
              <th className="p-3 font-medium opacity-70">КиноПоиск / IMDB</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r, i) => (
              <tr key={r.label} className={i % 2 === 0 ? 'bg-white/[0.02]' : ''}>
                <td className="p-3 opacity-80">{r.label}</td>
                <td className="p-3 text-center font-semibold bg-red-500/10">
                  {r.flicksee}
                </td>
                <td className="p-3 text-center opacity-80">{r.feed}</td>
                <td className="p-3 text-center opacity-80">{r.catalog}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </section>
);

export default Comparison;
