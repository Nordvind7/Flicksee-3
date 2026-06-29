import React, { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { useNavigate } from 'react-router-dom';
import { tmdbImg } from '../constants';

export interface MatchPayload {
  id: string;
  tmdbId: number;
  contentType: 'MOVIE' | 'TV';
  friend: { id: string; firstName: string | null; username: string | null; photoUrl: string | null };
  content: { title: string; posterPath: string | null } | null;
}

interface Props {
  match: MatchPayload;
  onClose: () => void;
}

const AUTO_DISMISS_MS = 6500;

/**
 * Fullscreen WOW-overlay показывается когда юзер делает свайп и
 * сервер сразу подтверждает матч. Цели:
 *   1. эмоциональный пик («МАТЧ!»),
 *   2. рекордабельность (если красиво — снимут на TikTok),
 *   3. чёткий call-to-action (открыть карточку матча).
 *
 * Эффекты:
 *   • Конфетти из двух точек (canvas-confetti, 2 burst).
 *   • Backdrop blur + radial gradient.
 *   • Постер вылетает с rotate+scale.
 *   • Текст вылетает снизу.
 *   • Auto-dismiss через ~6.5с (юзер успеет снять и тапнуть кнопку).
 */
const MatchOverlay: React.FC<Props> = ({ match, onClose }) => {
  const navigate = useNavigate();
  const dismissRef = useRef<number | null>(null);

  // Конфетти-залп + повторный через 800мс.
  useEffect(() => {
    const fire = (originY: number, particleCount: number, spread: number) => {
      confetti({
        particleCount,
        spread,
        startVelocity: 45,
        origin: { x: 0.5, y: originY },
        colors: ['#E50914', '#ff6a3d', '#ffcd3d', '#ffffff', '#ff3d8a'],
        ticks: 200,
      });
    };
    fire(0.55, 110, 90);
    const t1 = window.setTimeout(() => fire(0.4, 80, 70), 600);
    const t2 = window.setTimeout(() => fire(0.55, 60, 110), 1200);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);

  // Auto-dismiss.
  useEffect(() => {
    dismissRef.current = window.setTimeout(onClose, AUTO_DISMISS_MS);
    return () => {
      if (dismissRef.current) window.clearTimeout(dismissRef.current);
    };
  }, [onClose]);

  // Esc / клик по фону — закрыть.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const friendName = match.friend.firstName ?? match.friend.username ?? 'другом';
  const title = match.content?.title ?? `tmdb:${match.tmdbId}`;
  const posterPath = match.content?.posterPath;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      {/* Заглушающий blur + radial gradient. */}
      <div
        className="absolute inset-0 backdrop-blur-2xl"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(229,9,20,0.5) 0%, rgba(10,10,11,0.92) 60%, rgba(0,0,0,0.96) 100%)',
        }}
      />

      {/* Контент. */}
      <div
        className="relative flex flex-col items-center text-center max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Постер с вылетом. */}
        {posterPath && (
          <div className="match-overlay-poster mb-6">
            <img
              src={tmdbImg('w500', posterPath)}
              alt={title}
              className="w-44 sm:w-56 aspect-[2/3] object-cover rounded-2xl ring-2 ring-white/20"
              style={{
                boxShadow:
                  '0 30px 80px rgba(229,9,20,0.55), 0 0 0 1px rgba(255,255,255,0.1) inset',
              }}
            />
          </div>
        )}

        {/* Заголовок. */}
        <div className="match-overlay-text">
          <p
            className="text-5xl sm:text-7xl font-black tracking-tightest mb-2"
            style={{
              background: 'linear-gradient(135deg, #ffd23d 0%, #ff6a3d 50%, #E50914 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 4px 20px rgba(229,9,20,0.5))',
            }}
          >
            🎬 МАТЧ!
          </p>
          <p className="text-base sm:text-lg text-white/90 mb-1">
            у тебя и <span className="font-bold text-white">{friendName}</span>
          </p>
          <p className="text-xl sm:text-2xl font-bold text-white mb-7 line-clamp-2 px-4">
            «{title}»
          </p>
        </div>

        {/* CTA. */}
        <div className="flex flex-col sm:flex-row gap-3 w-full px-4">
          <button
            onClick={() => {
              onClose();
              navigate(`/matches/${match.id}`);
            }}
            className="match-overlay-cta flex-1 py-3.5 rounded-full font-bold text-white text-base transition-all hover:scale-[1.03] active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #E50914 0%, #ff6a3d 100%)',
              boxShadow: '0 10px 30px rgba(229,9,20,0.55)',
            }}
          >
            Открыть карточку
          </button>
          <button
            onClick={onClose}
            className="match-overlay-cta px-6 py-3.5 rounded-full font-semibold text-white/90 bg-white/10 hover:bg-white/15 backdrop-blur-md transition-colors"
          >
            Свайпать дальше
          </button>
        </div>
      </div>
    </div>
  );
};

export default MatchOverlay;
