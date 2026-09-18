import { describe, expect, it } from 'vitest';
import { columnMap } from '~/lib/column-map';
import { entities, fields, pages, sectionOrder, sections } from './registry';
import type { FieldEntityKey } from './types';

describe('entity registry', () => {
  it('marks exactly the six renameable entities as editable', () => {
    const editable = Object.entries(entities)
      .filter(([, e]) => e.editable)
      .map(([k]) => k)
      .sort();

    expect(editable).toEqual([
      'businessGroup',
      'businessGroupCard',
      'customerCard',
      'electionResult',
      'salesRepresentative',
      'visit',
    ]);
  });

  it('gives electionResult its own editable pair', () => {
    expect(entities.electionResult.editable).toBe(true);
    expect(entities.electionResult.singular).toBe('Seçim Sonucu');
    expect(entities.electionResult.plural).toBe('Seçim Sonuçları');
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

const SYSTEM_KEYS = ['id', 'createdAt', 'updatedAt'];

describe('field registry', () => {
  it('has no duplicate keys within an entity', () => {
    for (const [entity, list] of Object.entries(fields)) {
      const keys = list.map((f) => f.key);
      expect(new Set(keys).size, `${entity} has duplicate keys`).toBe(
        keys.length,
      );
    }
  });

  it('points every inherited and composed field at a real entity', () => {
    for (const list of Object.values(fields)) {
      for (const field of list) {
        if (field.kind === 'inherited') {
          expect(entities[field.from]).toBeDefined();
        }
        if (field.kind === 'composed') {
          expect(entities[field.fromEntity]).toBeDefined();
          const source = fields[field.fromEntity as FieldEntityKey];
          expect(source.some((f) => f.key === field.fromField)).toBe(true);
        }
      }
    }
  });

  it('covers every non-system column key', () => {
    const entityKeys: FieldEntityKey[] = [
      'customerCard',
      'visit',
      'businessGroupCard',
      'electionResult',
    ];

    for (const entity of entityKeys) {
      const registered = new Set(fields[entity].map((f) => f.key));
      const columns = columnMap[entity].filter((k) => !SYSTEM_KEYS.includes(k));

      for (const column of columns) {
        expect(
          registered.has(column as never),
          `${entity}.${column} missing`,
        ).toBe(true);
      }
    }
  });

  it('keeps the three election colors static rather than editable', () => {
    const staticKeys = fields.electionResult
      .filter((f) => f.kind === 'static')
      .map((f) => f.key)
      .sort();

    expect(staticKeys).toEqual(['mavi', 'turuncu', 'yesil']);
  });

  it('names the election result business group column Komite independently', () => {
    const komite = fields.electionResult.find(
      (f) => f.key === 'businessGroupName',
    );

    // Deliberately `editable`, not `inherited` — renaming the Meslek Grubu
    // entity must not rename this column.
    expect(komite?.kind).toBe('editable');
    expect(komite).toMatchObject({ default: 'Komite' });
  });
});

describe('section registry', () => {
  it('orders exactly the defined sections', () => {
    expect([...sectionOrder].sort()).toEqual(Object.keys(sections).sort());
  });
});
