import type { PageSizeTableDefinition, PageSizeTableKey } from './types';

const STANDARD = [25, 50, 100, 500];

export const pageSizeTables: Record<PageSizeTableKey, PageSizeTableDefinition> =
  {
    customerCard: {
      titleEntity: 'customerCard',
      options: STANDARD,
      defaultValue: 25,
    },
    visit: { titleEntity: 'visit', options: STANDARD, defaultValue: 25 },
    businessGroupCard: {
      titleEntity: 'businessGroupCard',
      options: [50, 100, 500],
      defaultValue: 50,
    },
    electionResult: {
      titleEntity: 'electionResult',
      options: STANDARD,
      defaultValue: 25,
    },
    user: { titleEntity: 'user', options: STANDARD, defaultValue: 25 },
    auditLog: { titleEntity: 'auditLog', options: STANDARD, defaultValue: 25 },
    salesRepresentative: {
      titleEntity: 'salesRepresentative',
      options: STANDARD,
      defaultValue: 25,
    },
    userReport: {
      staticTitle: 'Kullanıcı Raporu',
      options: STANDARD,
      defaultValue: 25,
    },
    userReportActions: {
      staticTitle: 'Rapor İşlemleri',
      options: STANDARD,
      defaultValue: 25,
    },
  };

export const pageSizeTableKeys = Object.keys(
  pageSizeTables,
) as PageSizeTableKey[];

/**
 * The display order in the editor. Matches the nav order of the panel rather
 * than the object's key order, so the two nested Kullanicilar tables sit
 * directly after the Kullanicilar table they belong to.
 */
export const pageSizeTableOrder: PageSizeTableKey[] = [
  'customerCard',
  'visit',
  'businessGroupCard',
  'electionResult',
  'user',
  'userReport',
  'userReportActions',
  'auditLog',
  'salesRepresentative',
];
