import type { Prisma } from 'generated/prisma';
import { z } from 'zod';
import { columnMap } from '~/lib/column-map';
import { VisitCreateSchema } from '~/shared/zod-schemas/visit';
import { createAuditLog, createTRPCRouter, protectedProcedure } from '../trpc';

const filterSchema = z.object({
  search: z.string().optional(),
  via: z.enum(['phone', 'inPerson', 'email', 'sms', 'all']).default('all'),
  searchScope: z.enum(['all', ...Object.keys(columnMap.visit)]).default('all'),
  customerCardId: z.string().optional(),
});

const sortingSchema = z.object({
  id: z.string(),
  desc: z.boolean(),
});

// Searchable text fields for "all" scope
const searchableFields = ['note'] as const;

type SearchableField = (typeof searchableFields)[number];

// Sortable fields
const sortableFields = [
  'date',
  'time',
  'via',
  'note',
  'createdAt',
  'updatedAt',
] as const;

type SortableField = (typeof sortableFields)[number];

export const visitRouter = createTRPCRouter({
  getTotal: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.db.visit.count();
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
      // Build search conditions based on searchScope
      const whereClause: Prisma.VisitWhereInput = {};

      if (input.filter?.search) {
        const searchValue = input.filter.search;
        const scope = input.filter.searchScope;

        if (scope === 'all') {
          // Search across all searchable fields
          whereClause.OR = searchableFields.map((field) => ({
            [field]: {
              contains: searchValue,
              mode: 'insensitive' as const,
            },
          })) as Prisma.VisitWhereInput[];
        } else if (searchableFields.includes(scope as SearchableField)) {
          // Search in specific field
          const field = scope as SearchableField;
          whereClause[field] = {
            contains: searchValue,
            mode: 'insensitive' as const,
          };
        }
      }

      // Build via filter
      if (input.filter?.via && input.filter.via !== 'all') {
        whereClause.via = input.filter.via;
      }

      // Filter by customerCardId if provided
      if (input.filter?.customerCardId) {
        whereClause.customerCardId = input.filter.customerCardId;
      }

      // Build orderBy clause
      const orderBy: Prisma.VisitOrderByWithRelationInput[] = [];

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
        orderBy.push({ date: 'desc' }, { time: 'desc' });
      }

      const totalItems = await ctx.db.visit.count({
        where: whereClause,
      });
      const totalPages = Math.ceil(totalItems / input.itemsPerPage);

      const data = await ctx.db.visit.findMany({
        where: whereClause,
        skip: (input.page - 1) * input.itemsPerPage,
        take: input.itemsPerPage,
        orderBy,
        include: {
          customerCard: {
            select: {
              name: true,
              gsm1: true,
            },
          },
        },
      });

      return {
        data,
        pagination: {
          totalItems,
          totalPages,
        },
      };
    }),
  create: protectedProcedure
    .input(VisitCreateSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await ctx.db.visit.create({
          data: {
            date: input.date,
            time: input.time,
            via: input.via,
            note: input.note,
            customerCard: { connect: { id: input.customerCardId } },
            createdBy: { connect: { id: ctx.session.user.id } },
          },
          include: {
            customerCard: {
              select: {
                name: true,
                gsm1: true,
              },
            },
          },
        });

        await createAuditLog(
          ctx.db,
          ctx.session.user.id,
          'VISIT_CREATED',
          'VISIT',
          result.id,
          'SUCCESS',
          undefined,
          `Ziyaret oluşturuldu: ${result.customerCard.name} - ${new Date(result.date).toLocaleDateString('tr-TR')}`,
        );

        return result;
      } catch (error) {
        await createAuditLog(
          ctx.db,
          ctx.session.user.id,
          'VISIT_CREATED',
          'VISIT',
          '',
          'FAILURE',
          error instanceof Error ? error.message : 'Bilinmeyen hata',
          `Ziyaret oluşturulamadı`,
        );
        throw error;
      }
    }),
  update: protectedProcedure
    .input(VisitCreateSchema.extend({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { id, customerCardId, ...data } = input;
      try {
        const result = await ctx.db.visit.update({
          where: { id },
          data: {
            ...data,
            customerCard: { connect: { id: customerCardId } },
          },
          include: {
            customerCard: {
              select: {
                name: true,
                gsm1: true,
              },
            },
          },
        });

        await createAuditLog(
          ctx.db,
          ctx.session.user.id,
          'VISIT_UPDATED',
          'VISIT',
          id,
          'SUCCESS',
          undefined,
          `Ziyaret güncellendi: ${result.customerCard.name} - ${new Date(result.date).toLocaleDateString('tr-TR')}`,
        );

        return result;
      } catch (error) {
        await createAuditLog(
          ctx.db,
          ctx.session.user.id,
          'VISIT_UPDATED',
          'VISIT',
          id,
          'FAILURE',
          error instanceof Error ? error.message : 'Bilinmeyen hata',
          `Ziyaret güncellenemedi`,
        );
        throw error;
      }
    }),
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Get the visit info before deletion for audit log
        const visit = await ctx.db.visit.findUnique({
          where: { id: input.id },
          include: {
            customerCard: {
              select: { name: true },
            },
          },
        });

        const result = await ctx.db.visit.delete({
          where: { id: input.id },
        });

        await createAuditLog(
          ctx.db,
          ctx.session.user.id,
          'VISIT_DELETED',
          'VISIT',
          input.id,
          'SUCCESS',
          undefined,
          `Ziyaret silindi: ${visit?.customerCard.name}`,
        );

        return result;
      } catch (error) {
        await createAuditLog(
          ctx.db,
          ctx.session.user.id,
          'VISIT_DELETED',
          'VISIT',
          input.id,
          'FAILURE',
          error instanceof Error ? error.message : 'Bilinmeyen hata',
          `Ziyaret silinemedi`,
        );
        throw error;
      }
    }),
});
