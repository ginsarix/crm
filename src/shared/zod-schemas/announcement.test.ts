import { describe, expect, it } from 'vitest';
import { AnnouncementCreateSchema } from './announcement';

const base = { title: 'Başlık', publishNow: false };

function accepts(imagePath: string | null | undefined) {
  return AnnouncementCreateSchema.safeParse({ ...base, imagePath }).success;
}

describe('AnnouncementCreateSchema.imagePath', () => {
  it('accepts paths produced by the upload route', () => {
    expect(
      accepts(
        '/uploads/announcements/3f2b8c1e-9a4d-4e6f-8b2a-1c3d5e7f9a0b.png',
      ),
    ).toBe(true);
  });

  it('accepts no image', () => {
    expect(accepts(null)).toBe(true);
    expect(accepts(undefined)).toBe(true);
    expect(accepts('')).toBe(true);
  });

  it('rejects path traversal', () => {
    expect(accepts('/uploads/announcements/../../../.env')).toBe(false);
    expect(
      accepts(
        '/uploads/announcements/3f2b8c1e-9a4d-4e6f-8b2a-1c3d5e7f9a0b.png/../../../.env',
      ),
    ).toBe(false);
  });

  it('rejects external URLs and other folders', () => {
    expect(accepts('https://tracker.example/pixel.gif')).toBe(false);
    expect(accepts('//tracker.example/pixel.gif')).toBe(false);
    expect(accepts('/uploads/other/x.png')).toBe(false);
  });
});
