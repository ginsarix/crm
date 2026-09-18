export type EntityKey =
  | 'customerCard'
  | 'visit'
  | 'businessGroupCard'
  | 'businessGroup'
  | 'salesRepresentative'
  | 'user'
  | 'announcement'
  | 'auditLog';

export type FieldEntityKey = 'customerCard' | 'visit' | 'businessGroupCard';

export type PageKey =
  | 'dashboard'
  | 'settings'
  | 'users'
  | 'announcements'
  | 'auditLogs'
  | 'changelog';

export type SectionKey =
  | 'meclis'
  | 'komite'
  | 'meclisYedek'
  | 'komiteYedek'
  | 'yedekUyeler';

export type EntityDefinition = {
  singular: string;
  plural: string;
  editable: boolean;
};

export type FieldDefinition<K extends string = string> =
  | { kind: 'editable'; key: K; default: string; required: boolean }
  | { kind: 'inherited'; key: K; from: EntityKey }
  | { kind: 'composed'; key: K; fromEntity: EntityKey; fromField: string };

export type EntityLabels = { singular: string; plural: string };

/**
 * Precise key unions, not `Record<string, string>`. tsconfig sets
 * noUncheckedIndexedAccess, so an index signature would widen every lookup to
 * `string | undefined` and force optional chaining at ~200 call sites.
 * Typing the registry arrays with these unions also makes a typo in a field
 * key a compile error rather than a blank header at runtime.
 */
export type CustomerCardFieldKey =
  | 'sira'
  | 'name'
  | 'sicil'
  | 'businessGroup'
  | 'address'
  | 'district'
  | 'region'
  | 'gsm1'
  | 'contact1'
  | 'gsm2'
  | 'contact2'
  | 'gsm3'
  | 'contact3'
  | 'authorities'
  | 'salesRepresentative'
  | 'status'
  | 'authorizationDocument'
  | 'vote'
  | 'color'
  | 'note';

export type VisitFieldKey =
  | 'customerCardId'
  | 'salesRepresentativeId'
  | 'date'
  | 'time'
  | 'via'
  | 'note'
  | 'customerCardName'
  | 'customerCardGsm';

export type BusinessGroupCardFieldKey =
  | 'meclisSayisi'
  | 'meclis1'
  | 'meclis2'
  | 'meclis3'
  | 'uyeSayisi'
  | 'baskan'
  | 'baskanYardimcisi'
  | 'uye1'
  | 'uye2'
  | 'uye3'
  | 'uye4'
  | 'uye5'
  | 'yedekUye1'
  | 'yedekUye2'
  | 'yedekUye3'
  | 'yedekUye4'
  | 'yedekUye5'
  | 'yedekUye6'
  | 'yedekUye7'
  | 'businessGroupName';

export type FieldLabels = {
  customerCard: Record<CustomerCardFieldKey, string>;
  visit: Record<VisitFieldKey, string>;
  businessGroupCard: Record<BusinessGroupCardFieldKey, string>;
};

export type FieldRegistry = {
  customerCard: FieldDefinition<CustomerCardFieldKey>[];
  visit: FieldDefinition<VisitFieldKey>[];
  businessGroupCard: FieldDefinition<BusinessGroupCardFieldKey>[];
};

export type ResolvedLabels = {
  entity: Record<EntityKey, EntityLabels>;
  field: FieldLabels;
  section: Record<SectionKey, string>;
  page: Record<PageKey, string>;
  system: { id: string; createdAt: string; updatedAt: string };
};

export const entityLabelKey = (
  entity: EntityKey,
  form: 'singular' | 'plural',
) => `entity.${entity}.${form}`;

export const fieldLabelKey = (entity: FieldEntityKey, field: string) =>
  `field.${entity}.${field}`;

export const sectionLabelKey = (section: SectionKey) => `section.${section}`;

export const pageLabelKey = (page: PageKey) => `page.${page}.title`;
