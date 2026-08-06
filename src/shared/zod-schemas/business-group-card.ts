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
  'uye4',
  'uye5',
  'yedekUye1',
  'yedekUye2',
  'yedekUye3',
  'yedekUye4',
  'yedekUye5',
  'yedekUye6',
  'yedekUye7',
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
  uye4: z.array(z.string()).optional(),
  uye5: z.array(z.string()).optional(),
  yedekUye1: z.array(z.string()).optional(),
  yedekUye2: z.array(z.string()).optional(),
  yedekUye3: z.array(z.string()).optional(),
  yedekUye4: z.array(z.string()).optional(),
  yedekUye5: z.array(z.string()).optional(),
  yedekUye6: z.array(z.string()).optional(),
  yedekUye7: z.array(z.string()).optional(),
});

export type Committee = z.infer<typeof CommitteeSchema>;

export const MeclisSayisiValidation = z.union([z.literal(2), z.literal(3)]);

export function getDuplicateCommitteeNames(
  committee: Partial<Record<CommitteeFieldKey, string[] | undefined>> | null,
): Set<string> {
  const fieldsByName = new Map<string, Set<CommitteeFieldKey>>();
  for (const key of committeeFieldKeys) {
    for (const name of committee?.[key] ?? []) {
      const fields = fieldsByName.get(name) ?? new Set<CommitteeFieldKey>();
      fields.add(key);
      fieldsByName.set(name, fields);
    }
  }

  const duplicates = new Set<string>();
  for (const [name, fields] of fieldsByName) {
    if (fields.size > 1) duplicates.add(name);
  }
  return duplicates;
}

export const BusinessGroupCardUpdateSchema = z.object({
  id: z.string(),
  committee: CommitteeSchema,
  meclisSayisi: MeclisSayisiValidation.nullable().optional(),
  uyeSayisi: z.string().nullable().optional(),
});
