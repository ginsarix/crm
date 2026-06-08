import type { Prisma } from 'generated/prisma';
import { z } from 'zod';
import { columnMap } from '~/lib/column-map';
import {
  CustomerCardCreateSchema,
  CustomerCardFindManySelectSchema,
} from '~/shared/zod-schemas/customer-card';
import {
  adminProcedure,
  createAuditLog,
  createTRPCRouter,
  protectedProcedure,
} from '../trpc';

const filterSchema = z.object({
  search: z.string().optional(),
  color: z
    .enum(['green', 'blue', 'orange', 'yellow', 'gray', 'all'])
    .default('all'),
  searchScope: z
    .enum(['all', ...Object.keys(columnMap.customerCard)])
    .default('all'),
  businessGroup: z.string().optional(),
  salesRepresentative: z.string().optional(),
  district: z
    .enum([
      '',
      'merkez',
      'avanos',
      'urgup',
      'hacibektas',
      'kozakli',
      'acigol',
      'derinkuyu',
      'gulsehir',
    ])
    .default(''),
  status: z.enum(['', 'geldi', 'gelmedi', '__null__']).default(''),
  authorizationDocument: z.enum(['', 'aldi', 'almadi', '__null__']).default(''),
  vote: z.enum(['', 'geldi', 'gelmedi', '__null__']).default(''),
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
  'authorities',
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
  'authorities',
  'color',
  'status',
  'authorizationDocument',
  'vote',
  'salesRepresentative',
  'createdAt',
  'updatedAt',
] as const;

type SortableField = (typeof sortableFields)[number];

export const customerCardRouter = createTRPCRouter({
  getTotal: protectedProcedure.query(async ({ ctx }) => {
    const isAdmin = ctx.session.user.role === 'admin';
    if (isAdmin) return ctx.db.customerCard.count();
    const assignedGroups = await ctx.db.businessGroup.findMany({
      where: { assignedUsers: { some: { id: ctx.session.user.id } } },
      select: { name: true },
    });
    return ctx.db.customerCard.count({
      where: { businessGroup: { in: assignedGroups.map((g) => g.name) } },
    });
  }),
  get: protectedProcedure
    .input(
      z.object({
        select: CustomerCardFindManySelectSchema.optional(),
        filter: filterSchema.optional(),
        sorting: z.array(sortingSchema).optional(),
        page: z.number().min(1).default(1),
        itemsPerPage: z.number().min(0).default(25),
      }),
    )
    .query(async ({ ctx, input }) => {
      const isAdmin = ctx.session.user.role === 'admin';

      // Fire group lookup immediately so it overlaps with whereClause construction
      const assignedGroupsPromise = isAdmin
        ? null
        : ctx.db.businessGroup.findMany({
            where: { assignedUsers: { some: { id: ctx.session.user.id } } },
            select: { name: true },
          });

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

      // Build color filter
      if (input.filter?.color && input.filter.color !== 'all') {
        whereClause.color = input.filter.color;
      }

      // Build businessGroup filter
      if (input.filter?.businessGroup && input.filter.businessGroup !== '') {
        whereClause.businessGroup = input.filter.businessGroup;
      }

      // Build salesRepresentative filter
      if (
        input.filter?.salesRepresentative &&
        input.filter.salesRepresentative !== ''
      ) {
        whereClause.salesRepresentative = input.filter.salesRepresentative;
      }

      // Build district filter
      if (input.filter?.district) {
        whereClause.district = input.filter.district;
      }

      // Build status filter
      if (input.filter?.status) {
        whereClause.status =
          input.filter.status === '__null__' ? null : input.filter.status;
      }

      // Build authorizationDocument filter
      if (input.filter?.authorizationDocument) {
        whereClause.authorizationDocument =
          input.filter.authorizationDocument === '__null__'
            ? null
            : input.filter.authorizationDocument;
      }

      // Build vote filter
      if (input.filter?.vote) {
        whereClause.vote =
          input.filter.vote === '__null__' ? null : input.filter.vote;
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

      // Apply non-admin group restriction (await the in-flight query)
      if (assignedGroupsPromise) {
        const assignedGroups = await assignedGroupsPromise;
        whereClause.businessGroup = { in: assignedGroups.map((g) => g.name) };
      }

      const fetchAll = input.itemsPerPage === 0;
      const [totalItems, data] = await Promise.all([
        ctx.db.customerCard.count({ where: whereClause }),
        ctx.db.customerCard.findMany({
          select: input.select,
          where: whereClause,
          skip: fetchAll ? 0 : (input.page - 1) * input.itemsPerPage,
          ...(fetchAll ? {} : { take: input.itemsPerPage }),
          orderBy,
        }),
      ]);
      const totalPages = fetchAll ? 1 : Math.ceil(totalItems / input.itemsPerPage);

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
      try {
        const result = await ctx.db.customerCard.update({
          where: { id: input.id },
          data: input,
        });

        await createAuditLog(
          ctx.db,
          ctx.session.user.id,
          'CUSTOMER_CARD_UPDATED',
          'CUSTOMER_CARD',
          input.id,
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
          input.id,
          'FAILURE',
          error instanceof Error ? error.message : 'Bilinmeyen hata',
          `Cari kart güncellenemedi: ${input.name}`,
        );
        throw error;
      }
    }),
  delete: adminProcedure
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

  getColorCounts: protectedProcedure.query(async ({ ctx }) => {
    const isAdmin = ctx.session.user.role === 'admin';
    let where: Prisma.CustomerCardWhereInput = {};
    if (!isAdmin) {
      const assignedGroups = await ctx.db.businessGroup.findMany({
        where: { assignedUsers: { some: { id: ctx.session.user.id } } },
        select: { name: true },
      });
      where = { businessGroup: { in: assignedGroups.map((g) => g.name) } };
    }
    const rows = await ctx.db.customerCard.groupBy({
      by: ['color'],
      _count: true,
      where,
    });
    const counts = { green: 0, blue: 0, orange: 0, yellow: 0, gray: 0 };
    for (const row of rows) counts[row.color] += row._count;
    return counts;
  }),
});
