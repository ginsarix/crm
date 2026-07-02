import { Prisma } from 'generated/prisma';

const TR_UPPER = 'İIÇĞÖŞÜ';
const TR_LOWER = 'iıçğöşü';

/**
 * Postgres's ILIKE / `mode: 'insensitive'` case-folding is bound to the
 * database's lc_ctype, which is "C" here — it only folds ASCII a-z, so
 * Turkish letters (ş/Ş, ç/Ç, ğ/Ğ, ö/Ö, ü/Ü, ı/I, i/İ) never match across
 * case. `translate()` remaps those letters to a canonical lowercase form
 * before `lower()` runs, on both the column and the search term.
 */
function foldedLike(column: Prisma.Sql, searchValue: string): Prisma.Sql {
  return Prisma.sql`lower(translate(${column}, ${TR_UPPER}, ${TR_LOWER})) LIKE lower(translate(${`%${searchValue}%`}, ${TR_UPPER}, ${TR_LOWER}))`;
}

/**
 * Finds row ids matching `searchValue` with Turkish-correct case-insensitive
 * substring matching, via a raw query. Pass the resulting ids to a normal
 * typed Prisma `findMany`/`count` as `{ id: { in: ids } }` alongside any
 * other filters.
 *
 * `from`, `idColumn`, and `columns` must be built from trusted, hardcoded
 * table/column names — never from request input — since they're inlined as
 * raw SQL identifiers.
 */
export async function findTurkishSearchMatches(
  db: { $queryRaw<T = unknown>(query: Prisma.Sql): Promise<T> },
  from: Prisma.Sql,
  idColumn: Prisma.Sql,
  columns: Prisma.Sql[],
  searchValue: string,
): Promise<string[]> {
  const conditions = Prisma.join(
    columns.map((column) => foldedLike(column, searchValue)),
    ' OR ',
  );
  const rows = await db.$queryRaw<{ id: string }[]>(
    Prisma.sql`SELECT ${idColumn} AS id FROM ${from} WHERE ${conditions}`,
  );
  return rows.map((row) => row.id);
}

/** Convenience wrapper for the common case: search columns on a single table. */
export function findTurkishSearchMatchesInTable(
  db: { $queryRaw<T = unknown>(query: Prisma.Sql): Promise<T> },
  table: string,
  fields: readonly string[],
  searchValue: string,
): Promise<string[]> {
  return findTurkishSearchMatches(
    db,
    Prisma.raw(`"${table}"`),
    Prisma.raw(`"${table}"."id"`),
    fields.map((field) => Prisma.raw(`"${table}"."${field}"`)),
    searchValue,
  );
}
