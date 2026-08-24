import { recordHeartbeat } from '~/server/activity-tracker';
import { normalizeIp } from '~/server/lib/normalize-ip';
import { getDeviceUuid } from '~/server/lib/resolve-device-id';
import { createTRPCRouter, protectedProcedure } from '../trpc';

export const activityRouter = createTRPCRouter({
  // Intentionally not audit-logged — this fires every ~30s per active tab,
  // and only ever touches an in-memory buffer (see activity-tracker.ts), so
  // logging it would just relocate the write-volume problem into AuditLog.
  // getDeviceUuid is a pure header read (no DB) — the actual device
  // resolution/upsert is deferred to the periodic flush, same reasoning.
  heartbeat: protectedProcedure.mutation(({ ctx }) => {
    recordHeartbeat(
      ctx.session.user.id,
      normalizeIp(ctx.session.session.ipAddress),
      getDeviceUuid(ctx.headers),
    );
  }),
});
