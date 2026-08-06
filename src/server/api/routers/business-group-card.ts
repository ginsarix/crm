import { Prisma, type PrismaClient } from 'generated/prisma';
import { z } from 'zod';
import { columnMap } from '~/lib/column-map';
import {
  BusinessGroupCardUpdateSchema,
  committeeFieldKeys,
} from '~/shared/zod-schemas/business-group-card';
import { findTurkishSearchMatches } from '../lib/turkish-search';
import { adminProcedure, createAuditLog, createTRPCRouter } from '../trpc';

const filterSchema = z.object({
  search: z.string().optional(),
  searchScope: z
    .enum(['all', ...Object.keys(columnMap.businessGroupCard)])
    .default('all'),
});

const sortingSchema = z.object({
  id: z.string(),
  desc: z.boolean(),
});

const sortableFields = ['businessGroupName', 'createdAt', 'updatedAt'] as const;
type SortableField = (typeof sortableFields)[number];

/** Ensures every existing BusinessGroup has a (possibly empty) card row. */
async function backfillMissingCards(db: PrismaClient) {
  const groupsWithoutCard = await db.businessGroup.findMany({
    where: { card: null },
    select: { id: true },
  });
  if (groupsWithoutCard.length === 0) return;
  await db.businessGroupCard.createMany({
    data: groupsWithoutCard.map((g) => ({ businessGroupId: g.id })),
    skipDuplicates: true,
  });
}

export const businessGroupCardRouter = createTRPCRouter({
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
      await backfillMissingCards(ctx.db);

      const whereClause: Prisma.BusinessGroupCardWhereInput = {};

      if (input.filter?.search) {
        const scope = input.filter.searchScope;
        const columns: Prisma.Sql[] =
          scope === 'all'
            ? [
                Prisma.raw('bg.name'),
                Prisma.raw('bgc."uyeSayisi"'),
                Prisma.raw('bgc."meclisSayisi"::text'),
                ...committeeFieldKeys.map((key) =>
                  Prisma.raw(`(bgc."committee"->>'${key}')`),
                ),
              ]
            : scope === 'businessGroupName'
              ? [Prisma.raw('bg.name')]
              : scope === 'uyeSayisi'
                ? [Prisma.raw('bgc."uyeSayisi"')]
                : scope === 'meclisSayisi'
                  ? [Prisma.raw('bgc."meclisSayisi"::text')]
                  : committeeFieldKeys.includes(
                        scope as (typeof committeeFieldKeys)[number],
                      )
                    ? [Prisma.raw(`(bgc."committee"->>'${scope}')`)]
                    : [];

        if (columns.length > 0) {
          whereClause.id = {
            in: await findTurkishSearchMatches(
              ctx.db,
              Prisma.raw(
                '"BusinessGroupCard" bgc JOIN "BusinessGroup" bg ON bg.id = bgc."businessGroupId"',
              ),
              Prisma.raw('bgc.id'),
              columns,
              input.filter.search,
            ),
          };
        }
      }

      const orderBy: Prisma.BusinessGroupCardOrderByWithRelationInput[] = [];
      if (input.sorting && input.sorting.length > 0) {
        for (const sort of input.sorting) {
          if (sortableFields.includes(sort.id as SortableField)) {
            if (sort.id === 'businessGroupName') {
              orderBy.push({
                businessGroup: { name: sort.desc ? 'desc' : 'asc' },
              });
            } else {
              orderBy.push({ [sort.id]: sort.desc ? 'desc' : 'asc' });
            }
          }
        }
      }
      if (orderBy.length === 0) {
        orderBy.push({ businessGroup: { name: 'asc' } });
      }

      const [totalItems, rows] = await Promise.all([
        ctx.db.businessGroupCard.count({ where: whereClause }),
        ctx.db.businessGroupCard.findMany({
          where: whereClause,
          include: { businessGroup: { select: { name: true } } },
          orderBy,
          skip: (input.page - 1) * input.itemsPerPage,
          take: input.itemsPerPage,
        }),
      ]);
      const totalPages = Math.ceil(totalItems / input.itemsPerPage);

      return {
        data: rows.map(({ businessGroup, ...row }) => ({
          ...row,
          businessGroupName: businessGroup.name,
        })),
        pagination: {
          totalItems,
          totalPages,
        },
      };
    }),

  getById: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const row = await ctx.db.businessGroupCard.findUnique({
        where: { id: input.id },
        include: { businessGroup: { select: { name: true } } },
      });
      if (!row) return null;
      const { businessGroup, ...rest } = row;
      return { ...rest, businessGroupName: businessGroup.name };
    }),

  update: adminProcedure
    .input(BusinessGroupCardUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const committee = Object.fromEntries(
        committeeFieldKeys.map((key) => [key, input.committee[key] ?? []]),
      );

      try {
        const result = await ctx.db.businessGroupCard.update({
          where: { id: input.id },
          data: {
            committee,
            meclisSayisi: input.meclisSayisi ?? null,
            uyeSayisi: input.uyeSayisi ?? null,
          },
          include: { businessGroup: { select: { name: true } } },
        });

        await createAuditLog(
          ctx.db,
          ctx.session.user.id,
          'BUSINESS_GROUP_CARD_UPDATED',
          'BUSINESS_GROUP_CARD',
          result.id,
          'SUCCESS',
          undefined,
          `Meslek grubu kartı güncellendi: ${result.businessGroup.name}`,
        );

        const { businessGroup, ...rest } = result;
        return { ...rest, businessGroupName: businessGroup.name };
      } catch (error) {
        await createAuditLog(
          ctx.db,
          ctx.session.user.id,
          'BUSINESS_GROUP_CARD_UPDATED',
          'BUSINESS_GROUP_CARD',
          input.id,
          'FAILURE',
          error instanceof Error ? error.message : 'Bilinmeyen hata',
          `Meslek grubu kartı güncellenemedi`,
        );
        throw error;
      }
    }),
});
