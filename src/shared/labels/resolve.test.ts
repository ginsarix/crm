import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LABELS,
  defaultLabelValues,
  editableLabelKeys,
  fieldLabel,
  labelValues,
  resolveLabels,
} from './resolve';

describe('resolveLabels', () => {
  it('returns defaults when there are no overrides', () => {
    const labels = resolveLabels({});
    expect(labels.entity.customerCard.singular).toBe('Cari Kartı');
    expect(labels.entity.customerCard.plural).toBe('Cari Kartları');
    expect(labels.field.customerCard.name).toBe('Ünvan');
    expect(labels.page.settings).toBe('Ayarlar');
    expect(labels.system.createdAt).toBe('Oluşturulma Tarihi');
  });

  it('layers an override over its default', () => {
    const labels = resolveLabels({ 'field.customerCard.name': 'Firma Adı' });
    expect(labels.field.customerCard.name).toBe('Firma Adı');
    expect(labels.field.customerCard.sicil).toBe('Sicil');
  });

  it('falls back to the default for an empty-string override', () => {
    const labels = resolveLabels({ 'field.customerCard.name': '   ' });
    expect(labels.field.customerCard.name).toBe('Ünvan');
  });

  it('ignores unknown keys instead of throwing', () => {
    expect(() =>
      resolveLabels({ 'field.customerCard.doesNotExist': 'x' }),
    ).not.toThrow();
    expect(() => resolveLabels({ garbage: 'x' })).not.toThrow();
  });

  it('resolves an inherited field from its source entity singular', () => {
    const labels = resolveLabels({ 'entity.businessGroup.singular': 'Sektör' });
    expect(labels.field.customerCard.businessGroup).toBe('Sektör');
    expect(labels.field.businessGroupCard.businessGroupName).toBe('Sektör');
  });

  it('does not let businessGroup rename businessGroupCard', () => {
    const labels = resolveLabels({ 'entity.businessGroup.singular': 'Sektör' });
    expect(labels.entity.businessGroupCard.singular).toBe('Meslek Grubu Kartı');
  });

  it('resolves a composed field from both its entity and its field', () => {
    const labels = resolveLabels({});
    expect(labels.field.visit.customerCardName).toBe('Cari Kartı Ünvan');
    expect(labels.field.visit.customerCardGsm).toBe('Cari Kartı GSM 1');
  });

  it('reflects a renamed source field in the composed column', () => {
    const labels = resolveLabels({ 'field.customerCard.name': 'Firma Adı' });
    expect(labels.field.visit.customerCardName).toBe('Cari Kartı Firma Adı');
  });

  it('ignores an override on a non-editable entity', () => {
    const labels = resolveLabels({ 'entity.user.singular': 'Hesap' });
    expect(labels.entity.user.singular).toBe('Kullanıcı');
  });

  it('resolves static field labels and refuses to override them', () => {
    const labels = resolveLabels({ 'field.electionResult.yesil': 'Kırmızı' });

    expect(labels.field.electionResult.yesil).toBe('Yeşil');
    expect(editableLabelKeys.has('field.electionResult.yesil')).toBe(false);
    expect(editableLabelKeys.has('field.electionResult.toplamOy')).toBe(true);
  });
});

describe('editableLabelKeys', () => {
  it('includes editable entities, fields, sections and pages', () => {
    expect(editableLabelKeys.has('entity.customerCard.singular')).toBe(true);
    expect(editableLabelKeys.has('field.customerCard.name')).toBe(true);
    expect(editableLabelKeys.has('section.komite')).toBe(true);
    expect(editableLabelKeys.has('page.settings.title')).toBe(true);
  });

  it('excludes static entities, pages, inherited and composed fields', () => {
    expect(editableLabelKeys.has('entity.user.singular')).toBe(false);
    expect(editableLabelKeys.has('page.users.title')).toBe(false);
    expect(editableLabelKeys.has('field.customerCard.businessGroup')).toBe(
      false,
    );
    expect(editableLabelKeys.has('field.visit.customerCardName')).toBe(false);
  });
});

describe('defaultLabelValues', () => {
  it('has a non-empty default for every editable key', () => {
    for (const key of editableLabelKeys) {
      expect(defaultLabelValues[key], key).toBeTruthy();
    }
  });
});

describe('DEFAULT_LABELS', () => {
  it('equals resolving with no overrides', () => {
    expect(DEFAULT_LABELS).toEqual(resolveLabels({}));
  });
});

describe('labelValues', () => {
  it('equals the defaults when nothing is overridden', () => {
    expect(labelValues(DEFAULT_LABELS)).toEqual(defaultLabelValues);
  });

  it('reflects an override', () => {
    const labels = resolveLabels({ 'field.customerCard.name': 'Firma Adı' });
    expect(labelValues(labels)['field.customerCard.name']).toBe('Firma Adı');
  });

  it('covers exactly the editable keys', () => {
    expect(Object.keys(labelValues(DEFAULT_LABELS)).sort()).toEqual(
      [...editableLabelKeys].sort(),
    );
  });
});

describe('fieldLabel', () => {
  it('resolves a normal field', () => {
    expect(fieldLabel(DEFAULT_LABELS, 'customerCard', 'name')).toBe('Ünvan');
  });

  it('falls through to system fields', () => {
    expect(fieldLabel(DEFAULT_LABELS, 'customerCard', 'createdAt')).toBe(
      'Oluşturulma Tarihi',
    );
  });

  it('returns the key itself for something unknown', () => {
    expect(fieldLabel(DEFAULT_LABELS, 'customerCard', 'nope')).toBe('nope');
  });
});
