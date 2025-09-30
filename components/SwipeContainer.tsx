
import React from 'react';
import useMovies from '../hooks/useMovies';
import TrailerCard from './TrailerCard';
import type { Movie, FilterState } from '../types';
import { LoadingIcon } from './icons';

interface SwipeContainerProps {
  onLike: (movie: Movie) => void;
  onDislike: (movie: Movie) => void;
  onWatched: (movie: Movie) => void;
  filters: FilterState;
}

const SwipeContainer: React.FC<SwipeContainerProps> = ({ onLike, onDislike, onWatched, filters }) => {
  const { movies, isLoading, error, removeMovie } = useMovies(filters);

  const handleSwipe = (direction: 'left' | 'right' | 'up', movie: Movie) => {
    removeMovie(movie.id);
    if (direction === 'right') {
      onLike(movie);
    } else if (direction === 'left') {
      onDislike(movie);
    } else if (direction === 'up') {
        onWatched(movie);
    }
  };

  const renderContent = () => {
    if (isLoading && movies.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-brand-muted">
          <LoadingIcon />
          <p className="mt-2">Загружаем трейлеры...</p>
        </div>
      );
    }

    if (error) {
      return <div className="flex items-center justify-center h-full text-red-500">{error}</div>;
    }
    
    if (movies.length === 0 && !isLoading) {
      return <div className="flex items-center justify-center h-full text-brand-muted">По вашему запросу ничего не найдено. Попробуйте изменить фильтры.</div>;
    }

    return (
      <div className="relative w-full h-full flex items-center justify-center">
        {movies.map((movie, index) => (
          <TrailerCard
            key={movie.id}
            movie={movie}
            onSwipe={(dir) => handleSwipe(dir, movie)}
            isActive={index === movies.length - 1}
            contentType={filters.contentType}
          />
        )).reverse()}
      </div>
    );
  };

  return <div className="w-full h-full">{renderContent()}</div>;
};

export default SwipeContainer;
   