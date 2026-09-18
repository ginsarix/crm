import { z } from 'zod';
import { editableLabelKeys } from '~/shared/labels/resolve';

export const LABEL_MAX_LENGTH = 60;

export const LabelValueSchema = z
  .string()
  .trim()
  .max(
    LABEL_MAX_LENGTH,
    `Etiket en fazla ${LABEL_MAX_LENGTH} karakter olabilir`,
  );

export const LabelUpdateSchema = z
  .object({
    values: z.record(z.string(), LabelValueSchema.nullable()),
  })
  .superRefine((input, ctx) => {
    for (const key of Object.keys(input.values)) {
      if (!editableLabelKeys.has(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['values', key],
          message: 'Bilinmeyen etiket anahtarı',
        });
      }
    }
  });
