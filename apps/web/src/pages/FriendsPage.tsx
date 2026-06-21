import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useFriends } from '../hooks/useFriends';
import FriendCard from '../components/FriendCard';

const FriendsPage: React.FC = () => {
  const { friends, loading, invite } = useFriends();
  const navigate = useNavigate();

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
    <div className="min-h-screen bg-brand-background text-white p-4">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigate('/')}
            className="text-neutral-400 hover:text-white"
            aria-label="Назад"
          >
            ←
          </button>
          <h1 className="text-xl font-semibold">Друзья</h1>
          <button
            onClick={onInvite}
            className="bg-brand-primary hover:bg-red-700 px-4 py-2 rounded-md text-sm font-medium"
          >
            Пригласить
          </button>
        </div>
        {loading ? (
          <div className="text-neutral-400 text-center py-8">Загрузка…</div>
        ) : friends.length === 0 ? (
          <div className="text-neutral-400 text-center py-12">
            Друзей пока нет. Тапни «Пригласить», чтобы добавить первого.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {friends.map((f) => (
              <FriendCard key={f.id} friend={f} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FriendsPage;
