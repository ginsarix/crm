import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';

export const feedbackRouter = createTRPCRouter({
  submit: protectedProcedure
    .input(
      z.object({
        version: z.string(),
        subjectType: z.string().optional(),
        subjectId: z.string().optional(),
        feedback: z.string().optional(),
        like: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.feedback.create({
        data: {
          version: input.version,
          subjectType: input.subjectType ?? null,
          subjectId: input.subjectId ?? null,
          feedback: input.feedback ?? null,
          like: input.like ?? null,
          userId: ctx.session.user.id,
        },
      });
    }),

  update: protectedProcedure
    .input(z.object({ id: z.string(), feedback: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.feedback.findFirst({
        where: { id: input.id, userId: ctx.session.user.id },
      });
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND' });
      return ctx.db.feedback.update({
        where: { id: input.id },
        data: { feedback: input.feedback },
      });
    }),

  retract: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.feedback.findFirst({
        where: { id: input.id, userId: ctx.session.user.id },
      });
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND' });
      return ctx.db.feedback.delete({ where: { id: input.id } });
    }),
});
