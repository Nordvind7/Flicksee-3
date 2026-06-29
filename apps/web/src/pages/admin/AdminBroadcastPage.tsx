import React, { useEffect, useState, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import type {
  BroadcastJobView,
  BroadcastSegment,
  BroadcastSegmentCounts,
} from '@flicksee/shared';
import { useAuth } from '../../auth/AuthContext';
import { api } from '../../lib/api';
import AdminShell from './AdminShell';

const SEGMENT_LABELS: Record<BroadcastSegment, string> = {
  all_bot_started: 'Все (нажавшие /start)',
  active_7d: 'Активны 7 дней',
  inactive_14d: 'Не заходили 14+ дней',
  with_friends: 'С друзьями',
  no_friends: 'Без друзей',
  admins_only: 'Только админы (тест)',
};

const SEGMENT_ORDER: BroadcastSegment[] = [
  'admins_only',
  'all_bot_started',
  'active_7d',
  'inactive_14d',
  'with_friends',
  'no_friends',
];

const POLL_MS = 1000;

const AdminBroadcastPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();

  const [counts, setCounts] = useState<BroadcastSegmentCounts | null>(null);
  const [segment, setSegment] = useState<BroadcastSegment>('admins_only');
  const [text, setText] = useState('');
  const [buttonOn, setButtonOn] = useState(false);
  const [buttonText, setButtonText] = useState('Открыть Flicksee');
  const [buttonUrl, setButtonUrl] = useState('https://flicksee.ru/');
  const [photoOn, setPhotoOn] = useState(false);
  const [photoUrl, setPhotoUrl] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [job, setJob] = useState<BroadcastJobView | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load segment counts on mount; refresh after each broadcast finishes.
  const loadCounts = useCallback(async () => {
    try {
      const res = await api.get('/admin/broadcast/segments');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { counts: BroadcastSegmentCounts };
      setCounts(data.counts);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'failed to load segments');
    }
  }, []);

  useEffect(() => {
    if (user?.isAdmin) loadCounts();
  }, [user?.isAdmin, loadCounts]);

  // Once a job is running we poll its status every second until done.
  useEffect(() => {
    if (!job || job.status === 'done' || job.status === 'cancelled' || job.status === 'failed') {
      return;
    }
    const t = window.setInterval(async () => {
      try {
        const res = await api.get(`/admin/broadcast/${job.id}`);
        if (!res.ok) return;
        const data = (await res.json()) as { job: BroadcastJobView };
        setJob(data.job);
      } catch {
        /* transient — keep polling */
      }
    }, POLL_MS);
    return () => window.clearInterval(t);
  }, [job]);

  const submit = async () => {
    setError(null);
    setSending(true);
    try {
      const body: Record<string, unknown> = { text, segment };
      if (buttonOn && buttonText.trim() && buttonUrl.trim()) {
        body.button = { text: buttonText, url: buttonUrl };
      }
      if (photoOn && photoUrl.trim()) {
        body.photoUrl = photoUrl;
      }
      const res = await api.post('/admin/broadcast', body);
      if (!res.ok) {
        const e = (await res.json()) as { error?: string };
        throw new Error(e.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as { job: BroadcastJobView };
      setJob(data.job);
      setConfirmOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'broadcast failed');
    } finally {
      setSending(false);
    }
  };

  const cancel = async () => {
    if (!job) return;
    try {
      await api.post(`/admin/broadcast/${job.id}/cancel`, {});
    } catch {
      /* status will reflect via next poll */
    }
  };

  const startNew = () => {
    setJob(null);
    setError(null);
    loadCounts();
  };

  if (authLoading) return <div className="min-h-screen bg-brand-background" />;
  if (!user?.isAdmin) return <Navigate to="/" replace />;

  const segmentCount = counts ? counts[segment] : 0;
  const canSend =
    text.trim().length > 0 &&
    text.length <= 4000 &&
    (!buttonOn || (buttonText.trim() && /^https?:\/\//.test(buttonUrl))) &&
    (!photoOn || /^https?:\/\//.test(photoUrl)) &&
    segmentCount > 0;

  // If a job exists, render the status view INSTEAD of the form.
  if (job) {
    const pct = job.total > 0 ? Math.round(((job.sent + job.failed) / job.total) * 100) : 0;
    const isTerminal = job.status === 'done' || job.status === 'cancelled' || job.status === 'failed';
    return (
      <AdminShell>
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="rounded-lg bg-white/5 border border-white/10 p-5">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <h2 className="text-lg font-semibold">
                {job.status === 'running' && '🟢 Отправка…'}
                {job.status === 'done' && '✅ Готово'}
                {job.status === 'cancelled' && '⏹ Остановлено'}
                {job.status === 'failed' && '⛔ Ошибка'}
              </h2>
              <span className="text-sm opacity-60">{SEGMENT_LABELS[job.preview.segment]}</span>
            </div>

            <div className="h-3 rounded-full bg-white/10 overflow-hidden mb-2">
              <div
                className="h-full bg-brand-primary transition-all"
                style={{ width: `${pct}%`, backgroundColor: '#E50914' }}
              />
            </div>
            <div className="flex gap-4 text-sm tabular-nums">
              <span>📤 Отправлено: <b>{job.sent}</b></span>
              <span>❌ Ошибок: <b>{job.failed}</b></span>
              <span className="opacity-60">из {job.total}</span>
            </div>

            {job.errors.length > 0 && (
              <details className="mt-4 text-xs">
                <summary className="cursor-pointer opacity-70 hover:opacity-100">
                  Первые ошибки ({job.errors.length})
                </summary>
                <ul className="mt-2 space-y-1 font-mono opacity-80">
                  {job.errors.map((e, i) => (
                    <li key={i}>
                      <code>{e.telegramId}</code>: {e.reason}
                    </li>
                  ))}
                </ul>
              </details>
            )}

            <div className="mt-5 flex gap-2 flex-wrap">
              {job.status === 'running' && !job.cancelRequested && (
                <button
                  onClick={cancel}
                  className="px-4 py-2 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 text-sm"
                >
                  Остановить
                </button>
              )}
              {isTerminal && (
                <button
                  onClick={startNew}
                  className="px-4 py-2 rounded-lg bg-white/15 hover:bg-white/20 text-sm font-medium"
                >
                  Новая рассылка
                </button>
              )}
            </div>
          </div>

          <div className="rounded-lg bg-white/5 border border-white/10 p-5 text-sm opacity-70">
            <div className="font-medium mb-2 opacity-90">Текст сообщения</div>
            <pre className="whitespace-pre-wrap font-sans">{job.preview.text}</pre>
            <div className="mt-3 text-xs space-x-3 opacity-60">
              {job.preview.hasPhoto && <span>📷 с картинкой</span>}
              {job.preview.hasButton && <span>🔘 с кнопкой</span>}
            </div>
          </div>
        </div>
      </AdminShell>
    );
  }

  // Form view.
  return (
    <AdminShell>
      <div className="max-w-2xl mx-auto space-y-5">
        {error && (
          <div className="rounded border border-red-500 bg-red-500/10 p-3 text-red-300 text-sm">
            {error}
          </div>
        )}

        <section className="rounded-lg bg-white/5 border border-white/10 p-5">
          <label className="block text-xs uppercase tracking-wide opacity-60 mb-2">
            Кому
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {SEGMENT_ORDER.map((s) => {
              const count = counts ? counts[s] : '—';
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSegment(s)}
                  className={`text-left px-3 py-2 rounded-lg text-sm border transition-colors ${
                    segment === s
                      ? 'bg-white/15 border-white/30 text-white'
                      : 'bg-transparent border-white/10 text-white/70 hover:bg-white/5'
                  }`}
                >
                  <div className="font-medium">{SEGMENT_LABELS[s]}</div>
                  <div className="text-xs opacity-60 tabular-nums">
                    {count} {typeof count === 'number' ? 'юзеров' : ''}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-lg bg-white/5 border border-white/10 p-5">
          <label className="block text-xs uppercase tracking-wide opacity-60 mb-2">
            Текст сообщения ({text.length}/4000)
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            placeholder="Привет! У нас обновления..."
            className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30 resize-y"
          />
          <p className="text-xs opacity-50 mt-2">
            Поддерживается HTML: &lt;b&gt;жирно&lt;/b&gt;, &lt;i&gt;курсив&lt;/i&gt;, &lt;a href="..."&gt;ссылка&lt;/a&gt;
          </p>
        </section>

        <section className="rounded-lg bg-white/5 border border-white/10 p-5">
          <label className="flex items-center gap-2 cursor-pointer mb-3">
            <input
              type="checkbox"
              checked={buttonOn}
              onChange={(e) => setButtonOn(e.target.checked)}
              className="accent-red-500"
            />
            <span className="text-sm font-medium">Добавить кнопку</span>
          </label>
          {buttonOn && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                value={buttonText}
                onChange={(e) => setButtonText(e.target.value)}
                placeholder="Текст кнопки"
                className="bg-black/30 border border-white/10 rounded-lg p-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30"
              />
              <input
                value={buttonUrl}
                onChange={(e) => setButtonUrl(e.target.value)}
                placeholder="https://..."
                className="bg-black/30 border border-white/10 rounded-lg p-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30 font-mono"
              />
            </div>
          )}
        </section>

        <section className="rounded-lg bg-white/5 border border-white/10 p-5">
          <label className="flex items-center gap-2 cursor-pointer mb-3">
            <input
              type="checkbox"
              checked={photoOn}
              onChange={(e) => setPhotoOn(e.target.checked)}
              className="accent-red-500"
            />
            <span className="text-sm font-medium">Прикрепить картинку</span>
          </label>
          {photoOn && (
            <input
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              placeholder="https://flicksee.ru/og-default.jpg"
              className="w-full bg-black/30 border border-white/10 rounded-lg p-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30 font-mono"
            />
          )}
        </section>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-sm opacity-70">
            Получателей: <b className="tabular-nums">{segmentCount}</b>
          </p>
          <button
            type="button"
            disabled={!canSend || sending}
            onClick={() => setConfirmOpen(true)}
            className="px-5 py-2.5 rounded-lg bg-red-500 hover:bg-red-600 disabled:bg-white/10 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors"
          >
            Разослать
          </button>
        </div>
      </div>

      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => !sending && setConfirmOpen(false)}
        >
          <div
            className="bg-ink-700 border border-white/10 rounded-xl p-6 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-2">Подтверди отправку</h3>
            <p className="text-sm opacity-80 mb-4">
              Сообщение уйдёт <b>{segmentCount}</b> юзерам через бота.
              <br />
              <span className="opacity-60">Сегмент: {SEGMENT_LABELS[segment]}</span>
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmOpen(false)}
                disabled={sending}
                className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm"
              >
                Отмена
              </button>
              <button
                onClick={submit}
                disabled={sending}
                className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-semibold"
              >
                {sending ? 'Запуск…' : 'Да, отправить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
};

export default AdminBroadcastPage;
