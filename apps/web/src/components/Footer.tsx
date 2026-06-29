import React from 'react';
import { Link } from 'react-router-dom';

// Common footer. Shown on every page except the swipe shell (which is
// full-screen video and needs no chrome). Carries the legal links —
// without them 152-ФЗ compliance is incomplete — plus internal nav.
const Footer: React.FC = () => {
  const year = new Date().getFullYear();
  return (
    <footer
      className="mt-16 border-t border-white/5"
      style={{ backgroundColor: '#0a0a0b' }}
    >
      <div className="max-w-5xl mx-auto px-4 py-8 md:py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 text-sm">
          <div>
            <h3 className="text-xs font-semibold text-ink-300 uppercase tracking-wider mb-3">
              Сервис
            </h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-ink-100 hover:text-white transition-colors">
                  Свайпать трейлеры
                </Link>
              </li>
              <li>
                <Link to="/friends" className="text-ink-100 hover:text-white transition-colors">
                  Друзья и матчи
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-ink-300 uppercase tracking-wider mb-3">
              Контент
            </h3>
            <ul className="space-y-2">
              <li>
                <Link to="/blog" className="text-ink-100 hover:text-white transition-colors">
                  Блог
                </Link>
              </li>
              <li>
                <a
                  href="https://t.me/Flicksee_bot"
                  target="_blank"
                  rel="noreferrer"
                  className="text-ink-100 hover:text-white transition-colors"
                >
                  Telegram-бот
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-ink-300 uppercase tracking-wider mb-3">
              Правовая
            </h3>
            <ul className="space-y-2">
              <li>
                <Link to="/privacy" className="text-ink-100 hover:text-white transition-colors">
                  Конфиденциальность
                </Link>
              </li>
              <li>
                <Link to="/privacy#cookies" className="text-ink-100 hover:text-white transition-colors">
                  Cookie-файлы
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-ink-300 uppercase tracking-wider mb-3">
              О проекте
            </h3>
            <p className="text-ink-200 text-xs leading-relaxed">
              Свайпай трейлеры фильмов и сериалов, находи матчи с друзьями через Telegram. Без
              регистрации, бесплатно.
            </p>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-white/5 flex flex-col gap-3 text-xs text-ink-300">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <p>© {year} Flicksee. Все права защищены.</p>
            {/* TMDB attribution — per https://developer.themoviedb.org/docs/faq
                требуется логотип + дисклеймер. Логотип меньше нашего по заметности. */}
            <a
              href="https://www.themoviedb.org"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 hover:opacity-80 transition-opacity"
              aria-label="Powered by The Movie Database"
            >
              <span
                className="inline-flex items-center px-1.5 py-0.5 font-bold rounded text-white text-[10px] tracking-wider"
                style={{ background: 'linear-gradient(90deg, #90CEA1 0%, #01B4E4 100%)' }}
              >
                TMDB
              </span>
              <span>Данные о фильмах</span>
            </a>
          </div>
          <p className="text-[10px] text-ink-400 leading-relaxed max-w-3xl">
            Этот продукт использует API TMDB, но не одобрен и не сертифицирован TMDB.
            Логотипы и изображения принадлежат правообладателям.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
