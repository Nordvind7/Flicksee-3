import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getMatch, markMatchSeen, type MatchDetail } from '../lib/api';
import TopNav from '../components/TopNav';
import Footer from '../components/Footer';

const MatchPage: React.FC = () => {
  const { id = '' } = useParams<{ id: string }>();
  const nav = useNavigate();
  const [data, setData] = useState<MatchDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMatch(id)
      .then(async (d) => {
        if (cancelled) return;
        setData(d);
        await markMatchSeen(id).catch(() => {});
      })
      .catch((e) => !cancelled && setError(String(e)));
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (error) {
    return (
      <div className="min-h-screen bg-brand-background text-white p-4">
        Не нашёл матч.{' '}
        <button onClick={() => nav('/')} className="underline">
          На главную
        </button>
      </div>
    );
  }
  if (!data) {
    return <div className="min-h-screen bg-brand-background text-neutral-400 p-4">Загрузка…</div>;
  }

  const { match, content, friend } = data;
  const friendName = friend?.firstName ?? friend?.username ?? 'другом';
  return (
    <div className="min-h-screen bg-ink-900 text-ink-50" style={{ backgroundColor: '#0a0a0b' }}>
      <TopNav />
      <div className="max-w-md mx-auto p-4 md:p-6">
        {/* Hero match callout */}
        <div className="text-center mb-6 mt-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-400/15 text-yellow-300 text-xs font-bold uppercase tracking-wider mb-3">
            <span>🎬</span>
            Матч
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight">
            {content?.title ?? `Фильм #${match.tmdbId}`}
          </h1>
          <p className="text-ink-200 mt-1">Тебе и {friendName} понравилось одно и то же</p>
        </div>
        {content?.posterPath && (
          <div className="relative rounded-3xl overflow-hidden shadow-card-lg ring-1 ring-white/10 mb-5">
            <img
              src={`https://image.tmdb.org/t/p/w500${content.posterPath}`}
              alt={content.title}
              className="w-full h-auto max-h-[55vh] object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/70 to-transparent" />
          </div>
        )}
        {content?.overview && (
          <div className="bg-ink-700/60 ring-1 ring-white/5 rounded-2xl p-4 mb-5">
            <p className="text-sm text-ink-100 leading-relaxed">{content.overview}</p>
          </div>
        )}
        <div className="flex flex-col gap-2">
          <button
            onClick={() => nav('/')}
            className="bg-accent hover:bg-accent-hover text-white font-semibold py-3 rounded-full shadow-glow-accent transition-all hover:scale-[1.02] active:scale-95"
          >
            Свайпать дальше
          </button>
          {friend && (
            <button
              onClick={() => nav(`/friends/${friend.id}`)}
              className="bg-ink-700 hover:bg-ink-600 text-ink-100 font-medium py-3 rounded-full ring-1 ring-white/5 transition-colors"
            >
              Все матчи с {friendName}
            </button>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default MatchPage;
