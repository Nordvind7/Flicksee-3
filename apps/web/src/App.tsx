import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import SwipeContainer from './components/SwipeContainer';
import QuickFilters from './components/QuickFilters';
// MatchOverlay тащит canvas-confetti (~10kb) — нужен только когда случился
// матч (редкое событие). Lazy-load экономит initial bundle.
const MatchOverlay = React.lazy(() => import('./components/MatchOverlay'));
import DebugBar from './components/DebugBar';
import Header from './components/Header';
import LikedList from './components/LikedList';
import type { FilterState, Genre } from './types';
import { ContentType } from './types';
import { fetchGenres } from './services/tmdb';
import { useSound } from './sound/SoundContext';
import { useLibraryContext } from './auth/LibraryContext';
import { useAuth } from './auth/AuthContext';
import FriendsPage from './pages/FriendsPage';
import FriendProfilePage from './pages/FriendProfilePage';
import MatchPage from './pages/MatchPage';
const BlogPage = React.lazy(() => import('./pages/BlogPage'));
const PrivacyPage = React.lazy(() => import('./pages/PrivacyPage'));
const AdminDashboardPage = React.lazy(() => import('./pages/admin/AdminDashboardPage'));
const AdminBroadcastPage = React.lazy(() => import('./pages/admin/AdminBroadcastPage'));
import NotFoundPage from './pages/NotFoundPage';
import SplashScreen from './components/SplashScreen';
const AboutLanding = React.lazy(() => import('./pages/about/AboutLanding'));
// SearchOverlay не нужен пока юзер не нажмёт Cmd+K / иконку поиска.
const SearchOverlay = React.lazy(() => import('./components/SearchOverlay'));
import CookieNotice from './components/CookieNotice';

// Extend the Window interface for TypeScript to recognize the Yandex Metrika function
declare global {
  interface Window {
    ym?: (counterId: string | number, action: string, url: string) => void;
  }
}

const YANDEX_METRIKA_ID = 104544058;

const App: React.FC = () => {
  const { unlock } = useSound();
  const { user, loading: authLoading } = useAuth();
  const {
    likedMovies,
    watchedMovies,
    excludedIds,
    handleLike,
    handleDislike,
    handleWatched,
    handleRecommend,
    handleUndo,
    pendingMatch,
    dismissMatch,
    resetAll,
    resetVersion,
  } = useLibraryContext();
  const location = useLocation();
  const navigate = useNavigate();

  const [view, setView] = useState<'swipe' | 'liked' | 'watched'>('swipe');
  const [searchOpen, setSearchOpen] = useState(false);

  // Sync `?view=watched|liked|swipe` query param into state. Lets the
  // ProfileMenu/links from sub-pages land the user on a specific tab.
  useEffect(() => {
    const q = new URLSearchParams(location.search).get('view');
    if (q === 'watched' || q === 'liked' || q === 'swipe') setView(q);
  }, [location.search]);
  // Cmd/Ctrl+K opens search globally on the home shell.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'k' || e.key === 'K' || e.key === 'л' || e.key === 'Л') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  // Splash gate: only shown when the user lands on the home route. Direct
  // deeplinks (/friends, /matches/:id, /blog/...) skip it so a bot-push
  // notification lands the user where they expected.
  //
  // Smart landing: залогиненный юзер на повторных визитах НЕ должен видеть
  // splash. Auto-skip срабатывает после того как auth resolved и user найден.
  // Холодный трафик с маркетинга идёт на /about — там splash показывается
  // всегда (даже логинутым), для адресов в Директе и шерах.
  const isHomeRoute = location.pathname === '/';
  const isAboutRoute = location.pathname === '/about';
  const [hasInteracted, setHasInteracted] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (user && isHomeRoute && !hasInteracted) {
      setHasInteracted(true);
    }
  }, [user, authLoading, isHomeRoute, hasInteracted]);

  // Когда splash скипнут, нужно как-то получить «user gesture» чтобы
  // разблокировать autoplay-with-sound. Браузер требует interaction.
  // Слушаем первый pointer/touch/key и снимаем listener.
  useEffect(() => {
    if (!hasInteracted) return;
    let done = false;
    const onAny = () => {
      if (done) return;
      done = true;
      unlock();
      cleanup();
    };
    const cleanup = () => {
      window.removeEventListener('pointerdown', onAny);
      window.removeEventListener('touchstart', onAny);
      window.removeEventListener('keydown', onAny);
    };
    window.addEventListener('pointerdown', onAny, { once: true });
    window.addEventListener('touchstart', onAny, { once: true });
    window.addEventListener('keydown', onAny, { once: true });
    return cleanup;
  }, [hasInteracted, unlock]);
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

  // Splash показываем когда:
  //  - юзер на / без auth (cold visit / не залогинен) — нужен onboarding,
  //  - юзер явно зашёл на /about (маркетинг / share / Директ).
  // Залогиненный на / увидит splash только если auto-skip useEffect ещё не
  // отработал (1 кадр) — здесь нужна вторая проверка чтобы не моргнуло.
  if (isAboutRoute) {
    // Cold-traffic landing. Splash still shows on '/' for unauth visitors who
    // arrived via a friend's deep-link — see comment above.
    return (
      <React.Suspense fallback={<div className="min-h-screen bg-brand-background" />}>
        <AboutLanding />
      </React.Suspense>
    );
  }
  if (!hasInteracted && isHomeRoute && !authLoading && !user) {
    return (
      <SplashScreen
        onStart={() => {
          unlock();
          setHasInteracted(true);
        }}
      />
    );
  }

  const mainShell = (
    // h-[100dvh] (dynamic viewport) учитывает нижнюю панель мобильных
    // браузеров (Safari/Yandex), иначе action-кнопки уходят под chrome.
    <div className="h-[100dvh] w-screen overflow-hidden flex flex-col bg-brand-background">
      {/* SEO: невидимый H1 + ссылки для краулеров. UI они не трогают (sr-only
          скрывает визуально), но Яндекс/Google их видят и индексируют. На
          swipe-deck иначе нет H1, аудит ругается. */}
      <h1 className="sr-only">
        Flicksee — свайпай трейлеры фильмов и сериалов, находи кино с друзьями
      </h1>
      <nav className="sr-only" aria-label="Разделы Flicksee">
        <a href="/blog">Блог про кино</a>
        <a href="/friends">Друзья и матчи</a>
        <a href="/about">О сервисе</a>
        <a href="/privacy">Конфиденциальность</a>
        <a href="/blog/top-filmov-2024">Топ фильмов 2024</a>
        <a href="/blog/top-filmov-2023">Топ фильмов 2023</a>
        <a href="/blog/top-filmov-2022">Топ фильмов 2022</a>
      </nav>
      <Header
        currentView={view}
        setView={setView}
        filters={filters}
        setFilters={setFilters}
        onOpenSearch={() => setSearchOpen(true)}
      />
      <main className="flex-grow relative pt-14 sm:pt-20 overflow-y-auto">
        {view === 'swipe' && (
          <div className="h-full flex flex-col">
            <QuickFilters filters={filters} setFilters={setFilters} />
            <div className="flex-1 min-h-0 relative">
              <SwipeContainer
                key={resetVersion}
                onLike={handleLike}
                onDislike={handleDislike}
                onWatched={handleWatched}
                onRecommend={handleRecommend}
                onUndo={handleUndo}
                onResetHistory={resetAll}
                onOpenFilters={() => {
                  // Скроллим main к самому верху чтобы QuickFilters попали
                  // в зону внимания. Это «open filters» MVP — без отдельной
                  // модалки. Если юзеру нужно больше — у него есть FilterIcon
                  // в Header (открывает full FilterModal).
                  const main = document.querySelector('main');
                  if (main) main.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                filters={filters}
                genreMap={genreMap[filters.contentType]}
                excludedIds={excludedIds}
              />
            </div>
          </div>
        )}
        {view === 'liked' && (
          <LikedList
            movies={likedMovies}
            genreMap={genreMap}
            onLikeRecommendation={handleLike}
            excludedIds={excludedIds}
          />
        )}
        {view === 'watched' && (
          <LikedList
            movies={watchedMovies}
            title="Просмотрено"
            genreMap={genreMap}
            onLikeRecommendation={handleLike}
            excludedIds={excludedIds}
          />
        )}
      </main>
      {/* Lazy: chunk грузится при первом searchOpen=true. fallback=null
          потому что overlay появляется поверх — пустота на 100мс OK. */}
      {searchOpen && (
        <React.Suspense fallback={null}>
          <SearchOverlay
            open={searchOpen}
            onClose={() => setSearchOpen(false)}
            onLike={handleLike}
            excludedIds={excludedIds}
          />
        </React.Suspense>
      )}
      <CookieNotice />
    </div>
  );

  return (
    <>
      <DebugBar />
      {pendingMatch && (
        <React.Suspense fallback={null}>
          <MatchOverlay match={pendingMatch} onClose={dismissMatch} />
        </React.Suspense>
      )}
    <Routes>
      <Route path="/" element={mainShell} />
      <Route path="/liked" element={mainShell} />
      <Route path="/watched" element={mainShell} />
      <Route path="/friends" element={<FriendsPage />} />
      <Route path="/friends/:id" element={<FriendProfilePage />} />
      <Route path="/matches/:id" element={<MatchPage />} />
      <Route
        path="/blog"
        element={
          <React.Suspense fallback={<div className="min-h-screen" style={{ backgroundColor: '#0a0a0b' }} />}>
            <BlogPage />
          </React.Suspense>
        }
      />
      <Route
        path="/blog/:slug"
        element={
          <React.Suspense fallback={<div className="min-h-screen" style={{ backgroundColor: '#0a0a0b' }} />}>
            <BlogPage />
          </React.Suspense>
        }
      />
      <Route
        path="/privacy"
        element={
          <React.Suspense fallback={<div className="min-h-screen" style={{ backgroundColor: '#0a0a0b' }} />}>
            <PrivacyPage />
          </React.Suspense>
        }
      />
      <Route
        path="/admin"
        element={
          <React.Suspense fallback={<div className="min-h-screen" style={{ backgroundColor: '#0a0a0b' }} />}>
            <AdminDashboardPage />
          </React.Suspense>
        }
      />
      <Route
        path="/admin/broadcast"
        element={
          <React.Suspense fallback={<div className="min-h-screen" style={{ backgroundColor: '#0a0a0b' }} />}>
            <AdminBroadcastPage />
          </React.Suspense>
        }
      />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
    </>
  );
};

export default App;
