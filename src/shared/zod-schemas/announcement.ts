import { z } from 'zod';

export const AnnouncementCreateSchema = z.object({
  title: z.string().min(1, 'Başlık zorunludur'),
  body: z.string().optional(),
  imagePath: z.string().nullable().optional(),
  // Transient — not persisted. Tells the server to override `start` with its
  // own clock instead of trusting the client's date picker value.
  publishNow: z.boolean(),
  start: z.date().nullable().optional(),
  end: z.date().nullable().optional(),
});

export const AnnouncementEditSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1, 'Başlık zorunludur'),
  body: z.string().optional(),
});

export const AnnouncementRescheduleSchema = z.object({
  id: z.string().min(1),
  start: z.date().nullable(),
  end: z.date().nullable(),
});
