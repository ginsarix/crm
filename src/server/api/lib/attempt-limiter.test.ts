import { describe, expect, it } from 'vitest';
import { createAttemptLimiter } from './attempt-limiter';

describe('createAttemptLimiter', () => {
  it('allows up to max attempts per window, per key', () => {
    let t = 0;
    const limiter = createAttemptLimiter({
      max: 3,
      windowMs: 1000,
      now: () => t,
    });

    expect([1, 2, 3, 4].map(() => limiter.tryAcquire('a'))).toEqual([
      true,
      true,
      true,
      false,
    ]);
    expect(limiter.tryAcquire('b')).toBe(true);

    t = 999;
    expect(limiter.tryAcquire('a')).toBe(false);
    t = 1000;
    expect(limiter.tryAcquire('a')).toBe(true);
  });
});
