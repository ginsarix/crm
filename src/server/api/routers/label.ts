import { defaultLabelValues, resolveLabels } from '~/shared/labels/resolve';
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
      const toDelete: string[] = [];
      const toUpsert: { key: string; value: string }[] = [];

      for (const [key, value] of Object.entries(input.values)) {
        const trimmed = value?.trim() ?? '';
        // Empty means "use the default", and a value equal to the default
        // is stored as absence so improved defaults keep reaching it.
        if (!trimmed || trimmed === defaultLabelValues[key]) {
          toDelete.push(key);
        } else {
          toUpsert.push({ key, value: trimmed });
        }
      }

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
        `${toUpsert.length} etiket güncellendi, ${toDelete.length} etiket varsayılana döndürüldü`,
      );

      return { success: true as const };
    }),
});
