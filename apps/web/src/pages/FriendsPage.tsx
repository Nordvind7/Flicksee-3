import React from 'react';
import { useFriends } from '../hooks/useFriends';
import FriendCard from '../components/FriendCard';
import { FriendsIcon } from '../components/icons';
import TopNav from '../components/TopNav';
import Footer from '../components/Footer';

const FriendsPage: React.FC = () => {
  const { friends, loading, invite } = useFriends();

  const onInvite = async () => {
    try {
      const { deeplink } = await invite();
      const text = `Свайпни со мной фильмы на Flicksee: ${deeplink}`;
      if (navigator.share) {
        try {
          await navigator.share({ text });
          return;
        } catch {
          /* user cancelled — fall through to clipboard */
        }
      }
      await navigator.clipboard.writeText(text);
      alert('Ссылка скопирована');
    } catch (e) {
      console.error(e);
      alert('Не удалось создать ссылку');
    }
  };

  return (
    <div className="min-h-screen bg-ink-900 text-ink-50" style={{ backgroundColor: '#0a0a0b' }}>
      <TopNav />
      <div className="max-w-2xl mx-auto p-4 md:p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">Друзья</h1>
          <button
            onClick={onInvite}
            className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-full text-sm font-semibold shadow-glow-accent transition-all hover:scale-[1.03] active:scale-95"
            style={{ backgroundColor: '#E50914' }}
          >
            Пригласить
          </button>
        </div>

        {loading ? (
          <div className="text-ink-200 text-center py-16">Загрузка…</div>
        ) : friends.length === 0 ? (
          <div className="flex flex-col items-center text-center py-16 px-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-accent/20 to-ink-700 flex items-center justify-center text-ink-100 mb-5 ring-1 ring-white/10">
              <FriendsIcon />
            </div>
            <h2 className="text-xl font-bold text-ink-50 mb-2">Пока никого</h2>
            <p className="text-ink-200 text-sm max-w-xs mb-6 leading-relaxed">
              Добавь друга через Telegram-ссылку, и вы сразу увидите все ваши общие
              «хочу посмотреть».
            </p>
            <button
              onClick={onInvite}
              className="bg-accent hover:bg-accent-hover text-white px-6 py-3 rounded-full font-semibold shadow-glow-accent transition-all hover:scale-[1.03] active:scale-95"
            >
              Пригласить первого
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {friends.map((f) => (
              <FriendCard key={f.id} friend={f} />
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default FriendsPage;
