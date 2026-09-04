import { z } from 'zod';

export const BusinessGroupCreateSchema = z.object({
  name: z.string().min(1, 'Meslek grubu adı zorunludur'),
});

export const BusinessGroupFormSchema = BusinessGroupCreateSchema.extend({
  passive: z.boolean().optional(),
});

export const BusinessGroupUpdateSchema = BusinessGroupFormSchema.extend({
  id: z.string(),
});
