# Dynamic Page Size Options

**Status:** approved design, not yet implemented
**Date:** 2026-09-22

## Problem

Every table in the panel offers a fixed set of rows-per-page (RPP) options and
opens at a fixed default. `DataTable` hardcodes `pageSizeOptions = [25, 50, 100,
500]` and each page-client hardcodes its own initial `pageSize`. Changing either
means a code change and a deploy.

Admins should be able to add, edit and remove RPP options per table, and choose
which option each table opens at. The settings page gains a tab shell to hold the
new editor alongside the existing cards.

## Scope

All 9 `DataTable` call sites become configurable:

| Table key             | Call site                                              |
| --------------------- | ------------------------------------------------------ |
| `customerCard`        | `panel/customer-cards/page-client.tsx`                  |
| `visit`               | `panel/visits/page-client.tsx`                          |
| `businessGroupCard`   | `panel/business-group-cards/page-client.tsx`            |
| `electionResult`      | `panel/election-results/page-client.tsx`                |
| `user`                | `panel/users/page-client.tsx`                           |
| `auditLog`            | `panel/audit-logs/page-client.tsx`                      |
| `salesRepresentative` | `panel/settings/sale-representatives-table.tsx`         |
| `userReport`          | `panel/users/report-tab.tsx`                            |
| `userReportActions`   | `panel/users/report-actions-dialog.tsx`                 |

### Rules

- 1–5 options per table. Never 0, never 6.
- Each option is an integer in **1–500**. The ceiling matches the existing
  `itemsPerPage: z.number().min(1).max(500)` in every router, so no router
  validation changes. There is no floor above 1 — a 1-row page works fine and a
  floor would guard against nothing.
- No duplicate values within a table.
- Options render ascending in the RPP dropdown, which they do not today.
- Exactly one option is the default. It is the value a table opens at.

### Out of scope

- Per-user persistence of the RPP choice. The admin default is the initial value
  on every visit, exactly like today's hardcoded number. No new localStorage
  keys; `DataTable`'s existing column-visibility and column-sizing persistence is
  untouched.
- Raising the 500 ceiling.
- Per-user or per-role overrides. The config is global.

## Data layer

### Prisma model

Added next to `LabelOverride` in `prisma/schema.prisma`, applied with
`pnpm db:push` (this repo has no migration history).

```prisma
model PageSizeConfig {
  tableKey     String   @id
  options      Json     // number[], 1-5 entries, unique, stored ascending
  defaultValue Int
  updatedAt    DateTime @updatedAt
  updatedById  String?
}
```

Sparse by design: no backfill, no seed. A table with no row uses its built-in
config from the code registry. This is the same contract `LabelOverride` uses —
rows exist only where an admin has diverged from the default.

`defaultValue` is a real column rather than a key inside the JSON blob because it
is validated and read on its own; only the variable-length list needs JSONB.

### Registry

`src/shared/page-sizes/registry.ts` — the static key list and each table's
built-in config. The only place these numbers are typed.

```ts
export const pageSizeTables = {
  customerCard:        { options: [25, 50, 100, 500], defaultValue: 25 },
  visit:               { options: [25, 50, 100, 500], defaultValue: 25 },
  businessGroupCard:   { options: [50, 100, 500],     defaultValue: 50 },
  electionResult:      { options: [25, 50, 100, 500], defaultValue: 25 },
  user:                { options: [25, 50, 100, 500], defaultValue: 25 },
  auditLog:            { options: [25, 50, 100, 500], defaultValue: 25 },
  salesRepresentative: { options: [25, 50, 100, 500], defaultValue: 25 },
  userReport:          { options: [25, 50, 100, 500], defaultValue: 25 },
  userReportActions:   { options: [25, 50, 100, 500], defaultValue: 25 },
} as const;
```

These reproduce current behavior exactly. `businessGroupCard` is the one table
that already differs — `pageSizeOptions={[50, 100, 500]}` with default 50, per
commit 664f049 — so it keeps its own entry.

### Zod schema

`src/shared/zod-schemas/page-size.ts`, shared by the router input and the editor
form. Every invariant lives here.

```ts
export const PageSizeTableConfigSchema = z
  .object({
    options: z
      .array(z.number().int().min(1).max(500))
      .min(1)
      .max(5)
      .refine((o) => new Set(o).size === o.length, 'Aynı değerden birden fazla olamaz'),
    defaultValue: z.number().int().min(1).max(500),
  })
  .refine((c) => c.options.includes(c.defaultValue), 'Varsayılan, seçenekler arasında olmalı');
```

Ascending order is deliberately **not** validated. The router normalizes with
`[...options].sort((a, b) => a - b)` before writing, so sorted-on-read holds
regardless of what the form submits — and the resolver sorts registry defaults
too, so the ascending dropdown works even for tables with no DB row.

### Resolver

`src/shared/page-sizes/resolve.ts`, mirroring `src/shared/labels/resolve.ts`.
Takes the rows, layers them over the registry, returns a fully-populated
`Record<PageSizeTableKey, { options: number[]; defaultValue: number }>`.

A row whose stored data fails the schema — hand-edited DB, or a key retired in
code — is discarded in favor of the registry default rather than throwing. A bad
row must never take the panel down.

### Router

`src/server/api/routers/page-size.ts`, registered as `pageSize` in
`src/server/api/root.ts`.

- **`get`** — `protectedProcedure`. Reads all rows, returns the resolved config.
  Everyone needs it; only admins write.
- **`update`** — `adminProcedure`, input `{ tableKey, options, defaultValue }`
  validated by the shared schema. Sorts `options` ascending, then:
  - if the submitted config deep-equals the registry default for that key,
    **deletes** the row (keeping the table sparse);
  - otherwise upserts it with `updatedById`.

  Follows the label router's shape (`src/server/api/routers/label.ts:24`):
  read-before-write so the audit detail describes what actually changed, a
  `FAILURE` audit log in the catch, a `SUCCESS` one after.

There is no separate `reset` procedure. "Varsayılanları Getir" sets the draft to
the registry default; saving that deletes the row. One endpoint, and sparseness
stays an invariant of the write path rather than something an admin must know to
click a special button for.

### Label registry additions

Two of the 9 tables have no entity behind them, so their display names in the
editor cannot be composed. They become static entries in
`src/shared/labels/registry.ts`, both `editable: false`:
`userReport: 'Kullanıcı Raporu'` and `userReportActions: 'Rapor İşlemleri'`. The
other 7 derive from their entity plural labels at runtime.

### Audit strings

`PAGE_SIZE_UPDATED: 'Sayfa Boyutu Güncellendi'` added to `auditActionLabels` and
`PAGE_SIZE: 'Sayfa Boyutu'` to the resource map, both in
`src/shared/labels/compose.ts:66`. Audit actions are plain strings here, not a
Prisma enum, so no schema change is needed.

## Config delivery

Server-fetched in each route's `page.tsx` and passed as a prop. Every panel route
already has a server `page.tsx` that prefetches and wraps in `HydrateClient`.

```
[[...slug]]/page.tsx   const pageSizes = await api.pageSize.get();
                       <CustomerCardsPageClient pageSize={pageSizes.customerCard} />

page-client.tsx        useState({ pageIndex: 0, pageSize: pageSize.defaultValue })
                       <DataTable pageSizeOptions={pageSize.options} ... />
```

Chosen over a `usePageSizes()` client hook mirroring `useLabels()`. Each
page-client seeds `useState` from the config, and `useState` reads its
initializer exactly once — a hook with `initialData: DEFAULT_PAGE_SIZES` would
mount the table at the code default, fire a query for that page size, then jump
to the admin's value and fire again, with correctness resting on prefetch
discipline across 10 routes. Passing a prop removes the race.

Route breakdown:

- 6 routes with a straightforward server page: `audit-logs`, `election-results`,
  `business-group-cards`, `users`, and the two `[[...slug]]` routes
  (`customer-cards`, `visits`).
- `settings/page.tsx` already awaits `api.label.get()`; `api.pageSize.get()`
  joins the existing `Promise.all`.
- The two nested Kullanıcılar tables (`report-tab.tsx`,
  `report-actions-dialog.tsx`) receive their slice threaded down from
  `users/page-client.tsx`, which already holds the config object.

### `DataTable`

`src/app/_components/data-table.tsx:315` loses its
`pageSizeOptions = [25, 50, 100, 500]` default and makes the prop **required**. A
table that forgets to pass config should fail typecheck, not silently fall back
to numbers that no longer mean anything. This turns the migration into a
compiler-enforced checklist across the 9 sites.

### The `=== 500` cache-patch checks

Four sites hardcode 500 to mean "largest page — patch the cache instead of
refetching": `customer-cards/page-client.tsx:439`,
`business-group-cards/page-client.tsx:120`, `users/page-client.tsx:164`,
`visits/page-client.tsx:266`. Each becomes a comparison against the largest
configured option, computed once near the top of the component:

```ts
const largestPageSize = Math.max(...pageSize.options);
// ...
if (pagination.pageSize === largestPageSize) { /* patch cache */ }
```

Equivalent to `options.at(-1)` given the sort guarantee, but `Math.max` does not
quietly depend on it. Without this change the optimization silently stops firing
for any table whose largest option is no longer 500.

## Settings tab shell

Admins get a tab strip; non-admins do not, since they only ever see the Satış
Temsilcileri table.

```
/panel/settings?tab=sales-representatives   Satış Temsilcileri   (default)
                    ?tab=business-groups    Meslek Grupları
                    ?tab=labels             Etiketler
                    ?tab=page-sizes         Sayfa Boyutu
```

Slugs are stable English identifiers, never derived from labels. They are a URL
contract, and `business-groups` is "Meslek Grupları" today and whatever an admin
renames it to tomorrow — a label-derived slug would break saved links on a
rename. Turkish appears only in the visible `TabsTrigger` text.

### Structure

`settings/page.tsx` stays a server component with its current responsibilities —
session, `isAdmin`, `await api.label.get()`, the prefetches — gaining
`api.pageSize.get()` in the existing `Promise.all`. It then branches:

- **Non-admin** → `<SaleRepresentativesTable />` directly, as today minus the
  grid wrapper. No tab strip, no `Tabs` in their tree.
- **Admin** → `settings/settings-tabs.tsx`, a new client component holding all
  four panels.

The page header (`labels.page.settings` plus the "Genel ayarlar, tanımlar ve
tercihler" subtitle) stays above the strip for both.

### Tab labels

Per the label-resolver rules in CLAUDE.md:

- **Satış Temsilcileri** and **Meslek Grupları** compose from their existing
  entity plural labels, so renaming the entity renames the tab automatically.
- **Etiketler** and **Sayfa Boyutu** are new static registry entries,
  `editable: false` — consistent with how `auditLogs` and `announcements` are
  already handled.

### Tab state

`settings-tabs.tsx` is `'use client'` and reads the active tab from
`useSearchParams()`, falling back to `sales-representatives` when the param is
absent or is not one of the four. On change it calls
`window.history.replaceState` with the updated query string — the documented
shallow-routing path for this Next version
(`node_modules/next/dist/docs/01-app/02-guides/single-page-applications.md:296`),
which syncs with `useSearchParams` without an RSC roundtrip.

`replaceState` rather than `pushState`: tab switches should not fill the back
button, so Back leaves the settings page instead of walking the tabs.

### Layout consequence

Today `SaleRepresentativesTable` and `BusinessGroupsTable` sit side by side in a
2-column grid for admins (`settings/page.tsx:41`). Tabs separate them and each
gets full width. This is an improvement — both are cramped at half width — but it
is a visible change to an existing screen, not purely additive.

### Prefetching

All four panels live inside `Tabs`, and shadcn's `TabsContent` unmounts inactive
panels, so a hidden tab fetches nothing until opened. The existing prefetches
cover the SR and BG tables; labels and page-sizes are single small queries
already resolved server-side. No per-tab loading state.

## The editor

`settings/page-sizes-card.tsx`. Follows `LabelsCard`'s conventions — local draft
state with a per-section dirty dot and a per-section Kaydet, not React Hook Form
— so the two editors sitting next to each other behave the same way.

A flat list of 9 table sections in one card, not nested tabs. Each config is at
most 5 short rows, and the `Etiketler` tab already contains a nested tab strip; a
second one beside it would be a lot to navigate.

```
Cari Kartları                                    ● (dirty)
  ┌──────────────────────────────────────────┐
  │ ( ) 25     [×]                            │
  │ (•) 50     [×]     ← varsayılan            │
  │ ( ) 100    [×]                            │
  │ ( ) 500    [×]                            │
  └──────────────────────────────────────────┘
  [ + Seçenek Ekle  4/5 ]   [Varsayılanları Getir] [Kaydet]
```

Each row is a number `Input`, a radio marking it the default, and a remove
button.

- **Remove is disabled at 1 option.** The minimum is enforced by never offering
  the action, not by an error afterwards.
- **Seçenek Ekle is disabled at 5**, with the count shown so the ceiling is not a
  surprise when the button greys out.
- Table names come from `useLabels()` entity plurals for 7 of the 9; the two
  Kullanıcılar report tables use their static registry entries
  (`Kullanıcı Raporu`, `Rapor İşlemleri`).

### Default tracking

The default is tracked **by value**, not by a synthetic row id. Values are unique
within a valid state, so the value is a sufficient identity — provided the two
mutation paths maintain it:

```ts
// editing a value
if (prevValue === defaultValue) setDefaultValue(nextValue);

// removing a row
if (removedValue === defaultValue) setDefaultValue(Math.min(...remaining));
```

Without the first rule, editing the default's value (50 → 60) leaves
`defaultValue: 50` pointing at a row that no longer exists. Without the second,
removing the default leaves it pointing at nothing.

This is maintained client-side rather than repaired in the procedure for two
reasons. The procedure receives a final state, not a sequence of edits: given
`{ options: [25, 60, 100], defaultValue: 50 }` it cannot distinguish "renamed the
default" from "deleted 50, added 60", and with two edits in one save
(50→60 *and* 100→200) which value inherits the default is genuinely ambiguous.
And a server rule only runs on save, so the radio would sit on a stale row while
the admin is looking at it. The server's job is the backstop —
`.refine(c => c.options.includes(c.defaultValue))` rejects a state the form can
never produce.

Two consequences of value-as-identity:

- **The patch runs per keystroke, not on blur.** The draft's `defaultValue` will
  transiently hold `''` or a partial number on the way from 50 to 60. The form
  state type is therefore looser than the submit type; Zod parses at submit and
  save stays disabled while invalid. Patching on blur would reintroduce the
  original bug in a narrower window.
- **Transient duplicates are tolerated.** Editing 25 → 50 when 50 already exists
  briefly matches two rows. The state is unsaveable and self-corrects; the
  duplicate error renders on both rows and the radio resolves to the first match.

### Row ordering

Values sort ascending on save, but the draft keeps entry order while typing.
Live-sorting would make rows jump between keystrokes — typing `60` reorders at
`6`, then again at `60`. New options append at the bottom; the list settles into
sorted order when the save round-trips.

### Validation

Inline per row; save disabled while any row in that section is invalid.

| Condition           | Message                            |
| ------------------- | ---------------------------------- |
| duplicate value     | `Aynı değerden birden fazla olamaz` |
| out of range        | `1 ile 500 arasında olmalı`         |
| empty / non-numeric | `Geçerli bir sayı girin`            |

### Save

Per section, like the labels tabs: `pageSize.update` for one `tableKey`, a
`sonner` toast, then `utils.pageSize.get.invalidate()` so open tables pick up the
new options. Dirty state is per section — an unsaved edit to Ziyaretler does not
block saving Cari Kartları.

Invalidating refreshes dropdown options everywhere, but an already-mounted table
keeps its current `pageSize` in `useState` and will not jump to a newly-saved
default until remount. This is deliberate: an open table should not re-paginate
under the person reading it.

## Testing

Vitest runs `environment: 'node'` over `src/**/*.test.ts` — `.ts` only, no
`.tsx`, and no component-testing infrastructure exists. This design does not add
jsdom and testing-library. Instead the form logic is extracted so it is reachable
from the existing setup.

**`src/shared/page-sizes/mutate.ts`** — pure functions the card imports and holds
the result of:

```ts
setOptionValue(state, index, nextValue) → state   // carries the default
removeOption(state, index)              → state   // reassigns to smallest remaining
addOption(state)                        → state
```

`mutate.test.ts`: editing the default's value moves the default; editing a
non-default does not; removing the default reassigns to the smallest remaining;
removing a non-default leaves it alone; remove is a no-op at 1 option; add is a
no-op at 5.

**`registry.test.ts`** — every built-in config satisfies
`PageSizeTableConfigSchema`, and the 9 keys exactly match the `DataTable` call
sites listed in Scope. Same invariant net `src/lib/column-map.ts` has: a key
added in one place and forgotten in the other fails the suite.

**`resolve.test.ts`** — missing row falls back to the registry; present row
overrides it; malformed row (bad JSON shape, out-of-range value, 6 options,
default not in options) falls back rather than throwing; output is always sorted
ascending regardless of stored order.

**`zod-schemas/page-size.test.ts`** — boundaries: 0 options rejected, 1 accepted,
5 accepted, 6 rejected; duplicates rejected; 0 and 501 rejected, 1 and 500
accepted; default outside options rejected.

**Router test** — the two write-path behaviors not covered by the schema:
unsorted input is stored sorted, and a config equal to the registry default
deletes the row instead of writing one.

**Playwright** (`e2e/page-sizes.spec.ts`), following `e2e/labels.spec.ts`: log
in, set Cari Kartları to a distinctive config (default 10), assert
`/panel/customer-cards` opens with 10 rows and its dropdown lists exactly the
configured options in ascending order, then restore via "Varsayılanları Getir" in
a `finally` block the way `labels.spec.ts:45` does.

**Fix to `e2e/labels.spec.ts`** — required, not optional. The spec does
`page.getByRole('tab', { name: 'Cari Kartları' })` immediately after
`goto('/panel/settings')` (`labels.spec.ts:25`, and again at `:47`). With the
outer tab strip, the labels card's nested tabs are unreachable until `Etiketler`
is clicked. A click on the outer tab must be inserted in both places.

Not tested: the tab shell's URL syncing and the card's rendering. Both need
component-test infrastructure to reach and are thin enough to verify by hand.
