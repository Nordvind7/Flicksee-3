import React, { useState, useEffect } from 'react';
import type { Genre, FilterState } from '../types';
import { ContentType } from '../types';
import { fetchGenres } from '../services/tmdb';
import { XMarkIcon } from './icons';

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentFilters: FilterState;
  onApplyFilters: (filters: FilterState) => void;
}

const FilterModal: React.FC<FilterModalProps> = ({
  isOpen,
  onClose,
  currentFilters,
  onApplyFilters,
}) => {
  const [genres, setGenres] = useState<Genre[]>([]);
  const [selectedContentType, setSelectedContentType] = useState<ContentType>(
    currentFilters.contentType,
  );
  const [selectedGenres, setSelectedGenres] = useState<number[]>(currentFilters.genres);

  useEffect(() => {
    const loadGenres = async () => {
      const fetchedGenres = await fetchGenres(selectedContentType);
      setGenres(fetchedGenres);
    };
    loadGenres();
  }, [selectedContentType]);

  const handleContentTypeChange = (type: ContentType) => {
    setSelectedContentType(type);
    setSelectedGenres([]);
  };

  const handleGenreToggle = (genreId: number) => {
    setSelectedGenres((prev) =>
      prev.includes(genreId) ? prev.filter((id) => id !== genreId) : [...prev, genreId],
    );
  };

  const handleApply = () => {
    onApplyFilters({ contentType: selectedContentType, genres: selectedGenres });
    onClose();
  };

  const handleReset = () => {
    setSelectedContentType(ContentType.Movie);
    setSelectedGenres([]);
  };

  if (!isOpen) return null;

  const selectedCount = selectedGenres.length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)' }}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg max-h-[85vh] flex flex-col rounded-t-3xl sm:rounded-3xl ring-1 ring-white/10 shadow-card-lg"
        style={{ backgroundColor: '#16161a' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile drag handle */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-12 h-1.5 rounded-full bg-white/15" />
        </div>

        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/5">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Фильтры</h2>
            {selectedCount > 0 && (
              <p className="text-xs text-ink-200 mt-0.5">
                {selectedCount}{' '}
                {selectedCount === 1
                  ? 'жанр'
                  : selectedCount < 5
                  ? 'жанра'
                  : 'жанров'}{' '}
                выбрано
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-ink-200 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors"
            aria-label="Закрыть"
          >
            <XMarkIcon />
          </button>
        </div>

        <div className="px-5 py-5 overflow-y-auto flex-1">
          <section className="mb-7">
            <h3 className="text-xs font-semibold text-ink-200 uppercase tracking-wider mb-3">
              Тип контента
            </h3>
            <div
              className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl"
              style={{ backgroundColor: '#1f1f25' }}
            >
              {[
                { type: ContentType.Movie, label: 'Фильмы' },
                { type: ContentType.TV, label: 'Сериалы' },
              ].map(({ type, label }) => {
                const active = selectedContentType === type;
                return (
                  <button
                    key={type}
                    onClick={() => handleContentTypeChange(type)}
                    className="py-2.5 rounded-xl text-sm font-semibold transition-all"
                    style={{
                      backgroundColor: active ? '#E50914' : 'transparent',
                      color: active ? '#ffffff' : '#9a9aa3',
                      boxShadow: active ? '0 4px 12px rgba(229, 9, 20, 0.35)' : 'none',
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <h3 className="text-xs font-semibold text-ink-200 uppercase tracking-wider mb-3">
              Жанры
            </h3>
            <div className="flex flex-wrap gap-2">
              {genres.map((genre) => {
                const active = selectedGenres.includes(genre.id);
                return (
                  <button
                    key={genre.id}
                    onClick={() => handleGenreToggle(genre.id)}
                    className="py-1.5 px-3.5 rounded-full text-sm font-medium transition-all"
                    style={{
                      backgroundColor: active ? '#E50914' : 'rgba(255,255,255,0.06)',
                      color: active ? '#ffffff' : '#d4d4dc',
                      boxShadow: active ? '0 4px 12px rgba(229, 9, 20, 0.35)' : 'none',
                    }}
                  >
                    {genre.name}
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        <div
          className="flex items-center gap-2 px-5 py-4 border-t border-white/5"
          style={{ backgroundColor: '#101013' }}
        >
          <button
            onClick={handleReset}
            className="px-4 py-3 rounded-full text-sm font-semibold text-ink-200 hover:text-white hover:bg-white/5 transition-colors"
          >
            Сбросить
          </button>
          <button
            onClick={handleApply}
            className="flex-1 py-3 rounded-full font-bold text-white transition-all hover:scale-[1.02] active:scale-95"
            style={{
              backgroundColor: '#E50914',
              boxShadow: '0 8px 24px rgba(229, 9, 20, 0.45)',
            }}
          >
            Применить
          </button>
        </div>
      </div>
    </div>
  );
};

export default FilterModal;
