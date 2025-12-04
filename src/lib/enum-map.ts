export const auditResult = {
  SUCCESS: 'Başarılı',
  FAILURE: 'Başarısız',
} as const;

export const auditAction = {
  USER_CREATED: 'Kullanıcı Oluşturuldu',
  USER_UPDATED: 'Kullanıcı Güncellendi',
  USER_DELETED: 'Kullanıcı Silindi',
  USER_LOGIN: 'Kullanıcı Girişi',
  USER_LOGOUT: 'Kullanıcı Çıkışı',
  CUSTOMER_CARD_CREATED: 'Cari Kartı Oluşturuldu',
  CUSTOMER_CARD_UPDATED: 'Cari Kartı Güncellendi',
  CUSTOMER_CARD_DELETED: 'Cari Kartı Silindi',
  VISIT_CREATED: 'Ziyaret Oluşturuldu',
  VISIT_UPDATED: 'Ziyaret Güncellendi',
  VISIT_DELETED: 'Ziyaret Silindi',
  SETTINGS_UPDATED: 'Ayarlar Güncellendi',
  PASSWORD_CHANGED: 'Parola Değiştirildi',
  EMAIL_CHANGED: 'E-posta Değiştirildi',
  ROLE_CHANGED: 'Rol Değiştirildi',
} as const;

export const resourceType = {
  USER: 'Kullanıcı',
  CUSTOMER_CARD: 'Cari Kartı',
  VISIT: 'Ziyaret',
  SETTINGS: 'Ayarlar',
  PASSWORD: 'Parola',
  EMAIL: 'E-posta',
  ROLE: 'Rol',
} as const;
