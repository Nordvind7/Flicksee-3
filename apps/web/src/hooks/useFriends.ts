import { useCallback, useEffect, useState } from 'react';
import { createInvite, getFriends, type FriendSummary, type InviteResponse } from '../lib/api';

export function useFriends() {
  const [friends, setFriends] = useState<FriendSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      setFriends(await getFriends());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const invite = useCallback(async (): Promise<InviteResponse> => createInvite(), []);

  return { friends, loading, refetch, invite };
}
