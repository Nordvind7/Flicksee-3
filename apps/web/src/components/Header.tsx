
import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { HeartIcon, FilmIcon, FilterIcon, FriendsIcon } from './icons';
// FilterModal грузится только при клике на FilterIcon — экономит initial JS.
const FilterModal = React.lazy(() => import('./FilterModal'));
import LoginButton from './LoginButton';
import { useMatchPolling } from '../hooks/useMatchPolling';
import type { FilterState } from '../types';

interface HeaderProps {
  currentView: 'swipe' | 'liked' | 'watched';
  setView: (view: 'swipe' | 'liked' | 'watched') => void;
  filters: FilterState;
  setFilters: (filters: FilterState) => void;
  onOpenSearch?: () => void;
}

const NavButton: React.FC<{
  isActive: boolean;
  onClick: () => void;
  children: React.ReactNode;
  ariaLabel: string;
  badge?: number;
}> = ({ isActive, onClick, children, ariaLabel, badge }) => (
  <button
    aria-label={ariaLabel}
    onClick={onClick}
    className={`relative p-2 rounded-xl transition-all duration-150 ${
      isActive
        ? 'bg-accent text-white shadow-glow-accent'
        : 'text-ink-200 hover:text-white hover:bg-white/5'
    }`}
  >
    <span className="block w-6 h-6 [&_svg]:w-6 [&_svg]:h-6">{children}</span>
    {badge && badge > 0 ? (
      <span className="absolute -top-1 -right-1 bg-accent text-white text-[10px] font-semibold leading-none rounded-full px-1.5 py-0.5 min-w-[1.1rem] text-center ring-2 ring-ink-900">
        {badge > 99 ? '99+' : badge}
      </span>
    ) : null}
  </button>
);

const Header: React.FC<HeaderProps> = ({ currentView, setView, filters, setFilters, onOpenSearch }) => {
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const onHome = location.pathname === '/' || location.pathname.startsWith('/liked') || location.pathname.startsWith('/watched');
  const onFriends = location.pathname.startsWith('/friends');
  const { count: unseenMatches } = useMatchPolling();

  return (
    <>
      <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between gap-2 px-3 sm:px-4 py-2.5 sm:py-3 bg-gradient-to-b from-ink-900/85 via-ink-900/50 to-transparent backdrop-blur-sm">
        {/* Лого слева */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity shrink-0"
          aria-label="Flicksee — на главную"
        >
          <img src="/logo.jpg" alt="" className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg object-cover ring-1 ring-white/10" />
          <span className="text-lg sm:text-xl font-black text-accent tracking-tightest hidden xs:inline">
            Flicksee
          </span>
        </button>

        {/* Всё остальное — справа единым блоком */}
        <nav className="flex items-center gap-0.5 sm:gap-1">
          <NavButton
            isActive={onHome && currentView === 'swipe'}
            onClick={() => { navigate('/'); setView('swipe'); }}
            ariaLabel="Свайпать трейлеры"
          >
            <FilmIcon />
          </NavButton>
          <NavButton
            isActive={onHome && currentView === 'liked'}
            onClick={() => { navigate('/'); setView('liked'); }}
            ariaLabel="Хочу посмотреть"
          >
            <HeartIcon />
          </NavButton>
          <div className="w-px h-5 bg-white/10 mx-0.5 sm:mx-1" />
          <NavButton
            isActive={onFriends}
            onClick={() => navigate('/friends')}
            ariaLabel="Друзья и матчи"
            badge={unseenMatches}
          >
            <FriendsIcon />
          </NavButton>
          {onHome && onOpenSearch && (
            <button
              onClick={onOpenSearch}
              className="p-2 rounded-xl text-ink-200 hover:text-white hover:bg-white/5 transition-all hidden sm:inline-flex"
              aria-label="Поиск"
              title="⌘K"
            >
              <span className="text-lg">🔍</span>
            </button>
          )}
          {onHome && (
            <NavButton
              isActive={false}
              onClick={() => setIsFilterModalOpen(true)}
              ariaLabel="Фильтры"
            >
              <FilterIcon />
            </NavButton>
          )}
          <div className="w-px h-6 bg-white/10 mx-1 sm:mx-1.5" />
          <LoginButton />
        </nav>
      </header>
      {isFilterModalOpen && (
        <React.Suspense fallback={null}>
          <FilterModal
            isOpen={isFilterModalOpen}
            onClose={() => setIsFilterModalOpen(false)}
            currentFilters={filters}
            onApplyFilters={setFilters}
          />
        </React.Suspense>
      )}
    </>
  );
};

export default Header;
   