import { defaultLabelValues } from './resolve';

export type LabelWritePartition = {
  toDelete: string[];
  toUpsert: { key: string; value: string }[];
};

/**
 * Partitions submitted label values into rows to delete vs. rows to upsert.
 *
 * Empty means "use the default", and a value equal to the default is stored
 * as absence so improved defaults keep reaching it.
 */
export function partitionLabelWrites(
  values: Record<string, string | null>,
): LabelWritePartition {
  const toDelete: string[] = [];
  const toUpsert: { key: string; value: string }[] = [];

  for (const [key, value] of Object.entries(values)) {
    const trimmed = value?.trim() ?? '';
    // Empty means "use the default", and a value equal to the default
    // is stored as absence so improved defaults keep reaching it.
    if (!trimmed || trimmed === defaultLabelValues[key]) {
      toDelete.push(key);
    } else {
      toUpsert.push({ key, value: trimmed });
    }
  }

  return { toDelete, toUpsert };
}
