import React, { useState } from 'react';
import { useFriends } from '../hooks/useFriends';
import { useAuth } from '../auth/AuthContext';
import FriendCard from '../components/FriendCard';
// InviteModal тащит react-qr-code (~5KB) — нужен только при тапе «Пригласить».
const InviteModal = React.lazy(() => import('../components/InviteModal'));
import { FriendsIcon, TelegramIcon } from '../components/icons';
import TopNav from '../components/TopNav';
import Footer from '../components/Footer';
import { api } from '../lib/api';

const FriendsPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { friends, loading, invite } = useFriends();
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [testPushState, setTestPushState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const onInvite = async () => {
    if (!user) {
      alert('Сначала войди через Telegram (кнопка в правом верхнем углу).');
      return;
    }
    try {
      const { deeplink } = await invite();
      setInviteLink(deeplink);
    } catch (e) {
      console.error(e);
      alert('Не удалось создать ссылку');
    }
  };

  const onTestPush = async () => {
    setTestPushState('sending');
    try {
      const res = await api.post('/auth/test-push');
      setTestPushState(res.ok ? 'sent' : 'error');
    } catch {
      setTestPushState('error');
    }
    setTimeout(() => setTestPushState('idle'), 3500);
  };

  return (
    <div className="min-h-screen bg-ink-900 text-ink-50" style={{ backgroundColor: '#0a0a0b' }}>
      <TopNav />
      <div className="max-w-2xl mx-auto p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">Друзья</h1>
          <button
            onClick={onInvite}
            className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-full text-sm font-semibold shadow-glow-accent transition-all hover:scale-[1.03] active:scale-95"
            style={{ backgroundColor: '#E50914' }}
          >
            Пригласить
          </button>
        </div>

        {/* Подсказка где смотреть уведомления */}
        <a
          href="https://t.me/Flicksee_bot"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 bg-[#229ED9]/10 hover:bg-[#229ED9]/15 ring-1 ring-[#229ED9]/30 rounded-2xl px-4 py-3 mb-5 transition-colors"
        >
          <span className="w-9 h-9 rounded-full bg-[#229ED9] flex items-center justify-center text-white shrink-0">
            <TelegramIcon />
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-ink-50">@Flicksee_bot</div>
            <div className="text-xs text-ink-200">
              Сюда придут уведомления о совпадениях с друзьями
            </div>
          </div>
          <button
            onClick={(e) => {
              e.preventDefault();
              void onTestPush();
            }}
            className="text-xs bg-white/10 hover:bg-white/15 text-white px-3 py-1.5 rounded-full font-medium transition-colors shrink-0"
          >
            {testPushState === 'sending'
              ? 'Отправка…'
              : testPushState === 'sent'
              ? 'Отправил ✓'
              : testPushState === 'error'
              ? 'Ошибка'
              : 'Тест'}
          </button>
        </a>

        {!authLoading && !user ? (
          <div className="flex flex-col items-center text-center py-16 px-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#229ED9]/30 to-ink-700 flex items-center justify-center text-[#9bd3ee] mb-5 ring-1 ring-white/10">
              <TelegramIcon />
            </div>
            <h2 className="text-xl font-bold text-ink-50 mb-2">Сначала войди</h2>
            <p className="text-ink-200 text-sm max-w-xs mb-6 leading-relaxed">
              Чтобы приглашать друзей и получать уведомления о совпадениях, войди
              через Telegram — кнопка справа сверху.
            </p>
          </div>
        ) : loading ? (
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
      {inviteLink && (
        <React.Suspense fallback={null}>
          <InviteModal deeplink={inviteLink} onClose={() => setInviteLink(null)} />
        </React.Suspense>
      )}
    </div>
  );
};

export default FriendsPage;
