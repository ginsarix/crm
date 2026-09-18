# Seçim Sonuçları — Design

Date: 2026-09-18

## Summary

A new panel page, `/panel/election-results`, showing one row per active
business group with seven editable integer columns of election data. Unlike
every other table in the app, rows are edited **inline** — a pencil button puts
a single row into edit mode rather than opening a dialog. Each row is
color-coded by whichever of its three faction columns (Yeşil / Mavi / Turuncu)
is largest.

The page is readable and editable by every logged-in user, admin or not.

## Columns

| Key | Default label | Editable inline | Label editor |
| --- | --- | --- | --- |
| `businessGroupName` | Komite | no | yes |
| `toplamOy` | Toplam Oy | yes | yes |
| `kullanilanOy` | Kullanılan Oy | yes | yes |
| `gecerliOy` | Geçerli Oy | yes | yes |
| `meclisUyeSayisi` | Meclis Üye Sayısı | yes | yes |
| `yesil` | Yeşil | yes | no (static) |
| `mavi` | Mavi | yes | no (static) |
| `turuncu` | Turuncu | yes | no (static) |

All eight columns are sortable.

## Data model

A new model, 1:1 with `BusinessGroup`, mirroring `BusinessGroupCard`:

```prisma
model ElectionResult {
  id              String        @id @default(cuid())
  businessGroupId String        @unique
  businessGroup   BusinessGroup @relation(fields: [businessGroupId], references: [id], onDelete: Cascade)

  toplamOy        Int @default(0)
  kullanilanOy    Int @default(0)
  gecerliOy       Int @default(0)
  meclisUyeSayisi Int @default(0)
  yesil           Int @default(0)
  mavi            Int @default(0)
  turuncu         Int @default(0)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

`BusinessGroup` gains `electionResult ElectionResult?`.

Rejected alternative: adding these seven columns to `BusinessGroupCard`.
`BusinessGroupCard` is admin-only while this page is all-roles, so sharing a
table would put one row under two different permission rules. `meclisUyeSayisi`
is also deliberately **separate** from the existing
`BusinessGroupCard.meclisSayisi` — the two pages do not read or write each
other's number.

Apply with `pnpm db:push` (this repo has no migration history), then restart the
dev server so the regenerated client in `generated/prisma` is picked up.

### Blank means zero

**Every field is optional on save, and a blank field means `0`** (product
decision, confirmed 2026-09-18). The columns are therefore non-null with a
`0` default rather than nullable: there is no "not yet entered" state to
distinguish from a genuine zero, so nothing in the model, router, color
function or cell renderers needs to handle `null`.

A freshly backfilled row reads `0` across all seven columns and renders
uncolored.

## Validation

`src/shared/zod-schemas/election-result.ts`, shared by the tRPC input and the
React Hook Form resolver per project convention.

- Each of the seven numeric fields: optional, integer, `>= 0`, no upper bound.
- Empty input coerces to `0`. The schema's output type is therefore
  `number`, never `number | undefined`, so the router writes plain integers.
- No cross-field constraints. `Kullanılan Oy > Toplam Oy` and
  `Yeşil + Mavi + Turuncu > Geçerli Oy` are both accepted without warning.

## Row color

Computed server-side in the router's row mapping and returned as a `color`
field on each row. The shared `DataTable` already paints
`row.original.color` for the six `Color` enum values, so no table changes are
needed and the Excel export inherits the coloring for free.

A pure function, `resolveElectionRowColor(yesil, mavi, turuncu)`, in
`src/lib/election-result-color.ts`:

1. If all three are `0`, return `null` (row renders with default striping).
2. If exactly one value is the maximum, return `green` / `blue` / `orange`
   for `yesil` / `mavi` / `turuncu` respectively.
3. Otherwise (two- or three-way tie for the maximum), return `purple`.

All three arguments are plain `number`s — blanks became `0` at the schema
boundary, so there is no null case here.

Note on purple: `src/lib/color-hints.ts` gives every color a
deployment-configured business meaning shown on the dashboard and the
customer-card color picker, and `business-group-cards/columns.tsx` separately
uses purple text to flag duplicate committee names. Purple therefore already
carries meaning elsewhere in the app. Using it for "tie" here is a deliberate,
accepted overload.

## Router

`src/server/api/routers/election-result.ts`, registered in
`src/server/api/root.ts`. Both procedures are `protectedProcedure` — every
logged-in user may read and write every row. There is no `isRestricted`
scoping and no admin gate.

Business-group assignment deliberately does **not** apply here (product
decision, confirmed 2026-09-18): a user with no assignment to a group still
sees that group's row and can still edit it. This is the one table in the app
where the role-scoping pattern is intentionally absent.

### `get`

Modeled on `businessGroupCard.get`:

- `backfillMissingRows(db)` first, creating an empty `ElectionResult` for any
  `BusinessGroup` lacking one, so the table always has a row per group.
- Active groups only, via an explicit `OR: [{ passive: null }, { passive: false }]`.
  Prisma's `not: true` on a nullable boolean silently drops `NULL` rows.
- Pagination and multi-column sorting identical to `businessGroupCard.get`.
  `sortableFields` covers all eight columns; `businessGroupName` sorts through
  the relation. Default order is `businessGroup.name asc`.
- Search: `findTurkishSearchMatches` against **`bg.name` only**. There is no
  search scope input and no scope enum — the scope is fixed.
- Each returned row carries `businessGroupName` and the computed `color`.

### `update`

Takes a row id plus the seven optional integers, writes them, and records an
audit log — `ELECTION_RESULT_UPDATED` / `ELECTION_RESULT`, success and failure
paths both, matching `businessGroupCard.update`.

## Inline editing

State lives in `page-client.tsx`: an `editingRowId` plus one React Hook Form
instance that `reset()`s to the edited row's values when edit mode opens. Cells
render `Controller`-bound number inputs, so validation comes from the shared Zod
schema.

- A trailing actions column holds a pencil button instead of the usual 3-dot
  menu. Clicking it puts that row — and only that row — into edit mode.
- While editing, the seven numeric cells become inputs and the pencil is
  replaced by a save / cancel pair. Komite stays read-only text.
- Escape cancels. Only one row is editable at a time; starting a second edit
  while one is dirty prompts before discarding.
- Field errors render as a red ring plus tooltip — there is no room for
  message text in a table cell.
- On success, invalidate the query so the row re-colors.

Renaming a business group remains a Ayarlar concern; the Komite cell never
edits it.

## Labels

`electionResult` becomes an **entity** (`Seçim Sonucu` / `Seçim Sonuçları`),
not a page entry, so `labelCompose` derives the nav item, the table title and
the audit-log strings from the tekil/çoğul pair the way `businessGroupCard`
does.

Type additions in `src/shared/labels/types.ts`: `electionResult` joins
`EntityKey` and `FieldEntityKey`; a new `ElectionResultFieldKey` union; entries
in `FieldLabels` and `FieldRegistry`.

`src/shared/labels/resolve.ts`: add `electionResult` to `FIELD_ENTITY_KEYS`.

Registry entries: `businessGroupName` is `kind: 'editable'` with default
`Komite`. It is deliberately **not** `inherited` from `businessGroup` the way
`businessGroupCard.businessGroupName` is — this column is named Komite, not
Meslek Grubu, so it must carry its own independently renameable label.
`yesil` / `mavi` / `turuncu` are registry entries but omitted from the editable
set, like the enum display values.

`labels-card.tsx` gains a `Seçim Sonuçları` tab with
`titleEntity: 'electionResult'`, `entityKeys: ['electionResult']`,
`fieldEntity: 'electionResult'`.

No field is marked `required`, matching the optional-save rule. Per project
convention no asterisk is ever baked into a label string.

### Tests that encode the current inventory

Two assertions in `src/shared/labels/registry.test.ts` list today's inventory
explicitly and must be updated deliberately, not worked around:

- `marks exactly the five renameable entities as editable` — becomes six, and
  the test name changes with it.
- `covers every non-system column key` — its explicit `entityKeys` array needs
  `electionResult`.

`resolve.test.ts` needs no changes: its `editableLabelKeys` assertions test
membership of specific keys, and its `DEFAULT_LABELS` assertions compare
derived values, so both absorb a new entity automatically.

`electionResult` is added to `src/lib/column-map.ts` (key array only, no
Turkish) so the "covers every non-system column key" invariant keeps guarding
the new entity, even though no search-scope enum is built from it.

## Navigation

A new entry in `sidebar-nav.tsx`'s `navigationItems` with `key: 'electionResult'`
and **no** `adminOnly` flag, plus a matching entry in `command-palette.tsx`.
`titleForKey` already falls through to `labelCompose.nav` for entity keys, so
no change is needed there.

## Files

New:

- `src/lib/election-result-color.ts` and its test
- `src/shared/zod-schemas/election-result.ts`
- `src/server/api/routers/election-result.ts`
- `src/app/panel/election-results/page.tsx`
- `src/app/panel/election-results/page-client.tsx`
- `src/app/panel/election-results/columns.tsx`
- `src/app/panel/election-results/filter-controls.tsx`

Modified:

- `prisma/schema.prisma`
- `src/server/api/root.ts`
- `src/lib/column-map.ts`
- `src/shared/labels/{types,registry,compose,resolve}.ts`
- `src/shared/labels/{registry,resolve}.test.ts`
- `src/app/panel/settings/labels-card.tsx`
- `src/app/panel/_components/{sidebar-nav,command-palette}.tsx`

## Testing

- Unit tests for `resolveElectionRowColor`: each single maximum, two-way ties
  in all three pairings, a three-way tie, and all zero.
- Unit tests for the Zod schema: blank coerces to `0`, negatives rejected,
  non-integers rejected, large values accepted, all-blank accepted.
- The label registry invariant tests cover the label wiring.
- Manual check: `pnpm typecheck`, `pnpm check`, and the page rendering with
  more business groups than fit one page.

## Out of scope

- Any cross-field validation or totals reconciliation.
- Aggregate/summary rows, dashboard tiles, or charts for election data.
- Per-user or per-business-group edit scoping.
