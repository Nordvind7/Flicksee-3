import React, { useState, useEffect } from 'react';
import SwipeContainer from './components/SwipeContainer';
import Header from './components/Header';
import LikedList from './components/LikedList';
import type { FilterState, Genre } from './types';
import { ContentType } from './types';
import { StartIcon } from './components/icons';
import { fetchGenres } from './services/tmdb';
import { useAuth } from './auth/AuthContext';
import { useLibrary } from './hooks/useLibrary';

// Extend the Window interface for TypeScript to recognize the Yandex Metrika function
declare global {
  interface Window {
    ym?: (counterId: string | number, action: string, url: string) => void;
  }
}

const YANDEX_METRIKA_ID = 104544058;

const App: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { likedMovies, watchedMovies, excludedIds, handleLike, handleDislike, handleWatched } =
    useLibrary(user, authLoading);

  const [view, setView] = useState<'swipe' | 'liked' | 'watched'>('swipe');
  const [hasInteracted, setHasInteracted] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    contentType: ContentType.Movie,
    genres: [],
  });
  const [genreMap, setGenreMap] = useState<{ movie: Map<number, string>; tv: Map<number, string> }>({
    movie: new Map(),
    tv: new Map(),
  });

  useEffect(() => {
    if (hasInteracted) {
      const loadGenres = async () => {
        try {
          const [movieGenres, tvGenres] = await Promise.all([
            fetchGenres(ContentType.Movie),
            fetchGenres(ContentType.TV),
          ]);
          setGenreMap({
            movie: new Map(movieGenres.map((g: Genre) => [g.id, g.name])),
            tv: new Map(tvGenres.map((g: Genre) => [g.id, g.name])),
          });
        } catch (error) {
          console.error('Failed to load genres', error);
        }
      };
      loadGenres();
    }
  }, [hasInteracted]);

  // Yandex Metrika Page View Tracking
  useEffect(() => {
    if (window.ym) {
      let path = '/';
      switch (view) {
        case 'liked':
          path = '/liked';
          break;
        case 'watched':
          path = '/watched';
          break;
        case 'swipe':
        default:
          path = '/';
          break;
      }
      window.ym(YANDEX_METRIKA_ID, 'hit', window.location.origin + path);
    }
  }, [view]);

  if (!hasInteracted) {
    const title = 'Flicksee'.split('');
    return (
      <div className="flex flex-col items-center justify-center h-screen start-screen-bg text-white p-4 text-center overflow-hidden">
        <h1 className="text-7xl md:text-8xl font-black text-brand-primary mb-2 flicksee-title" aria-label="Flicksee">
          {title.map((char, index) => (
            <span key={index} style={{ animationDelay: `${index * 0.05}s` }}>
              {char}
            </span>
          ))}
        </h1>
        <p className="text-lg text-brand-muted mb-8 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
          Свайпай трейлеры, находи фильмы и сериалы
        </p>
        <button
          onClick={() => setHasInteracted(true)}
          className="bg-brand-primary text-white font-bold py-4 px-8 rounded-full flex items-center justify-center transition-transform hover:scale-105 animate-fade-in-up animate-pulse-glow"
          style={{ animationDelay: '0.6s' }}
        >
          <StartIcon />
          <span className="ml-2 text-lg">Начать просмотр</span>
        </button>
        <p className="text-xs text-brand-muted mt-8 max-w-sm animate-fade-in-up" style={{ animationDelay: '0.8s' }}>
          Нажимая "Начать", вы разрешаете автовоспроизведение видео со звуком для лучшего опыта.
        </p>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-brand-background">
      <Header currentView={view} setView={setView} filters={filters} setFilters={setFilters} />
      <main className="flex-grow relative pt-20 overflow-y-auto">
        {view === 'swipe' && (
          <div className="h-full">
            <SwipeContainer
              onLike={handleLike}
              onDislike={handleDislike}
              onWatched={handleWatched}
              filters={filters}
              genreMap={genreMap[filters.contentType]}
              excludedIds={excludedIds}
            />
          </div>
        )}
        {view === 'liked' && <LikedList movies={likedMovies} />}
        {view === 'watched' && <LikedList movies={watchedMovies} title="Просмотрено" />}
      </main>
    </div>
  );
};

export default App;
