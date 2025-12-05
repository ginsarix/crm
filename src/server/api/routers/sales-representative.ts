import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';

export const salesRepresentativeRouter = createTRPCRouter({
  getTotal: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.db.salesRepresentative.count();
  }),
  get: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.db.salesRepresentative.findMany();
  }),
  create: protectedProcedure
    .input(
      z.object({
        name: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.salesRepresentative.create({
        data: { name: input.name },
      });
    }),
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.salesRepresentative.update({
        where: { id: input.id },
        data: { name: input.name },
      });
    }),
  delete: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.salesRepresentative.delete({
        where: { id: input.id },
      });
    }),
});
