import { z } from 'zod';
import { createAuditLog, createTRPCRouter, protectedProcedure } from '../trpc';

export const businessGroupRouter = createTRPCRouter({
  getTotal: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.db.businessGroup.count();
  }),
  get: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.db.businessGroup.findMany();
  }),
  create: protectedProcedure
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
  update: protectedProcedure
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
  delete: protectedProcedure
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
