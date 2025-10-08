import React from 'react';
import type { Movie } from '../types';
import { TMDB_IMAGE_BASE_URL } from '../constants';
import { ShareIcon } from './icons';

interface LikedListProps {
  movies: Movie[];
  title?: string;
}

const LikedList: React.FC<LikedListProps> = ({ movies, title = "Хочу посмотреть" }) => {
  const canShare = !!navigator.share;

  const handleShare = async (movie: Movie) => {
    // Fallback for items liked before contentType was stored
    const contentType = movie.contentType || 'movie'; 
    const url = `https://www.themoviedb.org/${contentType}/${movie.id}`;
    const shareData = {
      title: movie.title,
      text: `Посмотри трейлер к "${movie.title}"!`,
      url: url,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      }
    } catch (err: any) {
      // The user canceling the share dialog is not a bug.
      // The promise rejects with an "AbortError" in this case, which we can safely ignore.
      if (err.name !== 'AbortError') {
        console.error("Share failed:", err);
      }
    }
  };

  if (movies.length === 0) {
    return <div className="flex items-center justify-center h-full text-brand-muted text-center p-4">{`Список "${title}" пока пуст.`}</div>;
  }

  return (
    <div className="p-4">
        <h2 className="text-3xl font-bold mb-6 text-white">{title}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {movies.map((movie, index) => (
            <div 
                key={movie.id} 
                className="group relative rounded-lg overflow-hidden shadow-lg animate-fade-in-up"
                style={{ animationDelay: `${Math.min(index * 50, 500)}ms`, animationFillMode: 'both' }}
            >
                <img
                    src={`${TMDB_IMAGE_BASE_URL}${movie.poster_path}`}
                    alt={movie.title}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                <div className="absolute bottom-0 left-0 p-2">
                  <h3 className="text-white font-semibold text-sm">{movie.title}</h3>
                </div>
                {canShare && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      handleShare(movie);
                    }}
                    className="absolute top-2 right-2 bg-black/50 p-2 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Поделиться"
                  >
                    <ShareIcon />
                  </button>
                )}
            </div>
            ))}
        </div>
    </div>
  );
};

export default LikedList;