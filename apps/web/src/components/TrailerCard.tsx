import React, { useState, useEffect, useRef } from 'react';
import type { Movie } from '../types';
import { ContentType } from '../types';
import { TMDB_BACKDROP_BASE_URL } from '../constants';
import { HeartIcon, XMarkIcon, EyeIcon, StarIcon, MutedIcon, UnmutedIcon } from './icons';
import { useSound } from '../sound/SoundContext';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface TrailerCardProps {
  movie: Movie;
  onSwipe: (direction: 'left' | 'right' | 'up') => void;
  isActive: boolean;
  contentType: ContentType;
  trailerKey: string | null | undefined; // Added for preloading
  genreMap: Map<number, string>;
}

const TrailerCard: React.FC<TrailerCardProps> = ({ movie, onSwipe, isActive, trailerKey, genreMap }) => {
  const isLoading = trailerKey === undefined; // Loading if key is not yet fetched
  const { soundOn, setSoundOn, unlocked } = useSound();
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [ytApiReady, setYtApiReady] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  const playerRef = useRef<any>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const currentPos = useRef({ x: 0, y: 0 });

  // Mirror reactive values into refs so the player-creation effect (which must
  // not re-run on sound changes) can read the latest values.
  const isActiveRef = useRef(isActive);
  const soundOnRef = useRef(soundOn);
  const unlockedRef = useRef(unlocked);
  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);
  useEffect(() => {
    soundOnRef.current = soundOn;
  }, [soundOn]);
  useEffect(() => {
    unlockedRef.current = unlocked;
  }, [unlocked]);

  const genreNames = movie.genre_ids
    .map((id) => genreMap.get(id))
    .filter((name): name is string => !!name);

  useEffect(() => {
    if (window.YT && window.YT.Player) {
      setYtApiReady(true);
      return;
    }
    const intervalId = setInterval(() => {
      if (window.YT && window.YT.Player) {
        setYtApiReady(true);
        clearInterval(intervalId);
      }
    }, 100);
    return () => clearInterval(intervalId);
  }, []);

  // Create and destroy the YouTube player instance.
  useEffect(() => {
    if (!trailerKey || !ytApiReady) {
      return;
    }

    const wantsSound = () => soundOnRef.current && unlockedRef.current;

    const applySound = () => {
      const p = playerRef.current;
      if (!p || typeof p.mute !== 'function') return;
      if (wantsSound()) {
        p.unMute();
        if (typeof p.setVolume === 'function') p.setVolume(100);
      } else {
        p.mute();
      }
    };

    const onPlayerReady = (event: any) => {
      playerRef.current = event.target;
      if (isActiveRef.current) {
        applySound();
        playerRef.current.playVideo();
        // If the browser refused unmuted autoplay, it keeps the player muted —
        // detect that shortly after and surface a tap-to-unmute affordance.
        window.setTimeout(() => {
          const p = playerRef.current;
          if (!p || typeof p.isMuted !== 'function') return;
          setAudioBlocked(wantsSound() && p.isMuted());
        }, 800);
      } else {
        playerRef.current.mute();
      }
    };

    const onStateChange = (event: any) => {
      // Loop is enabled; this is a backup restart for edge cases.
      if (event.data === window.YT.PlayerState.ENDED) {
        playerRef.current?.seekTo(0);
      }
    };

    const playerElement = cardRef.current?.querySelector(`#player-${movie.id}`);
    if (playerElement && !playerRef.current) {
      playerRef.current = new window.YT.Player(playerElement.id, {
        videoId: trailerKey,
        playerVars: {
          autoplay: 1,
          mute: wantsSound() ? 0 : 1,
          controls: 0,
          showinfo: 0,
          rel: 0,
          modestbranding: 1,
          iv_load_policy: 3,
          loop: 1,
          playlist: trailerKey,
          fs: 0,
          playsinline: 1, // play inline on iOS instead of going fullscreen
          origin: window.location.origin,
        },
        events: {
          onReady: onPlayerReady,
          onStateChange: onStateChange,
        },
      });
    }

    return () => {
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [trailerKey, ytApiReady, movie.id]);

  // Play/pause + (re)apply sound as the active card changes.
  useEffect(() => {
    const p = playerRef.current;
    if (!p || typeof p.playVideo !== 'function') return;
    if (isActive) {
      if (soundOnRef.current && unlockedRef.current) {
        p.unMute();
        if (typeof p.setVolume === 'function') p.setVolume(100);
      } else {
        p.mute();
      }
      p.playVideo();
    } else {
      p.pauseVideo();
    }
  }, [isActive]);

  // React to the session-wide sound preference on the active card.
  useEffect(() => {
    const p = playerRef.current;
    if (!isActive || !p || typeof p.mute !== 'function') return;
    if (soundOn && unlocked) {
      p.unMute();
      if (typeof p.setVolume === 'function') p.setVolume(100);
      p.playVideo();
    } else {
      p.mute();
    }
    setAudioBlocked(false);
  }, [soundOn, unlocked, isActive]);

  // Turn sound on from within a user gesture — the reliable way to defeat
  // autoplay blocking.
  const enableSoundFromGesture = () => {
    const p = playerRef.current;
    if (p && typeof p.unMute === 'function') {
      p.unMute();
      if (typeof p.setVolume === 'function') p.setVolume(100);
      p.playVideo();
    }
    setAudioBlocked(false);
    setSoundOn(true);
  };

  const toggleSound = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (soundOn && !audioBlocked) {
      const p = playerRef.current;
      if (p && typeof p.mute === 'function') p.mute();
      setSoundOn(false);
    } else {
      enableSoundFromGesture();
    }
  };

  const handleDragStart = (clientX: number, clientY: number) => {
    if (!cardRef.current) return;
    isDragging.current = true;
    startPos.current = { x: clientX, y: clientY };
    cardRef.current.style.transition = 'none';
  };

  const handleDragMove = (clientX: number, clientY: number) => {
    if (!isDragging.current || !cardRef.current) return;
    const dx = clientX - startPos.current.x;
    const dy = clientY - startPos.current.y;
    currentPos.current = { x: dx, y: dy };
    const rotation = dx * 0.1;
    cardRef.current.style.transform = `translate(${dx}px, ${dy}px) rotate(${rotation}deg)`;
  };

  const handleDragEnd = () => {
    if (!isDragging.current || !cardRef.current) return;
    isDragging.current = false;
    cardRef.current.style.transition = 'transform 0.3s ease-out';

    const { x, y } = currentPos.current;
    const swipeThreshold = window.innerWidth / 4;

    if (Math.abs(x) > swipeThreshold) {
      const direction = x > 0 ? 'right' : 'left';
      const moveOutX = (window.innerWidth + 200) * (x > 0 ? 1 : -1);
      cardRef.current.style.transform = `translate(${moveOutX}px, ${y}px) rotate(${x * 0.1}deg)`;
      setTimeout(() => onSwipe(direction), 300);
    } else if (y < -swipeThreshold) {
      const moveOutY = -(window.innerHeight + 200);
      cardRef.current.style.transform = `translate(${x}px, ${moveOutY}px) rotate(0deg)`;
      setTimeout(() => onSwipe('up'), 300);
    } else {
      cardRef.current.style.transform = 'translate(0, 0) rotate(0)';
    }
    currentPos.current = { x: 0, y: 0 };
  };

  const triggerSwipe = (direction: 'left' | 'right' | 'up') => {
    if (!cardRef.current) return;
    cardRef.current.style.transition = 'transform 0.5s ease-out';
    if (direction === 'left') {
      cardRef.current.style.transform = `translate(-${window.innerWidth + 200}px, -50px) rotate(-30deg)`;
    } else if (direction === 'right') {
      cardRef.current.style.transform = `translate(${window.innerWidth + 200}px, -50px) rotate(30deg)`;
    } else if (direction === 'up') {
      cardRef.current.style.transform = `translate(0, -${window.innerHeight + 200}px)`;
    }
    setTimeout(() => onSwipe(direction), 500);
  };

  const overviewText = movie.overview || 'Описание отсутствует.';
  const needsTruncation = overviewText.length > 120;
  const soundActive = soundOn && !audioBlocked;

  return (
    <div
      ref={cardRef}
      className="absolute w-full h-full cursor-grab active:cursor-grabbing"
      style={{ touchAction: 'none' }}
      onMouseDown={(e) => handleDragStart(e.clientX, e.clientY)}
      onMouseMove={(e) => handleDragMove(e.clientX, e.clientY)}
      onMouseUp={handleDragEnd}
      onMouseLeave={handleDragEnd}
      onTouchStart={(e) => handleDragStart(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchMove={(e) => handleDragMove(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchEnd={handleDragEnd}
    >
      <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-2xl bg-brand-surface flex flex-col">
        <div className="w-full aspect-video bg-black flex items-center justify-center relative">
          {isLoading && <p className="text-brand-muted">Загрузка трейлера...</p>}
          {!isLoading && trailerKey && (
            <>
              <div id={`player-${movie.id}`} className="w-full h-full"></div>
              {isActive && audioBlocked && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    enableSoundFromGesture();
                  }}
                  className="absolute inset-0 z-20 flex items-center justify-center bg-black/40"
                  aria-label="Включить звук"
                >
                  <span className="flex items-center gap-2 bg-black/70 px-4 py-2 rounded-full text-white text-sm font-medium">
                    <UnmutedIcon /> Нажмите для звука
                  </span>
                </button>
              )}
              {isActive && (
                <button
                  onClick={toggleSound}
                  className="absolute bottom-4 right-4 z-30 bg-black/50 rounded-full p-2 text-white hover:bg-black/75 transition-colors"
                  aria-label={soundActive ? 'Выключить звук' : 'Включить звук'}
                >
                  {soundActive ? <UnmutedIcon /> : <MutedIcon />}
                </button>
              )}
            </>
          )}
          {!isLoading && !trailerKey && (
            <div className="w-full h-full relative">
              <img
                src={`${TMDB_BACKDROP_BASE_URL}${movie.backdrop_path}`}
                alt={movie.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-center p-4">
                <p className="text-brand-muted">Трейлер не найден.</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex-grow p-4 flex flex-col justify-between bg-brand-surface">
          <div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold truncate">{movie.title}</h2>
              <div className="flex items-center text-sm text-brand-muted">
                <span>{movie.release_date?.substring(0, 4) || movie.first_air_date?.substring(0, 4)}</span>
                <span className="mx-2">•</span>
                <StarIcon />
                <span className="ml-1">{movie.vote_average.toFixed(1)}</span>
              </div>
              {genreNames.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {genreNames.slice(0, 3).map((name) => (
                    <span
                      key={name}
                      className="bg-white/10 text-brand-secondary text-xs font-medium px-2 py-1 rounded-full"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              )}
              <div>
                <p
                  className={`text-sm text-brand-secondary transition-all ${
                    !isDescriptionExpanded ? 'line-clamp-3' : ''
                  }`}
                >
                  {overviewText}
                </p>
                {needsTruncation && !isDescriptionExpanded && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsDescriptionExpanded(true);
                    }}
                    className="text-brand-muted hover:text-white text-sm font-semibold mt-1 bg-transparent border-none p-0 cursor-pointer"
                    aria-label="Читать полностью"
                  >
                    еще
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-around items-end pt-4 gap-2">
            <ActionButton
              onClick={() => triggerSwipe('left')}
              ariaLabel="Не нравится"
              label="Не моё"
            >
              <XMarkIcon />
            </ActionButton>
            <ActionButton
              onClick={() => triggerSwipe('up')}
              ariaLabel="Смотрел"
              label="Уже видел"
            >
              <EyeIcon />
            </ActionButton>
            <ActionButton
              onClick={() => triggerSwipe('right')}
              ariaLabel="Нравится"
              isPrimary
              label="Хочу"
            >
              <HeartIcon />
            </ActionButton>
          </div>
          {/* Discoverability hint. Shown always — keyboard shortcuts are
              invisible without a label and drag-on-desktop is non-obvious
              for a metaphor most users associate with phones. */}
          <p className="text-center text-[11px] text-brand-muted/70 mt-3 hidden md:block">
            Жми кнопки, тяни карточку мышкой или используй клавиши
            <kbd className="mx-1 px-1.5 py-0.5 rounded bg-white/10 text-white text-[10px]">←</kbd>
            <kbd className="mx-0.5 px-1.5 py-0.5 rounded bg-white/10 text-white text-[10px]">↑</kbd>
            <kbd className="mx-1 px-1.5 py-0.5 rounded bg-white/10 text-white text-[10px]">→</kbd>
          </p>
          <p className="text-center text-[11px] text-brand-muted/70 mt-3 md:hidden">
            Свайпай: ← не моё · ↑ уже видел · → хочу
          </p>
        </div>
      </div>
    </div>
  );
};

const ActionButton: React.FC<{
  onClick: () => void;
  children: React.ReactNode;
  ariaLabel: string;
  isPrimary?: boolean;
  label?: string;
}> = ({ onClick, children, ariaLabel, isPrimary, label }) => (
  <div className="flex flex-col items-center gap-1.5">
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      className={`rounded-full flex items-center justify-center transition-all duration-200 ease-out transform hover:scale-110 active:scale-95
              ${
                isPrimary
                  ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/50 w-16 h-16 md:w-20 md:h-20'
                  : 'bg-white/10 text-white w-14 h-14 md:w-16 md:h-16 hover:bg-white/20'
              }`}
    >
      {children}
    </button>
    {label && (
      <span className="text-[11px] text-brand-muted font-medium">{label}</span>
    )}
  </div>
);

export default TrailerCard;
