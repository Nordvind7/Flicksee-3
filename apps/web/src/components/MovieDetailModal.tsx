import React, { useEffect, useState } from 'react';
import type { Movie } from '../types';
import { TMDB_IMAGE_BASE_URL, tmdbImg } from '../constants';
import { fetchRecommendations } from '../services/tmdb';
import { XMarkIcon, HeartIcon, StarIcon } from './icons';
import WatchProvidersRow from './WatchProvidersRow';

// Tap a card in LikedList → this modal opens with full info, where-to-watch
// strip, and a "Похожие" recommendation grid. Each recommendation can be
// liked in-place so the user can keep building their watchlist without
// returning to the main swipe deck.
interface Props {
  movie: Movie | null;
  onClose: () => void;
  onLike: (movie: Movie) => void;
  genreMap?: { movie: Map<number, string>; tv: Map<number, string> };
  excludedIds: Set<number>;
}

const MovieDetailModal: React.FC<Props> = ({ movie, onClose, onLike, genreMap, excludedIds }) => {
  const [recs, setRecs] = useState<Movie[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [locallyLiked, setLocallyLiked] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!movie) return;
    setRecs([]);
    setLocallyLiked(new Set());
    setLoadingRecs(true);
    fetchRecommendations(movie.id, movie.contentType)
      .then((r) => setRecs(r))
      .finally(() => setLoadingRecs(false));
  }, [movie]);

  useEffect(() => {
    if (!movie) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [movie, onClose]);

  if (!movie) return null;

  const year =
    movie.release_date?.substring(0, 4) || movie.first_air_date?.substring(0, 4) || '';
  const genreNames =
    (genreMap
      ? movie.genre_ids
          ?.map((id) => (movie.contentType === 'tv' ? genreMap.tv : genreMap.movie).get(id))
          .filter((n): n is string => Boolean(n))
      : movie.genres?.map((g) => g.name)) ?? [];

  const onLikeReco = (m: Movie) => {
    setLocallyLiked((prev) => new Set(prev).add(m.id));
    onLike(m);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm overflow-y-auto"
      style={{ backgroundColor: 'rgba(0,0,0,0.78)' }}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-2xl my-auto rounded-t-3xl sm:rounded-3xl ring-1 ring-white/10 shadow-card-lg max-h-[92vh] overflow-y-auto"
        style={{ backgroundColor: '#16161a' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile handle */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-12 h-1.5 rounded-full bg-white/15" />
        </div>

        {/* Header with backdrop hero */}
        <div className="relative">
          {movie.backdrop_path && (
            <img
              src={tmdbImg('w780', movie.backdrop_path)}
              alt=""
              className="w-full aspect-[16/9] object-cover sm:rounded-t-3xl"
            />
          )}
          <div
            className="absolute inset-0 sm:rounded-t-3xl"
            style={{
              background:
                'linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(22,22,26,0.4) 60%, #16161a 100%)',
            }}
          />
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-2 rounded-full text-white/90 hover:text-white transition-colors"
            style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
            aria-label="Закрыть"
          >
            <XMarkIcon />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 sm:px-6 pb-6 -mt-10 relative">
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-ink-50 leading-tight">
            {movie.title}
          </h2>
          <div className="flex items-center gap-2 mt-2 text-sm text-ink-200">
            {year && <span className="font-medium">{year}</span>}
            {year && movie.vote_average > 0 && <span className="opacity-50">·</span>}
            {movie.vote_average > 0 && (
              <span className="flex items-center gap-1">
                <StarIcon />
                <span className="font-medium">{movie.vote_average.toFixed(1)}</span>
              </span>
            )}
            <span className="opacity-50">·</span>
            <span>{movie.contentType === 'tv' ? 'сериал' : 'фильм'}</span>
          </div>

          {genreNames.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {genreNames.slice(0, 5).map((name) => (
                <span
                  key={name}
                  className="text-xs text-ink-100 font-medium px-2.5 py-1 rounded-full ring-1 ring-white/5"
                  style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                >
                  {name}
                </span>
              ))}
            </div>
          )}

          <div className="mt-4">
            <WatchProvidersRow tmdbId={movie.id} contentType={movie.contentType} />
          </div>

          <p className="text-ink-100 text-sm sm:text-base leading-relaxed mt-5">
            {movie.overview || 'Описание недоступно.'}
          </p>

          {/* Recommendations */}
          <div className="mt-8">
            <h3 className="text-lg font-bold text-ink-50 mb-3">Похожее</h3>
            {loadingRecs ? (
              <div className="text-ink-200 text-sm py-4">Загружаем…</div>
            ) : recs.length === 0 ? (
              <div className="text-ink-200 text-sm py-4">
                Не нашли похожих рекомендаций для этого фильма.
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                {recs.map((r) => {
                  const isLiked = excludedIds.has(r.id) || locallyLiked.has(r.id);
                  return (
                    <div key={r.id} className="relative group">
                      <div className="rounded-xl overflow-hidden ring-1 ring-white/5">
                        {r.poster_path ? (
                          <img
                            src={`${TMDB_IMAGE_BASE_URL}${r.poster_path}`}
                            alt={r.title}
                            className="w-full aspect-[2/3] object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full aspect-[2/3] bg-ink-600" />
                        )}
                      </div>
                      <div className="mt-1.5 text-xs text-ink-100 font-medium leading-tight line-clamp-2 min-h-[2.4em]">
                        {r.title}
                      </div>
                      <button
                        onClick={() => onLikeReco(r)}
                        disabled={isLiked}
                        className={`absolute top-1.5 right-1.5 p-1.5 rounded-full transition-all ${
                          isLiked
                            ? 'opacity-100'
                            : 'opacity-0 group-hover:opacity-100 hover:scale-110'
                        }`}
                        style={{
                          backgroundColor: isLiked ? '#E50914' : 'rgba(0,0,0,0.65)',
                          color: '#fff',
                        }}
                        aria-label={isLiked ? 'Уже в списке' : 'Хочу посмотреть'}
                      >
                        <span className="block w-4 h-4 [&_svg]:w-4 [&_svg]:h-4">
                          <HeartIcon />
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MovieDetailModal;
