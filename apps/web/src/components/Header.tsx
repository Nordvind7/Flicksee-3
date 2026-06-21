
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HeartIcon, FilmIcon, EyeIcon, FilterIcon } from './icons';
import FilterModal from './FilterModal';
import LoginButton from './LoginButton';
import { useMatchPolling } from '../hooks/useMatchPolling';
import type { FilterState } from '../types';

interface HeaderProps {
  currentView: 'swipe' | 'liked' | 'watched';
  setView: (view: 'swipe' | 'liked' | 'watched') => void;
  filters: FilterState;
  setFilters: (filters: FilterState) => void;
}

const NavButton: React.FC<{
  isActive: boolean;
  onClick: () => void;
  children: React.ReactNode;
  ariaLabel: string;
}> = ({ isActive, onClick, children, ariaLabel }) => (
  <button
    aria-label={ariaLabel}
    onClick={onClick}
    className={`p-2 rounded-full transition-colors ${
      isActive ? 'bg-brand-primary text-white' : 'text-brand-muted hover:text-white'
    }`}
  >
    {children}
  </button>
);

const Header: React.FC<HeaderProps> = ({ currentView, setView, filters, setFilters }) => {
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const navigate = useNavigate();
  const { count: unseenMatches } = useMatchPolling();

  return (
    <>
      <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 bg-gradient-to-b from-black/70 to-transparent">
        <div className="flex items-center space-x-3">
          <h1 className="text-2xl font-bold text-brand-primary">Flicksee</h1>
          <LoginButton />
        </div>
        <div className="flex items-center space-x-2">
           <NavButton
            isActive={currentView === 'swipe'}
            onClick={() => setView('swipe')}
            ariaLabel="Перейти к свайпу трейлеров"
          >
            <FilmIcon />
          </NavButton>
          <NavButton
            isActive={currentView === 'liked'}
            onClick={() => setView('liked')}
            ariaLabel="Показать понравившиеся"
          >
            <HeartIcon />
          </NavButton>
          <NavButton
            isActive={currentView === 'watched'}
            onClick={() => setView('watched')}
            ariaLabel="Показать просмотренные"
          >
            <EyeIcon />
          </NavButton>
          <button
            onClick={() => navigate('/friends')}
            className="relative p-2 text-brand-muted hover:text-white"
            aria-label="Друзья"
          >
            👥
            {unseenMatches > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] leading-none rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center">
                {unseenMatches}
              </span>
            )}
          </button>
          <button
            onClick={() => setIsFilterModalOpen(true)}
            className="p-2 text-brand-muted hover:text-white"
            aria-label="Открыть фильтры"
          >
            <FilterIcon />
          </button>
        </div>
      </header>
      <FilterModal 
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        currentFilters={filters}
        onApplyFilters={setFilters}
      />
    </>
  );
};

export default Header;
   