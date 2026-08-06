import { TRPCError } from '@trpc/server';
import type { Prisma } from 'generated/prisma';
import { z } from 'zod';
import { columnMap } from '~/lib/column-map';
import { COLOR_DISPLAY_NAME_MAP } from '~/shared/constants';
import {
  CustomerCardCreateSchema,
  CustomerCardFindManySelectSchema,
} from '~/shared/zod-schemas/customer-card';
import { findTurkishSearchMatchesInTable } from '../lib/turkish-search';
import {
  adminProcedure,
  createAuditLog,
  createTRPCRouter,
  protectedProcedure,
} from '../trpc';

// Fields eligible for the "boş alan" (missing-value) filter — every
// customerCard column except id/createdAt/updatedAt (technical fields) and
// color (always has a value via its DB default, so "empty" is meaningless)
const emptyFields = Object.keys(columnMap.customerCard).filter(
  (key) => !['id', 'createdAt', 'updatedAt', 'color'].includes(key),
);

// Enum fields have no empty-string variant — "empty" means null for these
const emptyEnumFields = ['district', 'status', 'authorizationDocument', 'vote'];

const filterSchema = z.object({
  search: z.string().optional(),
  color: z
    .enum(['green', 'blue', 'orange', 'yellow', 'gray', 'purple', 'all'])
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
  emptyField: z.enum(['', ...emptyFields]).default(''),
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
  'note',
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
  'note',
  'createdAt',
  'updatedAt',
] as const;

type SortableField = (typeof sortableFields)[number];

export const customerCardRouter = createTRPCRouter({
  getTotal: protectedProcedure
    .input(z.object({ businessGroup: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const isAdmin = ctx.session.user.role === 'admin';
      // Non-admins now see every card (out-of-scope ones grayed out), so the
      // total is no longer restricted to their assigned business groups —
      // it needs to match what the list/color-count cards add up to.
      return ctx.db.customerCard.count({
        where:
          isAdmin && input?.businessGroup
            ? { businessGroup: input.businessGroup }
            : {},
      });
    }),
  get: protectedProcedure
    .input(
      z.object({
        select: CustomerCardFindManySelectSchema.optional(),
        filter: filterSchema.optional(),
        sorting: z.array(sortingSchema).optional(),
        page: z.number().min(1).default(1),
        itemsPerPage: z.number().min(1).max(500).default(25),
        // When true, non-admins receive cards outside their assigned business
        // groups too (flagged via isRestricted) instead of having them filtered
        // out — used by the customer-cards list so it can gray those rows out.
        includeRestricted: z.boolean().default(false),
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
              'CustomerCard',
              fields,
              searchValue,
            ),
          };
        }
      }

      // Color filter is applied after allowedNames is known below, since
      // out-of-scope cards need to be treated as gray rather than filtered
      // by their real color.
      const requestedColor =
        input.filter?.color && input.filter.color !== 'all'
          ? input.filter.color
          : null;

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

      // Conditions that need to combine with each other via AND without
      // clobbering one another's use of the top-level OR key
      const andConditions: Prisma.CustomerCardWhereInput[] = [];

      // Build "boş alan" (empty field) filter
      if (input.filter?.emptyField) {
        const field = input.filter.emptyField;
        andConditions.push(
          emptyEnumFields.includes(field)
            ? { [field]: null }
            : { OR: [{ [field]: null }, { [field]: '' }] },
        );
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

      // Await the in-flight assigned-groups lookup (used below either to
      // restrict the query, or to flag out-of-scope rows as restricted)
      const assignedGroups = assignedGroupsPromise
        ? await assignedGroupsPromise
        : null;
      const allowedNames = assignedGroups?.map((g) => g.name) ?? null;

      if (allowedNames && !input.includeRestricted) {
        const requestedGroup = input.filter?.businessGroup;
        if (requestedGroup && requestedGroup !== '') {
          whereClause.businessGroup = allowedNames.includes(requestedGroup)
            ? requestedGroup
            : { in: [] };
        } else {
          whereClause.businessGroup = { in: allowedNames };
        }
      }

      if (requestedColor) {
        if (allowedNames && input.includeRestricted) {
          // Non-admins seeing restricted rows: an out-of-scope card's real
          // color isn't visible to them, so for filtering purposes it's
          // treated as gray — matching how it's rendered (faded, not by its
          // real color).
          if (requestedColor === 'gray') {
            andConditions.push({
              OR: [
                { color: 'gray', businessGroup: { in: allowedNames } },
                {
                  OR: [
                    { businessGroup: null },
                    { businessGroup: { notIn: allowedNames } },
                  ],
                },
              ],
            });
          } else {
            whereClause.color = requestedColor;
            if (!whereClause.businessGroup) {
              whereClause.businessGroup = { in: allowedNames };
            }
          }
        } else {
          whereClause.color = requestedColor;
        }
      }

      if (andConditions.length > 0) {
        whereClause.AND = andConditions;
      }

      const [totalItems, data] = await Promise.all([
        ctx.db.customerCard.count({ where: whereClause }),
        ctx.db.customerCard.findMany({
          select: input.select,
          where: whereClause,
          skip: (input.page - 1) * input.itemsPerPage,
          take: input.itemsPerPage,
          orderBy,
        }),
      ]);
      const totalPages = Math.ceil(totalItems / input.itemsPerPage);

      return {
        data: data.map((card) => ({
          ...card,
          isRestricted: allowedNames
            ? !card.businessGroup || !allowedNames.includes(card.businessGroup)
            : false,
        })),
        pagination: {
          totalItems,
          totalPages,
        },
      };
    }),
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const customerCard = await ctx.db.customerCard.findUnique({
        where: { id: input.id },
      });
      if (!customerCard) return null;

      if (ctx.session.user.role === 'admin') {
        return { ...customerCard, isRestricted: false };
      }

      const assignedGroups = await ctx.db.businessGroup.findMany({
        where: { assignedUsers: { some: { id: ctx.session.user.id } } },
        select: { name: true },
      });
      const allowedNames = assignedGroups.map((g) => g.name);
      const isRestricted =
        !customerCard.businessGroup ||
        !allowedNames.includes(customerCard.businessGroup);

      return { ...customerCard, isRestricted };
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
      if (ctx.session.user.role !== 'admin') {
        const [existing, assignedGroups] = await Promise.all([
          ctx.db.customerCard.findUnique({
            where: { id: input.id },
            select: { businessGroup: true },
          }),
          ctx.db.businessGroup.findMany({
            where: { assignedUsers: { some: { id: ctx.session.user.id } } },
            select: { name: true },
          }),
        ]);
        const allowedNames = assignedGroups.map((g) => g.name);
        if (
          !existing?.businessGroup ||
          !allowedNames.includes(existing.businessGroup)
        ) {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }
      }

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

  bulkDelete: adminProcedure
    .input(z.object({ ids: z.array(z.string()).min(1) }))
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await ctx.db.customerCard.deleteMany({
          where: { id: { in: input.ids } },
        });
        await createAuditLog(
          ctx.db,
          ctx.session.user.id,
          'CUSTOMER_CARD_DELETED',
          'CUSTOMER_CARD',
          input.ids.join(','),
          'SUCCESS',
          undefined,
          `${result.count} cari kart silindi (toplu)`,
        );
        return result;
      } catch (error) {
        await createAuditLog(
          ctx.db,
          ctx.session.user.id,
          'CUSTOMER_CARD_DELETED',
          'CUSTOMER_CARD',
          input.ids.join(','),
          'FAILURE',
          error instanceof Error ? error.message : 'Bilinmeyen hata',
          `Toplu cari kart silinemedi`,
        );
        throw error;
      }
    }),

  bulkUpdateColor: protectedProcedure
    .input(
      z.object({
        ids: z.array(z.string()).min(1),
        color: z.enum(['green', 'blue', 'orange', 'yellow', 'gray', 'purple']),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await ctx.db.customerCard.updateMany({
          where: { id: { in: input.ids } },
          data: { color: input.color },
        });
        await createAuditLog(
          ctx.db,
          ctx.session.user.id,
          'CUSTOMER_CARD_UPDATED',
          'CUSTOMER_CARD',
          input.ids.join(','),
          'SUCCESS',
          undefined,
          `${result.count} cari kartın rengi "${COLOR_DISPLAY_NAME_MAP[input.color]}" olarak güncellendi (toplu)`,
        );
        return result;
      } catch (error) {
        await createAuditLog(
          ctx.db,
          ctx.session.user.id,
          'CUSTOMER_CARD_UPDATED',
          'CUSTOMER_CARD',
          input.ids.join(','),
          'FAILURE',
          error instanceof Error ? error.message : 'Bilinmeyen hata',
          `Toplu renk güncellemesi başarısız`,
        );
        throw error;
      }
    }),

  getColorCounts: protectedProcedure
    .input(z.object({ businessGroup: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const isAdmin = ctx.session.user.role === 'admin';
      const filterByGroup = input?.businessGroup;

      const counts = {
        green: 0,
        blue: 0,
        orange: 0,
        yellow: 0,
        purple: 0,
        gray: 0,
      };

      if (!isAdmin) {
        const assignedGroups = await ctx.db.businessGroup.findMany({
          where: { assignedUsers: { some: { id: ctx.session.user.id } } },
          select: { name: true },
        });
        const allowedNames = assignedGroups.map((g) => g.name);

        // Out-of-scope cards are visible (grayed out) but their real color
        // isn't — bucket them under gray, same as the list's color filter.
        const [inScopeRows, outOfScopeCount] = await Promise.all([
          ctx.db.customerCard.groupBy({
            by: ['color'],
            _count: true,
            where: { businessGroup: { in: allowedNames } },
          }),
          ctx.db.customerCard.count({
            where: {
              OR: [
                { businessGroup: null },
                { businessGroup: { notIn: allowedNames } },
              ],
            },
          }),
        ]);

        for (const row of inScopeRows) counts[row.color] += row._count;
        counts.gray += outOfScopeCount;
        return counts;
      }

      const [dashboardConfig, rows] = await Promise.all([
        !filterByGroup
          ? ctx.db.dashboardConfig.findUnique({ where: { id: 'singleton' } })
          : null,
        ctx.db.customerCard.groupBy({
          by: ['color'],
          _count: true,
          where: filterByGroup ? { businessGroup: filterByGroup } : {},
        }),
      ]);

      const graySubtractGroup = !filterByGroup
        ? dashboardConfig?.graySubtractionBusinessGroup
        : null;

      const graySubtractCount = graySubtractGroup
        ? await ctx.db.customerCard.count({
            where: { businessGroup: graySubtractGroup },
          })
        : null;

      for (const row of rows) counts[row.color] += row._count;
      if (graySubtractCount) counts.gray -= graySubtractCount;
      return counts;
    }),
});
