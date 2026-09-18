import { z } from 'zod';

export const electionResultCountKeys = [
  'toplamOy',
  'kullanilanOy',
  'gecerliOy',
  'meclisUyeSayisi',
  'yesil',
  'mavi',
  'turuncu',
] as const;

export type ElectionResultCountKey = (typeof electionResultCountKeys)[number];

/**
 * Every count is optional to enter and a blank one MEANS zero (product
 * decision, 2026-09-18) — so the schema's output is always an integer and
 * nothing downstream handles null. The input side stays wide because the
 * inline table input holds `''` for a cleared cell.
 */
const OptionalCount = z.preprocess(
  (value) =>
    value === '' || value === null || value === undefined ? 0 : value,
  z.coerce.number().int().min(0),
);

export const ElectionResultUpdateSchema = z.object({
  id: z.string(),
  toplamOy: OptionalCount,
  kullanilanOy: OptionalCount,
  gecerliOy: OptionalCount,
  meclisUyeSayisi: OptionalCount,
  yesil: OptionalCount,
  mavi: OptionalCount,
  turuncu: OptionalCount,
});

/** What the router receives and the database stores — always integers. */
export type ElectionResultUpdateInput = z.output<
  typeof ElectionResultUpdateSchema
>;

/** What the form holds while editing — a cleared cell is `''`. */
export type ElectionResultFormValues = z.input<
  typeof ElectionResultUpdateSchema
>;
