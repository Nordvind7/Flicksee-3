import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import type { DashboardData } from '@flicksee/shared';
import { useAuth } from '../../auth/AuthContext';

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
        <pre className="text-xs overflow-x-auto bg-black/30 p-4 rounded">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
};

export default AdminDashboardPage;
