import { HEARTBEAT_INTERVAL_SECONDS } from '~/constants/activity';
import { db } from '~/server/db';

// Heartbeats never touch the DB directly — they just add to an in-memory
// buffer here, which a periodic job flushes as one batched write per user.
// This keeps DB write volume tied to the flush interval, not to how many
// users are active or how often they heartbeat.
const FLUSH_INTERVAL_MS = 2 * 60 * 1000;

// Multiple tabs from the same user each pass their own visibility/idle
// checks and would otherwise all heartbeat independently. Ignoring
// heartbeats that arrive within one interval of the last credited one
// collapses any number of tabs down to a single credit per window.
//
// The gap must be close to the FULL interval, not interval-minus-a-fixed-
// chunk: independent tabs' timers aren't phase-aligned, so their heartbeats
// drift apart over time. A fixed subtraction that's a large fraction of the
// interval leaves a wide window where a second tab's heartbeat lands far
// enough from the first's to also get credited, defeating the dedup.
// Subtracting a small constant (just enough for network/processing jitter)
// keeps that uncovered window tiny regardless of interval length.
const CREDIT_JITTER_MS = 2000;
const MIN_CREDIT_GAP_MS = HEARTBEAT_INTERVAL_SECONDS * 1000 - CREDIT_JITTER_MS;

interface UserAccumulator {
  pendingSeconds: number;
  lastCreditedAt: number;
}

declare global {
  var __activityAccumulator: Map<string, UserAccumulator> | undefined;
  var __activityFlushStarted: boolean | undefined;
}

const accumulator =
  globalThis.__activityAccumulator ?? new Map<string, UserAccumulator>();
globalThis.__activityAccumulator = accumulator;

export function recordHeartbeat(userId: string) {
  const now = Date.now();
  const existing = accumulator.get(userId);

  if (existing && now - existing.lastCreditedAt < MIN_CREDIT_GAP_MS) {
    return;
  }

  accumulator.set(userId, {
    pendingSeconds:
      (existing?.pendingSeconds ?? 0) + HEARTBEAT_INTERVAL_SECONDS,
    lastCreditedAt: now,
  });
}

function startOfTodayUtc() {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

export async function flushActivity() {
  if (accumulator.size === 0) return;

  const entries = [...accumulator.entries()];
  accumulator.clear();

  const date = startOfTodayUtc();

  await Promise.all(
    entries.map(async ([userId, { pendingSeconds }]) => {
      if (pendingSeconds <= 0) return;

      try {
        await db.$transaction([
          db.user.update({
            where: { id: userId },
            data: { totalActiveSeconds: { increment: pendingSeconds } },
          }),
          db.userDailyActivity.upsert({
            where: { userId_date_ipAddress: { userId, date, ipAddress: "unknown" } },
            update: { activeSeconds: { increment: pendingSeconds } },
            create: { userId, date, ipAddress: "unknown", activeSeconds: pendingSeconds },
          }),
        ]);
      } catch (error) {
        // Analytics-grade counter, not billing — drop on failure (e.g. the
        // user was deleted between heartbeat and flush) rather than retry.
        console.error(`Activity flush failed for user ${userId}:`, error);
      }
    }),
  );
}

export function startActivityFlushLoop() {
  if (globalThis.__activityFlushStarted) return;
  globalThis.__activityFlushStarted = true;

  setInterval(() => {
    void flushActivity();
  }, FLUSH_INTERVAL_MS);

  const flushOnShutdown = () => {
    void flushActivity();
  };
  process.once('SIGTERM', flushOnShutdown);
  process.once('SIGINT', flushOnShutdown);
}
