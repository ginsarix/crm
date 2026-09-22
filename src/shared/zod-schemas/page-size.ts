import { z } from 'zod';
import { pageSizeTableKeys } from '~/shared/page-sizes/registry';
import type { PageSizeTableKey } from '~/shared/page-sizes/types';

export const MIN_PAGE_SIZE = 1;
export const MAX_PAGE_SIZE = 500;
export const MIN_OPTION_COUNT = 1;
export const MAX_OPTION_COUNT = 5;

/**
 * Ascending order is deliberately NOT validated here. The router sorts before
 * writing, so sorted-on-read holds regardless of what the form submits.
 */
const baseConfig = z.object({
  options: z
    .array(z.number().int().min(MIN_PAGE_SIZE).max(MAX_PAGE_SIZE))
    .min(MIN_OPTION_COUNT)
    .max(MAX_OPTION_COUNT)
    .refine(
      (options) => new Set(options).size === options.length,
      'Aynı değerden birden fazla olamaz',
    ),
  defaultValue: z.number().int().min(MIN_PAGE_SIZE).max(MAX_PAGE_SIZE),
});

const defaultIsAnOption = (config: {
  options: number[];
  defaultValue: number;
}) => config.options.includes(config.defaultValue);

const DEFAULT_NOT_IN_OPTIONS = 'Varsayılan, seçenekler arasında olmalı';

export const PageSizeTableConfigSchema = baseConfig.refine(
  defaultIsAnOption,
  DEFAULT_NOT_IN_OPTIONS,
);

/**
 * Built by extending the base object rather than intersecting the refined
 * schema: `.refine` returns a ZodEffects, and `z.intersection` over one does
 * not compose the way `.extend` does.
 */
export const PageSizeUpdateSchema = baseConfig
  .extend({
    tableKey: z.enum(
      pageSizeTableKeys as [PageSizeTableKey, ...PageSizeTableKey[]],
    ),
  })
  .refine(defaultIsAnOption, DEFAULT_NOT_IN_OPTIONS);

export type PageSizeUpdateInput = z.infer<typeof PageSizeUpdateSchema>;
