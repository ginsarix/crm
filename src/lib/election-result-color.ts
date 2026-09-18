/** The subset of the shared DataTable's row colors this page uses. */
export type ElectionRowColor = 'green' | 'blue' | 'orange' | 'purple' | null;

/**
 * Colors a row by whichever faction count leads: Yeşil → green, Mavi → blue,
 * Turuncu → orange. Any tie for the top spot is purple, and an all-zero row
 * is left uncolored.
 *
 * Counts are plain numbers, never null: a blank input becomes 0 at the Zod
 * boundary and the columns are non-null in the database.
 */
export function resolveElectionRowColor(
  yesil: number,
  mavi: number,
  turuncu: number,
): ElectionRowColor {
  if (yesil === 0 && mavi === 0 && turuncu === 0) return null;

  const max = Math.max(yesil, mavi, turuncu);
  const leaders: Exclude<ElectionRowColor, null | 'purple'>[] = [];
  if (yesil === max) leaders.push('green');
  if (mavi === max) leaders.push('blue');
  if (turuncu === max) leaders.push('orange');

  // `leaders[0]` is `T | undefined` under noUncheckedIndexedAccess, though
  // the array always has at least one entry here.
  return leaders.length > 1 ? 'purple' : (leaders[0] ?? null);
}
