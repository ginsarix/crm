import { z } from 'zod';
import { defaultGraySubtractionBusinessGroup } from '~/constants/dashboard-config';
import { createLocaleSorter } from '~/lib/utils';
import { getDashboardConfig } from '~/server/lib/get-dashboard-config';
import {
  BusinessGroupCreateSchema,
  BusinessGroupUpdateSchema,
} from '~/shared/zod-schemas/business-group';
import { getPassiveBusinessGroupNames } from '../lib/passive-business-groups';
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

  getStats: protectedProcedure
    .input(z.object({ businessGroup: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const isAdmin = ctx.session.user.role === 'admin';
      const passiveNames = await getPassiveBusinessGroupNames(ctx.db);

      let allowedGroups: string[] | null = null;
      if (!isAdmin) {
        const assigned = await ctx.db.businessGroup.findMany({
          where: { assignedUsers: { some: { id: ctx.session.user.id } } },
          select: { name: true },
        });
        allowedGroups = assigned
          .map((g) => g.name)
          .filter((name) => !passiveNames.includes(name));
      }

      // For non-admins, only honor an explicit businessGroup filter if it's
      // one of their assigned groups — otherwise fall back to the full
      // allowed-groups filter rather than trusting the raw input. A passive
      // group is never honored, admin or not — its stats stay hidden.
      const requestedGroup =
        input?.businessGroup &&
        !passiveNames.includes(input.businessGroup) &&
        (!allowedGroups || allowedGroups.includes(input.businessGroup))
          ? input.businessGroup
          : undefined;

      const rows = await ctx.db.customerCard.groupBy({
        by: ['businessGroup', 'color'],
        _count: true,
        where: {
          businessGroup: requestedGroup
            ? requestedGroup
            : allowedGroups
              ? { in: allowedGroups }
              : { not: null, notIn: passiveNames },
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
          purple: number;
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
            purple: 0,
            gray: 0,
          });
        const entry = map.get(name);
        if (!entry) continue;
        entry.total += row._count;

        entry[
          ['green', 'blue', 'orange', 'yellow', 'purple'].includes(row.color)
            ? row.color
            : 'gray'
        ] += row._count;
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
          purpleCount: counts.purple,
          grayCount: counts.gray,
          greenPercent:
            total > 0 ? Math.round((counts.green / total) * 100) : 0,
          bluePercent: total > 0 ? Math.round((counts.blue / total) * 100) : 0,
          orangePercent:
            total > 0 ? Math.round((counts.orange / total) * 100) : 0,
          yellowPercent:
            total > 0 ? Math.round((counts.yellow / total) * 100) : 0,
          purplePercent:
            total > 0 ? Math.round((counts.purple / total) * 100) : 0,
          grayPercent: total > 0 ? Math.round((counts.gray / total) * 100) : 0,
        };
      });

      return {
        groups: all.sort(createLocaleSorter('name')),
      };
    }),

  getGraySubtractionBusinessGroupCount: adminProcedure.query(
    async ({ ctx }) => {
      const config = await getDashboardConfig();

      if (!config?.graySubtractionBusinessGroup) {
        await ctx.db.dashboardConfig.create({
          data: {
            id: 'singleton',
            graySubtractionBusinessGroup: defaultGraySubtractionBusinessGroup,
          },
        });
      }

      const graySubtractionBusinessGroup =
        config?.graySubtractionBusinessGroup ??
        defaultGraySubtractionBusinessGroup;

      const passiveNames = await getPassiveBusinessGroupNames(ctx.db);
      const customerCardCountSpecialBusinessGroup = passiveNames.includes(
        graySubtractionBusinessGroup,
      )
        ? Promise.resolve(0)
        : ctx.db.customerCard.count({
            where: {
              businessGroup: graySubtractionBusinessGroup,
            },
          });

      return {
        count: customerCardCountSpecialBusinessGroup,
        graySubtractionBusinessGroup,
      };
    },
  ),

  get: protectedProcedure
    .input(z.object({ includePassive: z.boolean().default(false) }).optional())
    .query(async ({ ctx, input }) => {
      const isAdmin = ctx.session.user.role === 'admin';
      // `passive` is nullable, and Prisma's `not: true` excludes NULL rows
      // (translates to `<> true`, not `IS DISTINCT FROM true`) — an explicit
      // null/false OR is required to actually match "active".
      const passiveFilter = input?.includePassive
        ? {}
        : { OR: [{ passive: null }, { passive: false }] };
      if (isAdmin)
        return ctx.db.businessGroup.findMany({ where: passiveFilter });
      return ctx.db.businessGroup.findMany({
        where: {
          assignedUsers: { some: { id: ctx.session.user.id } },
          ...passiveFilter,
        },
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
    .input(BusinessGroupCreateSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await ctx.db.$transaction(async (tx) => {
          const group = await tx.businessGroup.create({
            data: { name: input.name },
          });
          await tx.businessGroupCard.create({
            data: { businessGroupId: group.id },
          });
          return group;
        });

        await createAuditLog(
          ctx,
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
          ctx,
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
    .input(BusinessGroupUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await ctx.db.$transaction(async (tx) => {
          const old = await tx.businessGroup.findUnique({
            where: { id: input.id },
            select: { name: true },
          });

          const updated = await tx.businessGroup.update({
            where: { id: input.id },
            data: {
              name: input.name,
              ...(input.passive !== undefined && { passive: input.passive }),
            },
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
          ctx,
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
          ctx,
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
          ctx,
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
          ctx,
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

  bulkDelete: adminProcedure
    .input(z.object({ ids: z.array(z.string()).min(1) }))
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await ctx.db.$transaction(async (tx) => {
          const groups = await tx.businessGroup.findMany({
            where: { id: { in: input.ids } },
            select: { name: true },
          });
          const names = groups.map((g) => g.name);

          if (names.length > 0) {
            await tx.customerCard.updateMany({
              where: { businessGroup: { in: names } },
              data: { businessGroup: null },
            });
          }

          return tx.businessGroup.deleteMany({
            where: { id: { in: input.ids } },
          });
        });

        await createAuditLog(
          ctx,
          'BUSINESS_GROUP_DELETED',
          'BUSINESS_GROUP',
          input.ids.join(','),
          'SUCCESS',
          undefined,
          `${result.count} meslek grubu silindi (toplu)`,
        );
        return result;
      } catch (error) {
        await createAuditLog(
          ctx,
          'BUSINESS_GROUP_DELETED',
          'BUSINESS_GROUP',
          input.ids.join(','),
          'FAILURE',
          error instanceof Error ? error.message : 'Bilinmeyen hata',
          `Toplu meslek grubu silinemedi`,
        );
        throw error;
      }
    }),
});
