import { defaultFilter } from 'cmdk';

/**
 * JavaScript's `toLowerCase()` is locale-invariant: it folds `I` to `i`
 * (Turkish wants `ı`) and `İ` to `i` + U+0307 — a *second* code point that
 * breaks substring alignment. Every client-side search that folded with
 * `toLowerCase()` therefore missed Turkish case pairings.
 *
 * The fold is deliberately lenient: `I`, `İ`, `ı` and `i` all collapse onto
 * `i`, so a query typed without a Turkish keyboard still matches. The server
 * mirrors this exact canonical form in SQL — see the `translate()` table in
 * `src/server/api/lib/turkish-search.ts`. The two must stay in sync, or a
 * server-side search and the client-side filter layered on top of it will
 * disagree about what matches.
 */
const TR_SOURCE = 'İIıÇĞÖŞÜ';
const TR_FOLDED = 'iiiçğöşü';

export function foldTurkish(value: string): string {
  return value
    .replace(
      /[İIıÇĞÖŞÜ]/g,
      (char) => TR_FOLDED[TR_SOURCE.indexOf(char)] ?? char,
    )
    .toLowerCase()
    .replace(/̇/g, '');
}

/**
 * `filter` for cmdk's `<Command>`. cmdk's default scorer lowercases with
 * `toLowerCase()` internally, so it is fed already-folded strings here and its
 * fuzzy ranking is otherwise left alone.
 */
export function turkishCommandFilter(
  value: string,
  search: string,
  keywords?: string[],
): number {
  return (
    defaultFilter?.(
      foldTurkish(value),
      foldTurkish(search),
      keywords?.map(foldTurkish),
    ) ?? 0
  );
}
