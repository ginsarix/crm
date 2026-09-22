import { pageSizeTables } from '~/shared/page-sizes/registry';
import type { PageSizeTableConfig } from '~/shared/page-sizes/types';
import type { PageSizeUpdateInput } from '~/shared/zod-schemas/page-size';

const sameConfig = (a: PageSizeTableConfig, b: PageSizeTableConfig) =>
  a.defaultValue === b.defaultValue &&
  a.options.length === b.options.length &&
  a.options.every((value, index) => value === b.options[index]);

/**
 * Sorts the submitted options and reports whether the result is identical to
 * the table's built-in config. An identical config is stored as the ABSENCE of
 * a row, which is what keeps the table sparse — same contract as
 * `LabelOverride`, where an override equal to its default is deleted rather
 * than written.
 */
export function normalizeUpdate(input: PageSizeUpdateInput) {
  const options = [...input.options].sort((a, b) => a - b);
  const registry = pageSizeTables[input.tableKey];
  const registryConfig: PageSizeTableConfig = {
    options: [...registry.options].sort((a, b) => a - b),
    defaultValue: registry.defaultValue,
  };

  return {
    options,
    defaultValue: input.defaultValue,
    matchesRegistry: sameConfig(
      { options, defaultValue: input.defaultValue },
      registryConfig,
    ),
  };
}
