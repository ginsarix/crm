import type { Prisma } from 'generated/prisma';
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
  getIpBreakdown: adminProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const [logins, loginCounts, activity, actions] = await Promise.all([
        // Not a groupBy: we also need the most recent userAgent per IP, and
        // groupBy can only aggregate (count/sum/max) — it can't return a
        // sibling field like userAgent from the row that produced the max.
        // `distinct: ['ipAddress']` + desc order gives Postgres a
        // SELECT DISTINCT ON, so this returns exactly one (the freshest)
        // row per IP instead of the user's entire login history.
        ctx.db.loginEvent.findMany({
          where: { userId: input.userId },
          orderBy: { createdAt: 'desc' },
          distinct: ['ipAddress'],
          select: { ipAddress: true, createdAt: true, userAgent: true },
        }),
        ctx.db.loginEvent.groupBy({
          by: ['ipAddress'],
          where: { userId: input.userId },
          _count: true,
        }),
        ctx.db.userDailyActivity.groupBy({
          by: ['ipAddress'],
          where: { userId: input.userId },
          _sum: { activeSeconds: true },
        }),
        ctx.db.auditLog.groupBy({
          by: ['ipAddress'],
          where: { userId: input.userId },
          _count: true,
        }),
      ]);

      const rows = new Map<
        string,
        {
          ipAddress: string;
          loginCount: number;
          lastLoginAt: Date | null;
          userAgent: string | null;
          activeSeconds: number;
          actionCount: number;
        }
      >();

      const getRow = (ip: string) => {
        let row = rows.get(ip);
        if (!row) {
          row = {
            ipAddress: ip,
            loginCount: 0,
            lastLoginAt: null,
            userAgent: null,
            activeSeconds: 0,
            actionCount: 0,
          };
          rows.set(ip, row);
        }
        return row;
      };

      // logins holds one (the freshest, per the desc + distinct query above)
      // row per IP — exactly the lastLoginAt/userAgent we want.
      for (const l of logins) {
        const row = getRow(l.ipAddress);
        row.lastLoginAt = l.createdAt;
        row.userAgent = l.userAgent;
      }
      for (const c of loginCounts) {
        getRow(c.ipAddress).loginCount = c._count;
      }
      for (const a of activity) {
        getRow(a.ipAddress).activeSeconds = a._sum.activeSeconds ?? 0;
      }
      for (const a of actions) {
        getRow(a.ipAddress).actionCount = a._count;
      }

      return Array.from(rows.values()).sort(
        (a, b) => b.loginCount - a.loginCount,
      );
    }),
});
