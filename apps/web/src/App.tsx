import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import SwipeContainer from './components/SwipeContainer';
import Header from './components/Header';
import LikedList from './components/LikedList';
import type { FilterState, Genre } from './types';
import { ContentType } from './types';
import { fetchGenres } from './services/tmdb';
import { useAuth } from './auth/AuthContext';
import { useSound } from './sound/SoundContext';
import { useLibrary } from './hooks/useLibrary';
import FriendsPage from './pages/FriendsPage';
import FriendProfilePage from './pages/FriendProfilePage';
import MatchPage from './pages/MatchPage';
import BlogPage from './pages/BlogPage';
import SplashScreen from './components/SplashScreen';

// Extend the Window interface for TypeScript to recognize the Yandex Metrika function
declare global {
  interface Window {
    ym?: (counterId: string | number, action: string, url: string) => void;
  }
}

const YANDEX_METRIKA_ID = 104544058;

const App: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { unlock } = useSound();
  const { likedMovies, watchedMovies, excludedIds, handleLike, handleDislike, handleWatched, handleUndo } =
    useLibrary(user, authLoading);
  const location = useLocation();

  const [view, setView] = useState<'swipe' | 'liked' | 'watched'>('swipe');
  // Splash gate: only shown when the user lands on the home route. Direct
  // deeplinks (/friends, /matches/:id, /blog/...) skip it so a bot-push
  // notification lands the user where they expected.
  const isHomeRoute = location.pathname === '/';
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

  if (!hasInteracted && isHomeRoute) {
    return (
      <SplashScreen
        onStart={() => {
          // This tap is the user gesture that unlocks autoplay-with-sound.
          unlock();
          setHasInteracted(true);
        }}
      />
    );
  }

  const mainShell = (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-brand-background">
      <Header currentView={view} setView={setView} filters={filters} setFilters={setFilters} />
      <main className="flex-grow relative pt-20 overflow-y-auto">
        {view === 'swipe' && (
          <div className="h-full">
            <SwipeContainer
              onLike={handleLike}
              onDislike={handleDislike}
              onWatched={handleWatched}
              onUndo={handleUndo}
              filters={filters}
              genreMap={genreMap[filters.contentType]}
              excludedIds={excludedIds}
            />
          </div>
        )}
        {view === 'liked' && <LikedList movies={likedMovies} genreMap={genreMap} />}
        {view === 'watched' && (
          <LikedList movies={watchedMovies} title="Просмотрено" genreMap={genreMap} />
        )}
      </main>
    </div>
  );

  return (
    <Routes>
      <Route path="/friends" element={<FriendsPage />} />
      <Route path="/friends/:id" element={<FriendProfilePage />} />
      <Route path="/matches/:id" element={<MatchPage />} />
      <Route path="/blog" element={<BlogPage />} />
      <Route path="/blog/:slug" element={<BlogPage />} />
      <Route path="*" element={mainShell} />
    </Routes>
  );
};

export default App;
