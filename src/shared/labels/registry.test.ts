import { describe, expect, it } from 'vitest';
import { entities, pages } from './registry';

describe('entity registry', () => {
  it('marks exactly the five renameable entities as editable', () => {
    const editable = Object.entries(entities)
      .filter(([, e]) => e.editable)
      .map(([k]) => k)
      .sort();

    expect(editable).toEqual([
      'businessGroup',
      'businessGroupCard',
      'customerCard',
      'salesRepresentative',
      'visit',
    ]);
  });

  it('gives every entity a non-empty tekil and çoğul', () => {
    for (const [key, entity] of Object.entries(entities)) {
      expect(entity.singular, `${key}.singular`).not.toBe('');
      expect(entity.plural, `${key}.plural`).not.toBe('');
    }
  });

  it('gives businessGroupCard its own editable pair', () => {
    // Independence from businessGroup is enforced by resolveLabels (see
    // resolve.test.ts "does not let businessGroup rename businessGroupCard").
    // Here we only assert it carries its own editable defaults.
    expect(entities.businessGroupCard.editable).toBe(true);
    expect(entities.businessGroupCard.singular).toBe('Meslek Grubu Kartı');
    expect(entities.businessGroupCard.plural).toBe('Meslek Grubu Kartları');
  });
});

describe('page registry', () => {
  it('marks only Panel and Ayarlar as editable', () => {
    const editable = Object.entries(pages)
      .filter(([, p]) => p.editable)
      .map(([k]) => k)
      .sort();

    expect(editable).toEqual(['dashboard', 'settings']);
  });
});
