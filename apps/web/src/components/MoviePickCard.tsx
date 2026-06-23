import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

export interface MoviePick {
  tmdbId: number;
  contentType: 'movie' | 'tv';
  title: string;
  year: number;
  why: string; // 1-2 sentence pitch
}

// Hydrates a poster via /api/tmdb on mount, so article authors don't have to
// hand-curate TMDB poster paths (which change). Renders a numbered, posterised
// card with title, year and one-sentence "why this one" pitch.
const MoviePickCard: React.FC<{ pick: MoviePick; index: number }> = ({ pick, index }) => {
  const [posterPath, setPosterPath] = useState<string | null | 'loading'>('loading');

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/tmdb/${pick.contentType}/${pick.tmdbId}?language=ru-RU`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled) setPosterPath(data?.poster_path ?? null);
      })
      .catch(() => !cancelled && setPosterPath(null));
    return () => {
      cancelled = true;
    };
  }, [pick.tmdbId, pick.contentType]);

  return (
    <article
      className="flex gap-4 p-4 rounded-2xl ring-1 ring-white/5 hover:ring-white/10 transition-all"
      style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
    >
      <div className="shrink-0 relative">
        <div className="w-20 sm:w-24 rounded-xl overflow-hidden ring-1 ring-white/5">
          {posterPath === 'loading' ? (
            <div
              className="w-full aspect-[2/3] animate-pulse"
              style={{ backgroundColor: '#1f1f25' }}
            />
          ) : posterPath ? (
            <img
              src={`https://image.tmdb.org/t/p/w185${posterPath}`}
              alt={`Постер фильма «${pick.title}»`}
              className="w-full aspect-[2/3] object-cover"
              loading="lazy"
            />
          ) : (
            <div
              className="w-full aspect-[2/3] flex items-center justify-center text-ink-300 text-xs"
              style={{ backgroundColor: '#1f1f25' }}
            >
              {pick.title}
            </div>
          )}
        </div>
        <span
          className="absolute -top-2 -left-2 w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ring-2"
          style={{
            backgroundColor: '#E50914',
            color: '#fff',
            boxShadow: '0 0 0 2px #0a0a0b',
          }}
        >
          {index + 1}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-lg sm:text-xl font-bold text-ink-50 leading-tight">
          {pick.title}{' '}
          <span className="text-ink-200 font-medium">({pick.year})</span>
        </h3>
        <p className="text-ink-100 text-sm sm:text-base leading-relaxed mt-2">{pick.why}</p>
        <Link
          to="/"
          className="inline-flex items-center gap-1 mt-3 text-xs font-semibold text-accent hover:underline"
          style={{ color: '#E50914' }}
        >
          Свайпнуть похожее →
        </Link>
      </div>
    </article>
  );
};

export default MoviePickCard;
