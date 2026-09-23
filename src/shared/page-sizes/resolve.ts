import { PageSizeTableConfigSchema } from '~/shared/zod-schemas/page-size';
import { pageSizeTableKeys, pageSizeTables } from './registry';
import type {
  PageSizeTableConfig,
  PageSizeTableKey,
  ResolvedPageSizes,
} from './types';

/** The shape a `PageSizeConfig` row arrives in. `options` is JSONB, so it is
 * `unknown` until the schema has vouched for it. */
export type PageSizeConfigRow = {
  tableKey: string;
  options: unknown;
  defaultValue: number;
};

const sorted = (options: number[]) => [...options].sort((a, b) => a - b);

const registryConfig = (key: PageSizeTableKey): PageSizeTableConfig => {
  const table = pageSizeTables[key];
  return { options: sorted(table.options), defaultValue: table.defaultValue };
};

export const DEFAULT_PAGE_SIZES: ResolvedPageSizes = Object.fromEntries(
  pageSizeTableKeys.map((key) => [key, registryConfig(key)]),
) as ResolvedPageSizes;

const isTableKey = (key: string): key is PageSizeTableKey =>
  key in pageSizeTables;

/**
 * Layers stored rows over the registry. A row that fails validation — a
 * hand-edited DB, or a key retired in code — is discarded in favour of the
 * registry default rather than throwing: a single bad row must never take the
 * panel down.
 */
export function resolvePageSizes(rows: PageSizeConfigRow[]): ResolvedPageSizes {
  const overrides = new Map<PageSizeTableKey, PageSizeTableConfig>();

  for (const row of rows) {
    if (!isTableKey(row.tableKey)) {
      console.warn(
        `[page-sizes] discarding stored config for unknown tableKey "${row.tableKey}": not in the registry`,
      );
      continue;
    }

    const parsed = PageSizeTableConfigSchema.safeParse({
      options: row.options,
      defaultValue: row.defaultValue,
    });
    if (!parsed.success) {
      console.warn(
        `[page-sizes] discarding stored config for tableKey "${row.tableKey}": ${parsed.error.issues[0]?.message ?? 'schema validation failed'}`,
      );
      continue;
    }

    overrides.set(row.tableKey, {
      options: sorted(parsed.data.options),
      defaultValue: parsed.data.defaultValue,
    });
  }

  return Object.fromEntries(
    pageSizeTableKeys.map((key) => [
      key,
      overrides.get(key) ?? registryConfig(key),
    ]),
  ) as ResolvedPageSizes;
}
