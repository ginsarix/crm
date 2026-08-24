import type { Prisma, PrismaClient } from 'generated/prisma';
import { z } from 'zod';
import { columnMap } from '~/lib/column-map';
import { findTurkishSearchMatchesInTable } from '../lib/turkish-search';
import { adminProcedure, createTRPCRouter } from '../trpc';

const filterSchema = z.object({
  search: z.string().optional(),
  searchScope: z.enum(['all', ...Object.keys(columnMap.user)]).default('all'),
});

const sortingSchema = z.object({
  id: z.string(),
  desc: z.boolean(),
});

const searchableFields = ['name', 'email'] as const;
type SearchableField = (typeof searchableFields)[number];

const sortableFields = [
  'name',
  'email',
  'lastLoginAt',
  'totalActiveSeconds',
  'loginCount',
  'actionCount',
] as const;
type SortableField = (typeof sortableFields)[number];

function buildOrderBy(
  sorting: { id: string; desc: boolean }[] | undefined,
): Prisma.UserOrderByWithRelationInput[] {
  const orderBy: Prisma.UserOrderByWithRelationInput[] = [];

  for (const sort of sorting ?? []) {
    if (!sortableFields.includes(sort.id as SortableField)) continue;
    const dir = sort.desc ? 'desc' : 'asc';

    if (sort.id === 'loginCount') {
      orderBy.push({ loginEvents: { _count: dir } });
    } else if (sort.id === 'actionCount') {
      orderBy.push({ audits: { _count: dir } });
    } else {
      orderBy.push({ [sort.id]: dir } as Prisma.UserOrderByWithRelationInput);
    }
  }

  if (orderBy.length === 0)
    orderBy.push({ lastLoginAt: { sort: 'desc', nulls: 'last' } });
  return orderBy;
}

interface DeviceIpRow {
  deviceId: string | null;
  ipAddress: string;
  loginCount: number;
  lastLoginAt: Date | null;
  userAgent: string | null;
  activeSeconds: number;
  actionCount: number;
}

// Shared by getDeviceBreakdown (aggregated up to one row per device) and
// getDeviceIpBreakdown (filtered down to one device) — both need the same
// per-(device, IP) union across LoginEvent/UserDailyActivity/AuditLog, the
// same three-groupBy-merged-in-JS approach the old getIpBreakdown used,
// just with deviceId added as a second grouping dimension.
async function getDeviceIpRows(
  db: PrismaClient,
  userId: string,
): Promise<DeviceIpRow[]> {
  const [logins, loginCounts, activity, actions] = await Promise.all([
    db.loginEvent.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      distinct: ['deviceId', 'ipAddress'],
      select: {
        deviceId: true,
        ipAddress: true,
        createdAt: true,
        userAgent: true,
      },
    }),
    db.loginEvent.groupBy({
      by: ['deviceId', 'ipAddress'],
      where: { userId },
      _count: true,
    }),
    db.userDailyActivity.groupBy({
      by: ['deviceId', 'ipAddress'],
      where: { userId },
      _sum: { activeSeconds: true },
    }),
    db.auditLog.groupBy({
      by: ['deviceId', 'ipAddress'],
      where: { userId },
      _count: true,
    }),
  ]);

  const rows = new Map<string, DeviceIpRow>();
  // Safe delimiter: deviceId is either '' or a Prisma cuid ([a-z0-9] only,
  // never contains ':'), so this can never collide with an IPv6 address
  // (which does contain ':').
  const rowKey = (deviceId: string | null, ipAddress: string) =>
    `${deviceId ?? ''}:${ipAddress}`;

  const getRow = (deviceId: string | null, ipAddress: string) => {
    const k = rowKey(deviceId, ipAddress);
    let row = rows.get(k);
    if (!row) {
      row = {
        deviceId,
        ipAddress,
        loginCount: 0,
        lastLoginAt: null,
        userAgent: null,
        activeSeconds: 0,
        actionCount: 0,
      };
      rows.set(k, row);
    }
    return row;
  };

  for (const l of logins) {
    const row = getRow(l.deviceId, l.ipAddress);
    row.lastLoginAt = l.createdAt;
    row.userAgent = l.userAgent;
  }
  for (const c of loginCounts) {
    getRow(c.deviceId, c.ipAddress).loginCount = c._count;
  }
  for (const a of activity) {
    getRow(a.deviceId, a.ipAddress).activeSeconds = a._sum.activeSeconds ?? 0;
  }
  for (const a of actions) {
    getRow(a.deviceId, a.ipAddress).actionCount = a._count;
  }

  return Array.from(rows.values());
}

export const userReportRouter = createTRPCRouter({
  get: adminProcedure
    .input(
      z.object({
        filter: filterSchema.optional(),
        sorting: z.array(sortingSchema).optional(),
        page: z.number().min(1).default(1),
        itemsPerPage: z.number().min(1).max(500).default(25),
      }),
    )
    .query(async ({ ctx, input }) => {
      const whereClause: Prisma.UserWhereInput = {};

      if (input.filter?.search) {
        const searchValue = input.filter.search;
        const scope = input.filter.searchScope;
        const fields =
          scope === 'all'
            ? searchableFields
            : searchableFields.includes(scope as SearchableField)
              ? [scope as SearchableField]
              : [];

        if (fields.length > 0) {
          whereClause.id = {
            in: await findTurkishSearchMatchesInTable(
              ctx.db,
              'user',
              fields,
              searchValue,
            ),
          };
        }
      }

      const orderBy = buildOrderBy(input.sorting);

      const totalItems = await ctx.db.user.count({ where: whereClause });
      const totalPages = Math.ceil(totalItems / input.itemsPerPage);

      const users = await ctx.db.user.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          email: true,
          totalActiveSeconds: true,
          lastLoginAt: true,
          _count: { select: { loginEvents: true, audits: true } },
        },
        orderBy,
        skip: (input.page - 1) * input.itemsPerPage,
        take: input.itemsPerPage,
      });

      return {
        data: users.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          totalActiveSeconds: u.totalActiveSeconds,
          lastLoginAt: u.lastLoginAt,
          loginCount: u._count.loginEvents,
          actionCount: u._count.audits,
        })),
        pagination: { totalItems, totalPages },
      };
    }),
  getDeviceBreakdown: adminProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const [ipRows, deviceUsers] = await Promise.all([
        getDeviceIpRows(ctx.db, input.userId),
        ctx.db.deviceUser.findMany({
          where: { userId: input.userId },
          select: {
            deviceId: true,
            firstSeenAt: true,
            lastSeenAt: true,
            device: { select: { lastUserAgent: true } },
          },
        }),
      ]);

      const deviceMeta = new Map(deviceUsers.map((du) => [du.deviceId, du]));

      const devices = new Map<
        string | null,
        {
          deviceId: string | null;
          lastUserAgent: string | null;
          firstSeenAt: Date | null;
          lastSeenAt: Date | null;
          loginCount: number;
          activeSeconds: number;
          actionCount: number;
          ipCount: number;
        }
      >();

      const getDevice = (deviceId: string | null) => {
        let device = devices.get(deviceId);
        if (!device) {
          const meta = deviceId ? deviceMeta.get(deviceId) : undefined;
          device = {
            deviceId,
            lastUserAgent: meta?.device.lastUserAgent ?? null,
            firstSeenAt: meta?.firstSeenAt ?? null,
            lastSeenAt: meta?.lastSeenAt ?? null,
            loginCount: 0,
            activeSeconds: 0,
            actionCount: 0,
            ipCount: 0,
          };
          devices.set(deviceId, device);
        }
        return device;
      };

      // ipRows already has exactly one entry per (deviceId, ipAddress) pair
      // for this user, so summing across matching rows per device also
      // gives the correct distinct-IP count (ipCount) for free.
      for (const row of ipRows) {
        const device = getDevice(row.deviceId);
        device.loginCount += row.loginCount;
        device.activeSeconds += row.activeSeconds;
        device.actionCount += row.actionCount;
        device.ipCount += 1;
      }

      return Array.from(devices.values()).sort(
        (a, b) => b.loginCount - a.loginCount,
      );
    }),
  getDeviceIpBreakdown: adminProcedure
    .input(z.object({ userId: z.string(), deviceId: z.string().nullable() }))
    .query(async ({ ctx, input }) => {
      const ipRows = await getDeviceIpRows(ctx.db, input.userId);
      return ipRows
        .filter((row) => row.deviceId === input.deviceId)
        .sort((a, b) => b.loginCount - a.loginCount);
    }),
});
