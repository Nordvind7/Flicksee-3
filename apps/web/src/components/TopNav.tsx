import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FilmIcon, HeartIcon, EyeIcon, FriendsIcon, BookIcon } from './icons';
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
    className={`relative inline-flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-150 ${
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
  const onBlog = location.pathname.startsWith('/blog');

  return (
    <header
      className="sticky top-0 z-30 backdrop-blur-md border-b border-white/5"
      style={{ backgroundColor: 'rgba(10, 10, 11, 0.85)' }}
    >
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-3 px-4 py-3">
        <button
          onClick={() => navigate('/')}
          className="text-xl font-black text-accent tracking-tightest hover:opacity-80 transition-opacity"
          style={{ color: '#E50914' }}
        >
          Flicksee
        </button>
        <nav className="flex items-center gap-1">
          <NavLink to="/" active={false} ariaLabel="Свайпать трейлеры">
            <FilmIcon />
          </NavLink>
          <NavLink to="/" active={false} ariaLabel="Хочу посмотреть">
            <HeartIcon />
          </NavLink>
          <NavLink to="/" active={false} ariaLabel="Уже видел">
            <EyeIcon />
          </NavLink>
          <div className="w-px h-6 bg-white/10 mx-1" />
          <NavLink
            to="/friends"
            active={onFriends}
            ariaLabel="Друзья и матчи"
            badge={unseenMatches}
          >
            <FriendsIcon />
          </NavLink>
          <NavLink to="/blog" active={onBlog} ariaLabel="Блог">
            <BookIcon />
          </NavLink>
          <div className="ml-2">
            <LoginButton />
          </div>
        </nav>
      </div>
    </header>
  );
};

export default TopNav;
