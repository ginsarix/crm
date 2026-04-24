import { z } from "zod";
import {
  adminProcedure,
  createAuditLog,
  createTRPCRouter,
  protectedProcedure,
} from "../trpc";

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
      try {
        const result = await ctx.db.salesRepresentative.create({
          data: { name: input.name },
        });

        await createAuditLog(
          ctx.db,
          ctx.session.user.id,
          "SALES_REPRESENTATIVE_CREATED",
          "SALES_REPRESENTATIVE",
          result.id,
          "SUCCESS",
          undefined,
          `Satış temsilcisi oluşturuldu: ${result.name}`,
        );

        return result;
      } catch (error) {
        await createAuditLog(
          ctx.db,
          ctx.session.user.id,
          "SALES_REPRESENTATIVE_CREATED",
          "SALES_REPRESENTATIVE",
          "",
          "FAILURE",
          error instanceof Error ? error.message : "Bilinmeyen Hata",
          `Satış temsilcisi oluşturulamadı: ${input.name}`,
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
        const result = await ctx.db.salesRepresentative.update({
          where: { id: input.id },
          data: { name: input.name },
        });

        await createAuditLog(
          ctx.db,
          ctx.session.user.id,
          "SALES_REPRESENTATIVE_UPDATED",
          "SALES_REPRESENTATIVE",
          input.id,
          "SUCCESS",
          undefined,
          `Satış temsilcisi güncellendi: ${result.name}`,
        );

        return result;
      } catch (error) {
        await createAuditLog(
          ctx.db,
          ctx.session.user.id,
          "SALES_REPRESENTATIVE_UPDATED",
          "SALES_REPRESENTATIVE",
          input.id,
          "FAILURE",
          error instanceof Error ? error.message : "Bilinmeyen hata",
          `Satış temsilcisi güncellenemedi: ${input.name}`,
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
        // Get the sales representative name before deletion for audit log
        const salesRepresentative = await ctx.db.salesRepresentative.findUnique(
          {
            where: { id: input.id },
            select: { name: true },
          },
        );

        const result = await ctx.db.salesRepresentative.delete({
          where: { id: input.id },
        });
        await createAuditLog(
          ctx.db,
          ctx.session.user.id,
          "SALES_REPRESENTATIVE_DELETED",
          "SALES_REPRESENTATIVE",
          input.id,
          "SUCCESS",
          undefined,
          `Satış temsilcisi silindi: ${salesRepresentative?.name}`,
        );

        return result;
      } catch (error) {
        await createAuditLog(
          ctx.db,
          ctx.session.user.id,
          "SALES_REPRESENTATIVE_DELETED",
          "SALES_REPRESENTATIVE",
          input.id,
          "FAILURE",
          error instanceof Error ? error.message : "Bilinmeyen hata",
          `Satış temsilcisi silinemedi`,
        );

        throw error;
      }
    }),
  customerCardPositives: protectedProcedure.query(async ({ ctx }) => {
    const counts = await ctx.db.customerCard.groupBy({
      by: ["salesRepresentative"],
      where: {
        positive: "positive",
      },
      _count: true,
    });

    return counts
      .filter((c) => c.salesRepresentative)
      .map((c) => ({
        salesRepresentative: c.salesRepresentative as string,
        customerCardCount: c._count,
      }));
  }),
  customerCardNegatives: protectedProcedure.query(async ({ ctx }) => {
    const counts = await ctx.db.customerCard.groupBy({
      by: ["salesRepresentative"],
      where: {
        positive: "negative",
      },
      _count: true,
    });

    return counts
      .filter((c) => c.salesRepresentative)
      .map((c) => ({
        salesRepresentative: c.salesRepresentative as string,
        customerCardCount: c._count,
      }));
  }),
});
