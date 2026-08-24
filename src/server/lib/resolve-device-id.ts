import { DEVICE_UUID_HEADER } from '~/constants/device';
import { db } from '~/server/db';

// Reads the device id the proxy (src/proxy.ts) forwards on every matched
// request — never parses the raw Cookie header, since the proxy already
// normalizes both the "existing cookie" and "just minted" cases into this
// one header.
export function getDeviceUuid(headers: Headers): string | null {
  return headers.get(DEVICE_UUID_HEADER);
}

// Finds-or-creates the Device row for a deviceUuid and records that this
// user has been seen on it, bumping DeviceUser.lastSeenAt. Returns null
// when there's no deviceUuid to resolve (e.g. a request that bypassed the
// proxy) or if the upserts fail — callers treat a null deviceId as
// "unknown device", not an error, matching how ipAddress already falls
// back to an 'unknown' sentinel elsewhere in this codebase rather than
// letting a telemetry failure break the primary action.
export async function resolveDeviceId(
  deviceUuid: string | null,
  userId: string,
  userAgent?: string | null,
): Promise<string | null> {
  if (!deviceUuid) return null;

  try {
    const device = await db.device.upsert({
      where: { deviceUuid },
      update: {},
      create: { deviceUuid, lastUserAgent: userAgent ?? null },
    });

    await db.deviceUser.upsert({
      where: { deviceId_userId: { deviceId: device.id, userId } },
      update: { lastSeenAt: new Date() },
      create: { deviceId: device.id, userId },
    });

    return device.id;
  } catch (err) {
    console.error('Failed to resolve device:', err);
    return null;
  }
}
