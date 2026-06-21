import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getMatch, markMatchSeen, type MatchDetail } from '../lib/api';

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
    <div className="min-h-screen bg-brand-background text-white p-4">
      <div className="max-w-md mx-auto text-center">
        <h1 className="text-2xl font-bold mb-1">🎬 Матч!</h1>
        <div className="text-neutral-400 mb-4">с {friendName}</div>
        {content?.posterPath && (
          <img
            src={`https://image.tmdb.org/t/p/w500${content.posterPath}`}
            alt={content.title}
            className="rounded-lg mx-auto mb-4 max-h-[60vh]"
          />
        )}
        <div className="text-lg font-medium">{content?.title ?? `tmdb:${match.tmdbId}`}</div>
        {content?.overview && (
          <div className="text-sm text-neutral-400 mt-2 text-left">{content.overview}</div>
        )}
        <div className="mt-6 flex gap-2 justify-center">
          {friend && (
            <button
              onClick={() => nav(`/friends/${friend.id}`)}
              className="bg-neutral-800 hover:bg-neutral-700 px-4 py-2 rounded text-sm"
            >
              Профиль друга
            </button>
          )}
          <button
            onClick={() => nav('/')}
            className="bg-brand-primary hover:bg-red-700 px-4 py-2 rounded text-sm"
          >
            Свайпать дальше
          </button>
        </div>
      </div>
    </div>
  );
};

export default MatchPage;
