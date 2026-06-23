import React, { useState } from 'react';
import type { Movie, Genre } from '../types';
import { TMDB_IMAGE_BASE_URL } from '../constants';
import { ShareIcon, StarIcon } from './icons';

interface LikedListProps {
  movies: Movie[];
  title?: string;
  genreMap?: { movie: Map<number, string>; tv: Map<number, string> };
}

const PLACEHOLDER_IMG =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2 3"><rect width="2" height="3" fill="%231f1f25"/></svg>';

const MovieCard: React.FC<{
  movie: Movie;
  genreNames: string[];
  onShare?: (movie: Movie) => void;
  canShare: boolean;
}> = ({ movie, genreNames, onShare, canShare }) => {
  const [expanded, setExpanded] = useState(false);
  const year =
    movie.release_date?.substring(0, 4) || movie.first_air_date?.substring(0, 4) || '';
  const overview = movie.overview || 'Описание недоступно.';
  const needsClamp = overview.length > 160;

  return (
    <article
      className="flex gap-3 sm:gap-4 p-3 rounded-2xl ring-1 ring-white/5 transition-all hover:ring-white/10"
      style={{ backgroundColor: '#16161a' }}
    >
      <div className="shrink-0 w-24 sm:w-28 md:w-32 rounded-xl overflow-hidden ring-1 ring-white/5">
        <img
          src={movie.poster_path ? `${TMDB_IMAGE_BASE_URL}${movie.poster_path}` : PLACEHOLDER_IMG}
          alt={movie.title}
          className="w-full aspect-[2/3] object-cover"
          loading="lazy"
        />
      </div>

      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base sm:text-lg font-bold text-ink-50 leading-tight">
            {movie.title}
          </h3>
          {canShare && onShare && (
            <button
              onClick={() => onShare(movie)}
              className="shrink-0 p-1.5 text-ink-200 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              aria-label="Поделиться"
            >
              <ShareIcon />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 mt-1 text-xs text-ink-200">
          {year && <span className="font-medium">{year}</span>}
          {year && movie.vote_average > 0 && <span className="opacity-50">·</span>}
          {movie.vote_average > 0 && (
            <span className="flex items-center gap-1">
              <StarIcon />
              <span className="font-medium">{movie.vote_average.toFixed(1)}</span>
            </span>
          )}
          <span className="opacity-50">·</span>
          <span className="capitalize">{movie.contentType === 'tv' ? 'сериал' : 'фильм'}</span>
        </div>

        {genreNames.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {genreNames.slice(0, 3).map((name) => (
              <span
                key={name}
                className="text-[10px] sm:text-xs text-ink-100 font-medium px-2 py-0.5 rounded-full ring-1 ring-white/5"
                style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
              >
                {name}
              </span>
            ))}
          </div>
        )}

        <p
          className={`text-xs sm:text-sm text-ink-200 mt-2 leading-relaxed ${
            !expanded && needsClamp ? 'line-clamp-3' : ''
          }`}
        >
          {overview}
        </p>
        {needsClamp && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="self-start text-xs text-ink-300 hover:text-white mt-1 font-medium transition-colors"
          >
            {expanded ? 'свернуть' : 'ещё'}
          </button>
        )}
      </div>
    </article>
  );
};

const LikedList: React.FC<LikedListProps> = ({
  movies,
  title = 'Хочу посмотреть',
  genreMap,
}) => {
  const canShare = typeof navigator !== 'undefined' && !!navigator.share;

  const handleShare = async (movie: Movie) => {
    const contentType = movie.contentType || 'movie';
    const url = `https://www.themoviedb.org/${contentType}/${movie.id}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: movie.title,
          text: `Посмотри трейлер «${movie.title}»`,
          url,
        });
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') console.error('Share failed:', err);
    }
  };

  const namesFor = (movie: Movie): string[] => {
    if (!genreMap) return movie.genres?.map((g: Genre) => g.name) ?? [];
    const map = movie.contentType === 'tv' ? genreMap.tv : genreMap.movie;
    return movie.genre_ids?.map((id) => map.get(id)).filter((n): n is string => Boolean(n)) ?? [];
  };

  if (movies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-ink-200 text-center p-6">
        <p className="text-lg font-semibold mb-1">Список «{title}» пуст</p>
        <p className="text-sm max-w-xs">Свайпай трейлеры — фильмы будут собираться здесь.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex items-baseline justify-between mb-5">
        <h2 className="text-2xl md:text-3xl font-black tracking-tight text-ink-50">{title}</h2>
        <span className="text-sm text-ink-200">
          {movies.length}{' '}
          {movies.length === 1 ? 'фильм' : movies.length < 5 ? 'фильма' : 'фильмов'}
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {movies.map((movie) => (
          <MovieCard
            key={`${movie.contentType}-${movie.id}`}
            movie={movie}
            genreNames={namesFor(movie)}
            onShare={canShare ? handleShare : undefined}
            canShare={canShare}
          />
        ))}
      </div>
    </div>
  );
};

export default LikedList;
