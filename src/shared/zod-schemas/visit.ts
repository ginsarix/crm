import { z } from 'zod';

export const VisitCreateSchema = z.object({
  date: z.date({
    required_error: 'Tarih zorunludur',
  }),
  time: z.date().optional(),
  via: z.enum(['phone', 'inPerson', 'email', 'sms']).optional(),
  note: z.string().optional(),
  customerCardId: z.string().min(1, 'Müşteri kartı zorunludur'),
});

export const VisitFindManySelectSchema = z.object({
  id: z.boolean().default(false),
  date: z.boolean().default(true),
  time: z.boolean().default(true),
  via: z.boolean().default(true),
  note: z.boolean().default(true),
  customerCardId: z.boolean().default(true),
  createdById: z.boolean().default(true),
  createdAt: z.boolean().default(true),
  updatedAt: z.boolean().default(true),
});
