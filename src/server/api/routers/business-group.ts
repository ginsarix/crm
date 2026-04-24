import { z } from 'zod';
import {
  adminProcedure,
  createAuditLog,
  createTRPCRouter,
  protectedProcedure,
} from '../trpc';

export const businessGroupRouter = createTRPCRouter({
  getTotal: protectedProcedure.query(async ({ ctx }) => {
    const isAdmin = ctx.session.user.role === 'admin';
    if (isAdmin) return ctx.db.businessGroup.count();
    return ctx.db.businessGroup.count({
      where: { assignedUsers: { some: { id: ctx.session.user.id } } },
    });
  }),

  getStats: protectedProcedure.query(async ({ ctx }) => {
    const isAdmin = ctx.session.user.role === 'admin';

    let allowedGroups: string[] | null = null;
    if (!isAdmin) {
      const assigned = await ctx.db.businessGroup.findMany({
        where: { assignedUsers: { some: { id: ctx.session.user.id } } },
        select: { name: true },
      });
      allowedGroups = assigned.map((g) => g.name);
    }

    const rows = await ctx.db.customerCard.groupBy({
      by: ['businessGroup', 'positive'],
      _count: true,
      where: {
        businessGroup: allowedGroups
          ? { in: allowedGroups }
          : { not: null },
      },
    });

    const map = new Map<string, { total: number; positive: number; negative: number }>();

    for (const row of rows) {
      const name = row.businessGroup ?? '';
      if (!name) continue;
      if (!map.has(name)) map.set(name, { total: 0, positive: 0, negative: 0 });
      const entry = map.get(name)!;
      entry.total += row._count;
      if (row.positive === 'positive') entry.positive += row._count;
      else if (row.positive === 'negative') entry.negative += row._count;
    }

    const all = Array.from(map.entries()).map(([name, counts]) => ({
      name,
      total: counts.total,
      positivePercent: counts.total > 0 ? Math.round((counts.positive / counts.total) * 100) : 0,
      negativePercent: counts.total > 0 ? Math.round((counts.negative / counts.total) * 100) : 0,
    }));

    return {
      positiveGroups: all
        .filter((g) => g.positivePercent >= 40)
        .sort((a, b) => b.positivePercent - a.positivePercent),
      negativeGroups: all
        .filter((g) => g.negativePercent >= 40)
        .sort((a, b) => b.negativePercent - a.negativePercent),
    };
  }),

  get: protectedProcedure.query(async ({ ctx }) => {
    const isAdmin = ctx.session.user.role === 'admin';
    if (isAdmin) return ctx.db.businessGroup.findMany();
    return ctx.db.businessGroup.findMany({
      where: { assignedUsers: { some: { id: ctx.session.user.id } } },
    });
  }),

  getAssigned: adminProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.businessGroup.findMany({
        where: { assignedUsers: { some: { id: input.userId } } },
      });
    }),

  assign: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        businessGroupIds: z.array(z.string()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.user.update({
        where: { id: input.userId },
        data: {
          assignedBusinessGroups: {
            set: input.businessGroupIds.map((id) => ({ id })),
          },
        },
      });
    }),

  create: adminProcedure
    .input(
      z.object({
        name: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await ctx.db.businessGroup.create({
          data: { name: input.name },
        });

        await createAuditLog(
          ctx.db,
          ctx.session.user.id,
          'BUSINESS_GROUP_CREATED',
          'BUSINESS_GROUP',
          result.id,
          'SUCCESS',
          undefined,
          `Meslek grubu oluşturuldu: ${result.name}`,
        );

        return result;
      } catch (error) {
        await createAuditLog(
          ctx.db,
          ctx.session.user.id,
          'BUSINESS_GROUP_CREATED',
          'BUSINESS_GROUP',
          '',
          'FAILURE',
          error instanceof Error ? error.message : 'Bilinmeyen hata',
          `Meslek grubu oluşturulamadı: ${input.name}`,
        );

        throw error;
      }
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await ctx.db.businessGroup.update({
          where: { id: input.id },
          data: { name: input.name },
        });

        await createAuditLog(
          ctx.db,
          ctx.session.user.id,
          'BUSINESS_GROUP_UPDATED',
          'BUSINESS_GROUP',
          input.id,
          'SUCCESS',
          undefined,
          `Meslek grubu güncellendi: ${result.name}`,
        );

        return result;
      } catch (error) {
        await createAuditLog(
          ctx.db,
          ctx.session.user.id,
          'BUSINESS_GROUP_UPDATED',
          'BUSINESS_GROUP',
          '',
          'FAILURE',
          error instanceof Error ? error.message : 'Bilinmeyen hata',
          `Meslek grubu güncellenemedi: ${input.name}`,
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
        const businessGroup = await ctx.db.businessGroup.findUnique({
          where: { id: input.id },
          select: { name: true },
        });

        const result = await ctx.db.businessGroup.delete({
          where: { id: input.id },
        });

        await createAuditLog(
          ctx.db,
          ctx.session.user.id,
          'BUSINESS_GROUP_DELETED',
          'BUSINESS_GROUP',
          input.id,
          'SUCCESS',
          undefined,
          `Meslek grubu silindi: ${businessGroup?.name}`,
        );

        return result;
      } catch (error) {
        await createAuditLog(
          ctx.db,
          ctx.session.user.id,
          'BUSINESS_GROUP_DELETED',
          'BUSINESS_GROUP',
          '',
          'FAILURE',
          error instanceof Error ? error.message : 'Bilinmeyen hata',
          `Meslek grubu silinemedi`,
        );

        throw error;
      }
    }),
});
