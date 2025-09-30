
import { useState, useEffect, useCallback } from 'react';
import type { Movie, FilterState } from '../types';
import { fetchDiscoverContent } from '../services/tmdb';

const useMovies = (filters: FilterState) => {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const loadMovies = useCallback(async (currentPage: number, currentFilters: FilterState) => {
    setIsLoading(true);
    setError(null);
    try {
      const newMovies = await fetchDiscoverContent(currentPage, currentFilters);
      setMovies(prevMovies => {
        // Filter out duplicates
        const existingIds = new Set(prevMovies.map(m => m.id));
        const uniqueNewMovies = newMovies.filter(m => !existingIds.has(m.id));
        return [...prevMovies, ...uniqueNewMovies];
      });
      setPage(currentPage + 1);
    } catch (e) {
      setError('Не удалось загрузить фильмы.');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // Initial load and filter change handler
  useEffect(() => {
    setMovies([]);
    setPage(1);
    loadMovies(1, filters);
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);


  const removeMovie = (id: number) => {
    setMovies(prev => prev.filter(movie => movie.id !== id));
  };
  
  useEffect(() => {
    if (movies.length < 5 && !isLoading) {
      loadMovies(page, filters);
    }
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movies.length, isLoading, page, filters]);


  return { movies, isLoading, error, removeMovie };
};

export default useMovies;
   