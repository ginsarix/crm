import { describe, expect, it } from 'vitest';
import { partitionLabelWrites } from './partition';
import { defaultLabelValues } from './resolve';

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
    const defaultName = defaultLabelValues['field.customerCard.name'] ?? '';
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
    const defaultSicil = defaultLabelValues['field.customerCard.sicil'] ?? '';

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
