import type { EntityDefinition, EntityKey, PageKey } from './types';

export const entities: Record<EntityKey, EntityDefinition> = {
  customerCard: {
    singular: 'Cari Kartı',
    plural: 'Cari Kartları',
    editable: true,
  },
  visit: { singular: 'Ziyaret', plural: 'Ziyaretler', editable: true },
  businessGroupCard: {
    singular: 'Meslek Grubu Kartı',
    plural: 'Meslek Grubu Kartları',
    editable: true,
  },
  businessGroup: {
    singular: 'Meslek Grubu',
    plural: 'Meslek Grupları',
    editable: true,
  },
  salesRepresentative: {
    singular: 'Satış Temsilcisi',
    plural: 'Satış Temsilcileri',
    editable: true,
  },
  user: { singular: 'Kullanıcı', plural: 'Kullanıcılar', editable: false },
  announcement: { singular: 'Duyuru', plural: 'Duyurular', editable: false },
  auditLog: {
    singular: 'Denetim Kaydı',
    plural: 'Denetim Kayıtları',
    editable: false,
  },
};

export const pages: Record<PageKey, { title: string; editable: boolean }> = {
  dashboard: { title: 'Panel', editable: true },
  settings: { title: 'Ayarlar', editable: true },
  users: { title: 'Kullanıcılar', editable: false },
  announcements: { title: 'Duyurular', editable: false },
  auditLogs: { title: 'Denetim Kayıtları', editable: false },
  changelog: { title: 'Sürüm Notları', editable: false },
};
