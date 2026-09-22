import { describe, expect, it } from 'vitest';
import {
  addOption,
  type DraftConfig,
  fromDraft,
  removeOption,
  setDefaultOption,
  setOptionValue,
  toDraft,
} from './mutate';

const draft = (options: string[], defaultValue: string): DraftConfig => ({
  options,
  defaultValue,
});

describe('setOptionValue', () => {
  it('carries the default when the default row is edited', () => {
    const result = setOptionValue(draft(['25', '50', '100'], '50'), 1, '60');
    expect(result.options).toEqual(['25', '60', '100']);
    expect(result.defaultValue).toBe('60');
  });

  it('leaves the default alone when another row is edited', () => {
    const result = setOptionValue(draft(['25', '50', '100'], '50'), 0, '30');
    expect(result.options).toEqual(['30', '50', '100']);
    expect(result.defaultValue).toBe('50');
  });

  it('carries the default through an empty intermediate value', () => {
    const result = setOptionValue(draft(['25', '50'], '50'), 1, '');
    expect(result.defaultValue).toBe('');
  });

  it('does not reorder while editing', () => {
    const result = setOptionValue(draft(['25', '50', '100'], '25'), 2, '10');
    expect(result.options).toEqual(['25', '50', '10']);
  });
});

describe('removeOption', () => {
  it('reassigns the default to the smallest remaining when the default is removed', () => {
    const result = removeOption(draft(['25', '50', '100'], '50'), 1);
    expect(result.options).toEqual(['25', '100']);
    expect(result.defaultValue).toBe('25');
  });

  it('leaves the default alone when another row is removed', () => {
    const result = removeOption(draft(['25', '50', '100'], '50'), 2);
    expect(result.options).toEqual(['25', '50']);
    expect(result.defaultValue).toBe('50');
  });

  it('is a no-op at one option', () => {
    const only = draft(['25'], '25');
    expect(removeOption(only, 0)).toEqual(only);
  });

  it('ignores unparseable remaining values when picking the smallest', () => {
    const result = removeOption(draft(['', '50', '100'], '100'), 2);
    expect(result.defaultValue).toBe('50');
  });
});

describe('addOption', () => {
  it('appends an empty row at the bottom', () => {
    const result = addOption(draft(['25', '50'], '25'));
    expect(result.options).toEqual(['25', '50', '']);
    expect(result.defaultValue).toBe('25');
  });

  it('is a no-op at five options', () => {
    const full = draft(['1', '2', '3', '4', '5'], '1');
    expect(addOption(full)).toEqual(full);
  });
});

describe('setDefaultOption', () => {
  it('moves the default to the given row', () => {
    const result = setDefaultOption(draft(['25', '50'], '25'), 1);
    expect(result.defaultValue).toBe('50');
  });
});

describe('toDraft / fromDraft', () => {
  it('round-trips a config', () => {
    const config = { options: [25, 50, 100], defaultValue: 50 };
    expect(fromDraft(toDraft(config))).toEqual(config);
  });

  it('sorts options ascending on the way out', () => {
    expect(fromDraft(draft(['100', '25', '50'], '25')).options).toEqual([
      25, 50, 100,
    ]);
  });

  it('yields NaN for an unparseable draft so the schema rejects it', () => {
    expect(Number.isNaN(fromDraft(draft([''], '')).defaultValue)).toBe(true);
  });
});
