import React, { useState, useEffect, useCallback, useRef } from 'react';
import useMovies from '../hooks/useMovies';
import TrailerCard from './TrailerCard';
import type { Movie, FilterState } from '../types';
import { fetchTrailerKey } from '../services/tmdb';
import { LoadingIcon } from './icons';

interface SwipeContainerProps {
  onLike: (movie: Movie) => void;
  onDislike: (movie: Movie) => void;
  onWatched: (movie: Movie) => void;
  filters: FilterState;
  genreMap: Map<number, string>;
  excludedIds: Set<number>;
}

const PRELOAD_COUNT = 4;
const LOAD_MORE_THRESHOLD = 5;

const SwipeContainer: React.FC<SwipeContainerProps> = ({ onLike, onDislike, onWatched, filters, genreMap, excludedIds }) => {
  const { movies, isLoading, error, loadMoreMovies, hasMore } = useMovies(filters, excludedIds);
  
  const [currentIndex, setCurrentIndex] = useState(() => {
    try {
      const savedIndexRaw = localStorage.getItem('flicksee_swipe_currentIndex');
      if (savedIndexRaw) {
        return parseInt(savedIndexRaw, 10);
      }
    } catch (e) {
      console.error("Failed to read saved index from localStorage", e);
    }
    return 0;
  });

  const [trailerKeys, setTrailerKeys] = useState<Map<number, string | null>>(new Map());
  const fetchingRef = useRef(new Set<number>());

  // Reset index when filters change (localStorage is cleared in useMovies)
  useEffect(() => {
    setCurrentIndex(0);
  }, [filters]);

  // Load more movies when running low
  useEffect(() => {
    const remaining = movies.length - currentIndex;
    if (!isLoading && hasMore && remaining < LOAD_MORE_THRESHOLD) {
      loadMoreMovies();
    }
  }, [movies.length, currentIndex, isLoading, hasMore, loadMoreMovies]);

  // Preload trailers for upcoming cards
  useEffect(() => {
    if (movies.length > 0) {
      const moviesToPreload = movies.slice(currentIndex, currentIndex + PRELOAD_COUNT);

      moviesToPreload.forEach(movie => {
        if (movie && !trailerKeys.has(movie.id) && !fetchingRef.current.has(movie.id)) {
          fetchingRef.current.add(movie.id);

          fetchTrailerKey(movie.id, filters.contentType).then(key => {
            setTrailerKeys(prevKeys => new Map(prevKeys).set(movie.id, key));
            fetchingRef.current.delete(movie.id);
          }).catch(() => {
            fetchingRef.current.delete(movie.id);
          });
        }
      });
    }
  }, [movies, currentIndex, filters.contentType]);

  const handleSwipe = (direction: 'left' | 'right' | 'up', movie: Movie) => {
    const newIndex = currentIndex + 1;
    setCurrentIndex(newIndex);
    
    try {
      localStorage.setItem('flicksee_swipe_currentIndex', String(newIndex));
    } catch (e) {
      console.error("Failed to save swipe index to localStorage", e);
    }

    if (direction === 'right') {
      onLike(movie);
    } else if (direction === 'left') {
      onDislike(movie);
    } else if (direction === 'up') {
      onWatched(movie);
    }
  };

  const renderContent = () => {
    const hasMoviesToShow = movies.length > currentIndex;

    if (isLoading && !hasMoviesToShow) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-brand-muted">
          <LoadingIcon />
          <p className="mt-2">Загружаем...</p>
        </div>
      );
    }

    if (error) {
      return <div className="flex items-center justify-center h-full text-red-500">{error}</div>;
    }
    
    if (!hasMoviesToShow && !isLoading) {
       return <div className="flex items-center justify-center h-full text-brand-muted text-center p-4">
        {hasMore ? 'Подгружаем еще фильмы...' : 'Вы посмотрели всё! Попробуйте изменить фильтры.'}
      </div>;
    }

    // Only render the top few cards for performance
    const visibleMovies = movies.slice(currentIndex, currentIndex + PRELOAD_COUNT);

    return (
      <div className="relative w-full h-full flex items-center justify-center">
        {visibleMovies.map((movie, index) => {
          return (
            <TrailerCard
              key={movie.id}
              movie={movie}
              onSwipe={(dir) => handleSwipe(dir, movie)}
              // The top card is the one at index 0 of the visibleMovies array
              isActive={index === 0}
              contentType={filters.contentType}
              trailerKey={trailerKeys.get(movie.id)}
              genreMap={genreMap}
            />
          );
        }).reverse()} {/* Reverse to stack them correctly, with the first card (index 0) on top */}
      </div>
    );
  };

  return <div className="w-full h-full">{renderContent()}</div>;
};

export default SwipeContainer;