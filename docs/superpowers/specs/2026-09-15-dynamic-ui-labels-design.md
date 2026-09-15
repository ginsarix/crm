# Dynamic, admin-editable UI labels

**Date:** 2026-09-15
**Status:** Approved, ready for implementation planning

## Goal

Make display text — column headers, form input labels, table titles, page header
titles, nav item labels, and the audit strings derived from them — editable by
admins at runtime. Current hardcoded text becomes the default.

Secondary goal: route **all** display text through the resolver, including text
that stays uneditable, so there is one way to render a label.

### Editable topics

| Topic | What becomes editable |
|---|---|
| Cari Kartları | entity name (tekil/çoğul), all form field labels |
| Ziyaretler | entity name, all form field labels |
| Meslek Grubu Kartları | entity name, all form field labels, form section headings |
| Meslek Grubu | entity name only (feeds field labels + Ayarlar table title) |
| Satış Temsilcisi | entity name only (feeds field labels + Ayarlar table title) |
| Panel | page title |
| Ayarlar | page title |

Explicitly **not** editable: the columns of the Satış Temsilcileri and Meslek
Grupları tables on Ayarlar; `id` / `createdAt` / `updatedAt` on every entity;
enum *values* (Geldi/Gelmedi, Aldı/Almadı, telefon/yüz yüze, …).

## Architecture

```
src/shared/labels/
  registry.ts   defaults + metadata — the only place this Turkish text is typed
  resolve.ts    pure: overrides -> ResolvedLabels   (server & client)
  compose.ts    pure: tekil/çoğul -> derived strings
```

### Entities

Each entity is a `{ tekil, çoğul }` pair.

| key | tekil | çoğul | editable |
|---|---|---|---|
| `customerCard` | Cari Kartı | Cari Kartları | yes |
| `visit` | Ziyaret | Ziyaretler | yes |
| `businessGroupCard` | Meslek Grubu Kartı | Meslek Grubu Kartları | yes |
| `businessGroup` | Meslek Grubu | Meslek Grupları | yes |
| `salesRepresentative` | Satış Temsilcisi | Satış Temsilcileri | yes |
| `user` | Kullanıcı | Kullanıcılar | no |
| `announcement` | Duyuru | Duyurular | no |
| `auditLog` | Denetim Kaydı | Denetim Kayıtları | no |

`businessGroupCard` is an **independent** pair — it does not compose from
`businessGroup`. Renaming Meslek Grubu does not rename Meslek Grubu Kartları.

### Fields

Ordered per entity. Order is taken from the **edit/view dialog** (the dialog
with the complete field set), and that order *is* the admin-facing numbering.
Each entry is either `{ key, default, required }` or `{ key, inheritsFrom }`.

**customerCard**

| # | key | default | required |
|---|---|---|---|
| 1 | `sira` | Sıra | no |
| 2 | `name` | Ünvan | **yes** |
| 3 | `sicil` | Sicil | no |
| 4 | `businessGroup` | *inherits* `businessGroup.tekil` | no |
| 5 | `address` | Adres | no |
| 6 | `district` | İlçe | no |
| 7 | `region` | Bölge | no |
| 8 | `gsm1` | GSM 1 | no |
| 9 | `contact1` | İletişim 1 | no |
| 10 | `gsm2` | GSM 2 | no |
| 11 | `contact2` | İletişim 2 | no |
| 12 | `gsm3` | GSM 3 | no |
| 13 | `contact3` | İletişim 3 | no |
| 14 | `authorities` | Yetkililer | no |
| 15 | `salesRepresentative` | *inherits* `salesRepresentative.tekil` | no |
| 16 | `status` | Durum | no |
| 17 | `authorizationDocument` | Yetki Belge | no |
| 18 | `vote` | Oy | no |
| 19 | `color` | Renk | no |
| 20 | `note` | Not | no |

**visit**

| # | key | default | required |
|---|---|---|---|
| 1 | `customerCardId` | *inherits* `customerCard.tekil` | **yes** |
| 2 | `salesRepresentativeId` | *inherits* `salesRepresentative.tekil` | no |
| 3 | `date` | Tarih | **yes** |
| 4 | `time` | Saat | no |
| 5 | `via` | İletişim Türü | no |
| 6 | `note` | Not | no |

Plus two **composed, non-editable** columns that display the related card's data:

- `customerCardName` -> `{customerCard.tekil} {field.customerCard.name}`
- `customerCardGsm` -> `{customerCard.tekil} {field.customerCard.gsm1}`

**businessGroupCard** — all optional.

| # | key | default |
|---|---|---|
| 1 | `meclisSayisi` | Meclis Sayısı |
| 2 | `meclis1` | Meclis 1 |
| 3 | `meclis2` | Meclis 2 |
| 4 | `meclis3` | Meclis 3 |
| 5 | `uyeSayisi` | Üye Sayısı |
| 6 | `baskan` | Komite 1 |
| 7 | `baskanYardimcisi` | Komite 2 |
| 8 | `uye1` | Komite 3 |
| 9 | `uye2` | Komite 4 |
| 10 | `uye3` | Meclis Yedek 1 |
| 11 | `uye4` | Meclis Yedek 2 |
| 12 | `uye5` | Meclis Yedek 3 |
| 13 | `yedekUye1` | Komite Yedek 1 |
| 14 | `yedekUye2` | Komite Yedek 2 |
| 15 | `yedekUye3` | Komite Yedek 3 |
| 16 | `yedekUye4` | Komite Yedek 4 |
| 17 | `yedekUye5` | Yedek Üye 5 |
| 18 | `yedekUye6` | Yedek Üye 6 |
| 19 | `yedekUye7` | Yedek Üye 7 |

Plus `businessGroupName` (column-only) -> *inherits* `businessGroup.tekil`.

Section headings, editable, numbered separately as `N. Bölüm`:
Meclis · Komite · Meclis Yedek · Komite Yedek · Yedek Üyeler

**System fields** — resolved but never editable, shared by every entity:
`id` = ID, `createdAt` = Oluşturulma Tarihi, `updatedAt` = Güncellenme Tarihi.

### Pages

One `title` per page, used for **both** the nav item and the in-page `h2`.
`changelog` is the exception: it has no nav item (it is reached via the version
badge in the header), so its title feeds only the page `h1`.

| key | default | editable |
|---|---|---|
| `dashboard` | Panel | yes |
| `settings` | Ayarlar | yes |
| `users` | Kullanıcılar | no |
| `announcements` | Duyurular | no |
| `auditLogs` | Denetim Kayıtları | no |
| `changelog` | Sürüm Notları | no |

### Composition

`compose.ts` holds pure one-liners over an entity's `{ tekil, çoğul }`:

| composer | rule |
|---|---|
| `nav`, `tableTitle` | `çoğul` |
| `create` | `{tekil} Ekle` |
| `edit` / `view` | `{tekil} Düzenle` / `{tekil} Görüntüle` |
| `created` / `updated` / `deleted` | `{tekil} Oluşturuldu` / `Güncellendi` / `Silindi` |
| `resourceType` | `tekil` |

`auditAction` and `resourceType` stop being hand-written maps and are generated
from these. Non-CRUD entries stay literal: `USER_LOGIN`, `USER_LOGOUT`,
`PASSWORD_CHANGED`, `EMAIL_CHANGED`, `ROLE_CHANGED`. `SETTINGS_UPDATED` composes
as `{page.settings.title} Güncellendi`, so renaming Ayarlar renames its audit
rows too. A new `LABEL_UPDATED` / `LABEL` pair is added for this feature's own
mutation; `action` and `resourceType` are plain `String` columns, so no schema
change is needed for it.

**The required asterisk is never part of a label.** It is appended by the form
component from the registry's `required` flag, so admins never type it.

### Storage

```prisma
model LabelOverride {
  key         String   @id   // "entity.customerCard.plural" | "field.visit.via" | "page.settings.title"
  value       String
  updatedAt   DateTime @updatedAt
  updatedById String?
}
```

Only values an admin actually changed are persisted. Consequences:

- "Varsayılanı Getir" is a row **delete**, not a write.
- A default improved in code reaches everyone who has not overridden it.
- `pnpm db:push` adds one table, no backfill.

### Delivery

```
label router (src/server/api/routers/label.ts)
  get     protectedProcedure  -> ResolvedLabels
  update  adminProcedure      -> Record<key, string | null>   (null = reset)
                                 audit-logged as LABEL_UPDATED

panel/layout.tsx       api.label.get.prefetch() inside HydrateClient
server components      const L = await api.label.get()
client components      const L = useLabels()
```

`useLabels()` wraps `api.label.get.useQuery(undefined, { initialData: DEFAULT_LABELS })`,
seeded with the compiled-in defaults. Worst case a user sees defaults for a few
ms; never a blank header, and never `undefined`, so `createColumns(L, onView)`
and friends always receive a fully-shaped object with no optional chaining
downstream. `staleTime` is long — labels change approximately never.

`label.update` invalidates `label.get`, so the editing admin's own view updates
immediately; other sessions pick it up on their next refetch.

### Splitting the existing maps

`column-map.ts` currently does two jobs. It splits:

- **Key arrays stay** as a static export. Five routers build Zod enums from them
  (`z.enum(['all', ...Object.keys(columnMap.customerCard)])` in `customer-card`,
  `visit`, `business-group-card`, `user`, `user-report`). This is a schema
  contract and must not become dynamic. The CLAUDE.md rule — adding a
  `searchableFields` entry also requires a `column-map` entry — still holds.
- **Turkish strings move** to the registry. `filter-controls.tsx` reads scope
  labels from the resolver.

`enum-map.ts` sheds `auditAction` and `resourceType` to the composer and keeps
the enum-value maps (`status`, `vote`, `authorizationDocument`, `auditResult`),
which are out of scope.

## The editor

Admin-only card, full width, below the existing two-column row on `/panel/settings`.

```
┌─ Etiketler ────────────────────────────────────────────────┐
│ [Cari Kartları] [Ziyaretler] [Meslek Grubu Kartları] [Genel]│
│                                                             │
│  Tekil [Cari Kartı    ]   Çoğul [Cari Kartları   ]          │
│                              [Varsayılanları Getir] [Kaydet]│
│  ─────────────────────────────────────────────────────────  │
│  1. Alan  ⟨Formda Opsiyonel⟩      [Sıra          ]  [↺]    │
│  2. Alan  ⟨Formda Zorunlu⟩        [Ünvan         ]  [↺]    │
│  3. Alan  ⟨Formda Opsiyonel⟩      [Sicil         ]  [↺]    │
│  4. Alan  ⟨Meslek Grubundan⟩       Meslek Grubu            │
│  5. Alan  ⟨Formda Opsiyonel⟩      [Adres         ]  [↺]    │
└─────────────────────────────────────────────────────────────┘
```

**Field identifiers.** `{position}. Alan`, where position is the index in the
form. Required/optional is a **badge** — `Formda Zorunlu` / `Formda Opsiyonel` —
never part of the identifier text, so the number reads purely as a position and
cannot be misparsed as "the Nth optional field". MGK section headings use
`{position}. Bölüm` in their own sub-section.

**Inherited fields** keep their real form position and render read-only and
greyed, with a badge naming the source (`Meslek Grubundan`,
`Satış Temsilcisinden`). No input, no reset button. This keeps the list a
faithful top-to-bottom mirror of the actual form and keeps the numbering honest.

**Tabs.** Four: the three entities plus **Genel**, holding the two shared
entities (Meslek Grubu, Satış Temsilcisi — tekil/çoğul only) and the two page
titles (Panel, Ayarlar). Tab labels use the live çoğul, so a tab renames itself
as it is edited.

**One form per tab**, each with its own `Kaydet` and `Varsayılanları Getir`.
Tabs stay mounted so switching never loses edits; a dirty tab shows a dot on its
trigger. Save is scoped to the tab in view rather than writing sixty values at
once.

**Reset semantics.** `[↺]` writes the default *text* into the input rather than
clearing it. `Varsayılanları Getir` does that for every input in the tab.
Neither touches the database until `Kaydet`, so both are undoable by simply not
saving. On save, any value equal to its default is persisted as a **row delete**
— so "reset" and "never touched" converge on the same state, and future default
improvements still reach it.

**Placeholder** on each input is that input's default label. **An empty input
means "use the default"**, which makes the placeholder honest and prevents a
cleared box from producing a blank column header.

**Validation** lives in `src/shared/zod-schemas/label.ts` per the repo's
shared-schema rule: trimmed, 1–60 characters. The mutation takes
`Record<key, string | null>`, and the server re-checks every key against the
registry's editable set — an admin must not be able to write arbitrary keys.

**Layout.** Cari Kartları has 20 rows; on `lg` rows go two-up, single column below.

## Text that changes on day one

Collapsing duplicate wordings onto one source shifts some text before anyone
edits anything. All cosmetic, all intended:

| Site | Before | After |
|---|---|---|
| CK table title | Cari Kartlar | Cari Kartları |
| CK create dialog | Cari Kart Ekle | Cari Kartı Ekle |
| CK create toast | Cari kart başarıyla eklendi | Cari Kartı başarıyla eklendi |
| Ziyaret search scope for `via` | Aracılığıyla | İletişim Türü |
| Ziyaret `customerCardId` label | Müşteri Kartı | Cari Kartı |
| Ziyaret columns | Müşteri Ünvanı / Müşteri GSM | Cari Kartı Ünvan / Cari Kartı GSM 1 |
| Ziyaret edit dialog `time` | Saat * | Saat |

The last one is a fix: `time` is optional in `VisitCreateSchema`, and the edit
dialog's asterisk was wrong. Driving it from the registry's `required` flag
corrects it by construction.

**Form placeholders derive from the resolved label.** `"Sıra no"` becomes
`"Sıra"`, `"Sicil no"` becomes `"Sicil"`. Losing the "no" hint is an accepted
cost of not letting placeholders go stale when a label is renamed.

## Pre-existing bug — already fixed

`src/app/panel/business-group-cards/edit-dialog.tsx` gated the **Üye Sayısı**
input on `group.title === 'Üyeler'`, but commit `2422fd7` renamed the groups to
`Meclis` / `Komite` / `Meclis Yedek` / `Komite Yedek` / `Yedek Üyeler`. No group
was named `'Üyeler'`, so the input never rendered — Üye Sayısı was uneditable in
the UI while still appearing as a column and a search scope.

Fixed separately in `58b3230` ahead of this feature so it could ship on its own,
by gating on `'Komite'` (where the üye fields moved). Wave 3 does not need to
carry it. The registry's MGK ordering below reflects the corrected form:
Meclis Sayısı -> Meclis 1-3 -> Üye Sayısı -> Komite 1-4 -> ...

## Implementation waves

**Wave 0 — test infrastructure.** `vitest` 5.0.1 and `@playwright/test` 1.63.0
are already in devDependencies (commit `9f629ba`), but nothing is configured.

- `pnpm add -D vite` — **required**. Vitest 5 declares vite as a *peer*
  dependency (`^6.4.0 || ^7.0.0 || ^8.0.0`), not a regular one; under pnpm's
  strict layout vitest will not run without it, and Next 16 does not provide one.
- `vitest.config.ts` — `environment: 'node'`, `~/*` -> `./src/*` alias mirrored
  from tsconfig. Verify the v5 config surface against the installed package;
  Context7's index only reaches v4.1.6.
- `playwright.config.ts` — `webServer` running `pnpm dev`,
  `reuseExistingServer: !process.env.CI`, `baseURL` `http://localhost:3000`.
- `pnpm exec playwright install` for browser binaries.
- Scripts: `test`, `test:watch`, `test:e2e`.
- `.gitignore`: `.vitest/` (v5 moved reporter output there), `/test-results/`,
  `/playwright-report/`.

Node 22.23.2 and pnpm 11.15.0 clear Vitest 5's Node 22 floor.

**Wave 1 — foundation.** `shared/labels/{registry,resolve,compose}.ts`,
`shared/zod-schemas/label.ts`, `LabelOverride` model + `pnpm db:push`,
`routers/label.ts` + root registration, `hooks/use-labels.ts`, layout prefetch.

**Wave 2 — split the maps.** `column-map.ts` keeps key arrays, sheds Turkish.
`enum-map.ts` sheds `auditAction` / `resourceType`.

**Wave 3 — entity pages.** For each of the three entities: `columns.tsx`,
`page-client.tsx`, `create-dialog.tsx`, `view-dialog.tsx`, `filter-controls.tsx`,
plus MGK's `edit-dialog.tsx` (including the Üye Sayısı fix). `createColumns`
gains a labels parameter, which carries the Excel export and the column-visibility
dropdown along for free — both read `columnDef.header`.

**Wave 4 — everything else naming an entity.** `sidebar-nav.tsx`,
`command-palette.tsx`, `settings/page.tsx` and its four table/dialog files,
`dashboard/page.tsx` (h2 + the `Ziyaret Sıralaması — Satış Temsilcileri` card),
`business-group-alerts.tsx` (`Renk Dağılımı — Meslek Grupları`),
`account-{sheet,visits-list,business-groups-list}.tsx`, `users/view-dialog.tsx`,
and the three `audit-logs/` files.

**Wave 5 — the editor.** `settings/labels-card.tsx` and the settings page layout
change.

## Verification

**Types carry most of the weight.** The registry is typed so each entity's field
list must cover exactly that entity's column key set — miss one and
`pnpm typecheck` fails rather than shipping a blank header.

`pnpm typecheck` and `pnpm check` clean after every wave.

**Unit (vitest)** — `resolve.ts` and `compose.ts` are pure with no I/O:

- `resolve`: overrides layer over defaults; an override equal to its default is a
  no-op; an empty-string override falls back to the default; unknown keys in the
  DB are ignored rather than crashing the panel.
- `compose`: every composer for every entity; and **exhaustiveness** — every
  `AuditAction` and `resourceType` key produces a non-empty string, so the
  generated maps cannot silently lose an entry the hand-written ones had.
- **Registry invariants**: each entity's field list covers exactly its column key
  set; positions are contiguous; every `inheritsFrom` points at a real entity;
  editable keys are globally unique.
- The server-side key validator rejects keys outside the registry's editable set.

**E2E (playwright)** — one spec: log in as admin -> Ayarlar -> Etiketler ->
rename a field, an entity's çoğul, and a page title -> Kaydet -> assert the
change landed in the nav item, table title, column header, search-scope dropdown,
create dialog and edit dialog -> create a record and assert its audit row uses
the new tekil -> `Varsayılanları Getir` + Kaydet -> assert full revert.

**Accepted cost:** there is no test database. The E2E spec runs against whatever
`DATABASE_URL` points at and writes real rows. It reverts its own labels and
deletes its own record, but it is not isolated. Accepted deliberately; adding a
test DB is out of scope for this feature.
