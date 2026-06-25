import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useFriendProfile } from '../hooks/useFriendProfile';
import TopNav from '../components/TopNav';
import Footer from '../components/Footer';

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
    <div className="min-h-screen bg-ink-900 text-ink-50" style={{ backgroundColor: '#0a0a0b' }}>
      <TopNav />
      <div className="max-w-3xl mx-auto p-4 md:p-6">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-2xl md:text-3xl font-black tracking-tight truncate flex-1 mr-3">{friendName}</h1>
          <button
            className="text-sm text-ink-200 hover:text-accent transition-colors whitespace-nowrap"
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
        <div className="bg-ink-700/60 ring-1 ring-white/5 rounded-2xl px-5 py-4 mb-5 flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold text-ink-50">{matched.size}</div>
            <div className="text-xs text-ink-200 uppercase tracking-wider">Общих хочу-посмотреть</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-ink-50">{data.watchlist.length}</div>
            <div className="text-xs text-ink-200 uppercase tracking-wider">У друга в watchlist</div>
          </div>
        </div>
        {sorted.length === 0 ? (
          <div className="text-ink-200 text-center py-12">У друга пока пустой watchlist.</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {sorted.map((m) => (
              <div
                key={`${m.id}-${m.contentType}`}
                className={`group relative rounded-xl overflow-hidden transition-transform hover:scale-[1.03] ${
                  matched.has(m.id)
                    ? 'ring-2 ring-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.25)]'
                    : 'ring-1 ring-white/5'
                }`}
              >
                {m.poster_path ? (
                  <img
                    src={`https://image.tmdb.org/t/p/w342${m.poster_path}`}
                    alt={m.title}
                    className="w-full aspect-[2/3] object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full aspect-[2/3] bg-ink-600" />
                )}
                {matched.has(m.id) && (
                  <span className="absolute top-2 left-2 bg-yellow-400 text-ink-900 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                    Матч
                  </span>
                )}
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-2 pt-6 text-xs font-medium truncate">
                  {m.title}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default FriendProfilePage;
