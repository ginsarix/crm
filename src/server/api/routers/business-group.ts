import { z } from 'zod';
import { createLocaleSorter } from '~/lib/utils';
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
      by: ['businessGroup', 'color'],
      _count: true,
      where: {
        businessGroup: allowedGroups ? { in: allowedGroups } : { not: null },
      },
    });

    const map = new Map<
      string,
      {
        total: number;
        green: number;
        blue: number;
        orange: number;
        yellow: number;
        gray: number;
      }
    >();

    for (const row of rows) {
      const name = row.businessGroup ?? '';
      if (!name) continue;
      if (!map.has(name))
        map.set(name, {
          total: 0,
          green: 0,
          blue: 0,
          orange: 0,
          yellow: 0,
          gray: 0,
        });
      const entry = map.get(name);
      if (!entry) continue;
      entry.total += row._count;
      if (row.color === 'green') entry.green += row._count;
      else if (row.color === 'blue') entry.blue += row._count;
      else if (row.color === 'orange') entry.orange += row._count;
      else if (row.color === 'yellow') entry.yellow += row._count;
      else entry.gray += row._count;
    }

    const all = Array.from(map.entries()).map(([name, counts]) => {
      const { total } = counts;
      return {
        name,
        total,
        greenCount: counts.green,
        blueCount: counts.blue,
        orangeCount: counts.orange,
        yellowCount: counts.yellow,
        grayCount: counts.gray,
        greenPercent: total > 0 ? Math.round((counts.green / total) * 100) : 0,
        bluePercent: total > 0 ? Math.round((counts.blue / total) * 100) : 0,
        orangePercent:
          total > 0 ? Math.round((counts.orange / total) * 100) : 0,
        yellowPercent:
          total > 0 ? Math.round((counts.yellow / total) * 100) : 0,
        grayPercent: total > 0 ? Math.round((counts.gray / total) * 100) : 0,
      };
    });

    return {
      groups: all.sort(createLocaleSorter('name')),
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
        const result = await ctx.db.$transaction(async (tx) => {
          const old = await tx.businessGroup.findUnique({
            where: { id: input.id },
            select: { name: true },
          });

          const updated = await tx.businessGroup.update({
            where: { id: input.id },
            data: { name: input.name },
          });

          if (old?.name && old.name !== input.name) {
            await tx.customerCard.updateMany({
              where: { businessGroup: old.name },
              data: { businessGroup: input.name },
            });
          }

          return updated;
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
        const result = await ctx.db.$transaction(async (tx) => {
          const businessGroup = await tx.businessGroup.findUnique({
            where: { id: input.id },
            select: { name: true },
          });

          const deleted = await tx.businessGroup.delete({
            where: { id: input.id },
          });

          if (businessGroup?.name) {
            await tx.customerCard.updateMany({
              where: { businessGroup: businessGroup.name },
              data: { businessGroup: null },
            });
          }

          return deleted;
        });

        await createAuditLog(
          ctx.db,
          ctx.session.user.id,
          'BUSINESS_GROUP_DELETED',
          'BUSINESS_GROUP',
          input.id,
          'SUCCESS',
          undefined,
          `Meslek grubu silindi: ${result.name}`,
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
