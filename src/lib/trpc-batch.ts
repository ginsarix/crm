/**
 * Max tRPC calls per HTTP batch — enforced by the API route (maxBatchSize)
 * and mirrored by the client link (maxItems) so normal page loads that
 * batch more queries get split into several requests instead of rejected.
 */
export const TRPC_MAX_BATCH_SIZE = 20;
