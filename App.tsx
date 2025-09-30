
import React, { useState, useEffect, useCallback } from 'react';
import SwipeContainer from './components/SwipeContainer';
import Header from './components/Header';
import LikedList from './components/LikedList';
import type { Movie, FilterState } from './types';
import { ContentType } from './types';
import { StartIcon } from './components/icons';

const App: React.FC = () => {
  const [likedMovies, setLikedMovies] = useState<Movie[]>([]);
  const [watchedMovies, setWatchedMovies] = useState<Movie[]>([]);
  const [view, setView] = useState<'swipe' | 'liked' | 'watched'>('swipe');
  const [hasInteracted, setHasInteracted] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    contentType: ContentType.Movie,
    genres: [],
  });

  useEffect(() => {
    const storedLiked = localStorage.getItem('flicksee_liked');
    if (storedLiked) {
      setLikedMovies(JSON.parse(storedLiked));
    }
    const storedWatched = localStorage.getItem('flicksee_watched');
    if (storedWatched) {
      setWatchedMovies(JSON.parse(storedWatched));
    }
  }, []);

  const handleLike = useCallback((movie: Movie) => {
    setLikedMovies((prev) => {
      const newLiked = [movie, ...prev];
      localStorage.setItem('flicksee_liked', JSON.stringify(newLiked));
      return newLiked;
    });
  }, []);

  const handleDislike = useCallback((movie: Movie) => {
    // We can add logic here to prevent seeing this movie again
  }, []);

  const handleWatched = useCallback((movie: Movie) => {
    setWatchedMovies((prev) => {
        const newWatched = [movie, ...prev];
        localStorage.setItem('flicksee_watched', JSON.stringify(newWatched));
        return newWatched;
    });
  }, []);
  
  if (!hasInteracted) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-brand-background text-white p-4 text-center">
        <h1 className="text-5xl font-bold mb-2">Flicksee</h1>
        <p className="text-lg text-brand-muted mb-8">Свайпай трейлеры, находи фильмы и сериалы</p>
        <button
          onClick={() => setHasInteracted(true)}
          className="bg-brand-primary text-white font-bold py-3 px-6 rounded-full flex items-center justify-center transition-transform hover:scale-105"
        >
          <StartIcon />
          <span className="ml-2">Начать просмотр</span>
        </button>
        <p className="text-xs text-brand-muted mt-8 max-w-sm">
          Нажимая "Начать", вы разрешаете автовоспроизведение видео со звуком для лучшего опыта.
        </p>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-brand-background">
      <Header 
        currentView={view} 
        setView={setView} 
        filters={filters}
        setFilters={setFilters}
      />
      <main className="flex-grow relative pt-20">
        {view === 'swipe' && (
          <SwipeContainer 
            onLike={handleLike} 
            onDislike={handleDislike}
            onWatched={handleWatched}
            filters={filters}
          />
        )}
        {view === 'liked' && <LikedList movies={likedMovies} />}
        {view === 'watched' && <LikedList movies={watchedMovies} title="Просмотрено"/>}
      </main>
    </div>
  );
};

export default App;