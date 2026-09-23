import type { EntityKey } from '~/shared/labels/types';

export type PageSizeTableKey =
  | 'customerCard'
  | 'visit'
  | 'businessGroupCard'
  | 'electionResult'
  | 'user'
  | 'auditLog'
  | 'salesRepresentative'
  | 'userReport'
  | 'userReportActions';

export type PageSizeTableConfig = {
  options: number[];
  defaultValue: number;
};

/**
 * Where the editor gets this table's display name. Seven tables map to an
 * entity and follow its plural label, so renaming the entity renames the row.
 * The two Kullanicilar report tables have no entity and carry their own text —
 * the same split `labels-card.tsx` uses for its tab definitions.
 */
export type PageSizeTableDefinition = PageSizeTableConfig &
  ({ titleEntity: EntityKey } | { staticTitle: string });

export type ResolvedPageSizes = Record<PageSizeTableKey, PageSizeTableConfig>;
