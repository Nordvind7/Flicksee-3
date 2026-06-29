import React from 'react';
import type { FilterState } from '../types';
import { ContentType } from '../types';

interface Props {
  filters: FilterState;
  setFilters: (filters: FilterState) => void;
}

const MOVIE_GENRE = {
  action: 28,
  comedy: 35,
  romance: 10749,
  horror: 27,
  drama: 18,
  scifi: 878,
  animation: 16,
};

type Preset = {
  key: string;
  emoji: string;
  label: string;
  apply: () => FilterState;
  isActive: (f: FilterState) => boolean;
};

// Аниме: Animation genre + japanese original language. Иначе TMDB
// отдаёт обычные мультфильмы (Шрек, Тачки, Зверополис) — что юзер прямо
// и отметил как баг.
const PRESETS: Preset[] = [
  {
    key: 'all',
    emoji: '🔥',
    label: 'Популярное',
    apply: () => ({ contentType: ContentType.Movie, genres: [] }),
    isActive: (f) => f.genres.length === 0 && f.contentType === ContentType.Movie && !f.originalLanguage,
  },
  {
    key: 'anime',
    emoji: '🍙',
    label: 'Аниме',
    apply: () => ({
      contentType: ContentType.Movie,
      genres: [MOVIE_GENRE.animation],
      originalLanguage: 'ja',
    }),
    isActive: (f) => f.originalLanguage === 'ja' && f.genres.includes(MOVIE_GENRE.animation),
  },
  {
    key: 'action',
    emoji: '💥',
    label: 'Боевики',
    apply: () => ({ contentType: ContentType.Movie, genres: [MOVIE_GENRE.action] }),
    isActive: (f) => f.genres.length === 1 && f.genres[0] === MOVIE_GENRE.action && !f.originalLanguage,
  },
  {
    key: 'comedy',
    emoji: '😂',
    label: 'Комедии',
    apply: () => ({ contentType: ContentType.Movie, genres: [MOVIE_GENRE.comedy] }),
    isActive: (f) => f.genres.length === 1 && f.genres[0] === MOVIE_GENRE.comedy && !f.originalLanguage,
  },
  {
    key: 'romance',
    emoji: '💕',
    label: 'Романтика',
    apply: () => ({ contentType: ContentType.Movie, genres: [MOVIE_GENRE.romance] }),
    isActive: (f) => f.genres.length === 1 && f.genres[0] === MOVIE_GENRE.romance && !f.originalLanguage,
  },
  {
    key: 'horror',
    emoji: '🩸',
    label: 'Хоррор',
    apply: () => ({ contentType: ContentType.Movie, genres: [MOVIE_GENRE.horror] }),
    isActive: (f) => f.genres.length === 1 && f.genres[0] === MOVIE_GENRE.horror && !f.originalLanguage,
  },
  {
    key: 'drama',
    emoji: '🎭',
    label: 'Драма',
    apply: () => ({ contentType: ContentType.Movie, genres: [MOVIE_GENRE.drama] }),
    isActive: (f) => f.genres.length === 1 && f.genres[0] === MOVIE_GENRE.drama && !f.originalLanguage,
  },
  {
    key: 'scifi',
    emoji: '🚀',
    label: 'Фантастика',
    apply: () => ({ contentType: ContentType.Movie, genres: [MOVIE_GENRE.scifi] }),
    isActive: (f) => f.genres.length === 1 && f.genres[0] === MOVIE_GENRE.scifi && !f.originalLanguage,
  },
  {
    key: 'tv',
    emoji: '📺',
    label: 'Сериалы',
    apply: () => ({ contentType: ContentType.TV, genres: [] }),
    isActive: (f) => f.contentType === ContentType.TV && f.genres.length === 0,
  },
];

/**
 * Сегментированная панель пресетов. Центрированный контейнер шириной как
 * карточка трейлера (max-w-xl) с единой подложкой — чипы группируются
 * визуально, не "болтаются" по всей ширине viewport.
 *
 * Active чип = красно-оранжевый градиент, остальные — прозрачные с тонким
 * hover. На мобиле скроллится горизонтально.
 */
const QuickFilters: React.FC<Props> = ({ filters, setFilters }) => {
  return (
    <div className="shrink-0 w-full px-3 sm:px-4 pt-1 pb-1.5">
      <div className="max-w-xl mx-auto">
        <div
          className="flex gap-1 overflow-x-auto p-1 rounded-2xl"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            background: 'rgba(22,22,26,0.55)',
            backdropFilter: 'blur(16px) saturate(140%)',
            WebkitBackdropFilter: 'blur(16px) saturate(140%)',
            border: '1px solid rgba(255,255,255,0.06)',
            boxShadow: '0 6px 24px rgba(0,0,0,0.4)',
          }}
        >
          <style>{`.flicksee-chip::-webkit-scrollbar{display:none}`}</style>
          {PRESETS.map((p) => {
            const active = p.isActive(filters);
            return (
              <button
                key={p.key}
                onClick={() => setFilters(p.apply())}
                className="flicksee-chip shrink-0 inline-flex items-center gap-1.5 h-7 sm:h-8 px-3 rounded-xl text-[12px] sm:text-[13px] font-semibold whitespace-nowrap transition-all duration-150 active:scale-95"
                style={
                  active
                    ? {
                        background: 'linear-gradient(135deg, #E50914 0%, #ff6a3d 100%)',
                        color: '#ffffff',
                        boxShadow: '0 3px 10px rgba(229,9,20,0.45), inset 0 1px 0 rgba(255,255,255,0.18)',
                      }
                    : {
                        background: 'transparent',
                        color: '#c9c9d2',
                      }
                }
              >
                <span className="text-sm leading-none">{p.emoji}</span>
                <span>{p.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default QuickFilters;
