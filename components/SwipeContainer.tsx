
import React, { useState, useEffect, useCallback, useRef } from 'react';
import useMovies from '../hooks/useMovies';
import TrailerCard from './TrailerCard';
import type { Movie, FilterState, Recommendation } from '../types';
import { fetchTrailerKey } from '../services/tmdb';
import { LoadingIcon } from './icons';

interface SwipeContainerProps {
  onLike: (movie: Movie) => void;
  onDislike: (movie: Movie) => void;
  onWatched: (movie: Movie) => void;
  filters: FilterState;
}

const PRELOAD_COUNT = 4;
const LOAD_MORE_THRESHOLD = 5;

const recommendations: Recommendation[] = [
    { name: 'Максим Пронин', avatarUrl: 'https://i.postimg.cc/L54sGsJF/2025-08-06-21-59-19.jpg', text: 'прикольный фильм, советую.' },
    { name: 'Артем Шарипов', avatarUrl: 'https://i.postimg.cc/4y43j3YJ/2025-08-20-02-37-14.jpg', text: 'топ, надо глянуть!' },
    { name: 'Егор Галий', avatarUrl: 'https://i.postimg.cc/8ckCxC7p/2025-09-30-22-21-54.jpg', text: 'выглядит интересно.' },
    { name: 'Егор Соколов', avatarUrl: 'https://i.postimg.cc/j2qjBjDt/2025-09-30-22-23-28.jpg', text: 'это мы смотрим.' },
];

const SwipeContainer: React.FC<SwipeContainerProps> = ({ onLike, onDislike, onWatched, filters }) => {
  const { movies, isLoading, error, loadMoreMovies, hasMore } = useMovies(filters);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [trailerKeys, setTrailerKeys] = useState<Map<number, string | null>>(new Map());
  const fetchingRef = useRef(new Set<number>());

  // Reset index when filters change
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
    setCurrentIndex(prev => prev + 1);
    
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
          const absoluteIndex = currentIndex + index;
          let recommendation: Recommendation | undefined = undefined;
          // Apply to every second card (1, 3, 5...)
          if (absoluteIndex > 0 && absoluteIndex % 2 === 1) { 
            const recIndex = Math.floor((absoluteIndex - 1) / 2) % recommendations.length;
            recommendation = recommendations[recIndex];
          }

          return (
            <TrailerCard
              key={movie.id}
              movie={movie}
              onSwipe={(dir) => handleSwipe(dir, movie)}
              // The top card is the one at index 0 of the visibleMovies array
              isActive={index === 0}
              contentType={filters.contentType}
              trailerKey={trailerKeys.get(movie.id)}
              recommendation={recommendation}
            />
          );
        }).reverse()} {/* Reverse to stack them correctly, with the first card (index 0) on top */}
      </div>
    );
  };

  return <div className="w-full h-full">{renderContent()}</div>;
};

export default SwipeContainer;
