import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FriendsIcon } from './icons';
import { useMatchPolling } from '../hooks/useMatchPolling';
import LoginButton from './LoginButton';

// Slim header for sub-pages (/friends, /matches/:id, /blog/...). The main
// app keeps its own absolute-positioned Header so the trailer video can
// still fill the screen — this TopNav lives in flow on pages that need
// document-style layout instead.
const NavLink: React.FC<{
  to: string;
  active: boolean;
  ariaLabel: string;
  badge?: number;
  children: React.ReactNode;
}> = ({ to, active, ariaLabel, badge, children }) => (
  <Link
    to={to}
    aria-label={ariaLabel}
    className={`relative inline-flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl transition-all duration-150 ${
      active
        ? 'bg-accent text-white shadow-glow-accent'
        : 'text-ink-200 hover:text-white hover:bg-white/5'
    }`}
    style={active ? { backgroundColor: '#E50914' } : undefined}
  >
    <span className="block [&_svg]:w-5 [&_svg]:h-5">{children}</span>
    {badge && badge > 0 ? (
      <span
        className="absolute -top-1 -right-1 bg-accent text-white text-[10px] font-semibold leading-none rounded-full px-1.5 py-0.5 min-w-[1.1rem] text-center ring-2"
        style={{ backgroundColor: '#E50914', boxShadow: '0 0 0 2px #0a0a0b' }}
      >
        {badge > 99 ? '99+' : badge}
      </span>
    ) : null}
  </Link>
);

const TopNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { count: unseenMatches } = useMatchPolling();
  const onFriends = location.pathname.startsWith('/friends');

  return (
    <header
      className="sticky top-0 z-30 backdrop-blur-md border-b border-white/5"
      style={{ backgroundColor: 'rgba(10, 10, 11, 0.85)' }}
    >
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          aria-label="Flicksee — на главную"
        >
          <img src="/logo.jpg" alt="" className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg object-cover ring-1 ring-white/10" />
          <span
            className="text-lg sm:text-xl font-black tracking-tightest"
            style={{ color: '#E50914' }}
          >
            Flicksee
          </span>
        </button>
        {/* Sub-страницы: только Друзья + Профиль. «Уже видел» и «Блог»
            переехали в дропдаун ProfileMenu чтобы шапка не была перегружена. */}
        <nav className="flex items-center gap-2">
          <NavLink
            to="/friends"
            active={onFriends}
            ariaLabel="Друзья и матчи"
            badge={unseenMatches}
          >
            <FriendsIcon />
          </NavLink>
          <LoginButton />
        </nav>
      </div>
    </header>
  );
};

export default TopNav;
