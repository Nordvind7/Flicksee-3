
import React, { useState, useEffect } from 'react';
import type { Genre, FilterState } from '../types';
import { ContentType } from '../types';
import { fetchGenres } from '../services/tmdb';
import { XMarkIcon } from './icons';

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentFilters: FilterState;
  onApplyFilters: (filters: FilterState) => void;
}

const FilterModal: React.FC<FilterModalProps> = ({ isOpen, onClose, currentFilters, onApplyFilters }) => {
  const [genres, setGenres] = useState<Genre[]>([]);
  const [selectedContentType, setSelectedContentType] = useState<ContentType>(currentFilters.contentType);
  const [selectedGenres, setSelectedGenres] = useState<number[]>(currentFilters.genres);

  useEffect(() => {
    const loadGenres = async () => {
      const fetchedGenres = await fetchGenres(selectedContentType);
      setGenres(fetchedGenres);
    };
    loadGenres();
  }, [selectedContentType]);
  
  const handleContentTypeChange = (type: ContentType) => {
    setSelectedContentType(type);
    setSelectedGenres([]); // Reset genres when type changes
  };

  const handleGenreToggle = (genreId: number) => {
    setSelectedGenres(prev => 
      prev.includes(genreId) ? prev.filter(id => id !== genreId) : [...prev, genreId]
    );
  };
  
  const handleApply = () => {
    onApplyFilters({
        contentType: selectedContentType,
        genres: selectedGenres,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-brand-surface rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center p-4 border-b border-white/10">
          <h2 className="text-xl font-bold">Фильтры</h2>
          <button onClick={onClose} className="text-brand-muted hover:text-white"><XMarkIcon /></button>
        </div>
        
        <div className="p-6 overflow-y-auto">
          <div className="mb-6">
            <h3 className="font-semibold mb-3">Тип контента</h3>
            <div className="flex space-x-2">
              <button 
                onClick={() => handleContentTypeChange(ContentType.Movie)}
                className={`flex-1 py-2 px-4 rounded-lg text-sm transition-colors ${selectedContentType === ContentType.Movie ? 'bg-brand-primary' : 'bg-white/10'}`}
              >
                Фильмы
              </button>
              <button 
                onClick={() => handleContentTypeChange(ContentType.TV)}
                className={`flex-1 py-2 px-4 rounded-lg text-sm transition-colors ${selectedContentType === ContentType.TV ? 'bg-brand-primary' : 'bg-white/10'}`}
              >
                Сериалы
              </button>
            </div>
          </div>
          
          <div>
            <h3 className="font-semibold mb-3">Жанры</h3>
            <div className="flex flex-wrap gap-2">
                {genres.map(genre => (
                    <button
                        key={genre.id}
                        onClick={() => handleGenreToggle(genre.id)}
                        className={`py-1 px-3 rounded-full text-sm transition-colors ${selectedGenres.includes(genre.id) ? 'bg-brand-primary' : 'bg-white/10'}`}
                    >
                        {genre.name}
                    </button>
                ))}
            </div>
          </div>
        </div>

        <div className="p-4 mt-auto border-t border-white/10">
            <button onClick={handleApply} className="w-full bg-brand-primary text-white font-bold py-3 rounded-lg">
                Применить
            </button>
        </div>
      </div>
    </div>
  );
};

export default FilterModal;
   