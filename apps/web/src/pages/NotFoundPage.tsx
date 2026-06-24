import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import TopNav from '../components/TopNav';

// Hard 404 with explicit messaging. Sets <title> properly so the browser
// tab shows "404 — Flicksee" instead of a stale article title. Static
// hosts (Vercel/Netlify) need a `_redirects` / `vercel.json` rewrite to
// surface this for unknown URLs WITH a 404 status code — otherwise crawlers
// see soft-404s and may de-index real pages by mistake.
const NotFoundPage: React.FC = () => {
  useEffect(() => {
    const orig = document.title;
    document.title = '404 — страница не найдена · Flicksee';
    // Tell crawlers this isn't a real page so they don't index it.
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex';
    document.head.appendChild(meta);
    return () => {
      document.title = orig;
      meta.remove();
    };
  }, []);

  return (
    <div className="min-h-screen text-ink-50" style={{ backgroundColor: '#0a0a0b' }}>
      <TopNav />
      <div className="max-w-md mx-auto p-6 pt-16 text-center">
        <p
          className="text-7xl md:text-8xl font-black tracking-tightest"
          style={{
            background: 'linear-gradient(135deg, #E50914 0%, #ff6b3d 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          404
        </p>
        <h1 className="text-2xl md:text-3xl font-bold mt-4 tracking-tight">
          Эту страницу мы не нашли
        </h1>
        <p className="text-ink-200 mt-3 leading-relaxed">
          Возможно, ссылка устарела или содержит опечатку. А может, фильма, о котором ты
          подумал, ещё нет в списке.
        </p>
        <div className="flex flex-col sm:flex-row gap-2 mt-8 justify-center">
          <Link
            to="/"
            className="px-5 py-3 rounded-full font-bold text-white transition-all hover:scale-[1.03]"
            style={{ backgroundColor: '#E50914', boxShadow: '0 6px 18px rgba(229, 9, 20, 0.4)' }}
          >
            На главную
          </Link>
          <Link
            to="/blog"
            className="px-5 py-3 rounded-full font-semibold text-ink-100 ring-1 ring-white/10 hover:bg-white/5 transition-colors"
          >
            Открыть блог
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
