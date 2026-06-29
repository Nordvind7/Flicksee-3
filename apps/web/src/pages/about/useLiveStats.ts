import { useEffect, useState } from 'react';

interface LiveStats {
  swipes24h: number | null;
}

const REFRESH_MS = 30_000;

// Poll the public live counter. No auth — uses plain fetch (not api.get,
// which would attach a JWT and complain on unauthed pages). Returns null
// until the first response arrives so the UI can render a "—" placeholder.
export function useLiveStats(): LiveStats {
  const [swipes24h, setSwipes24h] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch('/api/public/live-stats');
        if (!res.ok) return;
        const data = (await res.json()) as { swipes24h: number };
        if (!cancelled) setSwipes24h(data.swipes24h);
      } catch {
        /* transient — keep last value, try again on next tick */
      }
    }
    load();
    const t = window.setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, []);

  return { swipes24h };
}
