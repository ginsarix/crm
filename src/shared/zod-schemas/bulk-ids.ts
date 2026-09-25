import { z } from 'zod';

/**
 * Upper bound on how many rows one bulk action may target. Selection persists
 * across pages, so without a cap a single request (and its audit-log entry,
 * which stores every id) could grow without limit.
 */
export const BULK_IDS_MAX = 1000;

export const BulkIdsSchema = z.array(z.string()).min(1).max(BULK_IDS_MAX);
