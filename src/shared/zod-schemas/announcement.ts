import { z } from 'zod';

/**
 * Exactly the shape the upload route (`/api/uploads/announcements`) hands
 * back: a UUID file name in the announcements upload folder. Anything else —
 * `..` segments, other folders, external URLs — is rejected, since the path
 * is later unlinked on delete and rendered as an <img> for every user.
 */
export const ANNOUNCEMENT_IMAGE_PATH_REGEX =
  /^\/uploads\/announcements\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp|gif)$/;

export const AnnouncementCreateSchema = z.object({
  title: z.string().min(1, 'Başlık zorunludur'),
  body: z.string().optional(),
  // '' is the form's "no image" value; the dialog sends it as null.
  imagePath: z
    .union([
      z.string().regex(ANNOUNCEMENT_IMAGE_PATH_REGEX, 'Geçersiz görsel yolu'),
      z.literal(''),
    ])
    .nullable()
    .optional(),
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
