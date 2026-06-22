import { z } from "zod";
import { createTRPCRouter, adminProcedure, protectedProcedure } from "../trpc";

export const dashboardConfigRouter = createTRPCRouter({

  get: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.dashboardConfig.findUnique({
      where: { id: "singleton" },
    });
  }),

  update: adminProcedure
    .input(z.object({ graySubtractionBusinessGroup: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.dashboardConfig.upsert({
        where: { id: "singleton" },
        update: input,
        create: { id: "singleton", ...input },
      });
    }),
});
