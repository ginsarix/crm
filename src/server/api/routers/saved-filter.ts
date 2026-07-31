import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';

const pageSchema = z.enum(['customerCard', 'visit']);

export const savedFilterRouter = createTRPCRouter({
  get: protectedProcedure
    .input(z.object({ page: pageSchema }))
    .query(({ ctx, input }) =>
      ctx.db.savedFilter.findMany({
        where: { userId: ctx.session.user.id, page: input.page },
        orderBy: { name: 'asc' },
      }),
    ),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().trim().min(1, 'İsim zorunludur').max(60),
        page: pageSchema,
        filters: z.record(z.string(), z.string()),
      }),
    )
    .mutation(({ ctx, input }) =>
      ctx.db.savedFilter.create({
        data: {
          name: input.name,
          page: input.page,
          filters: input.filters,
          user: { connect: { id: ctx.session.user.id } },
        },
      }),
    ),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.savedFilter.findFirst({
        where: { id: input.id, userId: ctx.session.user.id },
      });
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND' });

      return ctx.db.savedFilter.delete({ where: { id: input.id } });
    }),
});
