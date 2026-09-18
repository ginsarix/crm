import type {
  EntityDefinition,
  EntityKey,
  FieldRegistry,
  PageKey,
  SectionKey,
} from './types';

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
  electionResult: {
    singular: 'Seçim Sonucu',
    plural: 'Seçim Sonuçları',
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

export const systemFieldLabels = {
  id: 'ID',
  createdAt: 'Oluşturulma Tarihi',
  updatedAt: 'Güncellenme Tarihi',
} as const;

export const fields: FieldRegistry = {
  customerCard: [
    { kind: 'editable', key: 'sira', default: 'Sıra', required: false },
    { kind: 'editable', key: 'name', default: 'Ünvan', required: true },
    { kind: 'editable', key: 'sicil', default: 'Sicil', required: false },
    { kind: 'inherited', key: 'businessGroup', from: 'businessGroup' },
    { kind: 'editable', key: 'address', default: 'Adres', required: false },
    { kind: 'editable', key: 'district', default: 'İlçe', required: false },
    { kind: 'editable', key: 'region', default: 'Bölge', required: false },
    { kind: 'editable', key: 'gsm1', default: 'GSM 1', required: false },
    {
      kind: 'editable',
      key: 'contact1',
      default: 'İletişim 1',
      required: false,
    },
    { kind: 'editable', key: 'gsm2', default: 'GSM 2', required: false },
    {
      kind: 'editable',
      key: 'contact2',
      default: 'İletişim 2',
      required: false,
    },
    { kind: 'editable', key: 'gsm3', default: 'GSM 3', required: false },
    {
      kind: 'editable',
      key: 'contact3',
      default: 'İletişim 3',
      required: false,
    },
    {
      kind: 'editable',
      key: 'authorities',
      default: 'Yetkililer',
      required: false,
    },
    {
      kind: 'inherited',
      key: 'salesRepresentative',
      from: 'salesRepresentative',
    },
    { kind: 'editable', key: 'status', default: 'Durum', required: false },
    {
      kind: 'editable',
      key: 'authorizationDocument',
      default: 'Yetki Belge',
      required: false,
    },
    { kind: 'editable', key: 'vote', default: 'Oy', required: false },
    { kind: 'editable', key: 'color', default: 'Renk', required: false },
    { kind: 'editable', key: 'note', default: 'Not', required: false },
  ],
  visit: [
    { kind: 'inherited', key: 'customerCardId', from: 'customerCard' },
    {
      kind: 'inherited',
      key: 'salesRepresentativeId',
      from: 'salesRepresentative',
    },
    { kind: 'editable', key: 'date', default: 'Tarih', required: true },
    { kind: 'editable', key: 'time', default: 'Saat', required: false },
    { kind: 'editable', key: 'via', default: 'İletişim Türü', required: false },
    { kind: 'editable', key: 'note', default: 'Not', required: false },
    {
      kind: 'composed',
      key: 'customerCardName',
      fromEntity: 'customerCard',
      fromField: 'name',
    },
    {
      kind: 'composed',
      key: 'customerCardGsm',
      fromEntity: 'customerCard',
      fromField: 'gsm1',
    },
  ],
  businessGroupCard: [
    {
      kind: 'editable',
      key: 'meclisSayisi',
      default: 'Meclis Sayısı',
      required: false,
    },
    { kind: 'editable', key: 'meclis1', default: 'Meclis 1', required: false },
    { kind: 'editable', key: 'meclis2', default: 'Meclis 2', required: false },
    { kind: 'editable', key: 'meclis3', default: 'Meclis 3', required: false },
    {
      kind: 'editable',
      key: 'uyeSayisi',
      default: 'Üye Sayısı',
      required: false,
    },
    { kind: 'editable', key: 'baskan', default: 'Komite 1', required: false },
    {
      kind: 'editable',
      key: 'baskanYardimcisi',
      default: 'Komite 2',
      required: false,
    },
    { kind: 'editable', key: 'uye1', default: 'Komite 3', required: false },
    { kind: 'editable', key: 'uye2', default: 'Komite 4', required: false },
    {
      kind: 'editable',
      key: 'uye3',
      default: 'Meclis Yedek 1',
      required: false,
    },
    {
      kind: 'editable',
      key: 'uye4',
      default: 'Meclis Yedek 2',
      required: false,
    },
    {
      kind: 'editable',
      key: 'uye5',
      default: 'Meclis Yedek 3',
      required: false,
    },
    {
      kind: 'editable',
      key: 'yedekUye1',
      default: 'Komite Yedek 1',
      required: false,
    },
    {
      kind: 'editable',
      key: 'yedekUye2',
      default: 'Komite Yedek 2',
      required: false,
    },
    {
      kind: 'editable',
      key: 'yedekUye3',
      default: 'Komite Yedek 3',
      required: false,
    },
    {
      kind: 'editable',
      key: 'yedekUye4',
      default: 'Komite Yedek 4',
      required: false,
    },
    {
      kind: 'editable',
      key: 'yedekUye5',
      default: 'Yedek Üye 5',
      required: false,
    },
    {
      kind: 'editable',
      key: 'yedekUye6',
      default: 'Yedek Üye 6',
      required: false,
    },
    {
      kind: 'editable',
      key: 'yedekUye7',
      default: 'Yedek Üye 7',
      required: false,
    },
    { kind: 'inherited', key: 'businessGroupName', from: 'businessGroup' },
  ],
  electionResult: [
    // `editable`, not `inherited` from businessGroup: this column is named
    // Komite, so renaming the Meslek Grubu entity must not rename it.
    {
      kind: 'editable',
      key: 'businessGroupName',
      default: 'Komite',
      required: false,
    },
    {
      kind: 'editable',
      key: 'toplamOy',
      default: 'Toplam Oy',
      required: false,
    },
    {
      kind: 'editable',
      key: 'kullanilanOy',
      default: 'Kullanılan Oy',
      required: false,
    },
    {
      kind: 'editable',
      key: 'gecerliOy',
      default: 'Geçerli Oy',
      required: false,
    },
    {
      kind: 'editable',
      key: 'meclisUyeSayisi',
      default: 'Meclis Üye Sayısı',
      required: false,
    },
    // Color names, not concepts — static like the enum display values.
    { kind: 'static', key: 'yesil', default: 'Yeşil' },
    { kind: 'static', key: 'mavi', default: 'Mavi' },
    { kind: 'static', key: 'turuncu', default: 'Turuncu' },
  ],
};

export const sectionOrder: SectionKey[] = [
  'meclis',
  'komite',
  'meclisYedek',
  'komiteYedek',
  'yedekUyeler',
];

export const sections: Record<SectionKey, string> = {
  meclis: 'Meclis',
  komite: 'Komite',
  meclisYedek: 'Meclis Yedek',
  komiteYedek: 'Komite Yedek',
  yedekUyeler: 'Yedek Üyeler',
};
