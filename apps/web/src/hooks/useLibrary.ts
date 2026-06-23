import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AuthUser, ExcludedIds, LibraryResponse, SwipeActionType } from '@flicksee/shared';
import type { Movie } from '../types';
import { api } from '../lib/api';

const LS = {
  liked: 'flicksee_liked',
  watched: 'flicksee_watched',
  disliked: 'flicksee_disliked',
};

function readLS<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function contentOf(movie: Movie) {
  return {
    title: movie.title,
    overview: movie.overview,
    posterPath: movie.poster_path,
    backdropPath: movie.backdrop_path,
    voteAverage: movie.vote_average,
    releaseDate: movie.release_date,
    genreIds: movie.genre_ids,
  };
}

/**
 * The user's library (liked / watched / disliked). When authenticated it is
 * backed by the API (synced across devices); otherwise it falls back to
 * localStorage so the app still works anonymously. On first login, any local
 * history is migrated to the account.
 */
export function useLibrary(user: AuthUser | null, authLoading: boolean) {
  const [likedMovies, setLikedMovies] = useState<Movie[]>([]);
  const [watchedMovies, setWatchedMovies] = useState<Movie[]>([]);
  const [dislikedIds, setDislikedIds] = useState<Set<number>>(new Set());
  const migratedRef = useRef(false);

  const post = useCallback((movie: Movie, action: SwipeActionType) => {
    void api.post('/swipes', {
      tmdbId: movie.id,
      contentType: movie.contentType,
      action,
      content: contentOf(movie),
    });
  }, []);

  // (Re)load the library whenever auth state settles or changes.
  useEffect(() => {
    if (authLoading) return;
    let active = true;

    if (!user) {
      setLikedMovies(readLS<Movie[]>(LS.liked, []));
      setWatchedMovies(readLS<Movie[]>(LS.watched, []));
      setDislikedIds(new Set(readLS<number[]>(LS.disliked, [])));
      return;
    }

    (async () => {
      // One-time migration of anonymous history into the account.
      if (!migratedRef.current) {
        migratedRef.current = true;
        const localLiked = readLS<Movie[]>(LS.liked, []);
        const localWatched = readLS<Movie[]>(LS.watched, []);
        if (localLiked.length || localWatched.length) {
          try {
            await Promise.all([
              ...localLiked.map((m) => api.post('/swipes', { tmdbId: m.id, contentType: m.contentType, action: 'LIKE', content: contentOf(m) })),
              ...localWatched.map((m) => api.post('/swipes', { tmdbId: m.id, contentType: m.contentType, action: 'SEEN', content: contentOf(m) })),
            ]);
            localStorage.removeItem(LS.liked);
            localStorage.removeItem(LS.watched);
            // LS.disliked is id-only (no contentType to send as a swipe); keep
            // it locally and fold it into the excluded set below instead.
          } catch {
            /* best-effort */
          }
        }
      }

      const [wl, wd, ex] = await Promise.all([
        api.get('/watchlist'),
        api.get('/watched'),
        api.get('/swipes/excluded'),
      ]);
      if (!active) return;
      if (wl.ok) setLikedMovies(((await wl.json()) as LibraryResponse).items as unknown as Movie[]);
      if (wd.ok) setWatchedMovies(((await wd.json()) as LibraryResponse).items as unknown as Movie[]);
      if (ex.ok) {
        const e = (await ex.json()) as ExcludedIds;
        // Union server-side acted ids with any leftover anonymous dislikes so
        // those titles stay out of the deck after login.
        const localDisliked = readLS<number[]>(LS.disliked, []);
        setDislikedIds(new Set<number>([...e.movie, ...e.tv, ...localDisliked]));
      }
    })();

    return () => {
      active = false;
    };
  }, [user, authLoading]);

  const handleLike = useCallback(
    (movie: Movie) => {
      setLikedMovies((prev) => {
        const next = [movie, ...prev.filter((m) => m.id !== movie.id)];
        if (!user) localStorage.setItem(LS.liked, JSON.stringify(next));
        return next;
      });
      // A title carries a single verdict — drop it from "watched" if it was there.
      setWatchedMovies((prev) => {
        if (!prev.some((m) => m.id === movie.id)) return prev;
        const next = prev.filter((m) => m.id !== movie.id);
        if (!user) localStorage.setItem(LS.watched, JSON.stringify(next));
        return next;
      });
      if (user) post(movie, 'LIKE');
    },
    [user, post],
  );

  const handleDislike = useCallback(
    (movie: Movie) => {
      setDislikedIds((prev) => {
        const next = new Set(prev).add(movie.id);
        if (!user) localStorage.setItem(LS.disliked, JSON.stringify([...next]));
        return next;
      });
      if (user) post(movie, 'DISLIKE');
    },
    [user, post],
  );

  const handleWatched = useCallback(
    (movie: Movie) => {
      setWatchedMovies((prev) => {
        const next = [movie, ...prev.filter((m) => m.id !== movie.id)];
        if (!user) localStorage.setItem(LS.watched, JSON.stringify(next));
        return next;
      });
      setLikedMovies((prev) => {
        if (!prev.some((m) => m.id === movie.id)) return prev;
        const next = prev.filter((m) => m.id !== movie.id);
        if (!user) localStorage.setItem(LS.liked, JSON.stringify(next));
        return next;
      });
      if (user) post(movie, 'SEEN');
    },
    [user, post],
  );

  // Undo: drop the verdict server-side AND remove from any local list +
  // excluded set so the title can flow through the deck again.
  const handleUndo = useCallback(
    async (movie: Movie) => {
      setLikedMovies((prev) => {
        if (!prev.some((m) => m.id === movie.id)) return prev;
        const next = prev.filter((m) => m.id !== movie.id);
        if (!user) localStorage.setItem(LS.liked, JSON.stringify(next));
        return next;
      });
      setWatchedMovies((prev) => {
        if (!prev.some((m) => m.id === movie.id)) return prev;
        const next = prev.filter((m) => m.id !== movie.id);
        if (!user) localStorage.setItem(LS.watched, JSON.stringify(next));
        return next;
      });
      setDislikedIds((prev) => {
        if (!prev.has(movie.id)) return prev;
        const next = new Set(prev);
        next.delete(movie.id);
        if (!user) localStorage.setItem(LS.disliked, JSON.stringify([...next]));
        return next;
      });
      if (user) {
        try {
          // api.del doesn't take a body — use the underlying request via
          // a typed fetch wrapper to send the (tmdbId, contentType) payload.
          await fetch('/api/swipes', {
            method: 'DELETE',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tmdbId: movie.id, contentType: movie.contentType }),
          });
        } catch {
          /* best-effort; local state already updated */
        }
      }
    },
    [user],
  );

  // Titles already acted on are kept out of the deck.
  const excludedIds = useMemo(() => {
    const ids = new Set<number>(dislikedIds);
    likedMovies.forEach((m) => ids.add(m.id));
    watchedMovies.forEach((m) => ids.add(m.id));
    return ids;
  }, [dislikedIds, likedMovies, watchedMovies]);

  return {
    likedMovies,
    watchedMovies,
    excludedIds,
    handleLike,
    handleDislike,
    handleWatched,
    handleUndo,
  };
}
