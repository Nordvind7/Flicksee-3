import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import type { DashboardData } from '@flicksee/shared';
import { useAuth } from '../../auth/AuthContext';
import MetricCard from './components/MetricCard';
import TopContentTable from './components/TopContentTable';
import FunnelBlock from './components/FunnelBlock';
import TrendChart from './components/TrendChart';
import DonutChart from './components/DonutChart';

const REFRESH_MS = 30_000;

const AdminDashboardPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.isAdmin) return;
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch('/api/admin/dashboard', { credentials: 'include' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as DashboardData;
        if (!cancelled) {
          setData(json);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'load failed');
      }
    }
    load();
    const t = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [user?.isAdmin]);

  if (authLoading) {
    return <div className="min-h-screen bg-brand-background" />;
  }
  if (!user?.isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-brand-background text-brand-secondary p-4 sm:p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Flicksee Admin</h1>
        <p className="text-sm opacity-60">
          {data
            ? `Обновлено ${new Date(data.generatedAt).toLocaleTimeString('ru-RU')}`
            : 'Загрузка…'}
        </p>
      </header>

      {error && (
        <div className="mb-6 rounded border border-red-500 bg-red-500/10 p-4 text-red-300">
          Ошибка: {error}
        </div>
      )}

      {!data && !error && <div className="opacity-60">Загружаю метрики…</div>}

      {data && (
        <>
          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-3 opacity-80">Юзеры</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <MetricCard label="Всего" value={data.users.total} />
              <MetricCard label="DAU" value={data.users.dau} hint="за 24 часа" />
              <MetricCard label="WAU" value={data.users.wau} hint="за 7 дней" />
              <MetricCard label="MAU" value={data.users.mau} hint="за 30 дней" />
              <MetricCard label="Новых 24h" value={data.users.new24h} />
              <MetricCard label="Новых 7d" value={data.users.new7d} />
              <MetricCard label="Новых 30d" value={data.users.new30d} />
              <MetricCard label="/start в боте" value={data.users.botStarted} />
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-3 opacity-80">Активность</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
              <MetricCard label="Свайпов 24h" value={data.activity.swipes.d24} />
              <MetricCard label="Свайпов 7d" value={data.activity.swipes.d7} />
              <MetricCard label="Свайпов 30d" value={data.activity.swipes.d30} />
              <MetricCard label="Друзья 7d" value={data.activity.friendships7d} />
              <MetricCard label="Матчей 24h" value={data.activity.matches.d24} />
              <MetricCard label="Матчей 7d" value={data.activity.matches.d7} />
              <MetricCard label="Матчей 30d" value={data.activity.matches.d30} />
            </div>
            <div className="rounded-lg bg-white/5 border border-white/10 p-4">
              <div className="text-xs uppercase tracking-wide opacity-60 mb-2">
                Свайпы по типу (7 дней)
              </div>
              <div className="flex flex-wrap gap-4 text-sm">
                <span>👍 LIKE: <b>{data.activity.swipesByAction7d.LIKE}</b></span>
                <span>👎 DISLIKE: <b>{data.activity.swipesByAction7d.DISLIKE}</b></span>
                <span>✓ SEEN: <b>{data.activity.swipesByAction7d.SEEN}</b></span>
                <span>⭐ RECOMMEND: <b>{data.activity.swipesByAction7d.RECOMMEND}</b></span>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-3 opacity-80">Топ контента</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <TopContentTable title="Топ лайков (7d)" rows={data.topContent.likes7d} countLabel="❤" />
              <TopContentTable title="Топ дислайков (7d)" rows={data.topContent.dislikes7d} countLabel="👎" />
              <TopContentTable title="Топ рекомендаций (30d)" rows={data.topContent.recommend30d} countLabel="⭐" />
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-3 opacity-80">Тренды (30 дней)</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <TrendChart title="Новые юзеры" data={data.trends30d.newUsers} kind="bar" color="#E50914" />
              <TrendChart title="Свайпы" data={data.trends30d.swipes} kind="line" color="#ff6a3d" />
              <TrendChart title="Матчи" data={data.trends30d.matches} kind="line" color="#ffcd3d" />
              <DonutChart
                title="Свайпы по типу (7d)"
                data={[
                  { name: 'LIKE', value: data.activity.swipesByAction7d.LIKE, color: '#E50914' },
                  { name: 'DISLIKE', value: data.activity.swipesByAction7d.DISLIKE, color: '#888888' },
                  { name: 'SEEN', value: data.activity.swipesByAction7d.SEEN, color: '#ffcd3d' },
                  { name: 'RECOMMEND', value: data.activity.swipesByAction7d.RECOMMEND, color: '#ff6a3d' },
                ]}
              />
            </div>
          </section>

          <section className="mb-8">
            <FunnelBlock data={data.funnel7d} />
          </section>
        </>
      )}
    </div>
  );
};

export default AdminDashboardPage;
