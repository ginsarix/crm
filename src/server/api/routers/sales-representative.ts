import type { Prisma } from 'generated/prisma';
import { z } from 'zod';
import { findTurkishSearchMatchesInTable } from '../lib/turkish-search';
import {
  adminProcedure,
  createAuditLog,
  createTRPCRouter,
  protectedProcedure,
} from '../trpc';

const filterSchema = z.object({
  search: z.string().optional(),
});

const sortingSchema = z.object({
  id: z.string(),
  desc: z.boolean(),
});

const sortableFields = ['name', 'createdAt', 'updatedAt'] as const;
type SortableField = (typeof sortableFields)[number];

export const salesRepresentativeRouter = createTRPCRouter({
  getTotal: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.db.salesRepresentative.count();
  }),
  get: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.db.salesRepresentative.findMany();
  }),
  getPaginated: protectedProcedure
    .input(
      z.object({
        filter: filterSchema.optional(),
        sorting: z.array(sortingSchema).optional(),
        page: z.number().min(1).default(1),
        itemsPerPage: z.number().min(1).max(500).default(25),
      }),
    )
    .query(async ({ ctx, input }) => {
      const whereClause: Prisma.SalesRepresentativeWhereInput = {};

      if (input.filter?.search) {
        whereClause.id = {
          in: await findTurkishSearchMatchesInTable(
            ctx.db,
            'SalesRepresentative',
            ['name'],
            input.filter.search,
          ),
        };
      }

      const orderBy: Prisma.SalesRepresentativeOrderByWithRelationInput[] = [];

      if (input.sorting && input.sorting.length > 0) {
        for (const sort of input.sorting) {
          if (sortableFields.includes(sort.id as SortableField)) {
            orderBy.push({
              [sort.id]: sort.desc ? 'desc' : 'asc',
            });
          }
        }
      }

      if (orderBy.length === 0) {
        orderBy.push({ name: 'asc' });
      }

      const totalItems = await ctx.db.salesRepresentative.count({
        where: whereClause,
      });
      const totalPages = Math.ceil(totalItems / input.itemsPerPage);

      const data = await ctx.db.salesRepresentative.findMany({
        where: whereClause,
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
  create: protectedProcedure
    .input(
      z.object({
        name: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await ctx.db.salesRepresentative.create({
          data: { name: input.name },
        });

        await createAuditLog(
          ctx,
          'SALES_REPRESENTATIVE_CREATED',
          'SALES_REPRESENTATIVE',
          result.id,
          'SUCCESS',
          undefined,
          `Satış temsilcisi oluşturuldu: ${result.name}`,
        );

        return result;
      } catch (error) {
        await createAuditLog(
          ctx,
          'SALES_REPRESENTATIVE_CREATED',
          'SALES_REPRESENTATIVE',
          '',
          'FAILURE',
          error instanceof Error ? error.message : 'Bilinmeyen Hata',
          `Satış temsilcisi oluşturulamadı: ${input.name}`,
        );

        throw error;
      }
    }),
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await ctx.db.salesRepresentative.update({
          where: { id: input.id },
          data: { name: input.name },
        });

        await createAuditLog(
          ctx,
          'SALES_REPRESENTATIVE_UPDATED',
          'SALES_REPRESENTATIVE',
          input.id,
          'SUCCESS',
          undefined,
          `Satış temsilcisi güncellendi: ${result.name}`,
        );

        return result;
      } catch (error) {
        await createAuditLog(
          ctx,
          'SALES_REPRESENTATIVE_UPDATED',
          'SALES_REPRESENTATIVE',
          input.id,
          'FAILURE',
          error instanceof Error ? error.message : 'Bilinmeyen hata',
          `Satış temsilcisi güncellenemedi: ${input.name}`,
        );
        throw error;
      }
    }),
  delete: adminProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Get the sales representative name before deletion for audit log
        const salesRepresentative = await ctx.db.salesRepresentative.findUnique(
          {
            where: { id: input.id },
            select: { name: true },
          },
        );

        const result = await ctx.db.salesRepresentative.delete({
          where: { id: input.id },
        });
        await createAuditLog(
          ctx,
          'SALES_REPRESENTATIVE_DELETED',
          'SALES_REPRESENTATIVE',
          input.id,
          'SUCCESS',
          undefined,
          `Satış temsilcisi silindi: ${salesRepresentative?.name}`,
        );

        return result;
      } catch (error) {
        await createAuditLog(
          ctx,
          'SALES_REPRESENTATIVE_DELETED',
          'SALES_REPRESENTATIVE',
          input.id,
          'FAILURE',
          error instanceof Error ? error.message : 'Bilinmeyen hata',
          `Satış temsilcisi silinemedi`,
        );

        throw error;
      }
    }),

  bulkDelete: adminProcedure
    .input(z.object({ ids: z.array(z.string()).min(1) }))
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await ctx.db.salesRepresentative.deleteMany({
          where: { id: { in: input.ids } },
        });
        await createAuditLog(
          ctx,
          'SALES_REPRESENTATIVE_DELETED',
          'SALES_REPRESENTATIVE',
          input.ids.join(','),
          'SUCCESS',
          undefined,
          `${result.count} satış temsilcisi silindi (toplu)`,
        );
        return result;
      } catch (error) {
        await createAuditLog(
          ctx,
          'SALES_REPRESENTATIVE_DELETED',
          'SALES_REPRESENTATIVE',
          input.ids.join(','),
          'FAILURE',
          error instanceof Error ? error.message : 'Bilinmeyen hata',
          `Toplu satış temsilcisi silinemedi`,
        );
        throw error;
      }
    }),

  customerCardGreens: protectedProcedure.query(async ({ ctx }) => {
    const counts = await ctx.db.customerCard.groupBy({
      by: ['salesRepresentative'],
      where: {
        color: 'green',
      },
      _count: true,
    });

    return counts
      .filter((c) => c.salesRepresentative)
      .map((c) => ({
        salesRepresentative: c.salesRepresentative as string,
        customerCardCount: c._count,
      }));
  }),
  customerCardOranges: protectedProcedure.query(async ({ ctx }) => {
    const counts = await ctx.db.customerCard.groupBy({
      by: ['salesRepresentative'],
      where: {
        color: 'orange',
      },
      _count: true,
    });

    return counts
      .filter((c) => c.salesRepresentative)
      .map((c) => ({
        salesRepresentative: c.salesRepresentative as string,
        customerCardCount: c._count,
      }));
  }),
});
