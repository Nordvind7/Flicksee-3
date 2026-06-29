import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLibraryContext } from '../auth/LibraryContext';
import { ContentType, type Movie } from '../types';
import { HeartIcon } from './icons';
import { tmdbImg } from '../constants';

export interface MoviePick {
  tmdbId: number;
  contentType: 'movie' | 'tv';
  title: string;
  year: number;
  why: string; // 1-2 sentence pitch
}

interface TmdbDetail {
  poster_path: string | null;
  overview?: string;
  vote_average?: number;
  backdrop_path?: string | null;
  genres?: { id: number; name: string }[];
}

// Hydrates TMDB data on mount, renders posterised numbered card with title /
// year / pitch + a heart button that drops the movie straight into the user's
// watchlist via LibraryContext. Already-liked → red disabled state.
const MoviePickCard: React.FC<{ pick: MoviePick; index: number }> = ({ pick, index }) => {
  const [detail, setDetail] = useState<TmdbDetail | null | 'loading'>('loading');
  const { excludedIds, handleLike } = useLibraryContext();

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/tmdb/${pick.contentType}/${pick.tmdbId}?language=ru-RU`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled) setDetail(data ?? null);
      })
      .catch(() => !cancelled && setDetail(null));
    return () => {
      cancelled = true;
    };
  }, [pick.tmdbId, pick.contentType]);

  const posterPath = detail !== 'loading' && detail ? detail.poster_path : null;
  const isLiked = excludedIds.has(pick.tmdbId);

  const onLike = () => {
    if (isLiked || detail === 'loading' || !detail) return;
    const movie: Movie = {
      id: pick.tmdbId,
      title: pick.title,
      overview: detail.overview ?? pick.why,
      poster_path: detail.poster_path ?? '',
      backdrop_path: detail.backdrop_path ?? '',
      vote_average: detail.vote_average ?? 0,
      genre_ids: detail.genres?.map((g) => g.id) ?? [],
      release_date: pick.contentType === 'movie' ? `${pick.year}-01-01` : undefined,
      first_air_date: pick.contentType === 'tv' ? `${pick.year}-01-01` : undefined,
      contentType: pick.contentType === 'tv' ? ContentType.TV : ContentType.Movie,
    };
    handleLike(movie);
  };

  return (
    <article
      className="flex gap-4 p-4 rounded-2xl ring-1 ring-white/5 hover:ring-white/10 transition-all"
      style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
    >
      <div className="shrink-0 relative">
        <div className="w-20 sm:w-24 rounded-xl overflow-hidden ring-1 ring-white/5">
          {detail === 'loading' ? (
            <div className="w-full aspect-[2/3] animate-pulse" style={{ backgroundColor: '#1f1f25' }} />
          ) : posterPath ? (
            <img
              src={tmdbImg('w185', posterPath)}
              alt={`Постер фильма «${pick.title}»`}
              className="w-full aspect-[2/3] object-cover"
              loading="lazy"
            />
          ) : (
            <div
              className="w-full aspect-[2/3] flex items-center justify-center text-ink-300 text-xs p-2 text-center"
              style={{ backgroundColor: '#1f1f25' }}
            >
              {pick.title}
            </div>
          )}
        </div>
        <span
          className="absolute -top-2 -left-2 w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ring-2"
          style={{ backgroundColor: '#E50914', color: '#fff', boxShadow: '0 0 0 2px #0a0a0b' }}
        >
          {index + 1}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-lg sm:text-xl font-bold text-ink-50 leading-tight">
            {pick.title}{' '}
            <span className="text-ink-200 font-medium">({pick.year})</span>
          </h3>
          <button
            onClick={onLike}
            disabled={isLiked}
            className="shrink-0 rounded-full p-2 transition-all hover:scale-110 active:scale-95"
            style={{
              backgroundColor: isLiked ? '#E50914' : 'rgba(255,255,255,0.06)',
              color: isLiked ? '#fff' : '#9a9aa3',
              boxShadow: isLiked ? '0 0 16px rgba(229, 9, 20, 0.5)' : 'none',
            }}
            aria-label={isLiked ? 'Уже в watchlist' : 'Добавить в watchlist'}
            title={isLiked ? 'Уже в списке «Хочу посмотреть»' : 'В «Хочу посмотреть»'}
          >
            <span className="block w-4 h-4 [&_svg]:w-4 [&_svg]:h-4">
              <HeartIcon />
            </span>
          </button>
        </div>
        <p className="text-ink-100 text-sm sm:text-base leading-relaxed mt-2">{pick.why}</p>
        <Link
          to="/"
          className="inline-flex items-center gap-1 mt-3 text-xs font-semibold hover:underline"
          style={{ color: '#E50914' }}
        >
          Свайпнуть похожее →
        </Link>
      </div>
    </article>
  );
};

export default MoviePickCard;
