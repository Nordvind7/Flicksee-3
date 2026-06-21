import React, { useEffect, useMemo, useState } from 'react';
import { StartIcon } from './icons';

interface SplashScreenProps {
  onStart: () => void;
}

// Pulled on mount — we use the existing /api/tmdb proxy so no extra config.
// Posters render as a drifting backdrop behind the hero copy.
async function fetchPopularPosters(): Promise<string[]> {
  try {
    const res = await fetch('/api/tmdb/movie/popular?language=ru-RU&page=1');
    if (!res.ok) return [];
    const data = (await res.json()) as { results?: Array<{ poster_path: string | null }> };
    return (data.results ?? [])
      .map((m) => m.poster_path)
      .filter((p): p is string => Boolean(p))
      .slice(0, 24);
  } catch {
    return [];
  }
}

// Rotates every ~2.5s through the value props. First impression should
// answer "what is this and why should I tap?" within the first sentence.
const ROTATOR = [
  'Трейлеры со звуком — в один тап',
  'Матчи с друзьями — автоматически',
  'Где смотреть в России — сразу видно',
];
const ROTATOR_INTERVAL_MS = 2800;

const SplashScreen: React.FC<SplashScreenProps> = ({ onStart }) => {
  const [posters, setPosters] = useState<string[]>([]);
  const [rotatorIndex, setRotatorIndex] = useState(0);

  useEffect(() => {
    void fetchPopularPosters().then(setPosters);
  }, []);

  useEffect(() => {
    const id = window.setInterval(
      () => setRotatorIndex((i) => (i + 1) % ROTATOR.length),
      ROTATOR_INTERVAL_MS,
    );
    return () => window.clearInterval(id);
  }, []);

  // Stable shuffle on first poster arrival so the grid doesn't reflow.
  const grid = useMemo(() => {
    if (posters.length === 0) return [];
    // Two columns × 12 rows = enough to fill any viewport with overflow.
    return Array.from({ length: 24 }, (_, i) => posters[i % posters.length]);
  }, [posters]);

  const title = useMemo(() => 'Flicksee'.split(''), []);

  return (
    <div className="relative flex flex-col items-center justify-center h-screen w-screen overflow-hidden bg-black text-white">
      {/* Drifting poster mosaic — diagonal slow scroll, blurred + dimmed. */}
      {grid.length > 0 && (
        <div
          className="absolute inset-0 pointer-events-none opacity-40"
          style={{
            transform: 'rotate(-8deg) scale(1.6)',
            transformOrigin: 'center',
          }}
        >
          <div
            className="grid grid-cols-4 gap-3 w-[140vw] -ml-[20vw] splash-drift"
            style={{ filter: 'blur(1px)' }}
          >
            {grid.map((path, i) => (
              <img
                key={`${path}-${i}`}
                src={`https://image.tmdb.org/t/p/w342${path}`}
                alt=""
                loading="lazy"
                className="w-full aspect-[2/3] object-cover rounded-md"
                style={{ animationDelay: `${(i % 6) * -1.2}s` }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Cinematic dark gradient + vignette overlay. */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.85) 60%, rgba(0,0,0,0.98) 100%)',
        }}
      />
      {/* Top + bottom edge fade for stronger focus on the center copy. */}
      <div
        className="absolute inset-x-0 top-0 h-1/3 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.9), transparent)' }}
      />
      <div
        className="absolute inset-x-0 bottom-0 h-1/3 pointer-events-none"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)' }}
      />

      {/* Hero content. */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-md">
        <h1
          className="text-6xl md:text-7xl font-black text-brand-primary mb-1 flicksee-title tracking-tight"
          style={{ textShadow: '0 0 40px rgba(229,9,20,0.45), 0 0 80px rgba(229,9,20,0.25)' }}
          aria-label="Flicksee"
        >
          {title.map((char, index) => (
            <span key={index} style={{ animationDelay: `${index * 0.05}s` }}>
              {char}
            </span>
          ))}
        </h1>

        <p
          className="text-3xl md:text-4xl font-bold mt-6 mb-4 leading-tight animate-fade-in-up"
          style={{ animationDelay: '0.4s' }}
        >
          Что посмотреть{' '}
          <span className="text-brand-primary">сегодня?</span>
        </p>

        {/* Rotator: cycles three value props. The fixed-height wrapper avoids
            layout jitter as text changes. */}
        <div
          className="h-7 mb-8 overflow-hidden animate-fade-in-up"
          style={{ animationDelay: '0.65s' }}
        >
          <p
            key={rotatorIndex}
            className="text-base md:text-lg text-brand-muted splash-rotator"
          >
            {ROTATOR[rotatorIndex]}
          </p>
        </div>

        <button
          onClick={onStart}
          className="group relative inline-flex items-center gap-2 bg-brand-primary text-white font-bold py-4 px-10 rounded-full transition-all duration-300 hover:scale-105 hover:shadow-2xl animate-fade-in-up animate-pulse-glow"
          style={{
            animationDelay: '0.85s',
            boxShadow: '0 0 30px rgba(229,9,20,0.55), 0 10px 40px rgba(0,0,0,0.5)',
          }}
        >
          <StartIcon />
          <span className="text-lg">Начать</span>
          <span className="text-xl transition-transform group-hover:translate-x-1">→</span>
        </button>

        <p
          className="text-xs text-brand-muted mt-6 max-w-xs leading-relaxed animate-fade-in-up"
          style={{ animationDelay: '1.05s' }}
        >
          Свайпай как в Tinder: вправо «хочу посмотреть», влево «не моё», вверх «уже видел».
        </p>
        <p
          className="text-[10px] text-brand-muted/60 mt-3 max-w-xs animate-fade-in-up"
          style={{ animationDelay: '1.2s' }}
        >
          Нажимая «Начать», ты разрешаешь автовоспроизведение трейлеров со звуком.
        </p>
      </div>
    </div>
  );
};

export default SplashScreen;
