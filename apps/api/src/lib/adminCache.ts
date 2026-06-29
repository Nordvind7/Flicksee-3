// Tiny per-process TTL cache for admin endpoints. Single-instance API server
// means we don't need Redis. Map cleanup is lazy — entries are checked on read.
interface Entry<T> {
  value: T;
  expiresAt: number;
}

const store = new Map<string, Entry<unknown>>();

export async function cached<T>(
  key: string,
  ttlMs: number,
  fn: () => Promise<T>,
): Promise<T> {
  const now = Date.now();
  const hit = store.get(key) as Entry<T> | undefined;
  if (hit && hit.expiresAt > now) {
    return hit.value;
  }
  const value = await fn();
  store.set(key, { value, expiresAt: now + ttlMs });
  return value;
}

export function clearCache(key?: string): void {
  if (key) store.delete(key);
  else store.clear();
}
