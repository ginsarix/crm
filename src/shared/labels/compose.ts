import type { EntityLabels, ResolvedLabels } from './types';

export const labelCompose = {
  nav: (e: EntityLabels) => e.plural,
  tableTitle: (e: EntityLabels) => e.plural,
  create: (e: EntityLabels) => `${e.singular} Ekle`,
  edit: (e: EntityLabels) => `${e.singular} Düzenle`,
  view: (e: EntityLabels) => `${e.singular} Görüntüle`,
  created: (e: EntityLabels) => `${e.singular} Oluşturuldu`,
  updated: (e: EntityLabels) => `${e.singular} Güncellendi`,
  deleted: (e: EntityLabels) => `${e.singular} Silindi`,
};

export type AuditActionKey = keyof ReturnType<typeof auditActionLabels>;
export type ResourceTypeKey = keyof ReturnType<typeof resourceTypeLabels>;

export function auditActionLabels(labels: ResolvedLabels) {
  const { entity, page } = labels;

  return {
    USER_CREATED: labelCompose.created(entity.user),
    USER_UPDATED: labelCompose.updated(entity.user),
    USER_DELETED: labelCompose.deleted(entity.user),
    USER_LOGIN: `${entity.user.singular} Girişi`,
    USER_LOGOUT: `${entity.user.singular} Çıkışı`,

    CUSTOMER_CARD_CREATED: labelCompose.created(entity.customerCard),
    CUSTOMER_CARD_UPDATED: labelCompose.updated(entity.customerCard),
    CUSTOMER_CARD_DELETED: labelCompose.deleted(entity.customerCard),

    VISIT_CREATED: labelCompose.created(entity.visit),
    VISIT_UPDATED: labelCompose.updated(entity.visit),
    VISIT_DELETED: labelCompose.deleted(entity.visit),

    SETTINGS_UPDATED: `${page.settings} Güncellendi`,

    // Not entity CRUD — these stay literal.
    PASSWORD_CHANGED: 'Parola Değiştirildi',
    EMAIL_CHANGED: 'E-posta Değiştirildi',
    ROLE_CHANGED: 'Rol Değiştirildi',

    BUSINESS_GROUP_CREATED: labelCompose.created(entity.businessGroup),
    BUSINESS_GROUP_UPDATED: labelCompose.updated(entity.businessGroup),
    BUSINESS_GROUP_DELETED: labelCompose.deleted(entity.businessGroup),

    BUSINESS_GROUP_CARD_UPDATED: labelCompose.updated(entity.businessGroupCard),

    ELECTION_RESULT_UPDATED: labelCompose.updated(entity.electionResult),

    SALES_REPRESENTATIVE_CREATED: labelCompose.created(
      entity.salesRepresentative,
    ),
    SALES_REPRESENTATIVE_UPDATED: labelCompose.updated(
      entity.salesRepresentative,
    ),
    SALES_REPRESENTATIVE_DELETED: labelCompose.deleted(
      entity.salesRepresentative,
    ),

    ANNOUNCEMENT_CREATED: labelCompose.created(entity.announcement),
    ANNOUNCEMENT_UPDATED: labelCompose.updated(entity.announcement),
    ANNOUNCEMENT_RESCHEDULED: `${entity.announcement.singular} Zamanlaması Değiştirildi`,
    ANNOUNCEMENT_PUBLISHED: `${entity.announcement.singular} Yayınlandı`,
    ANNOUNCEMENT_DELETED: labelCompose.deleted(entity.announcement),

    LABEL_UPDATED: 'Etiketler Güncellendi',
    PAGE_SIZE_UPDATED: 'Sayfa Boyutu Güncellendi',
  };
}

export function resourceTypeLabels(labels: ResolvedLabels) {
  const { entity, page } = labels;

  return {
    USER: entity.user.singular,
    CUSTOMER_CARD: entity.customerCard.singular,
    VISIT: entity.visit.singular,
    SETTINGS: page.settings,
    PASSWORD: 'Parola',
    EMAIL: 'E-posta',
    ROLE: 'Rol',
    BUSINESS_GROUP: entity.businessGroup.singular,
    BUSINESS_GROUP_CARD: entity.businessGroupCard.singular,
    ELECTION_RESULT: entity.electionResult.singular,
    SALES_REPRESENTATIVE: entity.salesRepresentative.singular,
    ANNOUNCEMENT: entity.announcement.singular,
    LABEL: 'Etiket',
    PAGE_SIZE: 'Sayfa Boyutu',
  };
}
