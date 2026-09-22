import {
  adminProcedure,
  createAuditLog,
  createTRPCRouter,
  protectedProcedure,
} from '~/server/api/trpc';
import { pageSizeTables } from '~/shared/page-sizes/registry';
import {
  type PageSizeConfigRow,
  resolvePageSizes,
} from '~/shared/page-sizes/resolve';
import type { PageSizeTableConfig } from '~/shared/page-sizes/types';
import {
  type PageSizeUpdateInput,
  PageSizeUpdateSchema,
} from '~/shared/zod-schemas/page-size';

const sameConfig = (a: PageSizeTableConfig, b: PageSizeTableConfig) =>
  a.defaultValue === b.defaultValue &&
  a.options.length === b.options.length &&
  a.options.every((value, index) => value === b.options[index]);

/**
 * Sorts the submitted options and reports whether the result is identical to
 * the table's built-in config. An identical config is stored as the ABSENCE of
 * a row, which is what keeps the table sparse — same contract as
 * `LabelOverride`, where an override equal to its default is deleted rather
 * than written.
 */
export function normalizeUpdate(input: PageSizeUpdateInput) {
  const options = [...input.options].sort((a, b) => a - b);
  const registry = pageSizeTables[input.tableKey];
  const registryConfig: PageSizeTableConfig = {
    options: [...registry.options].sort((a, b) => a - b),
    defaultValue: registry.defaultValue,
  };

  return {
    options,
    defaultValue: input.defaultValue,
    matchesRegistry: sameConfig(
      { options, defaultValue: input.defaultValue },
      registryConfig,
    ),
  };
}

const describeChange = (
  tableKey: string,
  next: { options: number[]; defaultValue: number },
  previous: PageSizeTableConfig | null,
) => {
  const format = (config: { options: number[]; defaultValue: number }) =>
    `${config.options.join(', ')} (varsayılan ${config.defaultValue})`;

  return previous
    ? `${tableKey}: ${format(previous)} → ${format(next)}`
    : `${tableKey}: ${format(next)}`;
};

export const pageSizeRouter = createTRPCRouter({
  get: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.pageSizeConfig.findMany();
    return resolvePageSizes(rows as PageSizeConfigRow[]);
  }),

  update: adminProcedure
    .input(PageSizeUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const { options, defaultValue, matchesRegistry } = normalizeUpdate(input);

      // Read before writing so the audit detail describes what actually
      // changed rather than what was submitted.
      const existingRow = await ctx.db.pageSizeConfig.findUnique({
        where: { tableKey: input.tableKey },
      });
      const previous = existingRow
        ? resolvePageSizes([existingRow as PageSizeConfigRow])[input.tableKey]
        : null;

      try {
        if (matchesRegistry) {
          await ctx.db.pageSizeConfig.deleteMany({
            where: { tableKey: input.tableKey },
          });
        } else {
          await ctx.db.pageSizeConfig.upsert({
            where: { tableKey: input.tableKey },
            update: {
              options,
              defaultValue,
              updatedById: ctx.session.user.id,
            },
            create: {
              tableKey: input.tableKey,
              options,
              defaultValue,
              updatedById: ctx.session.user.id,
            },
          });
        }
      } catch (error) {
        await createAuditLog(
          ctx,
          'PAGE_SIZE_UPDATED',
          'PAGE_SIZE',
          input.tableKey,
          'FAILURE',
          error instanceof Error ? error.message : 'Bilinmeyen hata',
        );
        throw error;
      }

      await createAuditLog(
        ctx,
        'PAGE_SIZE_UPDATED',
        'PAGE_SIZE',
        input.tableKey,
        'SUCCESS',
        undefined,
        describeChange(input.tableKey, { options, defaultValue }, previous),
      );

      return { success: true as const };
    }),
});
