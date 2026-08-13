import { Prisma } from 'generated/prisma';
import { z } from 'zod';
import { findTurkishSearchMatches } from '../lib/turkish-search';
import {
  adminProcedure,
  createAuditLog,
  createTRPCRouter,
  protectedProcedure,
} from '../trpc';

const filterSchema = z.object({
  search: z.string().optional(),
  action: z.string().optional(),
  resourceType: z.string().optional(),
  result: z.enum(['SUCCESS', 'FAILURE', 'all']).default('all'),
  userId: z.string().optional(),
  ipAddress: z.string().optional(),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
});

const sortingSchema = z.object({
  id: z.string(),
  desc: z.boolean(),
});

// Sortable fields
const sortableFields = [
  'action',
  'resourceType',
  'result',
  'createdAt',
] as const;

type SortableField = (typeof sortableFields)[number];

export const auditLogRouter = createTRPCRouter({
  getTotal: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.db.auditLog.count();
  }),
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
      const whereClause: Prisma.AuditLogWhereInput = {};

      // Search filter
      if (input.filter?.search) {
        const ownColumns = [
          'action',
          'resourceType',
          'resourceId',
          'details',
          'error',
        ].map((field) => Prisma.raw(`"AuditLog"."${field}"`));
        const userColumns = ['name', 'email'].map((field) =>
          Prisma.raw(`"user"."${field}"`),
        );

        whereClause.id = {
          in: await findTurkishSearchMatches(
            ctx.db,
            Prisma.raw(
              '"AuditLog" LEFT JOIN "user" ON "AuditLog"."userId" = "user"."id"',
            ),
            Prisma.raw('"AuditLog"."id"'),
            [...ownColumns, ...userColumns],
            input.filter.search,
          ),
        };
      }

      // Action filter
      if (input.filter?.action) {
        whereClause.action = input.filter.action;
      }

      // Resource type filter
      if (input.filter?.resourceType) {
        whereClause.resourceType = input.filter.resourceType;
      }

      // Result filter
      if (input.filter?.result && input.filter.result !== 'all') {
        whereClause.result = input.filter.result;
      }

      // User filter
      if (input.filter?.userId) {
        whereClause.userId = input.filter.userId;
      }

      // IP address filter
      if (input.filter?.ipAddress) {
        whereClause.ipAddress = input.filter.ipAddress;
      }

      // Date range filter
      if (input.filter?.dateFrom || input.filter?.dateTo) {
        whereClause.createdAt = {};
        if (input.filter.dateFrom) {
          whereClause.createdAt.gte = input.filter.dateFrom;
        }
        if (input.filter.dateTo) {
          whereClause.createdAt.lte = input.filter.dateTo;
        }
      }

      // Build orderBy clause
      const orderBy: Prisma.AuditLogOrderByWithRelationInput[] = [];

      if (input.sorting && input.sorting.length > 0) {
        for (const sort of input.sorting) {
          if (sortableFields.includes(sort.id as SortableField)) {
            orderBy.push({
              [sort.id]: sort.desc ? 'desc' : 'asc',
            });
          }
        }
      }

      // Default sort if no sorting provided
      if (orderBy.length === 0) {
        orderBy.push({ createdAt: 'desc' });
      }

      const [totalItems, data] = await Promise.all([
        ctx.db.auditLog.count({ where: whereClause }),
        ctx.db.auditLog.findMany({
          where: whereClause,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
          skip: (input.page - 1) * input.itemsPerPage,
          take: input.itemsPerPage,
          orderBy,
        }),
      ]);
      const totalPages = Math.ceil(totalItems / input.itemsPerPage);

      return {
        data,
        pagination: {
          totalItems,
          totalPages,
        },
      };
    }),
  // NOT locked to adminProcedure like get/getById below: /panel/dashboard
  // (accessible to every authenticated user, not just admins) calls this
  // unconditionally to show the latest audit action. Tightening this to
  // adminProcedure would throw FORBIDDEN inside that page's server-side
  // Promise.all for every non-admin user and break the dashboard. This
  // still leaks the latest row's ipAddress to non-admins — flagged for the
  // controller rather than fixed here, see final-fix-report.md.
  getLatest: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.db.auditLog.findFirst({
      orderBy: { createdAt: 'desc' },
    });
  }),
  getById: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.auditLog.findUnique({
        where: { id: input.id },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      });
    }),
  getDistinctActions: protectedProcedure.query(async ({ ctx }) => {
    const actions = await ctx.db.auditLog.findMany({
      select: { action: true },
      distinct: ['action'],
      orderBy: { action: 'asc' },
    });
    return actions.map((a) => a.action);
  }),
  getDistinctResourceTypes: protectedProcedure.query(async ({ ctx }) => {
    const types = await ctx.db.auditLog.findMany({
      select: { resourceType: true },
      distinct: ['resourceType'],
      orderBy: { resourceType: 'asc' },
    });
    return types.map((t) => t.resourceType);
  }),
  bulkDelete: adminProcedure
    .input(z.object({ ids: z.array(z.string()).min(1) }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.auditLog.deleteMany({
        where: { id: { in: input.ids } },
      });
      await createAuditLog(
        ctx,
        'AUDIT_LOG_DELETED',
        'AUDIT_LOG',
        input.ids.join(','),
        'SUCCESS',
        undefined,
        `${result.count} denetim kaydı silindi (toplu)`,
      );
      return result;
    }),
});
