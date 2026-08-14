import { unlink } from 'node:fs/promises';
import path from 'node:path';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { computePublishNowWindow } from '~/lib/announcement-status';
import {
  AnnouncementCreateSchema,
  AnnouncementEditSchema,
  AnnouncementRescheduleSchema,
} from '~/shared/zod-schemas/announcement';
import {
  adminProcedure,
  createAuditLog,
  createTRPCRouter,
  protectedProcedure,
} from '../trpc';

async function deleteUploadedFile(imagePath: string | null) {
  if (!imagePath?.startsWith('/uploads/announcements/')) return;
  try {
    await unlink(path.join(process.cwd(), 'public', imagePath));
  } catch {
    // best effort — file may already be gone
  }
}

export const announcementRouter = createTRPCRouter({
  get: adminProcedure.query(async ({ ctx }) => {
    return ctx.db.announcement.findMany({ orderBy: { createdAt: 'desc' } });
  }),

  // Currently-live announcements, for the consumer-facing nudge/trigger — any
  // logged-in user may read these, not just admins. Matches the same
  // start/end derivation as getAnnouncementStatus, so anything the admin
  // gallery shows as "live" (including scheduled items whose start has
  // simply arrived) shows up here too.
  getLive: protectedProcedure.query(async ({ ctx }) => {
    const now = new Date();
    return ctx.db.announcement.findMany({
      where: {
        start: { lte: now },
        OR: [{ end: null }, { end: { gte: now } }],
      },
      orderBy: { start: 'desc' },
    });
  }),

  create: adminProcedure
    .input(AnnouncementCreateSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await ctx.db.announcement.create({
          data: {
            title: input.title,
            body: input.body?.trim() || null,
            imagePath: input.imagePath,
            start: input.publishNow ? new Date() : (input.start ?? null),
            end: input.end ?? null,
            createdById: ctx.session.user.id,
          },
        });

        await createAuditLog(
          ctx,
          'ANNOUNCEMENT_CREATED',
          'ANNOUNCEMENT',
          result.id,
          'SUCCESS',
          undefined,
          `Duyuru oluşturuldu: ${result.title}`,
        );

        return result;
      } catch (error) {
        await createAuditLog(
          ctx,
          'ANNOUNCEMENT_CREATED',
          'ANNOUNCEMENT',
          '',
          'FAILURE',
          error instanceof Error ? error.message : 'Bilinmeyen hata',
          `Duyuru oluşturulamadı: ${input.title}`,
        );
        throw error;
      }
    }),

  update: adminProcedure
    .input(AnnouncementEditSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await ctx.db.announcement.update({
          where: { id: input.id },
          data: { title: input.title, body: input.body?.trim() || null },
        });

        await createAuditLog(
          ctx,
          'ANNOUNCEMENT_UPDATED',
          'ANNOUNCEMENT',
          result.id,
          'SUCCESS',
          undefined,
          `Duyuru güncellendi: ${result.title}`,
        );

        return result;
      } catch (error) {
        await createAuditLog(
          ctx,
          'ANNOUNCEMENT_UPDATED',
          'ANNOUNCEMENT',
          input.id,
          'FAILURE',
          error instanceof Error ? error.message : 'Bilinmeyen hata',
          `Duyuru güncellenemedi`,
        );
        throw error;
      }
    }),

  reschedule: adminProcedure
    .input(AnnouncementRescheduleSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await ctx.db.announcement.update({
          where: { id: input.id },
          data: { start: input.start, end: input.end },
        });

        await createAuditLog(
          ctx,
          'ANNOUNCEMENT_RESCHEDULED',
          'ANNOUNCEMENT',
          result.id,
          'SUCCESS',
          undefined,
          `Duyuru zamanlaması değiştirildi: ${result.title}`,
        );

        return result;
      } catch (error) {
        await createAuditLog(
          ctx,
          'ANNOUNCEMENT_RESCHEDULED',
          'ANNOUNCEMENT',
          input.id,
          'FAILURE',
          error instanceof Error ? error.message : 'Bilinmeyen hata',
          `Duyuru zamanlaması değiştirilemedi`,
        );
        throw error;
      }
    }),

  publishNow: adminProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      try {
        const existing = await ctx.db.announcement.findUnique({
          where: { id: input.id },
        });
        if (!existing) {
          throw new TRPCError({ code: 'NOT_FOUND' });
        }

        const window = computePublishNowWindow(existing);

        const result = await ctx.db.announcement.update({
          where: { id: input.id },
          data: { start: window.start, end: window.end },
        });

        await createAuditLog(
          ctx,
          'ANNOUNCEMENT_PUBLISHED',
          'ANNOUNCEMENT',
          result.id,
          'SUCCESS',
          undefined,
          `Duyuru yayınlandı: ${result.title}`,
        );

        return result;
      } catch (error) {
        await createAuditLog(
          ctx,
          'ANNOUNCEMENT_PUBLISHED',
          'ANNOUNCEMENT',
          input.id,
          'FAILURE',
          error instanceof Error ? error.message : 'Bilinmeyen hata',
          `Duyuru yayınlanamadı`,
        );
        throw error;
      }
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await ctx.db.announcement.delete({
          where: { id: input.id },
        });

        await deleteUploadedFile(result.imagePath);

        await createAuditLog(
          ctx,
          'ANNOUNCEMENT_DELETED',
          'ANNOUNCEMENT',
          input.id,
          'SUCCESS',
          undefined,
          `Duyuru silindi: ${result.title}`,
        );

        return result;
      } catch (error) {
        await createAuditLog(
          ctx,
          'ANNOUNCEMENT_DELETED',
          'ANNOUNCEMENT',
          input.id,
          'FAILURE',
          error instanceof Error ? error.message : 'Bilinmeyen hata',
          `Duyuru silinemedi`,
        );
        throw error;
      }
    }),
});
