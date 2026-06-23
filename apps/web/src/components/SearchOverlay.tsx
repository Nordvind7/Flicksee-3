import React, { useEffect, useRef, useState } from 'react';
import { searchTitles, type SearchResult } from '../services/tmdb';
import { XMarkIcon, HeartIcon, StarIcon } from './icons';
import type { Movie } from '../types';
import { TMDB_IMAGE_BASE_URL } from '../constants';

// Modal overlay search: focus-trap on open, debounced query, results list.
// Click + on a result → adds to watchlist via onLike. We map SearchResult →
// minimal Movie so the existing useLibrary handlers accept it.
interface Props {
  open: boolean;
  onClose: () => void;
  onLike: (movie: Movie) => void;
  excludedIds: Set<number>;
}

function searchResultToMovie(r: SearchResult): Movie {
  return {
    id: r.id,
    title: r.title,
    overview: r.overview,
    poster_path: r.poster_path ?? '',
    backdrop_path: '',
    vote_average: r.vote_average,
    genre_ids: [],
    release_date: r.release_date,
    first_air_date: r.first_air_date,
    contentType: r.contentType,
  };
}

const SearchOverlay: React.FC<Props> = ({ open, onClose, onLike, excludedIds }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState<Set<number>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults([]);
      setAdded(new Set());
      return;
    }
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  // Debounced search.
  useEffect(() => {
    if (!open) return;
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    const t = setTimeout(() => {
      searchTitles(query)
        .then(setResults)
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [query, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleAdd = (r: SearchResult) => {
    setAdded((prev) => new Set(prev).add(r.id));
    onLike(searchResultToMovie(r));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] sm:pt-[15vh] p-4 backdrop-blur-sm"
      style={{ backgroundColor: 'rgba(0,0,0,0.78)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-3xl ring-1 ring-white/10 shadow-card-lg overflow-hidden"
        style={{ backgroundColor: '#16161a' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
          <span className="text-ink-200">🔍</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Найти фильм или сериал…"
            className="flex-1 bg-transparent outline-none text-ink-50 text-base placeholder-ink-300"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-ink-300 hover:text-white text-xs"
            >
              очистить
            </button>
          )}
          <button
            onClick={onClose}
            className="text-ink-200 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors"
            aria-label="Закрыть"
          >
            <XMarkIcon />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {!query && (
            <div className="text-ink-200 text-sm p-6 text-center">
              Введи название фильма или сериала. Поиск по TMDB.
            </div>
          )}
          {query && loading && (
            <div className="text-ink-200 text-sm p-6 text-center">Ищем…</div>
          )}
          {query && !loading && results.length === 0 && (
            <div className="text-ink-200 text-sm p-6 text-center">
              Ничего не найдено для «{query}».
            </div>
          )}
          <div className="flex flex-col">
            {results.map((r) => {
              const year =
                r.release_date?.substring(0, 4) || r.first_air_date?.substring(0, 4) || '';
              const isInLibrary = excludedIds.has(r.id) || added.has(r.id);
              return (
                <div
                  key={`${r.contentType}-${r.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors"
                >
                  <div className="shrink-0 w-12 h-16 rounded-md overflow-hidden ring-1 ring-white/5">
                    {r.poster_path ? (
                      <img
                        src={`${TMDB_IMAGE_BASE_URL}${r.poster_path}`}
                        alt={r.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full bg-ink-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-ink-50 font-semibold truncate">{r.title}</div>
                    <div className="flex items-center gap-1.5 text-xs text-ink-200 mt-0.5">
                      {year && <span>{year}</span>}
                      {year && r.vote_average > 0 && <span className="opacity-50">·</span>}
                      {r.vote_average > 0 && (
                        <span className="flex items-center gap-0.5">
                          <StarIcon />
                          <span>{r.vote_average.toFixed(1)}</span>
                        </span>
                      )}
                      <span className="opacity-50">·</span>
                      <span>{r.contentType === 'tv' ? 'сериал' : 'фильм'}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleAdd(r)}
                    disabled={isInLibrary}
                    className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all hover:scale-[1.03] active:scale-95 flex items-center gap-1.5"
                    style={{
                      backgroundColor: isInLibrary ? 'rgba(255,255,255,0.06)' : '#E50914',
                      color: isInLibrary ? '#9a9aa3' : '#fff',
                      boxShadow: isInLibrary ? 'none' : '0 4px 12px rgba(229, 9, 20, 0.35)',
                    }}
                  >
                    <span className="block w-3.5 h-3.5 [&_svg]:w-3.5 [&_svg]:h-3.5">
                      <HeartIcon />
                    </span>
                    {isInLibrary ? 'В списке' : 'Хочу'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchOverlay;
