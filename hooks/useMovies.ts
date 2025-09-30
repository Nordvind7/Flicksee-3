
import { useState, useEffect, useCallback } from 'react';
import type { Movie, FilterState } from '../types';
import { fetchDiscoverContent } from '../services/tmdb';

const useMovies = (filters: FilterState) => {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const loadMovies = useCallback(async (currentPage: number, currentFilters: FilterState, isNewFilter: boolean) => {
    if (isLoading || (!isNewFilter && !hasMore)) return;

    setIsLoading(true);
    setError(null);
    try {
      const newMovies = await fetchDiscoverContent(currentPage, currentFilters);
      
      if (newMovies.length === 0 && !isNewFilter) {
        setHasMore(false);
      }

      setMovies(prevMovies => {
        const moviesToSet = isNewFilter ? newMovies : [...prevMovies, ...newMovies];
        const uniqueIds = new Set();
        // Filter out duplicates that might come from API glitches between pages
        return moviesToSet.filter(movie => {
            if (uniqueIds.has(movie.id)) {
                return false;
            }
            uniqueIds.add(movie.id);
            return true;
        });
      });
      setPage(currentPage + 1);
    } catch (e) {
      setError('Не удалось загрузить фильмы.');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, hasMore]);
  
  // Filter change handler
  useEffect(() => {
    setMovies([]);
    setPage(1);
    setHasMore(true);
    loadMovies(1, filters, true);
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const loadMoreMovies = useCallback(() => {
    if (!isLoading && hasMore) {
        loadMovies(page, filters, false);
    }
  }, [loadMovies, page, filters, isLoading, hasMore]);


  return { movies, isLoading, error, loadMoreMovies, hasMore };
};

export default useMovies;
