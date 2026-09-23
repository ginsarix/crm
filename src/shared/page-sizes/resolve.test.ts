import { describe, expect, it } from 'vitest';
import { pageSizeTables } from './registry';
import { DEFAULT_PAGE_SIZES, resolvePageSizes } from './resolve';

describe('resolvePageSizes', () => {
  it('falls back to the registry for a table with no row', () => {
    const resolved = resolvePageSizes([]);
    expect(resolved.customerCard).toEqual({
      options: [25, 50, 100, 500],
      defaultValue: 25,
    });
    expect(resolved.businessGroupCard).toEqual({
      options: [50, 100, 500],
      defaultValue: 50,
    });
  });

  it('returns every registry key even when rows are sparse', () => {
    const resolved = resolvePageSizes([
      { tableKey: 'visit', options: [10], defaultValue: 10 },
    ]);
    expect(Object.keys(resolved).sort()).toEqual(
      Object.keys(pageSizeTables).sort(),
    );
  });

  it('applies a stored row over the registry default', () => {
    const resolved = resolvePageSizes([
      { tableKey: 'customerCard', options: [10, 20], defaultValue: 20 },
    ]);
    expect(resolved.customerCard).toEqual({
      options: [10, 20],
      defaultValue: 20,
    });
  });

  it('sorts stored options ascending regardless of stored order', () => {
    const resolved = resolvePageSizes([
      { tableKey: 'visit', options: [100, 10, 50], defaultValue: 10 },
    ]);
    expect(resolved.visit.options).toEqual([10, 50, 100]);
  });

  it('sorts registry defaults ascending too', () => {
    for (const config of Object.values(resolvePageSizes([]))) {
      expect(config.options).toEqual([...config.options].sort((a, b) => a - b));
    }
  });

  it('ignores a row whose key is not in the registry', () => {
    const resolved = resolvePageSizes([
      { tableKey: 'retiredTable', options: [7], defaultValue: 7 },
    ]);
    expect(resolved).toEqual(DEFAULT_PAGE_SIZES);
  });

  it.each([
    ['options is not an array', { options: 'nope', defaultValue: 25 }],
    ['an option is out of range', { options: [900], defaultValue: 900 }],
    ['there are six options', { options: [1, 2, 3, 4, 5, 6], defaultValue: 1 }],
    ['there are no options', { options: [], defaultValue: 25 }],
    ['the default is not an option', { options: [10, 20], defaultValue: 99 }],
    ['options contains a non-number', { options: [10, 'x'], defaultValue: 10 }],
  ])('falls back to the registry when %s', (_name, row) => {
    const resolved = resolvePageSizes([{ tableKey: 'customerCard', ...row }]);
    expect(resolved.customerCard).toEqual(DEFAULT_PAGE_SIZES.customerCard);
  });

  it('does not throw on a malformed row', () => {
    expect(() =>
      resolvePageSizes([
        { tableKey: 'customerCard', options: null, defaultValue: 0 },
      ]),
    ).not.toThrow();
  });

  it('does not mutate the registry across repeated calls', () => {
    const registryOptions = pageSizeTables.customerCard.options;
    const before = [...registryOptions];
    const resolved = resolvePageSizes([]);
    resolvePageSizes([
      { tableKey: 'visit', options: [100, 10], defaultValue: 10 },
    ]);
    // The resolved config must be a fresh copy, never the registry's own
    // array — an in-place sort would return the same reference here.
    expect(resolved.customerCard.options).not.toBe(registryOptions);
    expect(pageSizeTables.customerCard.options).toEqual(before);
    // visit and customerCard share one array reference in the registry, so a
    // mutation via either key would show up on the other.
    expect(pageSizeTables.visit.options).toBe(
      pageSizeTables.customerCard.options,
    );
  });
});
