import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useFriendProfile } from '../hooks/useFriendProfile';

const FriendProfilePage: React.FC = () => {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, loading, error, unfriend } = useFriendProfile(id);

  if (loading) {
    return <div className="min-h-screen bg-brand-background text-neutral-400 p-4">Загрузка…</div>;
  }
  if (error || !data) {
    return (
      <div className="min-h-screen bg-brand-background text-white p-4">
        Ошибка загрузки.{' '}
        <button onClick={() => navigate('/friends')} className="underline">
          Назад
        </button>
      </div>
    );
  }

  const matched = new Set(data.matchedTmdbIds);
  const sorted = [...data.watchlist].sort(
    (a, b) => Number(matched.has(b.id)) - Number(matched.has(a.id)),
  );
  const friendName = data.friend.firstName ?? data.friend.username ?? 'Друг';

  return (
    <div className="min-h-screen bg-brand-background text-white p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigate('/friends')}
            className="text-neutral-400 hover:text-white"
          >
            ←
          </button>
          <h1 className="text-xl font-semibold">{friendName}</h1>
          <button
            className="text-sm text-red-400 hover:text-red-300"
            onClick={async () => {
              if (confirm('Удалить из друзей? Совпадения тоже исчезнут.')) {
                await unfriend();
                navigate('/friends');
              }
            }}
          >
            Удалить
          </button>
        </div>
        <div className="text-sm text-neutral-400 mb-3">
          {matched.size > 0 ? `🎬 ${matched.size} общих хочу-посмотреть` : 'Пока нет общих'}
        </div>
        {sorted.length === 0 ? (
          <div className="text-neutral-400 text-center py-12">У друга пока пустой watchlist.</div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {sorted.map((m) => (
              <div
                key={`${m.id}-${m.contentType}`}
                className={`relative rounded-md overflow-hidden ${
                  matched.has(m.id) ? 'ring-2 ring-yellow-400' : ''
                }`}
              >
                {m.poster_path && (
                  <img
                    src={`https://image.tmdb.org/t/p/w342${m.poster_path}`}
                    alt={m.title}
                    className="w-full h-auto"
                    loading="lazy"
                  />
                )}
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-1 text-xs truncate">
                  {m.title}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FriendProfilePage;
