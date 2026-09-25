/**
 * In-memory fixed-window attempt counter. Used for endpoints that call
 * better-auth through `auth.api.*` on the server — those calls skip
 * better-auth's own HTTP rate limiter, so they need one of their own.
 *
 * The slot is taken synchronously, before the caller awaits anything, so a
 * batch of parallel calls can't all pass the check before any is counted.
 * Per-process only — fine for the single Node instance this app runs as.
 */
export function createAttemptLimiter(opts: {
  max: number;
  windowMs: number;
  now?: () => number;
}) {
  const now = opts.now ?? Date.now;
  const windows = new Map<string, { count: number; resetAt: number }>();

  return {
    /** Takes an attempt for `key`; false when the window's budget is spent. */
    tryAcquire(key: string): boolean {
      const t = now();
      for (const [k, w] of windows) {
        if (w.resetAt <= t) windows.delete(k);
      }
      const w = windows.get(key);
      if (!w) {
        windows.set(key, { count: 1, resetAt: t + opts.windowMs });
        return true;
      }
      if (w.count >= opts.max) return false;
      w.count++;
      return true;
    },
  };
}
