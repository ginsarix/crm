import { z } from 'zod';

export const committeeFieldKeys = [
  'meclis1',
  'meclis2',
  'meclis3',
  'baskan',
  'baskanYardimcisi',
  'uye1',
  'uye2',
  'uye3',
  'yedekUye1',
  'yedekUye2',
] as const;

export type CommitteeFieldKey = (typeof committeeFieldKeys)[number];

export const CommitteeSchema = z.object({
  meclis1: z.array(z.string()).optional(),
  meclis2: z.array(z.string()).optional(),
  meclis3: z.array(z.string()).optional(),
  baskan: z.array(z.string()).optional(),
  baskanYardimcisi: z.array(z.string()).optional(),
  uye1: z.array(z.string()).optional(),
  uye2: z.array(z.string()).optional(),
  uye3: z.array(z.string()).optional(),
  yedekUye1: z.array(z.string()).optional(),
  yedekUye2: z.array(z.string()).optional(),
});

export type Committee = z.infer<typeof CommitteeSchema>;

export const BusinessGroupCardUpdateSchema = z.object({
  id: z.string(),
  committee: CommitteeSchema,
});
