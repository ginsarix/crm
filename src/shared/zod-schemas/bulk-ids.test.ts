import { describe, expect, it } from 'vitest';
import { BULK_IDS_MAX, BulkIdsSchema } from './bulk-ids';
import { MAX_PAGE_SIZE } from './page-size';

const ids = (n: number) => Array.from({ length: n }, (_, i) => `id${i}`);

describe('BulkIdsSchema', () => {
  it('accepts up to BULK_IDS_MAX ids', () => {
    expect(BulkIdsSchema.safeParse(ids(BULK_IDS_MAX)).success).toBe(true);
  });

  it('rejects more than BULK_IDS_MAX ids', () => {
    expect(BulkIdsSchema.safeParse(ids(BULK_IDS_MAX + 1)).success).toBe(false);
  });

  it('rejects an empty list', () => {
    expect(BulkIdsSchema.safeParse([]).success).toBe(false);
  });

  // Selecting every row on one full page must always be a valid bulk action
  it('is never smaller than the largest page size', () => {
    expect(BULK_IDS_MAX).toBeGreaterThanOrEqual(MAX_PAGE_SIZE);
  });
});
