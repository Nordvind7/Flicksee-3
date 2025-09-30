import React, { useState, useEffect, useRef } from 'react';
import type { Movie } from '../types';
import { ContentType } from '../types';
import { fetchTrailerKey } from '../services/tmdb';
import { TMDB_BACKDROP_BASE_URL } from '../constants';
import { HeartIcon, XMarkIcon, EyeIcon, InfoIcon, StarIcon, MutedIcon, UnmutedIcon } from './icons';

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
}

const TrailerCard: React.FC<TrailerCardProps> = ({ movie, onSwipe, isActive, contentType }) => {
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [ytApiReady, setYtApiReady] = useState(false);

  const playerRef = useRef<any>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const currentPos = useRef({ x: 0, y: 0 });

  // Ref to hold the most current `isActive` state to be accessible in callbacks like onReady
  const isActiveRef = useRef(isActive);
  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  // Check if the YouTube IFrame API script is ready
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

  // Fetch the trailer key for the movie
  useEffect(() => {
    setIsLoading(true);
    fetchTrailerKey(movie.id, contentType)
      .then(setTrailerKey)
      .finally(() => setIsLoading(false));
  }, [movie.id, contentType]);

  // Create and destroy the YouTube player instance.
  useEffect(() => {
    if (!trailerKey || !ytApiReady) {
      return;
    }

    const onPlayerReady = (event: any) => {
      playerRef.current = event.target;
      playerRef.current.mute();
      setIsMuted(true);
      // If the card is already active when the player becomes ready, play immediately.
      if (isActiveRef.current) {
        playerRef.current.playVideo();
      }
    };

    const playerElement = cardRef.current?.querySelector(`#player-${movie.id}`);
    if (playerElement && !playerRef.current) {
      playerRef.current = new window.YT.Player(playerElement.id, {
        videoId: trailerKey,
        playerVars: {
          autoplay: 1,
          mute: 1,
          controls: 0,
          showinfo: 0,
          rel: 0,
          modestbranding: 1,
          iv_load_policy: 3,
          loop: 1, // Use native YouTube player looping
          playlist: trailerKey, // Required for loop: 1
          fs: 0,
        },
        events: {
          onReady: onPlayerReady,
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

  // Control playback (play/pause) based on `isActive` state.
  useEffect(() => {
    if (playerRef.current && typeof playerRef.current.playVideo === 'function') {
      if (isActive) {
        playerRef.current.playVideo();
      } else {
        playerRef.current.pauseVideo();
      }
    }
  }, [isActive]);


  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card drag when clicking the button
    const player = playerRef.current;
    if (!player || typeof player.isMuted !== 'function') return;

    if (player.isMuted()) {
        player.unMute();
        setIsMuted(false);
    } else {
        player.mute();
        setIsMuted(true);
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
            {isLoading && <p>Загрузка трейлера...</p>}
            {!isLoading && trailerKey && (
              <>
                <div id={`player-${movie.id}`} className="w-full h-full"></div>
                {isActive && (
                   <button
                    onClick={toggleMute}
                    className="absolute bottom-4 right-4 z-10 bg-black/50 rounded-full p-2 text-white hover:bg-black/75 transition-colors"
                    aria-label={isMuted ? "Включить звук" : "Выключить звук"}
                  >
                    {isMuted ? <MutedIcon /> : <UnmutedIcon />}
                  </button>
                )}
              </>
            )}
            {!isLoading && !trailerKey && (
                 <div className="w-full h-full relative">
                    <img src={`${TMDB_BACKDROP_BASE_URL}${movie.backdrop_path}`} alt={movie.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-center p-4">
                        <p>Трейлер не найден.</p>
                    </div>
                </div>
            )}
        </div>
        
        <div className="flex-grow p-4 flex flex-col justify-between bg-brand-surface">
            <div>
                <h2 className="text-2xl font-bold truncate">{movie.title}</h2>
                <div className="flex items-center text-sm text-brand-muted mt-1">
                    <span>{movie.release_date?.substring(0,4) || movie.first_air_date?.substring(0,4)}</span>
                    <span className="mx-2">•</span>
                    <StarIcon />
                    <span className="ml-1">{movie.vote_average.toFixed(1)}</span>
                </div>
                 <div className="mt-2">
                    <button onClick={() => setShowInfo(!showInfo)} className="flex items-center text-sm text-brand-muted hover:text-white transition-colors">
                        <InfoIcon />
                        <span className="ml-1">{showInfo ? 'Скрыть описание' : 'Подробнее'}</span>
                    </button>
                    {showInfo && <p className="text-sm text-brand-secondary mt-2 max-h-24 overflow-y-auto">{movie.overview || "Описание отсутствует."}</p>}
                </div>
            </div>

            <div className="flex justify-around items-center pt-4">
                <ActionButton onClick={() => triggerSwipe('left')} ariaLabel="Не нравится"><XMarkIcon /></ActionButton>
                <ActionButton onClick={() => triggerSwipe('up')} ariaLabel="Смотрел"><EyeIcon /></ActionButton>
                <ActionButton onClick={() => triggerSwipe('right')} ariaLabel="Нравится" isPrimary><HeartIcon /></ActionButton>
            </div>
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
}> = ({ onClick, children, ariaLabel, isPrimary }) => (
    <button
        onClick={onClick}
        aria-label={ariaLabel}
        className={`rounded-full p-4 flex items-center justify-center transition-transform hover:scale-110
            ${isPrimary 
                ? 'bg-brand-primary text-white shadow-lg' 
                : 'bg-white/20 text-white'
            }`
        }
    >
        {children}
    </button>
);


export default TrailerCard;