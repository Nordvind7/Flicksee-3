import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StartIcon } from './icons';
import { tmdbImg } from '../constants';

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

// Rotates every ~2.8s through value props. Speaks vibe + outcome, never
// features. "Trailers with sound" is table-stakes, not a selling point.
const ROTATOR = [
  'Снеки целы. Фильм найден.',
  'Хватит листать. Время свайпать.',
  'Кино за минуту вместо часа спора.',
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
    return Array.from({ length: 42 }, (_, i) => posters[i % posters.length]);
  }, [posters]);

  // Mouse parallax. We push transform updates directly to a DOM ref via CSS
  // variables instead of React state — this avoids re-rendering 42 <img>
  // elements 60 times per second when the cursor moves.
  const parallaxRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = parallaxRef.current;
    if (!el) return;
    let frame = 0;
    const onMove = (e: PointerEvent) => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        // Counter-direction: wall pushes AGAINST the cursor → reads as depth,
        // not as the cursor "carrying" the wall. Magnitudes amplified so the
        // motion is unmistakable rather than subliminal.
        const x = -(e.clientX / window.innerWidth - 0.5); // −0.5 .. +0.5 (inverted)
        const y = -(e.clientY / window.innerHeight - 0.5);
        el.style.setProperty('--mx', String(x));
        el.style.setProperty('--my', String(y));
      });
    };
    // Pointer events fire on both mouse + touch + pen — better than mousemove.
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  const title = useMemo(() => 'Flicksee'.split(''), []);

  return (
    <div className="relative flex flex-col items-center justify-center h-screen w-screen overflow-hidden bg-black text-white">
      {/* Poster mosaic — 3 nested wrappers, each owning one transform:
            (1) parallax-wrap: mouse-driven CSS-var translate (always mounted,
                so the ref is wired up regardless of whether TMDB responded)
            (2) splash-pan: auto-pan keyframes
            (3) splash-grid: static rotate + scale to break the orthogonal feel
          Layering this way lets all three transforms compose without any one
          fighting the others, and only the parallax layer re-renders on
          pointermove (via CSS var, not React). */}
      <div
        ref={parallaxRef}
        className="absolute inset-0 pointer-events-none splash-parallax"
      >
        <div className="splash-pan w-full h-full">
          <div
            className="splash-grid"
            style={{
              transform: 'rotate(-5deg) scale(1.5)',
              transformOrigin: 'center',
              willChange: 'transform',
            }}
          >
            <div className="grid grid-cols-7 gap-1.5 w-[140vw] -ml-[20vw] -mt-[25vh] opacity-75">
              {grid.map((path, i) => (
                <img
                  key={`${path}-${i}`}
                  src={tmdbImg('w154', path)}
                  alt=""
                  loading="eager"
                  decoding="async"
                  className="w-full aspect-[2/3] object-cover rounded"
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Cinematic dark gradient + vignette — lighter than before so the
          poster wall is clearly the hero, not a faint hint. */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(0,0,0,0.30) 0%, rgba(0,0,0,0.70) 70%, rgba(0,0,0,0.92) 100%)',
        }}
      />
      {/* Narrow top/bottom fade just to anchor the text panel. */}
      <div
        className="absolute inset-x-0 top-0 h-24 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)' }}
      />
      <div
        className="absolute inset-x-0 bottom-0 h-32 pointer-events-none"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)' }}
      />

      {/* Hero content. */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-2xl">
        <h1
          className="text-4xl md:text-5xl font-black text-brand-primary mb-2 flicksee-title tracking-tight"
          style={{ textShadow: '0 0 40px rgba(229,9,20,0.55), 0 0 90px rgba(229,9,20,0.3)' }}
          aria-label="Flicksee"
        >
          {title.map((char, index) => (
            <span key={index} style={{ animationDelay: `${index * 0.05}s` }}>
              {char}
            </span>
          ))}
        </h1>

        <p
          className="text-5xl md:text-7xl font-black mt-4 mb-5 leading-[1.05] tracking-tight animate-fade-in-up"
          style={{ animationDelay: '0.4s' }}
        >
          Что смотрим{' '}
          <span
            className="bg-gradient-to-r from-red-500 via-red-400 to-orange-400 bg-clip-text text-transparent"
            style={{
              filter: 'drop-shadow(0 0 24px rgba(239,68,68,0.45))',
            }}
          >
            сегодня?
          </span>
        </p>

        {/* Rotator: every item is mounted permanently and crossfaded with
            opacity. Earlier we re-mounted (key={index}), which restarted the
            entry animation each tick — visually a flash → blank → re-fade. */}
        <div
          className="h-8 mb-10 relative w-full max-w-md animate-fade-in-up"
          style={{ animationDelay: '0.65s' }}
        >
          {ROTATOR.map((line, i) => (
            <p
              key={i}
              aria-hidden={i !== rotatorIndex}
              className="absolute inset-0 text-lg md:text-xl text-neutral-300 font-medium transition-opacity duration-700 ease-out"
              style={{ opacity: i === rotatorIndex ? 1 : 0 }}
            >
              {line}
            </p>
          ))}
        </div>

        <button
          onClick={onStart}
          className="group relative inline-flex items-center gap-3 bg-brand-primary text-white font-bold py-5 px-12 rounded-full transition-all duration-300 hover:scale-[1.04] hover:shadow-2xl animate-fade-in-up animate-pulse-glow overflow-hidden"
          style={{
            animationDelay: '0.85s',
            boxShadow: '0 0 40px rgba(229,9,20,0.65), 0 14px 50px rgba(0,0,0,0.55)',
          }}
        >
          {/* Shine sweep on hover — a thin diagonal highlight that rakes
              across the button. Pure CSS, no JS. */}
          <span className="splash-cta-shine" aria-hidden="true" />
          <StartIcon />
          <span className="text-xl tracking-wide">Начать</span>
          <span className="text-2xl transition-transform group-hover:translate-x-1">→</span>
        </button>

        {/* Three-step explainer — answers "что я тут получу" в одном взгляде. */}
        <div
          className="grid grid-cols-3 gap-2 sm:gap-4 mt-8 max-w-md w-full animate-fade-in-up"
          style={{ animationDelay: '1.05s' }}
        >
          {[
            { n: '1', t: 'Свайпай', s: 'карточки кино' },
            { n: '2', t: 'Зови', s: 'пару или друга' },
            { n: '3', t: 'Матч', s: 'идёте смотреть' },
          ].map((step) => (
            <div
              key={step.n}
              className="flex flex-col items-center text-center px-1 py-3 rounded-xl bg-white/[0.03] ring-1 ring-white/5"
            >
              <span className="w-6 h-6 rounded-full bg-brand-primary text-white text-xs font-bold flex items-center justify-center mb-2 shadow-glow-accent">
                {step.n}
              </span>
              <span className="text-sm font-semibold text-white leading-tight">{step.t}</span>
              <span className="text-[11px] text-brand-muted leading-tight mt-0.5">{step.s}</span>
            </div>
          ))}
        </div>

        <p
          className="text-[10px] text-brand-muted/60 mt-4 max-w-xs animate-fade-in-up"
          style={{ animationDelay: '1.2s' }}
        >
          Нажимая «Начать», ты разрешаешь автовоспроизведение трейлеров со звуком.
        </p>
      </div>
    </div>
  );
};

export default SplashScreen;
