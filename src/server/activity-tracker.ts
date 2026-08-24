import { HEARTBEAT_INTERVAL_SECONDS } from '~/constants/activity';
import { db } from '~/server/db';
import { resolveDeviceId } from '~/server/lib/resolve-device-id';

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
  userId: string;
  ipAddress: string;
  deviceUuid: string | null;
  userAgent: string | null;
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

function accumulatorKey(
  userId: string,
  ipAddress: string,
  deviceUuid: string | null,
) {
  return `${userId}:${ipAddress}:${deviceUuid ?? ''}`;
}

export function recordHeartbeat(
  userId: string,
  ipAddress: string,
  deviceUuid: string | null,
  userAgent: string | null,
) {
  const now = Date.now();
  const key = accumulatorKey(userId, ipAddress, deviceUuid);
  const existing = accumulator.get(key);

  if (existing && now - existing.lastCreditedAt < MIN_CREDIT_GAP_MS) {
    return;
  }

  accumulator.set(key, {
    userId,
    ipAddress,
    deviceUuid,
    userAgent,
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

  const entries = [...accumulator.values()];
  accumulator.clear();

  const date = startOfTodayUtc();

  await Promise.all(
    entries.map(
      async ({ userId, ipAddress, deviceUuid, userAgent, pendingSeconds }) => {
        if (pendingSeconds <= 0) return;

        try {
          // Resolving here (once per flush, every ~2 minutes per active
          // user+ip+device) rather than per-heartbeat (every ~30s) keeps
          // the heartbeat mutation itself DB-free, matching the batching
          // this module already does for UserDailyActivity/totalActiveSeconds.
          const deviceId = await resolveDeviceId(deviceUuid, userId, userAgent);

          await db.$transaction(async (tx) => {
            await tx.user.update({
              where: { id: userId },
              data: { totalActiveSeconds: { increment: pendingSeconds } },
            });

            if (deviceId === null) {
              // Prisma's compound-unique `where` requires every key
              // column to be a concrete value, including deviceId — even
              // though the column itself is nullable and the @@unique
              // constraint permits null. Passing null there throws
              // PrismaClientValidationError at runtime (verified
              // directly against the generated client), so the null
              // case can't go through upsert's compound-key `where` and
              // needs a find-then-branch instead.
              const existing = await tx.userDailyActivity.findFirst({
                where: { userId, date, ipAddress, deviceId: null },
                select: { id: true },
              });
              if (existing) {
                await tx.userDailyActivity.update({
                  where: { id: existing.id },
                  data: { activeSeconds: { increment: pendingSeconds } },
                });
              } else {
                await tx.userDailyActivity.create({
                  data: {
                    userId,
                    date,
                    ipAddress,
                    deviceId: null,
                    activeSeconds: pendingSeconds,
                  },
                });
              }
            } else {
              await tx.userDailyActivity.upsert({
                where: {
                  userId_date_ipAddress_deviceId: {
                    userId,
                    date,
                    ipAddress,
                    deviceId,
                  },
                },
                update: { activeSeconds: { increment: pendingSeconds } },
                create: {
                  userId,
                  date,
                  ipAddress,
                  deviceId,
                  activeSeconds: pendingSeconds,
                },
              });
            }
          });
        } catch (error) {
          // Analytics-grade counter, not billing — drop on failure (e.g.
          // the user was deleted between heartbeat and flush) rather
          // than retry.
          console.error(`Activity flush failed for user ${userId}:`, error);
        }
      },
    ),
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
