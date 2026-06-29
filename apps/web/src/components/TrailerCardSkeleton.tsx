import React from 'react';

/**
 * Skeleton-плейсхолдер пока первая карточка грузится. Раньше показывали
 * текст «Загружаем...» — юзер с медленным интернетом видел чёрный экран
 * и думал что app зависнул. Скелет даёт визуальную предсказуемость:
 * «вот тут будет видео, тут текст, тут кнопки».
 *
 * Размеры и пропорции один-в-один с TrailerCard.
 */
const TrailerCardSkeleton: React.FC = () => {
  return (
    <div className="w-full max-w-lg h-full mx-auto flex items-center justify-center px-2 py-1 sm:py-3">
      <div
        className="w-full rounded-3xl overflow-hidden ring-1 ring-white/5 flex flex-col animate-pulse"
        style={{ backgroundColor: '#16161a' }}
      >
        {/* Video area — с пульсирующим красным glow в центре, чтобы было
            видно даже в Telegram WebView с подавленным emoji-рендером. */}
        <div
          className="aspect-video w-full flex items-center justify-center"
          style={{ backgroundColor: '#1f1f25' }}
        >
          <div
            className="w-12 h-12 rounded-full"
            style={{
              background: 'linear-gradient(135deg, #E50914 0%, #ff6a3d 100%)',
              boxShadow: '0 0 32px rgba(229,9,20,0.7)',
            }}
          />
        </div>
        {/* Title / meta */}
        <div className="p-5 sm:p-6 space-y-3">
          <div className="h-8 w-2/3 rounded-md" style={{ backgroundColor: '#2a2a32' }} />
          <div className="flex items-center gap-2">
            <div className="h-4 w-10 rounded" style={{ backgroundColor: '#2a2a32' }} />
            <div className="h-4 w-1 rounded-full" style={{ backgroundColor: '#2a2a32' }} />
            <div className="h-4 w-10 rounded" style={{ backgroundColor: '#2a2a32' }} />
          </div>
          <div className="flex gap-2">
            <div className="h-6 w-16 rounded-full" style={{ backgroundColor: '#1f1f25' }} />
            <div className="h-6 w-20 rounded-full" style={{ backgroundColor: '#1f1f25' }} />
          </div>
          <div className="space-y-2 pt-2">
            <div className="h-3 w-full rounded" style={{ backgroundColor: '#2a2a32' }} />
            <div className="h-3 w-5/6 rounded" style={{ backgroundColor: '#2a2a32' }} />
            <div className="h-3 w-4/6 rounded" style={{ backgroundColor: '#2a2a32' }} />
          </div>
          {/* Buttons row */}
          <div className="flex justify-around pt-5">
            <div className="w-14 h-14 rounded-full" style={{ backgroundColor: '#1f1f25' }} />
            <div className="w-14 h-14 rounded-full" style={{ backgroundColor: '#1f1f25' }} />
            <div className="w-16 h-16 rounded-full" style={{ backgroundColor: '#2a2a32' }} />
            <div className="w-14 h-14 rounded-full" style={{ backgroundColor: '#1f1f25' }} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrailerCardSkeleton;
