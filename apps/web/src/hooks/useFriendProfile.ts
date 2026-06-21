import { useCallback, useEffect, useState } from 'react';
import { deleteFriend, getFriendProfile, type FriendProfile } from '../lib/api';

export function useFriendProfile(id: string) {
  const [data, setData] = useState<FriendProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getFriendProfile(id)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((e) => {
        if (!cancelled) setError(e);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const unfriend = useCallback(() => deleteFriend(id), [id]);
  return { data, loading, error, unfriend };
}
