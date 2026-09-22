import { describe, expect, it } from 'vitest';
import { auditActionLabels, labelCompose, resourceTypeLabels } from './compose';
import { DEFAULT_LABELS, resolveLabels } from './resolve';

const EXPECTED_AUDIT_ACTIONS = [
  'USER_CREATED',
  'USER_UPDATED',
  'USER_DELETED',
  'USER_LOGIN',
  'USER_LOGOUT',
  'CUSTOMER_CARD_CREATED',
  'CUSTOMER_CARD_UPDATED',
  'CUSTOMER_CARD_DELETED',
  'VISIT_CREATED',
  'VISIT_UPDATED',
  'VISIT_DELETED',
  'SETTINGS_UPDATED',
  'PASSWORD_CHANGED',
  'EMAIL_CHANGED',
  'ROLE_CHANGED',
  'BUSINESS_GROUP_CREATED',
  'BUSINESS_GROUP_UPDATED',
  'BUSINESS_GROUP_DELETED',
  'BUSINESS_GROUP_CARD_UPDATED',
  'SALES_REPRESENTATIVE_CREATED',
  'SALES_REPRESENTATIVE_UPDATED',
  'SALES_REPRESENTATIVE_DELETED',
  'ANNOUNCEMENT_CREATED',
  'ANNOUNCEMENT_UPDATED',
  'ANNOUNCEMENT_RESCHEDULED',
  'ANNOUNCEMENT_PUBLISHED',
  'ANNOUNCEMENT_DELETED',
  'ELECTION_RESULT_UPDATED',
  'LABEL_UPDATED',
  'PAGE_SIZE_UPDATED',
];

const EXPECTED_RESOURCE_TYPES = [
  'USER',
  'CUSTOMER_CARD',
  'VISIT',
  'SETTINGS',
  'PASSWORD',
  'EMAIL',
  'ROLE',
  'BUSINESS_GROUP',
  'BUSINESS_GROUP_CARD',
  'SALES_REPRESENTATIVE',
  'ANNOUNCEMENT',
  'ELECTION_RESULT',
  'LABEL',
  'PAGE_SIZE',
];

describe('labelCompose', () => {
  const customerCard = DEFAULT_LABELS.entity.customerCard;

  it('composes every wording from the tekil/çoğul pair', () => {
    expect(labelCompose.nav(customerCard)).toBe('Cari Kartları');
    expect(labelCompose.tableTitle(customerCard)).toBe('Cari Kartları');
    expect(labelCompose.create(customerCard)).toBe('Cari Kartı Ekle');
    expect(labelCompose.edit(customerCard)).toBe('Cari Kartı Düzenle');
    expect(labelCompose.view(customerCard)).toBe('Cari Kartı Görüntüle');
    expect(labelCompose.created(customerCard)).toBe('Cari Kartı Oluşturuldu');
    expect(labelCompose.updated(customerCard)).toBe('Cari Kartı Güncellendi');
    expect(labelCompose.deleted(customerCard)).toBe('Cari Kartı Silindi');
  });
});

describe('auditActionLabels', () => {
  it('covers exactly the known actions', () => {
    const actual = Object.keys(auditActionLabels(DEFAULT_LABELS)).sort();
    expect(actual).toEqual([...EXPECTED_AUDIT_ACTIONS].sort());
  });

  it('produces a non-empty string for every action', () => {
    for (const [key, value] of Object.entries(
      auditActionLabels(DEFAULT_LABELS),
    )) {
      expect(value, key).toBeTruthy();
    }
  });

  it('reproduces the previous hardcoded wording by default', () => {
    const actions = auditActionLabels(DEFAULT_LABELS);
    expect(actions.CUSTOMER_CARD_CREATED).toBe('Cari Kartı Oluşturuldu');
    expect(actions.VISIT_DELETED).toBe('Ziyaret Silindi');
    expect(actions.BUSINESS_GROUP_UPDATED).toBe('Meslek Grubu Güncellendi');
    expect(actions.SETTINGS_UPDATED).toBe('Ayarlar Güncellendi');
    expect(actions.USER_LOGIN).toBe('Kullanıcı Girişi');
    expect(actions.PASSWORD_CHANGED).toBe('Parola Değiştirildi');
  });

  it('follows a renamed entity', () => {
    const labels = resolveLabels({
      'entity.customerCard.singular': 'Firma Kartı',
    });
    expect(auditActionLabels(labels).CUSTOMER_CARD_CREATED).toBe(
      'Firma Kartı Oluşturuldu',
    );
  });

  it('follows a renamed Ayarlar page title', () => {
    const labels = resolveLabels({ 'page.settings.title': 'Tercihler' });
    expect(auditActionLabels(labels).SETTINGS_UPDATED).toBe(
      'Tercihler Güncellendi',
    );
  });
});

describe('resourceTypeLabels', () => {
  it('covers exactly the known resource types', () => {
    const actual = Object.keys(resourceTypeLabels(DEFAULT_LABELS)).sort();
    expect(actual).toEqual([...EXPECTED_RESOURCE_TYPES].sort());
  });

  it('reproduces the previous hardcoded wording by default', () => {
    const types = resourceTypeLabels(DEFAULT_LABELS);
    expect(types.CUSTOMER_CARD).toBe('Cari Kartı');
    expect(types.BUSINESS_GROUP_CARD).toBe('Meslek Grubu Kartı');
    expect(types.SETTINGS).toBe('Ayarlar');
  });
});
