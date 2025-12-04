export const columnMap = {
  auditLog: {
    id: 'ID',
    action: 'İşlem',
    resourceType: 'Kaynak Türü',
    resourceId: 'Kaynak ID',
    result: 'Sonuç',
    error: 'Hata',
    details: 'Detaylar',
    userId: 'Kullanıcı ID',
    createdAt: 'Tarih',
  },
  customerCard: {
    id: 'ID',
    sira: 'Sıra',
    name: 'Adı',
    sicil: 'Sicil',
    address: 'Adres',
    district: 'İlçe',
    region: 'Bölge',
    gsm1: 'GSM 1',
    contact1: 'İletişim 1',
    gsm2: 'GSM 2',
    contact2: 'İletişim 2',
    gsm3: 'GSM 3',
    contact3: 'İletişim 3',
    businessGroup: 'İş Grubu',
    positive: 'Pozitif',
    salesRepresentative: 'Satış Temsilcisi',
    createdAt: 'Oluşturulma Tarihi',
    updatedAt: 'Güncellenme Tarihi',
  },
  user: {
    id: 'ID',
    name: 'Ad',
    email: 'E-posta',
    emailVerified: 'E-posta Doğrulandı',
    image: 'Profil Resmi',
    createdAt: 'Oluşturulma Tarihi',
    updatedAt: 'Güncellenme Tarihi',
  },
  visit: {
    id: 'ID',
    date: 'Tarih',
    time: 'Saat',
    via: 'Aracılığıyla',
    note: 'Not',
    createdAt: 'Oluşturulma Tarihi',
    updatedAt: 'Güncellenme Tarihi',
  },
} as const;

export const getColumnName = <T extends keyof typeof columnMap>(
  table: T,
  column: keyof (typeof columnMap)[T],
) => {
  return columnMap[table][column];
};
