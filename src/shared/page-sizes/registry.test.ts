import { describe, expect, it } from 'vitest';
import { PageSizeTableConfigSchema } from '~/shared/zod-schemas/page-size';
import {
  pageSizeTableKeys,
  pageSizeTableOrder,
  pageSizeTables,
} from './registry';

/**
 * The keys are a contract with the 9 DataTable call sites listed in the spec.
 * A key added here and forgotten there (or vice versa) is exactly the drift
 * this test exists to catch.
 */
const EXPECTED_KEYS = [
  'customerCard',
  'visit',
  'businessGroupCard',
  'electionResult',
  'user',
  'auditLog',
  'salesRepresentative',
  'userReport',
  'userReportActions',
];

describe('page size registry', () => {
  it('has exactly the expected table keys', () => {
    expect([...pageSizeTableKeys].sort()).toEqual([...EXPECTED_KEYS].sort());
  });

  it.each(Object.entries(pageSizeTables))(
    '%s has a built-in config satisfying the schema',
    (_key, table) => {
      const result = PageSizeTableConfigSchema.safeParse({
        options: [...table.options],
        defaultValue: table.defaultValue,
      });
      expect(result.success).toBe(true);
    },
  );

  it.each(Object.entries(pageSizeTables))(
    '%s has exactly one display-name source',
    (_key, table) => {
      const hasEntity = 'titleEntity' in table;
      const hasStatic = 'staticTitle' in table;
      expect(hasEntity !== hasStatic).toBe(true);
    },
  );

  it('lists every table key exactly once in the display order', () => {
    expect([...pageSizeTableOrder].sort()).toEqual(
      [...pageSizeTableKeys].sort(),
    );
    expect(new Set(pageSizeTableOrder).size).toBe(pageSizeTableOrder.length);
  });
});
