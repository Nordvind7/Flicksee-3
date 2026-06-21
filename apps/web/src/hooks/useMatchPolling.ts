import { useCallback, useEffect, useState } from 'react';
import { getUnseenMatchCount } from '../lib/api';

// Poll the unseen-match count for the Header badge. Only ticks while the tab
// is visible so we don't burn requests on background tabs.
export function useMatchPolling(intervalMs = 30_000) {
  const [count, setCount] = useState(0);

  const refetch = useCallback(async () => {
    try {
      setCount(await getUnseenMatchCount());
    } catch {
      /* transient — try again next tick */
    }
  }, []);

  useEffect(() => {
    void refetch();
    const tick = () => {
      if (document.visibilityState === 'visible') void refetch();
    };
    const id = window.setInterval(tick, intervalMs);
    const onVis = () => {
      if (document.visibilityState === 'visible') void refetch();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [intervalMs, refetch]);

  return { count, refetch };
}
