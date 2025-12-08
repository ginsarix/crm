import { sub } from 'date-fns';
import type { Prisma } from 'generated/prisma';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';

const filterSchema = z.object({
  search: z.string().optional(),
  action: z.string().optional(),
  resourceType: z.string().optional(),
  result: z.enum(['SUCCESS', 'FAILURE', 'all']).default('all'),
  userId: z.string().optional(),
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
  get: protectedProcedure
    .input(
      z.object({
        filter: filterSchema.optional(),
        sorting: z.array(sortingSchema).optional(),
        page: z.number().min(1).default(1),
        itemsPerPage: z.number().min(1).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const whereClause: Prisma.AuditLogWhereInput = {};

      // Search filter
      if (input.filter?.search) {
        const searchValue = input.filter.search;
        whereClause.OR = [
          { action: { contains: searchValue, mode: 'insensitive' } },
          { resourceType: { contains: searchValue, mode: 'insensitive' } },
          { resourceId: { contains: searchValue, mode: 'insensitive' } },
          { details: { contains: searchValue, mode: 'insensitive' } },
          { error: { contains: searchValue, mode: 'insensitive' } },
          { user: { name: { contains: searchValue, mode: 'insensitive' } } },
          { user: { email: { contains: searchValue, mode: 'insensitive' } } },
        ];
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

      const totalItems = await ctx.db.auditLog.count({
        where: whereClause,
      });
      const totalPages = Math.ceil(totalItems / input.itemsPerPage);

      const data = await ctx.db.auditLog.findMany({
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
      });

      return {
        data,
        pagination: {
          totalItems,
          totalPages,
        },
      };
    }),
  getLatest: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.db.auditLog.findFirst({
      orderBy: { createdAt: 'desc' },
    });
  }),
  getById: protectedProcedure
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
  clearLogs: protectedProcedure
    .input(
      z.object({
        amount: z.number().int().positive(),
        unit: z.enum(['hours', 'days', 'months', 'years']),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const cutoffDate = sub(new Date(), {
        [input.unit]: input.amount,
      });

      // delete logs that occurred WITHIN the last {amount} {unit}
      // i.e., if amount is 1 and unit is hours, delete logs that occurred in the last hour
      await ctx.db.auditLog.deleteMany({
        where: {
          createdAt: { gt: cutoffDate },
        },
      });
    }),
});
