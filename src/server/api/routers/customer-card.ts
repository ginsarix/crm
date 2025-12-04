import type { Prisma } from 'generated/prisma';
import { z } from 'zod';
import { columnMap } from '~/lib/column-map';
import {
  CustomerCardCreateSchema,
  CustomerCardFindManySelectSchema,
} from '~/shared/zod-schemas/customer-card';
import { createAuditLog, createTRPCRouter, protectedProcedure } from '../trpc';

const filterSchema = z.object({
  search: z.string().optional(),
  positive: z.enum(['negative', 'neutral', 'positive', 'all']).default('all'),
  searchScope: z
    .enum(['all', ...Object.keys(columnMap.customerCard)])
    .default('all'),
});

const sortingSchema = z.object({
  id: z.string(),
  desc: z.boolean(),
});

// Searchable text fields for "all" scope
const searchableFields = [
  'name',
  'sira',
  'sicil',
  'address',
  'region',
  'gsm1',
  'contact1',
  'gsm2',
  'contact2',
  'gsm3',
  'contact3',
  'businessGroup',
  'salesRepresentative',
] as const;

type SearchableField = (typeof searchableFields)[number];

// Sortable fields
const sortableFields = [
  'name',
  'sira',
  'sicil',
  'address',
  'district',
  'region',
  'gsm1',
  'contact1',
  'gsm2',
  'contact2',
  'gsm3',
  'contact3',
  'businessGroup',
  'positive',
  'salesRepresentative',
  'createdAt',
  'updatedAt',
] as const;

type SortableField = (typeof sortableFields)[number];

export const customerCardRouter = createTRPCRouter({
  getTotal: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.db.customerCard.count();
  }),
  get: protectedProcedure
    .input(
      z.object({
        select: CustomerCardFindManySelectSchema.optional(),
        filter: filterSchema.optional(),
        sorting: z.array(sortingSchema).optional(),
        page: z.number().min(1).default(1),
        itemsPerPage: z.number().min(1).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Build search conditions based on searchScope
      const whereClause: Prisma.CustomerCardWhereInput = {};

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
          })) as Prisma.CustomerCardWhereInput[];
        } else if (searchableFields.includes(scope as SearchableField)) {
          // Search in specific field
          const field = scope as SearchableField;
          whereClause[field] = {
            contains: searchValue,
            mode: 'insensitive' as const,
          };
        }
      }

      // Build positive filter
      if (input.filter?.positive && input.filter.positive !== 'all') {
        whereClause.positive = input.filter.positive;
      }

      // Build orderBy clause
      const orderBy: Prisma.CustomerCardOrderByWithRelationInput[] = [];

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

      const totalItems = await ctx.db.customerCard.count({
        where: whereClause,
      });
      const totalPages = Math.ceil(totalItems / input.itemsPerPage);

      const data = await ctx.db.customerCard.findMany({
        select: input.select,
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
    .input(CustomerCardCreateSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await ctx.db.customerCard.create({
          data: {
            ...input,
            createdBy: { connect: { id: ctx.session.user.id } },
          },
        });

        await createAuditLog(
          ctx.db,
          ctx.session.user.id,
          'CUSTOMER_CARD_CREATED',
          'CUSTOMER_CARD',
          result.id,
          'SUCCESS',
          undefined,
          `Cari kart oluşturuldu: ${result.name}`,
        );

        return result;
      } catch (error) {
        await createAuditLog(
          ctx.db,
          ctx.session.user.id,
          'CUSTOMER_CARD_CREATED',
          'CUSTOMER_CARD',
          '',
          'FAILURE',
          error instanceof Error ? error.message : 'Bilinmeyen hata',
          `Cari kart oluşturulamadı: ${input.name}`,
        );
        throw error;
      }
    }),
  update: protectedProcedure
    .input(CustomerCardCreateSchema.extend({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      try {
        const result = await ctx.db.customerCard.update({
          where: { id },
          data,
        });

        await createAuditLog(
          ctx.db,
          ctx.session.user.id,
          'CUSTOMER_CARD_UPDATED',
          'CUSTOMER_CARD',
          id,
          'SUCCESS',
          undefined,
          `Cari kart güncellendi: ${result.name}`,
        );

        return result;
      } catch (error) {
        await createAuditLog(
          ctx.db,
          ctx.session.user.id,
          'CUSTOMER_CARD_UPDATED',
          'CUSTOMER_CARD',
          id,
          'FAILURE',
          error instanceof Error ? error.message : 'Bilinmeyen hata',
          `Cari kart güncellenemedi: ${input.name}`,
        );
        throw error;
      }
    }),
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Get the customer card name before deletion for audit log
        const customerCard = await ctx.db.customerCard.findUnique({
          where: { id: input.id },
          select: { name: true },
        });

        const result = await ctx.db.customerCard.delete({
          where: { id: input.id },
        });

        await createAuditLog(
          ctx.db,
          ctx.session.user.id,
          'CUSTOMER_CARD_DELETED',
          'CUSTOMER_CARD',
          input.id,
          'SUCCESS',
          undefined,
          `Cari kart silindi: ${customerCard?.name}`,
        );

        return result;
      } catch (error) {
        await createAuditLog(
          ctx.db,
          ctx.session.user.id,
          'CUSTOMER_CARD_DELETED',
          'CUSTOMER_CARD',
          input.id,
          'FAILURE',
          error instanceof Error ? error.message : 'Bilinmeyen hata',
          `Cari kart silinemedi`,
        );
        throw error;
      }
    }),
});
