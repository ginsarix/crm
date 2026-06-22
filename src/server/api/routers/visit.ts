import { Prisma } from 'generated/prisma';
import { z } from 'zod';
import { columnMap } from '~/lib/column-map';
import { VisitCreateSchema } from '~/shared/zod-schemas/visit';
import {
  adminProcedure,
  createAuditLog,
  createTRPCRouter,
  protectedProcedure,
} from '../trpc';

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
  getTotal: protectedProcedure
    .input(z.object({ businessGroup: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const isAdmin = ctx.session.user.role === 'admin';
      if (isAdmin) {
        return ctx.db.visit.count({
          where: input?.businessGroup
            ? { customerCard: { businessGroup: input.businessGroup } }
            : {},
        });
      }
      const assignedGroups = await ctx.db.businessGroup.findMany({
        where: { assignedUsers: { some: { id: ctx.session.user.id } } },
        select: { name: true },
      });
      return ctx.db.visit.count({
        where: {
          customerCard: {
            businessGroup: { in: assignedGroups.map((g) => g.name) },
          },
        },
      });
    }),
  getRankedVisitsBySalesRepresentative: protectedProcedure
    .input(z.object({ businessGroup: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const isAdmin = ctx.session.user.role === 'admin';

      type RawRow = { salesRepresentative: string; visitCount: bigint };

      if (isAdmin) {
        if (input?.businessGroup) {
          const rows = await ctx.db.$queryRaw<RawRow[]>(
            Prisma.sql`
              SELECT cc."salesRepresentative", COUNT(v.id)::int AS "visitCount"
              FROM "Visit" v
              JOIN "CustomerCard" cc ON v."customerCardId" = cc.id
              WHERE cc."salesRepresentative" IS NOT NULL AND cc."salesRepresentative" <> ''
                AND cc."businessGroup" = ${input.businessGroup}
              GROUP BY cc."salesRepresentative"
              ORDER BY "visitCount" DESC
              LIMIT 5
            `,
          );
          return rows.map((r) => ({
            salesRepresentative: r.salesRepresentative,
            visitCount: Number(r.visitCount),
          }));
        }
        const rows = await ctx.db.$queryRaw<RawRow[]>`
          SELECT cc."salesRepresentative", COUNT(v.id)::int AS "visitCount"
          FROM "Visit" v
          JOIN "CustomerCard" cc ON v."customerCardId" = cc.id
          WHERE cc."salesRepresentative" IS NOT NULL AND cc."salesRepresentative" <> ''
          GROUP BY cc."salesRepresentative"
          ORDER BY "visitCount" DESC
          LIMIT 5
        `;
        return rows.map((r) => ({
          salesRepresentative: r.salesRepresentative,
          visitCount: Number(r.visitCount),
        }));
      }

      const assignedGroups = await ctx.db.businessGroup.findMany({
        where: { assignedUsers: { some: { id: ctx.session.user.id } } },
        select: { name: true },
      });
      const groupNames = assignedGroups.map((g) => g.name);
      if (groupNames.length === 0) return [];

      const rows = await ctx.db.$queryRaw<RawRow[]>(
        Prisma.sql`
          SELECT cc."salesRepresentative", COUNT(v.id)::int AS "visitCount"
          FROM "Visit" v
          JOIN "CustomerCard" cc ON v."customerCardId" = cc.id
          WHERE cc."salesRepresentative" IS NOT NULL AND cc."salesRepresentative" <> ''
            AND cc."businessGroup" IN (${Prisma.join(groupNames)})
          GROUP BY cc."salesRepresentative"
          ORDER BY "visitCount" DESC
          LIMIT 5
        `,
      );
      return rows.map((r) => ({
        salesRepresentative: r.salesRepresentative,
        visitCount: Number(r.visitCount),
      }));
    }),
  get: protectedProcedure
    .input(
      z.object({
        filter: filterSchema.optional(),
        sorting: z.array(sortingSchema).optional(),
        page: z.number().min(1).default(1),
        itemsPerPage: z.number().min(0).default(25),
      }),
    )
    .query(async ({ ctx, input }) => {
      const isAdmin = ctx.session.user.role === 'admin';

      const assignedGroupsPromise = isAdmin
        ? null
        : ctx.db.businessGroup.findMany({
            where: { assignedUsers: { some: { id: ctx.session.user.id } } },
            select: { name: true },
          });

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

      if (assignedGroupsPromise) {
        const assignedGroups = await assignedGroupsPromise;
        whereClause.customerCard = {
          businessGroup: { in: assignedGroups.map((g) => g.name) },
        };
      }

      const fetchAll = input.itemsPerPage === 0;
      const [totalItems, data] = await Promise.all([
        ctx.db.visit.count({ where: whereClause }),
        ctx.db.visit.findMany({
          where: whereClause,
          skip: fetchAll ? 0 : (input.page - 1) * input.itemsPerPage,
          ...(fetchAll ? {} : { take: input.itemsPerPage }),
          orderBy,
          include: {
            customerCard: {
              select: {
                name: true,
                gsm1: true,
              },
            },
          },
        }),
      ]);
      const totalPages = fetchAll
        ? 1
        : Math.ceil(totalItems / input.itemsPerPage);

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
  delete: adminProcedure
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

  bulkDelete: adminProcedure
    .input(z.object({ ids: z.array(z.string()).min(1) }))
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await ctx.db.visit.deleteMany({
          where: { id: { in: input.ids } },
        });
        await createAuditLog(
          ctx.db,
          ctx.session.user.id,
          'VISIT_DELETED',
          'VISIT',
          '',
          'SUCCESS',
          undefined,
          `${result.count} ziyaret silindi (toplu)`,
        );
        return result;
      } catch (error) {
        await createAuditLog(
          ctx.db,
          ctx.session.user.id,
          'VISIT_DELETED',
          'VISIT',
          '',
          'FAILURE',
          error instanceof Error ? error.message : 'Bilinmeyen hata',
          `Toplu ziyaret silinemedi`,
        );
        throw error;
      }
    }),
});
