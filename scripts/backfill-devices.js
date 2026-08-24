import { PrismaClient } from '../generated/prisma/index.js';

/** @typedef {import('../generated/prisma/index.js').Prisma.TransactionClient} TransactionClient */

const db = new PrismaClient();

/**
 * Groups LoginEvent rows with no deviceId by (userId, userAgent) and gives
 * each group a synthetic Device — userAgent is the closest available proxy
 * for "device" in data that predates the device_uuid cookie. Rows with no
 * userAgent are left alone (deviceId stays null) rather than inventing a
 * device for "no user agent" — they fall into the report's per-user
 * "Bilinmeyen cihaz" bucket, same as any other unmatched row.
 *
 * @param {TransactionClient} tx
 */
async function synthesizeLegacyDevices(tx) {
  const ungrouped = await tx.loginEvent.findMany({
    where: { deviceId: null, userAgent: { not: null } },
    select: { id: true, userId: true, userAgent: true, createdAt: true },
  });

  const groups = new Map();
  for (const row of ungrouped) {
    if (!row.userAgent) continue;
    const key = `${row.userId}:${row.userAgent}`;
    let group = groups.get(key);
    if (!group) {
      group = {
        userId: row.userId,
        userAgent: row.userAgent,
        loginEventIds: [],
        firstSeenAt: row.createdAt,
        lastSeenAt: row.createdAt,
      };
      groups.set(key, group);
    }
    group.loginEventIds.push(row.id);
    if (row.createdAt < group.firstSeenAt) group.firstSeenAt = row.createdAt;
    if (row.createdAt > group.lastSeenAt) group.lastSeenAt = row.createdAt;
  }

  let devicesCreated = 0;
  for (const group of groups.values()) {
    const device = await tx.device.create({
      data: {
        deviceUuid: `legacy-${crypto.randomUUID()}`,
        lastUserAgent: group.userAgent,
      },
    });
    await tx.deviceUser.create({
      data: {
        deviceId: device.id,
        userId: group.userId,
        firstSeenAt: group.firstSeenAt,
        lastSeenAt: group.lastSeenAt,
      },
    });
    await tx.loginEvent.updateMany({
      where: { id: { in: group.loginEventIds } },
      data: { deviceId: device.id },
    });
    devicesCreated += 1;
  }

  return devicesCreated;
}

/**
 * For each (userId, ipAddress) pair seen in the just-assigned LoginEvent
 * rows, picks the device with the most logins from that IP (tie-break:
 * most recent) — the best guess for "which device used this IP" when
 * backfilling tables that never recorded a userAgent of their own.
 * 'unknown' is never a real IP (better-auth's own not-resolved sentinel —
 * see src/server/lib/normalize-ip.ts) so it's excluded here: attributing
 * "we couldn't determine the IP" to whichever device happened to have the
 * most such logins would be a false positive, not a best guess.
 *
 * @param {TransactionClient} tx
 */
async function buildIpDeviceMap(tx) {
  const assigned = await tx.loginEvent.findMany({
    where: { deviceId: { not: null }, ipAddress: { not: 'unknown' } },
    select: { userId: true, ipAddress: true, deviceId: true, createdAt: true },
  });

  const counts = new Map();
  for (const row of assigned) {
    const key = `${row.userId}:${row.ipAddress}:${row.deviceId}`;
    const existing = counts.get(key);
    if (!existing) {
      counts.set(key, {
        userId: row.userId,
        ipAddress: row.ipAddress,
        deviceId: row.deviceId,
        count: 1,
        lastSeenAt: row.createdAt,
      });
    } else {
      existing.count += 1;
      if (row.createdAt > existing.lastSeenAt)
        existing.lastSeenAt = row.createdAt;
    }
  }

  const best = new Map();
  for (const entry of counts.values()) {
    const key = `${entry.userId}:${entry.ipAddress}`;
    const current = best.get(key);
    if (
      !current ||
      entry.count > current.count ||
      (entry.count === current.count && entry.lastSeenAt > current.lastSeenAt)
    ) {
      best.set(key, entry);
    }
  }

  const ipDeviceMap = new Map();
  for (const entry of best.values()) {
    ipDeviceMap.set(`${entry.userId}:${entry.ipAddress}`, entry.deviceId);
  }
  return ipDeviceMap;
}

/**
 * AuditLog has no unique constraint touching deviceId, so a batched
 * updateMany per resolved device is always safe (no unique-constraint
 * collision possible) and avoids one round trip per row — this table can
 * be much larger than UserDailyActivity in production.
 *
 * @param {TransactionClient} tx
 * @param {Map<string, string>} ipDeviceMap
 */
async function backfillAuditLog(tx, ipDeviceMap) {
  const rows = await tx.auditLog.findMany({
    where: { deviceId: null, ipAddress: { not: 'unknown' } },
    select: { id: true, userId: true, ipAddress: true },
  });

  const idsByDevice = new Map();
  for (const row of rows) {
    const deviceId = ipDeviceMap.get(`${row.userId}:${row.ipAddress}`);
    if (!deviceId) continue;
    const ids = idsByDevice.get(deviceId) ?? [];
    ids.push(row.id);
    idsByDevice.set(deviceId, ids);
  }

  let updated = 0;
  for (const [deviceId, ids] of idsByDevice) {
    const result = await tx.auditLog.updateMany({
      where: { id: { in: ids } },
      data: { deviceId },
    });
    updated += result.count;
  }
  return updated;
}

/**
 * UserDailyActivity IS unique on (userId, date, ipAddress, deviceId), so
 * unlike AuditLog this can't be safely batched with a blind updateMany —
 * a per-row update, with a P2002 catch for the rare deploy-day collision
 * described below, is required.
 *
 * @param {TransactionClient} tx
 * @param {Map<string, string>} ipDeviceMap
 */
async function backfillUserDailyActivity(tx, ipDeviceMap) {
  const rows = await tx.userDailyActivity.findMany({
    where: { deviceId: null, ipAddress: { not: 'unknown' } },
    select: { id: true, userId: true, ipAddress: true },
  });

  let updated = 0;
  for (const row of rows) {
    const deviceId = ipDeviceMap.get(`${row.userId}:${row.ipAddress}`);
    if (!deviceId) continue;
    try {
      await tx.userDailyActivity.update({
        where: { id: row.id },
        data: { deviceId },
      });
      updated += 1;
    } catch (err) {
      // Unique on (userId, date, ipAddress, deviceId). On deploy day, a
      // legacy (deviceId: null) row and a fresh real-deviceId row can
      // both exist for the same (userId, date, ipAddress) if a user was
      // active both before and after the deploy — updating the legacy
      // row to that same deviceId would collide. Leave it at
      // deviceId: null (falls into the "unknown device" bucket) rather
      // than aborting the whole transaction over one ambiguous row.
      if (
        err &&
        typeof err === 'object' &&
        'code' in err &&
        err.code === 'P2002'
      ) {
        continue;
      }
      throw err;
    }
  }
  return updated;
}

async function main() {
  const result = await db.$transaction(
    async (tx) => {
      console.log('Phase 1: synthesizing legacy devices from LoginEvent...');
      const devicesCreated = await synthesizeLegacyDevices(tx);
      console.log(`  -> ${devicesCreated} device(s) created`);

      console.log('Phase 2: building IP -> device map...');
      const ipDeviceMap = await buildIpDeviceMap(tx);
      console.log(
        `  -> ${ipDeviceMap.size} (userId, ipAddress) pair(s) mapped`,
      );

      console.log('Phase 3: backfilling UserDailyActivity...');
      const activityUpdated = await backfillUserDailyActivity(tx, ipDeviceMap);
      console.log(`  -> ${activityUpdated} row(s) updated`);

      console.log('Phase 4: backfilling AuditLog...');
      const auditLogUpdated = await backfillAuditLog(tx, ipDeviceMap);
      console.log(`  -> ${auditLogUpdated} row(s) updated`);

      return { devicesCreated, activityUpdated, auditLogUpdated };
    },
    { timeout: 5 * 60 * 1000 },
  );

  console.log('Backfill complete:', result);
}

main()
  .catch((err) => {
    console.error('Backfill failed, transaction rolled back:', err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
