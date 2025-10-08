import { useState, useEffect, useCallback } from 'react';
import type { Movie, FilterState } from '../types';
import { fetchDiscoverContent } from '../services/tmdb';

const useMovies = (filters: FilterState) => {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Effect for handling initial load, state restoration, and filter changes.
  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      // 1. Try to restore state from localStorage
      try {
        const savedStateRaw = localStorage.getItem('flicksee_swipe_state');
        if (savedStateRaw) {
          const savedState = JSON.parse(savedStateRaw);
          // Only restore if filters match
          if (JSON.stringify(savedState.filters) === JSON.stringify(filters)) {
            if (isMounted) {
              setMovies(savedState.movies || []);
              setPage(savedState.page || 1);
              setHasMore(true);
              setIsLoading(false);
            }
            return; // Exit if restored
          }
        }
      } catch (e) {
        console.error("Failed to restore swipe state from localStorage", e);
      }

      // 2. If not restored, fetch fresh data
      if (isMounted) {
        localStorage.removeItem('flicksee_swipe_state');
        localStorage.removeItem('flicksee_swipe_currentIndex');
        setMovies([]);
        setPage(1);
        setHasMore(true);
        setIsLoading(true);
        setError(null);
      }
      
      try {
        const initialMovies = await fetchDiscoverContent(1, filters);
        if (isMounted) {
          if (initialMovies.length === 0) {
            setHasMore(false);
          }
          const nextPage = 2;
          setMovies(initialMovies);
          setPage(nextPage);

          // Persist the new initial state
          const stateToSave = { movies: initialMovies, page: nextPage, filters };
          localStorage.setItem('flicksee_swipe_state', JSON.stringify(stateToSave));
        }
      } catch (e) {
        if (isMounted) {
          setError('Не удалось загрузить фильмы.');
          console.error(e);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initialize();

    return () => {
      isMounted = false;
    };
  }, [filters]);

  const loadMoreMovies = useCallback(async () => {
    if (isLoading || !hasMore) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const newMovies = await fetchDiscoverContent(page, filters);
      
      if (newMovies.length === 0) {
        setHasMore(false);
      }

      setMovies(prevMovies => {
        const moviesToSet = [...prevMovies, ...newMovies];
        const uniqueIds = new Set();
        const uniqueMovies = moviesToSet.filter(movie => {
            if (uniqueIds.has(movie.id)) {
                return false;
            }
            uniqueIds.add(movie.id);
            return true;
        });

        const nextPage = page + 1;
        // Persist the new state to localStorage
        try {
            const stateToSave = { movies: uniqueMovies, page: nextPage, filters };
            localStorage.setItem('flicksee_swipe_state', JSON.stringify(stateToSave));
        } catch (e) {
            console.error("Failed to save swipe state to localStorage", e);
        }
        return uniqueMovies;
      });
      setPage(prevPage => prevPage + 1);
    } catch (e) {
      setError('Не удалось загрузить фильмы.');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, hasMore, page, filters]);

  return { movies, isLoading, error, loadMoreMovies, hasMore };
};

export default useMovies;