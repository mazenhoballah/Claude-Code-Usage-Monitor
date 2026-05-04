type Entry<T> = { value: T; expiresAt: number };

export function memoTTL<T>(ttlMs: number, fn: () => Promise<T>): () => Promise<T> {
  let entry: Entry<T> | null = null;
  let inflight: Promise<T> | null = null;
  return async () => {
    const now = Date.now();
    if (entry && entry.expiresAt > now) return entry.value;
    if (inflight) return inflight;
    inflight = (async () => {
      try {
        const value = await fn();
        entry = { value, expiresAt: Date.now() + ttlMs };
        return value;
      } finally {
        inflight = null;
      }
    })();
    return inflight;
  };
}
