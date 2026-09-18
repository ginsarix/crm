import {
  describeLabelChanges,
  partitionLabelWrites,
  summarizeLabelChanges,
} from '~/shared/labels/partition';
import { resolveLabels } from '~/shared/labels/resolve';
import { LabelUpdateSchema } from '~/shared/zod-schemas/label';
import {
  adminProcedure,
  createAuditLog,
  createTRPCRouter,
  protectedProcedure,
} from '../trpc';

export const labelRouter = createTRPCRouter({
  get: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.labelOverride.findMany();
    const overrides = Object.fromEntries(
      rows.map((row) => [row.key, row.value]),
    );
    return resolveLabels(overrides);
  }),

  update: adminProcedure
    .input(LabelUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const partition = partitionLabelWrites(input.values);
      const { toDelete, toUpsert } = partition;

      // Read current state BEFORE writing, so the audit detail can describe
      // what actually changed rather than what was submitted. The editor sends
      // every key in a tab, so most of `toDelete` is untouched fields that
      // never had an override row.
      const existing = await ctx.db.labelOverride.findMany({
        where: { key: { in: Object.keys(input.values) } },
      });
      const currentOverrides = Object.fromEntries(
        existing.map((row) => [row.key, row.value]),
      );

      try {
        await ctx.db.$transaction([
          ctx.db.labelOverride.deleteMany({ where: { key: { in: toDelete } } }),
          ...toUpsert.map((row) =>
            ctx.db.labelOverride.upsert({
              where: { key: row.key },
              update: { value: row.value, updatedById: ctx.session.user.id },
              create: { ...row, updatedById: ctx.session.user.id },
            }),
          ),
        ]);
      } catch (error) {
        await createAuditLog(
          ctx,
          'LABEL_UPDATED',
          'LABEL',
          'labels',
          'FAILURE',
          error instanceof Error ? error.message : 'Bilinmeyen hata',
        );
        throw error;
      }

      await createAuditLog(
        ctx,
        'LABEL_UPDATED',
        'LABEL',
        'labels',
        'SUCCESS',
        undefined,
        describeLabelChanges(
          summarizeLabelChanges(partition, currentOverrides),
        ),
      );

      return { success: true as const };
    }),
});
