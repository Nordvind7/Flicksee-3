import React, { useEffect, useState } from 'react';
import { fetchWatchProviders, type WatchProviders } from '../services/tmdb';
import type { ContentType } from '../types';
import { tmdbImg } from '../constants';

// Compact "Где смотреть" strip. Pulls TMDB /watch/providers (RU) on mount
// and renders up to 6 provider logos that deep-link to JustWatch (TMDB's
// official aggregator — the RU link auto-redirects you to whichever service
// you have an active subscription with).
interface Props {
  tmdbId: number;
  contentType: ContentType;
  compact?: boolean;
}

const WatchProvidersRow: React.FC<Props> = ({ tmdbId, contentType, compact }) => {
  const [providers, setProviders] = useState<WatchProviders | null | 'loading'>('loading');

  useEffect(() => {
    let cancelled = false;
    setProviders('loading');
    fetchWatchProviders(tmdbId, contentType).then((p) => {
      if (!cancelled) setProviders(p);
    });
    return () => {
      cancelled = true;
    };
  }, [tmdbId, contentType]);

  if (providers === 'loading') return null;
  if (!providers) return null;

  // Prefer subscription (flatrate); fall back to rent/buy if no subscription.
  const list = providers.flatrate.length
    ? providers.flatrate
    : providers.rent.length
    ? providers.rent
    : providers.buy;

  if (list.length === 0) return null;

  const tag = providers.flatrate.length
    ? 'По подписке'
    : providers.rent.length
    ? 'В аренде'
    : 'К покупке';

  const link = providers.link ?? `https://www.themoviedb.org/${contentType}/${tmdbId}/watch?locale=RU`;
  const visible = list.slice(0, 6);

  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={`flex items-center gap-2 rounded-xl ring-1 ring-white/5 hover:ring-white/15 transition-all group ${
        compact ? 'px-2 py-1.5' : 'px-3 py-2'
      }`}
      style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
    >
      <span className={`text-ink-200 font-medium shrink-0 ${compact ? 'text-[10px]' : 'text-xs'}`}>
        {tag}
      </span>
      <div className="flex items-center gap-1.5 flex-1 min-w-0 overflow-hidden">
        {visible.map((p) => (
          <img
            key={p.provider_id}
            src={tmdbImg('w92', p.logo_path)}
            alt={p.provider_name}
            title={p.provider_name}
            className={`shrink-0 rounded-md ${compact ? 'w-5 h-5' : 'w-6 h-6'}`}
            loading="lazy"
          />
        ))}
      </div>
      <span className="text-ink-200 group-hover:text-white transition-colors text-xs shrink-0">
        →
      </span>
    </a>
  );
};

export default WatchProvidersRow;
