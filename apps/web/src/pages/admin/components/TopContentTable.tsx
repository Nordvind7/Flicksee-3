import React from 'react';
import type { TopContentRow } from '@flicksee/shared';

interface Props {
  title: string;
  rows: TopContentRow[];
  countLabel: string;
}

const TopContentTable: React.FC<Props> = ({ title, rows, countLabel }) => (
  <div className="rounded-lg bg-white/5 border border-white/10 p-4">
    <h3 className="text-sm uppercase tracking-wide opacity-60 mb-3">{title}</h3>
    {rows.length === 0 ? (
      <div className="text-sm opacity-50">Нет данных</div>
    ) : (
      <ol className="space-y-2">
        {rows.map((r, i) => (
          <li key={`${r.contentType}-${r.tmdbId}`} className="flex items-center gap-3 text-sm">
            <span className="opacity-40 w-5 text-right">{i + 1}.</span>
            <span className="flex-1 truncate">
              {r.title}
              <span className="opacity-40 ml-2 text-xs">[{r.contentType}]</span>
            </span>
            <span className="tabular-nums font-mono">
              {r.count} {countLabel}
              {r.likeRatio !== undefined && (
                <span className="opacity-50 ml-2">({Math.round(r.likeRatio * 100)}%)</span>
              )}
            </span>
          </li>
        ))}
      </ol>
    )}
  </div>
);

export default TopContentTable;
