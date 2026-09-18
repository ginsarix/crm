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

export type LabelChangeSummary = {
  /** Keys whose stored override is being added or changed. */
  updated: number;
  /** Keys whose stored override is being removed, returning them to the default. */
  reverted: number;
};

/**
 * Counts what a submission actually CHANGES, against what is currently stored.
 *
 * The editor submits every key in a tab, not just the edited ones, so the raw
 * partition is not a description of the change: an untouched field equals its
 * default and lands in `toDelete` even though it never had an override row.
 * Counting the partition therefore reports edits that did not happen — which
 * is exactly the wrong thing to write into an audit trail.
 */
export function summarizeLabelChanges(
  partition: LabelWritePartition,
  currentOverrides: Record<string, string>,
): LabelChangeSummary {
  const reverted = partition.toDelete.filter(
    (key) => currentOverrides[key] !== undefined,
  ).length;

  const updated = partition.toUpsert.filter(
    (row) => currentOverrides[row.key] !== row.value,
  ).length;

  return { updated, reverted };
}

/** Turkish audit-log detail describing what a label save actually changed. */
export function describeLabelChanges(summary: LabelChangeSummary): string {
  const parts: string[] = [];
  if (summary.updated > 0) parts.push(`${summary.updated} etiket güncellendi`);
  if (summary.reverted > 0) {
    parts.push(`${summary.reverted} etiket varsayılana döndürüldü`);
  }

  return parts.length > 0 ? parts.join(', ') : 'Değişiklik yapılmadı';
}
