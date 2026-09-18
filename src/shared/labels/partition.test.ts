import { describe, expect, it } from 'vitest';
import {
  describeLabelChanges,
  partitionLabelWrites,
  summarizeLabelChanges,
} from './partition';
import { defaultLabelValues } from './resolve';

/** noUncheckedIndexedAccess widens the lookup; every key used here is real. */
const def = (key: string): string => {
  const value = defaultLabelValues[key];
  if (value === undefined) throw new Error(`no default for ${key}`);
  return value;
};

describe('partitionLabelWrites', () => {
  it('deletes a key whose value is null', () => {
    const result = partitionLabelWrites({
      'field.customerCard.name': null,
    });
    expect(result.toDelete).toEqual(['field.customerCard.name']);
    expect(result.toUpsert).toEqual([]);
  });

  it('deletes a key whose value is empty or whitespace-only', () => {
    const result = partitionLabelWrites({
      'field.customerCard.name': '',
      'field.customerCard.sicil': '   ',
    });
    expect(result.toDelete.sort()).toEqual(
      ['field.customerCard.name', 'field.customerCard.sicil'].sort(),
    );
    expect(result.toUpsert).toEqual([]);
  });

  it('deletes a key whose value equals its registry default', () => {
    const defaultName = def('field.customerCard.name') ?? '';
    expect(defaultName).toBe('Ünvan');

    const result = partitionLabelWrites({
      'field.customerCard.name': defaultName,
    });
    expect(result.toDelete).toEqual(['field.customerCard.name']);
    expect(result.toUpsert).toEqual([]);
  });

  it('upserts a changed value, trimmed', () => {
    const result = partitionLabelWrites({
      'field.customerCard.name': '  Firma Adı  ',
    });
    expect(result.toDelete).toEqual([]);
    expect(result.toUpsert).toEqual([
      { key: 'field.customerCard.name', value: 'Firma Adı' },
    ]);
  });

  it('partitions a mix of null, empty, default, and changed values in one call', () => {
    const defaultSicil = def('field.customerCard.sicil') ?? '';

    const result = partitionLabelWrites({
      'field.customerCard.name': null,
      'field.customerCard.sicil': defaultSicil,
      'field.customerCard.address': '   ',
      'field.customerCard.region': '  Bölge Adı  ',
    });

    expect(result.toDelete.sort()).toEqual(
      [
        'field.customerCard.name',
        'field.customerCard.sicil',
        'field.customerCard.address',
      ].sort(),
    );
    expect(result.toUpsert).toEqual([
      { key: 'field.customerCard.region', value: 'Bölge Adı' },
    ]);
  });
});

describe('summarizeLabelChanges', () => {
  const partition = (values: Record<string, string | null>) =>
    partitionLabelWrites(values);

  it('does not count untouched defaults as reversions', () => {
    // The regression this exists for: the editor submits every key in a tab,
    // so 25 untouched fields equal their defaults and land in toDelete. None
    // of them has a stored override, so none of them changed.
    const values: Record<string, string | null> = {
      'field.customerCard.name': 'Firma Adı',
      'field.customerCard.sira': def('field.customerCard.sira'),
      'field.customerCard.sicil': def('field.customerCard.sicil'),
      'field.customerCard.address': null,
    };

    const summary = summarizeLabelChanges(partition(values), {});

    expect(summary.updated).toBe(1);
    expect(summary.reverted).toBe(0);
  });

  it('counts a reversion only when an override actually exists', () => {
    const values = {
      'field.customerCard.name': def('field.customerCard.name'),
      'field.customerCard.sicil': def('field.customerCard.sicil'),
    };

    const summary = summarizeLabelChanges(partition(values), {
      'field.customerCard.name': 'Firma Adı',
    });

    expect(summary.reverted).toBe(1);
    expect(summary.updated).toBe(0);
  });

  it('does not count an upsert that rewrites an identical value', () => {
    const values = { 'field.customerCard.name': 'Firma Adı' };

    const summary = summarizeLabelChanges(partition(values), {
      'field.customerCard.name': 'Firma Adı',
    });

    expect(summary.updated).toBe(0);
    expect(summary.reverted).toBe(0);
  });

  it('counts a changed override as updated, not as new', () => {
    const values = { 'field.customerCard.name': 'Ticari Ünvan' };

    const summary = summarizeLabelChanges(partition(values), {
      'field.customerCard.name': 'Firma Adı',
    });

    expect(summary.updated).toBe(1);
  });
});

describe('describeLabelChanges', () => {
  it('omits the half that did not happen', () => {
    expect(describeLabelChanges({ updated: 1, reverted: 0 })).toBe(
      '1 etiket güncellendi',
    );
    expect(describeLabelChanges({ updated: 0, reverted: 3 })).toBe(
      '3 etiket varsayılana döndürüldü',
    );
  });

  it('joins both halves when both happened', () => {
    expect(describeLabelChanges({ updated: 2, reverted: 3 })).toBe(
      '2 etiket güncellendi, 3 etiket varsayılana döndürüldü',
    );
  });

  it('says so plainly when nothing changed', () => {
    expect(describeLabelChanges({ updated: 0, reverted: 0 })).toBe(
      'Değişiklik yapılmadı',
    );
  });
});
