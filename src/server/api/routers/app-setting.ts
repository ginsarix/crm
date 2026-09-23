import type { PrismaClient } from 'generated/prisma';
import {
  adminProcedure,
  createAuditLog,
  createTRPCRouter,
  protectedProcedure,
} from '~/server/api/trpc';
import {
  AppSettingUpdateSchema,
  type CustomerCardBulkMode,
  DEFAULT_CUSTOMER_CARD_BULK_MODE,
} from '~/shared/zod-schemas/app-setting';

const SINGLETON_ID = 'singleton';

const BULK_MODE_DISPLAY: Record<CustomerCardBulkMode, string> = {
  color_delete: 'Renk ve silme',
  vote: 'Yalnızca oy',
};

/** Reads the settings row, falling back to defaults when none exists yet. */
export async function getAppSettings(db: PrismaClient) {
  const row = await db.appSetting.findUnique({ where: { id: SINGLETON_ID } });
  return {
    customerCardBulkMode:
      row?.customerCardBulkMode ?? DEFAULT_CUSTOMER_CARD_BULK_MODE,
  };
}

export const appSettingRouter = createTRPCRouter({
  get: protectedProcedure.query(({ ctx }) => getAppSettings(ctx.db)),

  update: adminProcedure
    .input(AppSettingUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const previous = await getAppSettings(ctx.db);

      try {
        await ctx.db.appSetting.upsert({
          where: { id: SINGLETON_ID },
          update: { ...input, updatedById: ctx.session.user.id },
          create: {
            id: SINGLETON_ID,
            ...input,
            updatedById: ctx.session.user.id,
          },
        });
      } catch (error) {
        await createAuditLog(
          ctx,
          'GENERAL_SETTINGS_UPDATED',
          'SETTINGS',
          SINGLETON_ID,
          'FAILURE',
          error instanceof Error ? error.message : 'Bilinmeyen hata',
        );
        throw error;
      }

      await createAuditLog(
        ctx,
        'GENERAL_SETTINGS_UPDATED',
        'SETTINGS',
        SINGLETON_ID,
        'SUCCESS',
        undefined,
        `Toplu seçim modu: ${BULK_MODE_DISPLAY[previous.customerCardBulkMode]} → ${BULK_MODE_DISPLAY[input.customerCardBulkMode]}`,
      );

      return { success: true as const };
    }),
});
