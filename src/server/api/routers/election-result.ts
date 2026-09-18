import { Prisma, type PrismaClient } from 'generated/prisma';
import { z } from 'zod';
import { resolveElectionRowColor } from '~/lib/election-result-color';
import { ElectionResultUpdateSchema } from '~/shared/zod-schemas/election-result';
import { findTurkishSearchMatches } from '../lib/turkish-search';
import { createAuditLog, createTRPCRouter, protectedProcedure } from '../trpc';

const filterSchema = z.object({
  /** Always matched against the business group name — this page has no
   *  search scope selector, unlike the other tables. */
  search: z.string().optional(),
});

const sortingSchema = z.object({
  id: z.string(),
  desc: z.boolean(),
});

const sortableFields = [
  'businessGroupName',
  'toplamOy',
  'kullanilanOy',
  'gecerliOy',
  'meclisUyeSayisi',
  'yesil',
  'mavi',
  'turuncu',
] as const;
type SortableField = (typeof sortableFields)[number];

/** Ensures every existing BusinessGroup has a (zero-filled) result row. */
async function backfillMissingRows(db: PrismaClient) {
  const groupsWithoutRow = await db.businessGroup.findMany({
    where: { electionResult: null },
    select: { id: true },
  });
  if (groupsWithoutRow.length === 0) return;
  await db.electionResult.createMany({
    data: groupsWithoutRow.map((g) => ({ businessGroupId: g.id })),
    skipDuplicates: true,
  });
}

type RowWithGroup = Prisma.ElectionResultGetPayload<{
  include: { businessGroup: { select: { name: true } } };
}>;

/** Flattens the group name onto the row and attaches the computed color. */
function toRow({ businessGroup, ...rest }: RowWithGroup) {
  return {
    ...rest,
    businessGroupName: businessGroup.name,
    color: resolveElectionRowColor(rest.yesil, rest.mavi, rest.turuncu),
  };
}

export const electionResultRouter = createTRPCRouter({
  // protectedProcedure, not adminProcedure: business-group assignment
  // deliberately does not gate this page — every logged-in user reads and
  // edits every row. Confirmed product decision, 2026-09-18.
  get: protectedProcedure
    .input(
      z.object({
        filter: filterSchema.optional(),
        sorting: z.array(sortingSchema).optional(),
        page: z.number().min(1).default(1),
        itemsPerPage: z.number().min(1).max(500).default(25),
      }),
    )
    .query(async ({ ctx, input }) => {
      await backfillMissingRows(ctx.db);

      // `passive` is nullable, and Prisma's `not: true` excludes NULL rows
      // (it translates to `<> true`, not `IS DISTINCT FROM true`) — an
      // explicit null/false OR is required to actually match "active".
      const whereClause: Prisma.ElectionResultWhereInput = {
        businessGroup: { OR: [{ passive: null }, { passive: false }] },
      };

      if (input.filter?.search) {
        whereClause.id = {
          in: await findTurkishSearchMatches(
            ctx.db,
            Prisma.raw(
              '"ElectionResult" er JOIN "BusinessGroup" bg ON bg.id = er."businessGroupId"',
            ),
            Prisma.raw('er.id'),
            [Prisma.raw('bg.name')],
            input.filter.search,
          ),
        };
      }

      const orderBy: Prisma.ElectionResultOrderByWithRelationInput[] = [];
      for (const sort of input.sorting ?? []) {
        if (!sortableFields.includes(sort.id as SortableField)) continue;
        if (sort.id === 'businessGroupName') {
          orderBy.push({ businessGroup: { name: sort.desc ? 'desc' : 'asc' } });
        } else {
          orderBy.push({ [sort.id]: sort.desc ? 'desc' : 'asc' });
        }
      }
      if (orderBy.length === 0) {
        orderBy.push({ businessGroup: { name: 'asc' } });
      }

      const [totalItems, rows] = await Promise.all([
        ctx.db.electionResult.count({ where: whereClause }),
        ctx.db.electionResult.findMany({
          where: whereClause,
          include: { businessGroup: { select: { name: true } } },
          orderBy,
          skip: (input.page - 1) * input.itemsPerPage,
          take: input.itemsPerPage,
        }),
      ]);

      return {
        data: rows.map(toRow),
        pagination: {
          totalItems,
          totalPages: Math.ceil(totalItems / input.itemsPerPage),
        },
      };
    }),

  update: protectedProcedure
    .input(ElectionResultUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...counts } = input;

      try {
        const result = await ctx.db.electionResult.update({
          where: { id },
          data: counts,
          include: { businessGroup: { select: { name: true } } },
        });

        await createAuditLog(
          ctx,
          'ELECTION_RESULT_UPDATED',
          'ELECTION_RESULT',
          result.id,
          'SUCCESS',
          undefined,
          `Seçim sonucu güncellendi: ${result.businessGroup.name}`,
        );

        return toRow(result);
      } catch (error) {
        await createAuditLog(
          ctx,
          'ELECTION_RESULT_UPDATED',
          'ELECTION_RESULT',
          id,
          'FAILURE',
          error instanceof Error ? error.message : 'Bilinmeyen hata',
          'Seçim sonucu güncellenemedi',
        );
        throw error;
      }
    }),
});
