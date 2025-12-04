import { z } from 'zod';

export const CustomerCardCreateSchema = z.object({
  sira: z.string().optional(),
  name: z.string().min(1, 'Müşteri adı zorunludur'),
  sicil: z.string().optional(),
  address: z.string().optional(),
  district: z
    .enum([
      'merkez',
      'avanos',
      'urgup',
      'hacibektas',
      'kozakli',
      'acigol',
      'derinkuyu',
      'gulsehir',
    ])
    .optional(),
  region: z.string().optional(),
  gsm1: z.string().optional(),
  contact1: z.string().optional(),
  gsm2: z.string().optional(),
  contact2: z.string().optional(),
  gsm3: z.string().optional(),
  contact3: z.string().optional(),
  businessGroup: z.string().optional(),
  positive: z.enum(['negative', 'neutral', 'positive']).default('neutral'),
  salesRepresentative: z.string().optional(),
});

export const CustomerCardFindManySelectSchema = z.object({
  id: z.boolean().default(false),
  sira: z.boolean().default(true),
  name: z.boolean().default(true),
  sicil: z.boolean().default(true),
  address: z.boolean().default(true),
  district: z.boolean().default(true),
  region: z.boolean().default(true),
  gsm1: z.boolean().default(true),
  contact1: z.boolean().default(true),
  gsm2: z.boolean().default(true),
  contact2: z.boolean().default(true),
  gsm3: z.boolean().default(true),
  contact3: z.boolean().default(true),
  businessGroup: z.boolean().default(true),
  positive: z.boolean().default(true),
  salesRepresentative: z.boolean().default(true),
  createdById: z.boolean().default(true),
  createdAt: z.boolean().default(true),
  updatedAt: z.boolean().default(true),
});
