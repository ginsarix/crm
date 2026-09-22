import { describe, expect, it } from 'vitest';
import { normalizeUpdate } from './page-size';

describe('normalizeUpdate', () => {
  it('sorts options ascending', () => {
    const result = normalizeUpdate({
      tableKey: 'customerCard',
      options: [500, 25, 100],
      defaultValue: 25,
    });
    expect(result.options).toEqual([25, 100, 500]);
  });

  it('flags a config identical to the registry default', () => {
    const result = normalizeUpdate({
      tableKey: 'customerCard',
      options: [25, 50, 100, 500],
      defaultValue: 25,
    });
    expect(result.matchesRegistry).toBe(true);
  });

  it('flags an out-of-order config that still equals the registry default', () => {
    const result = normalizeUpdate({
      tableKey: 'businessGroupCard',
      options: [500, 50, 100],
      defaultValue: 50,
    });
    expect(result.matchesRegistry).toBe(true);
  });

  it('does not flag a config with a different default', () => {
    const result = normalizeUpdate({
      tableKey: 'customerCard',
      options: [25, 50, 100, 500],
      defaultValue: 50,
    });
    expect(result.matchesRegistry).toBe(false);
  });

  it('does not flag a config with different options', () => {
    const result = normalizeUpdate({
      tableKey: 'customerCard',
      options: [25, 50],
      defaultValue: 25,
    });
    expect(result.matchesRegistry).toBe(false);
  });
});
