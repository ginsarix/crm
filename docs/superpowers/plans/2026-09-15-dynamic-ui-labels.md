# Dynamic, Admin-Editable UI Labels — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let admins rename column headers, form labels, table titles, page titles and nav items at runtime, with today's hardcoded Turkish as the default, and route all display text through one resolver.

**Architecture:** A static registry holds every default plus metadata (order, required, inheritance). A `LabelOverride` table stores *only* what an admin changed. A pure `resolve()` layers overrides over defaults; a pure `compose()` derives every other wording (nav, table title, dialog titles, audit strings) from each entity's tekil/çoğul pair. Labels reach server components via `await api.label.get()` and client components via a `useLabels()` hook seeded with compiled-in defaults.

**Tech Stack:** Next.js 16 App Router · tRPC 11 · Prisma 6 (PostgreSQL) · React Hook Form + Zod · shadcn/ui · Vitest 5 · Playwright 1.63

**Spec:** `docs/superpowers/specs/2026-09-15-dynamic-ui-labels-design.md`

## Global Constraints

- **Package manager is `pnpm`.** Never `npm`. Prefix with `COREPACK_ENABLE_STRICT=0` if corepack complains.
- **Prisma client is imported from `generated/prisma`**, never `@prisma/client`. After a schema change run `pnpm db:push` (never `db:generate` — this repo has no migration history) and restart the dev server.
- **Import alias `~/*` -> `./src/*`.**
- **All UI text is Turkish.** Turkish common nouns take suffixes with **no apostrophe**: `Formda Zorunlu`, `Meslek Grubundan`, `Satış Temsilcisinden` — never `Form'da` / `Meslek Grubu'ndan`.
- **Shared Zod schemas live in `src/shared/zod-schemas/`** and are used by both router inputs and React Hook Form. Never inline a schema in a router or a form.
- **`tsconfig.json` sets `noUncheckedIndexedAccess: true`.** Type every label record with a precise key union (`Record<CustomerCardFieldKey, string>`), never `Record<string, string>`, or every lookup widens to `string | undefined`.
- **Biome formatting:** single quotes, 2-space indent. Biome's assist sorts imports **and JSX attributes alphabetically** — run `pnpm check:write` before committing rather than hand-sorting.
- **Verification after every task:** `pnpm typecheck` must be clean. `pnpm check` currently fails on **pre-existing** issues (`src/app/panel/users/report-device-breakdown.tsx` unused imports, `src/app/_components/data-table.tsx:516` a11y, `src/app/panel/changelog/page.tsx` two rules, `src/app/panel/visits/columns.tsx:113` non-null assertion, `biome.jsonc:41` deprecated key). Do **not** fix those here. Confirm your own files are not in the output.
- **`src/lib/column-map.ts` key arrays are a schema contract.** Five routers build Zod enums from it (`customer-card`, `visit`, `business-group-card`, `user`, `user-report`). Keys stay static; only the Turkish strings move.
- **The required asterisk is never part of a label.** Form components append `*` from the registry's `required` flag.
- Node 22.23.2 / pnpm 11.15.0 are installed and clear Vitest 5's Node 22 floor.

---

### Task 1: Test infrastructure

Vitest 5.0.1 and @playwright/test 1.63.0 are already in `devDependencies` (commit `9f629ba`) but nothing is configured, and **`vite` is missing** — Vitest 5 declares it as a peer dependency (`^6.4.0 || ^7.0.0 || ^8.0.0`), not a regular one, so under pnpm's strict layout `vitest` will not start. Next 16 does not provide one.

**Files:**
- Modify: `package.json` (scripts + `vite` devDependency)
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Modify: `.gitignore`
- Create: `src/shared/labels/smoke.test.ts` (deleted in Step 8)

**Interfaces:**
- Consumes: nothing
- Produces: `pnpm test` runs Vitest over `src/**/*.test.ts`; `pnpm test:e2e` runs Playwright over `e2e/**/*.spec.ts`.

- [ ] **Step 1: Install the missing peer dependency**

```bash
pnpm add -D vite
```

- [ ] **Step 2: Create `vitest.config.ts`**

`environment: 'node'` — every module under test is pure, no DOM. The `include` is scoped to `src/` so Playwright's `e2e/` specs are never picked up by Vitest (they import `test` from `@playwright/test` and would fail under Vitest).

```ts
import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '~': resolve(import.meta.dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
```

- [ ] **Step 3: Create `playwright.config.ts`**

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:3000',
  },
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
```

- [ ] **Step 4: Add scripts to `package.json`**

Insert into `"scripts"`, keeping the existing alphabetical ordering:

```json
"test": "vitest run",
"test:e2e": "playwright test",
"test:watch": "vitest",
```

- [ ] **Step 5: Extend `.gitignore`**

Vitest 5 moved reporter output to `.vitest/`. Append under the existing `# testing` section:

```
.vitest/
/test-results/
/playwright-report/
```

- [ ] **Step 6: Install Playwright browsers**

```bash
pnpm exec playwright install
```

- [ ] **Step 7: Write a smoke test and prove the harness runs**

Create `src/shared/labels/smoke.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

describe('vitest harness', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

Run: `pnpm test`
Expected: 1 passed. If it errors with a missing `vite` module, Step 1 did not take.

- [ ] **Step 8: Delete the smoke test and commit**

```bash
rm src/shared/labels/smoke.test.ts
pnpm typecheck
pnpm check:write
git add package.json pnpm-lock.yaml vitest.config.ts playwright.config.ts .gitignore
git commit -m "chore: configure vitest and playwright"
```

---

### Task 2: Label types and the entity/page registry

**Files:**
- Create: `src/shared/labels/types.ts`
- Create: `src/shared/labels/registry.ts`
- Test: `src/shared/labels/registry.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `EntityKey`, `PageKey`, `FieldEntityKey`, `SectionKey`, `FieldDefinition`, `EntityDefinition`, `ResolvedLabels`, `LabelKey`
  - `entities: Record<EntityKey, EntityDefinition>`
  - `pages: Record<PageKey, { title: string; editable: boolean }>`

- [ ] **Step 1: Write `src/shared/labels/types.ts`**

`FieldDefinition` is a discriminated union on `kind`. `inherited` takes the source entity's **singular**. `composed` renders `{entity singular} {that entity's field label}` — used only by Ziyaretler's two borrowed columns.

```ts
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
  | 'sira' | 'name' | 'sicil' | 'businessGroup' | 'address' | 'district'
  | 'region' | 'gsm1' | 'contact1' | 'gsm2' | 'contact2' | 'gsm3' | 'contact3'
  | 'authorities' | 'salesRepresentative' | 'status' | 'authorizationDocument'
  | 'vote' | 'color' | 'note';

export type VisitFieldKey =
  | 'customerCardId' | 'salesRepresentativeId' | 'date' | 'time' | 'via'
  | 'note' | 'customerCardName' | 'customerCardGsm';

export type BusinessGroupCardFieldKey =
  | 'meclisSayisi' | 'meclis1' | 'meclis2' | 'meclis3' | 'uyeSayisi'
  | 'baskan' | 'baskanYardimcisi' | 'uye1' | 'uye2' | 'uye3' | 'uye4' | 'uye5'
  | 'yedekUye1' | 'yedekUye2' | 'yedekUye3' | 'yedekUye4' | 'yedekUye5'
  | 'yedekUye6' | 'yedekUye7' | 'businessGroupName';

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
```

- [ ] **Step 2: Write the entity and page tables in `src/shared/labels/registry.ts`**

`businessGroupCard` is deliberately an **independent** pair — renaming `businessGroup` must not rename it.

```ts
import type {
  EntityDefinition,
  EntityKey,
  PageKey,
} from './types';

export const entities: Record<EntityKey, EntityDefinition> = {
  customerCard: {
    singular: 'Cari Kartı',
    plural: 'Cari Kartları',
    editable: true,
  },
  visit: { singular: 'Ziyaret', plural: 'Ziyaretler', editable: true },
  businessGroupCard: {
    singular: 'Meslek Grubu Kartı',
    plural: 'Meslek Grubu Kartları',
    editable: true,
  },
  businessGroup: {
    singular: 'Meslek Grubu',
    plural: 'Meslek Grupları',
    editable: true,
  },
  salesRepresentative: {
    singular: 'Satış Temsilcisi',
    plural: 'Satış Temsilcileri',
    editable: true,
  },
  user: { singular: 'Kullanıcı', plural: 'Kullanıcılar', editable: false },
  announcement: { singular: 'Duyuru', plural: 'Duyurular', editable: false },
  auditLog: {
    singular: 'Denetim Kaydı',
    plural: 'Denetim Kayıtları',
    editable: false,
  },
};

export const pages: Record<PageKey, { title: string; editable: boolean }> = {
  dashboard: { title: 'Panel', editable: true },
  settings: { title: 'Ayarlar', editable: true },
  users: { title: 'Kullanıcılar', editable: false },
  announcements: { title: 'Duyurular', editable: false },
  auditLogs: { title: 'Denetim Kayıtları', editable: false },
  changelog: { title: 'Sürüm Notları', editable: false },
};
```

- [ ] **Step 3: Write the failing test**

Create `src/shared/labels/registry.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { entities, pages } from './registry';

describe('entity registry', () => {
  it('marks exactly the five renameable entities as editable', () => {
    const editable = Object.entries(entities)
      .filter(([, e]) => e.editable)
      .map(([k]) => k)
      .sort();

    expect(editable).toEqual([
      'businessGroup',
      'businessGroupCard',
      'customerCard',
      'salesRepresentative',
      'visit',
    ]);
  });

  it('gives every entity a non-empty tekil and çoğul', () => {
    for (const [key, entity] of Object.entries(entities)) {
      expect(entity.singular, `${key}.singular`).not.toBe('');
      expect(entity.plural, `${key}.plural`).not.toBe('');
    }
  });

  it('keeps businessGroupCard independent of businessGroup', () => {
    expect(entities.businessGroupCard.singular).not.toContain(
      `${entities.businessGroup.singular} Kartı`.slice(0, 0),
    );
    expect(entities.businessGroupCard.editable).toBe(true);
  });
});

describe('page registry', () => {
  it('marks only Panel and Ayarlar as editable', () => {
    const editable = Object.entries(pages)
      .filter(([, p]) => p.editable)
      .map(([k]) => k)
      .sort();

    expect(editable).toEqual(['dashboard', 'settings']);
  });
});
```

- [ ] **Step 4: Run the test**

Run: `pnpm test src/shared/labels/registry.test.ts`
Expected: PASS (the registry was written in Step 2).

- [ ] **Step 5: Commit**

```bash
pnpm typecheck && pnpm check:write
git add src/shared/labels/
git commit -m "feat: add label registry types and entity/page defaults"
```

---

### Task 3: Field and section registries

**Files:**
- Modify: `src/shared/labels/registry.ts`
- Test: `src/shared/labels/registry.test.ts`

**Interfaces:**
- Consumes: `FieldDefinition`, `FieldEntityKey`, `SectionKey` from Task 2
- Produces:
  - `fields: Record<FieldEntityKey, FieldDefinition[]>` — array order **is** the admin-facing numbering
  - `sections: Record<SectionKey, string>`
  - `sectionOrder: SectionKey[]`
  - `systemFieldLabels: { id: string; createdAt: string; updatedAt: string }`

- [ ] **Step 1: Append the field lists to `src/shared/labels/registry.ts`**

Order is taken from each entity's **edit/view dialog** (the dialog with the complete field set), because that order is what the admin sees numbered.

```ts
import type { FieldRegistry, SectionKey } from './types';

export const systemFieldLabels = {
  id: 'ID',
  createdAt: 'Oluşturulma Tarihi',
  updatedAt: 'Güncellenme Tarihi',
} as const;

export const fields: FieldRegistry = {
  customerCard: [
    { kind: 'editable', key: 'sira', default: 'Sıra', required: false },
    { kind: 'editable', key: 'name', default: 'Ünvan', required: true },
    { kind: 'editable', key: 'sicil', default: 'Sicil', required: false },
    { kind: 'inherited', key: 'businessGroup', from: 'businessGroup' },
    { kind: 'editable', key: 'address', default: 'Adres', required: false },
    { kind: 'editable', key: 'district', default: 'İlçe', required: false },
    { kind: 'editable', key: 'region', default: 'Bölge', required: false },
    { kind: 'editable', key: 'gsm1', default: 'GSM 1', required: false },
    { kind: 'editable', key: 'contact1', default: 'İletişim 1', required: false },
    { kind: 'editable', key: 'gsm2', default: 'GSM 2', required: false },
    { kind: 'editable', key: 'contact2', default: 'İletişim 2', required: false },
    { kind: 'editable', key: 'gsm3', default: 'GSM 3', required: false },
    { kind: 'editable', key: 'contact3', default: 'İletişim 3', required: false },
    { kind: 'editable', key: 'authorities', default: 'Yetkililer', required: false },
    {
      kind: 'inherited',
      key: 'salesRepresentative',
      from: 'salesRepresentative',
    },
    { kind: 'editable', key: 'status', default: 'Durum', required: false },
    {
      kind: 'editable',
      key: 'authorizationDocument',
      default: 'Yetki Belge',
      required: false,
    },
    { kind: 'editable', key: 'vote', default: 'Oy', required: false },
    { kind: 'editable', key: 'color', default: 'Renk', required: false },
    { kind: 'editable', key: 'note', default: 'Not', required: false },
  ],
  visit: [
    { kind: 'inherited', key: 'customerCardId', from: 'customerCard' },
    {
      kind: 'inherited',
      key: 'salesRepresentativeId',
      from: 'salesRepresentative',
    },
    { kind: 'editable', key: 'date', default: 'Tarih', required: true },
    { kind: 'editable', key: 'time', default: 'Saat', required: false },
    { kind: 'editable', key: 'via', default: 'İletişim Türü', required: false },
    { kind: 'editable', key: 'note', default: 'Not', required: false },
    {
      kind: 'composed',
      key: 'customerCardName',
      fromEntity: 'customerCard',
      fromField: 'name',
    },
    {
      kind: 'composed',
      key: 'customerCardGsm',
      fromEntity: 'customerCard',
      fromField: 'gsm1',
    },
  ],
  businessGroupCard: [
    { kind: 'editable', key: 'meclisSayisi', default: 'Meclis Sayısı', required: false },
    { kind: 'editable', key: 'meclis1', default: 'Meclis 1', required: false },
    { kind: 'editable', key: 'meclis2', default: 'Meclis 2', required: false },
    { kind: 'editable', key: 'meclis3', default: 'Meclis 3', required: false },
    { kind: 'editable', key: 'uyeSayisi', default: 'Üye Sayısı', required: false },
    { kind: 'editable', key: 'baskan', default: 'Komite 1', required: false },
    { kind: 'editable', key: 'baskanYardimcisi', default: 'Komite 2', required: false },
    { kind: 'editable', key: 'uye1', default: 'Komite 3', required: false },
    { kind: 'editable', key: 'uye2', default: 'Komite 4', required: false },
    { kind: 'editable', key: 'uye3', default: 'Meclis Yedek 1', required: false },
    { kind: 'editable', key: 'uye4', default: 'Meclis Yedek 2', required: false },
    { kind: 'editable', key: 'uye5', default: 'Meclis Yedek 3', required: false },
    { kind: 'editable', key: 'yedekUye1', default: 'Komite Yedek 1', required: false },
    { kind: 'editable', key: 'yedekUye2', default: 'Komite Yedek 2', required: false },
    { kind: 'editable', key: 'yedekUye3', default: 'Komite Yedek 3', required: false },
    { kind: 'editable', key: 'yedekUye4', default: 'Komite Yedek 4', required: false },
    { kind: 'editable', key: 'yedekUye5', default: 'Yedek Üye 5', required: false },
    { kind: 'editable', key: 'yedekUye6', default: 'Yedek Üye 6', required: false },
    { kind: 'editable', key: 'yedekUye7', default: 'Yedek Üye 7', required: false },
    { kind: 'inherited', key: 'businessGroupName', from: 'businessGroup' },
  ],
};

export const sectionOrder: SectionKey[] = [
  'meclis',
  'komite',
  'meclisYedek',
  'komiteYedek',
  'yedekUyeler',
];

export const sections: Record<SectionKey, string> = {
  meclis: 'Meclis',
  komite: 'Komite',
  meclisYedek: 'Meclis Yedek',
  komiteYedek: 'Komite Yedek',
  yedekUyeler: 'Yedek Üyeler',
};
```

- [ ] **Step 2: Write the failing invariant tests**

The load-bearing one is the third: **every non-system column key must have a registry entry**, or a column ships with a blank header. The reverse containment is deliberately *not* asserted — form-only fields like `customerCardId` have no column.

Append to `src/shared/labels/registry.test.ts`:

```ts
import { columnMap } from '~/lib/column-map';
import { entities, fields, sectionOrder, sections } from './registry';
import type { FieldEntityKey } from './types';

const SYSTEM_KEYS = ['id', 'createdAt', 'updatedAt'];

describe('field registry', () => {
  it('has no duplicate keys within an entity', () => {
    for (const [entity, list] of Object.entries(fields)) {
      const keys = list.map((f) => f.key);
      expect(new Set(keys).size, `${entity} has duplicate keys`).toBe(
        keys.length,
      );
    }
  });

  it('points every inherited and composed field at a real entity', () => {
    for (const list of Object.values(fields)) {
      for (const field of list) {
        if (field.kind === 'inherited') {
          expect(entities[field.from]).toBeDefined();
        }
        if (field.kind === 'composed') {
          expect(entities[field.fromEntity]).toBeDefined();
          const source = fields[field.fromEntity as FieldEntityKey];
          expect(source.some((f) => f.key === field.fromField)).toBe(true);
        }
      }
    }
  });

  it('covers every non-system column key', () => {
    const entityKeys: FieldEntityKey[] = [
      'customerCard',
      'visit',
      'businessGroupCard',
    ];

    for (const entity of entityKeys) {
      const registered = new Set(fields[entity].map((f) => f.key));
      const columns = Object.keys(columnMap[entity]).filter(
        (k) => !SYSTEM_KEYS.includes(k),
      );

      for (const column of columns) {
        expect(registered.has(column), `${entity}.${column} missing`).toBe(true);
      }
    }
  });
});

describe('section registry', () => {
  it('orders exactly the defined sections', () => {
    expect([...sectionOrder].sort()).toEqual(Object.keys(sections).sort());
  });
});
```

- [ ] **Step 3: Run the tests**

Run: `pnpm test src/shared/labels/registry.test.ts`
Expected: PASS. A failure on "covers every non-system column key" means a key in `column-map.ts` has no registry entry — add it rather than weakening the test.

- [ ] **Step 4: Commit**

```bash
pnpm typecheck && pnpm check:write
git add src/shared/labels/
git commit -m "feat: add field and section label registries"
```

---

### Task 4: The resolver

**Files:**
- Create: `src/shared/labels/resolve.ts`
- Test: `src/shared/labels/resolve.test.ts`
- Modify: `src/shared/labels/types.ts` (add `ResolvedLabels`, `LabelKey`)

**Interfaces:**
- Consumes: `entities`, `fields`, `pages`, `sections`, `systemFieldLabels` from Tasks 2-3
- Produces:
  - `resolveLabels(overrides: Record<string, string>): ResolvedLabels`
  - `editableLabelKeys: ReadonlySet<string>`
  - `defaultLabelValues: Record<string, string>` — every editable key mapped to its default
  - `DEFAULT_LABELS: ResolvedLabels` — `resolveLabels({})`, used as the client hook's `initialData`
  - `ResolvedLabels` shape:

```ts
export type ResolvedLabels = {
  entity: Record<EntityKey, EntityLabels>;
  field: FieldLabels;
  section: Record<SectionKey, string>;
  page: Record<PageKey, string>;
  system: { id: string; createdAt: string; updatedAt: string };
};
```

  - `labelValues(labels: ResolvedLabels): Record<string, string>` — every editable key mapped to its *current* value (the mirror of `defaultLabelValues`; the editor seeds its draft from this)
  - `fieldLabel(labels, entity, key): string` — lookup by a runtime string key, falling back through system fields. Filter controls iterate `columnMap` keys as plain strings, which the precise unions would otherwise reject.

- [ ] **Step 1: Add `ResolvedLabels` and the key helpers to `types.ts`**

Override key format, used verbatim as the `LabelOverride.key` primary key:

```
entity.<EntityKey>.singular
entity.<EntityKey>.plural
field.<FieldEntityKey>.<fieldKey>
section.<SectionKey>
page.<PageKey>.title
```

```ts
import type {
  EntityKey,
  FieldEntityKey,
  FieldLabels,
  PageKey,
  SectionKey,
} from './types';

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
```

- [ ] **Step 2: Write the failing tests**

Create `src/shared/labels/resolve.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LABELS,
  defaultLabelValues,
  editableLabelKeys,
  fieldLabel,
  labelValues,
  resolveLabels,
} from './resolve';

describe('resolveLabels', () => {
  it('returns defaults when there are no overrides', () => {
    const labels = resolveLabels({});
    expect(labels.entity.customerCard.singular).toBe('Cari Kartı');
    expect(labels.entity.customerCard.plural).toBe('Cari Kartları');
    expect(labels.field.customerCard.name).toBe('Ünvan');
    expect(labels.page.settings).toBe('Ayarlar');
    expect(labels.system.createdAt).toBe('Oluşturulma Tarihi');
  });

  it('layers an override over its default', () => {
    const labels = resolveLabels({ 'field.customerCard.name': 'Firma Adı' });
    expect(labels.field.customerCard.name).toBe('Firma Adı');
    expect(labels.field.customerCard.sicil).toBe('Sicil');
  });

  it('falls back to the default for an empty-string override', () => {
    const labels = resolveLabels({ 'field.customerCard.name': '   ' });
    expect(labels.field.customerCard.name).toBe('Ünvan');
  });

  it('ignores unknown keys instead of throwing', () => {
    expect(() =>
      resolveLabels({ 'field.customerCard.doesNotExist': 'x' }),
    ).not.toThrow();
    expect(() => resolveLabels({ garbage: 'x' })).not.toThrow();
  });

  it('resolves an inherited field from its source entity singular', () => {
    const labels = resolveLabels({ 'entity.businessGroup.singular': 'Sektör' });
    expect(labels.field.customerCard.businessGroup).toBe('Sektör');
    expect(labels.field.businessGroupCard.businessGroupName).toBe('Sektör');
  });

  it('does not let businessGroup rename businessGroupCard', () => {
    const labels = resolveLabels({ 'entity.businessGroup.singular': 'Sektör' });
    expect(labels.entity.businessGroupCard.singular).toBe('Meslek Grubu Kartı');
  });

  it('resolves a composed field from both its entity and its field', () => {
    const labels = resolveLabels({});
    expect(labels.field.visit.customerCardName).toBe('Cari Kartı Ünvan');
    expect(labels.field.visit.customerCardGsm).toBe('Cari Kartı GSM 1');
  });

  it('reflects a renamed source field in the composed column', () => {
    const labels = resolveLabels({ 'field.customerCard.name': 'Firma Adı' });
    expect(labels.field.visit.customerCardName).toBe('Cari Kartı Firma Adı');
  });

  it('ignores an override on a non-editable entity', () => {
    const labels = resolveLabels({ 'entity.user.singular': 'Hesap' });
    expect(labels.entity.user.singular).toBe('Kullanıcı');
  });
});

describe('editableLabelKeys', () => {
  it('includes editable entities, fields, sections and pages', () => {
    expect(editableLabelKeys.has('entity.customerCard.singular')).toBe(true);
    expect(editableLabelKeys.has('field.customerCard.name')).toBe(true);
    expect(editableLabelKeys.has('section.komite')).toBe(true);
    expect(editableLabelKeys.has('page.settings.title')).toBe(true);
  });

  it('excludes static entities, pages, inherited and composed fields', () => {
    expect(editableLabelKeys.has('entity.user.singular')).toBe(false);
    expect(editableLabelKeys.has('page.users.title')).toBe(false);
    expect(editableLabelKeys.has('field.customerCard.businessGroup')).toBe(
      false,
    );
    expect(editableLabelKeys.has('field.visit.customerCardName')).toBe(false);
  });
});

describe('defaultLabelValues', () => {
  it('has a non-empty default for every editable key', () => {
    for (const key of editableLabelKeys) {
      expect(defaultLabelValues[key], key).toBeTruthy();
    }
  });
});

describe('DEFAULT_LABELS', () => {
  it('equals resolving with no overrides', () => {
    expect(DEFAULT_LABELS).toEqual(resolveLabels({}));
  });
});

describe('labelValues', () => {
  it('equals the defaults when nothing is overridden', () => {
    expect(labelValues(DEFAULT_LABELS)).toEqual(defaultLabelValues);
  });

  it('reflects an override', () => {
    const labels = resolveLabels({ 'field.customerCard.name': 'Firma Adı' });
    expect(labelValues(labels)['field.customerCard.name']).toBe('Firma Adı');
  });

  it('covers exactly the editable keys', () => {
    expect(Object.keys(labelValues(DEFAULT_LABELS)).sort()).toEqual(
      [...editableLabelKeys].sort(),
    );
  });
});

describe('fieldLabel', () => {
  it('resolves a normal field', () => {
    expect(fieldLabel(DEFAULT_LABELS, 'customerCard', 'name')).toBe('Ünvan');
  });

  it('falls through to system fields', () => {
    expect(fieldLabel(DEFAULT_LABELS, 'customerCard', 'createdAt')).toBe(
      'Oluşturulma Tarihi',
    );
  });

  it('returns the key itself for something unknown', () => {
    expect(fieldLabel(DEFAULT_LABELS, 'customerCard', 'nope')).toBe('nope');
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `pnpm test src/shared/labels/resolve.test.ts`
Expected: FAIL — `Failed to resolve import "./resolve"`.

- [ ] **Step 4: Write `src/shared/labels/resolve.ts`**

Resolution order matters: entities first (fields inherit from them), then editable fields, then inherited/composed fields (which read the already-resolved values).

```ts
import {
  entities,
  fields,
  pages,
  sections,
  systemFieldLabels,
} from './registry';
import {
  entityLabelKey,
  fieldLabelKey,
  pageLabelKey,
  sectionLabelKey,
} from './types';
import type {
  EntityKey,
  EntityLabels,
  FieldEntityKey,
  PageKey,
  ResolvedLabels,
  SectionKey,
} from './types';

const FIELD_ENTITY_KEYS: FieldEntityKey[] = [
  'customerCard',
  'visit',
  'businessGroupCard',
];

/** An override only counts if it has non-whitespace content. */
const pick = (override: string | undefined, fallback: string) => {
  const trimmed = override?.trim();
  return trimmed ? trimmed : fallback;
};

export const editableLabelKeys: ReadonlySet<string> = new Set([
  ...Object.entries(entities)
    .filter(([, entity]) => entity.editable)
    .flatMap(([key]) => [
      entityLabelKey(key as EntityKey, 'singular'),
      entityLabelKey(key as EntityKey, 'plural'),
    ]),
  ...FIELD_ENTITY_KEYS.flatMap((entity) =>
    fields[entity]
      .filter((field) => field.kind === 'editable')
      .map((field) => fieldLabelKey(entity, field.key)),
  ),
  ...Object.keys(sections).map((key) => sectionLabelKey(key as SectionKey)),
  ...Object.entries(pages)
    .filter(([, page]) => page.editable)
    .map(([key]) => pageLabelKey(key as PageKey)),
]);

export const defaultLabelValues: Record<string, string> = {
  ...Object.fromEntries(
    Object.entries(entities).flatMap(([key, entity]) => [
      [entityLabelKey(key as EntityKey, 'singular'), entity.singular],
      [entityLabelKey(key as EntityKey, 'plural'), entity.plural],
    ]),
  ),
  ...Object.fromEntries(
    FIELD_ENTITY_KEYS.flatMap((entity) =>
      fields[entity]
        .filter((field) => field.kind === 'editable')
        .map((field) => [fieldLabelKey(entity, field.key), field.default]),
    ),
  ),
  ...Object.fromEntries(
    Object.entries(sections).map(([key, value]) => [
      sectionLabelKey(key as SectionKey),
      value,
    ]),
  ),
  ...Object.fromEntries(
    Object.entries(pages).map(([key, page]) => [
      pageLabelKey(key as PageKey),
      page.title,
    ]),
  ),
};

export function resolveLabels(
  overrides: Record<string, string>,
): ResolvedLabels {
  /** Only keys the registry marks editable may be overridden. */
  const override = (key: string) =>
    editableLabelKeys.has(key) ? overrides[key] : undefined;

  const entity = {} as Record<EntityKey, EntityLabels>;
  for (const [key, definition] of Object.entries(entities)) {
    const entityKey = key as EntityKey;
    entity[entityKey] = {
      singular: pick(
        override(entityLabelKey(entityKey, 'singular')),
        definition.singular,
      ),
      plural: pick(
        override(entityLabelKey(entityKey, 'plural')),
        definition.plural,
      ),
    };
  }

  // Built as a loose record because the two passes below key in by runtime
  // string, then cast once at the return. FieldLabels' precise unions are what
  // every consumer sees.
  const field = {} as Record<FieldEntityKey, Record<string, string>>;

  // Pass 1: editable fields. Pass 2 reads these, so it must come first.
  for (const entityKey of FIELD_ENTITY_KEYS) {
    const resolved: Record<string, string> = {};
    for (const definition of fields[entityKey]) {
      if (definition.kind === 'editable') {
        resolved[definition.key] = pick(
          override(fieldLabelKey(entityKey, definition.key)),
          definition.default,
        );
      }
    }
    field[entityKey] = resolved;
  }

  // Pass 2: inherited and composed fields.
  for (const entityKey of FIELD_ENTITY_KEYS) {
    for (const definition of fields[entityKey]) {
      if (definition.kind === 'inherited') {
        field[entityKey][definition.key] = entity[definition.from].singular;
      }
      if (definition.kind === 'composed') {
        const sourceEntity = entity[definition.fromEntity].singular;
        const sourceField =
          field[definition.fromEntity as FieldEntityKey][definition.fromField];
        field[entityKey][definition.key] = `${sourceEntity} ${sourceField}`;
      }
    }
  }

  const section = {} as Record<SectionKey, string>;
  for (const [key, value] of Object.entries(sections)) {
    const sectionKey = key as SectionKey;
    section[sectionKey] = pick(override(sectionLabelKey(sectionKey)), value);
  }

  const page = {} as Record<PageKey, string>;
  for (const [key, definition] of Object.entries(pages)) {
    const pageKey = key as PageKey;
    page[pageKey] = pick(override(pageLabelKey(pageKey)), definition.title);
  }

  return {
    entity,
    field: field as ResolvedLabels['field'],
    section,
    page,
    system: systemFieldLabels,
  };
}

export const DEFAULT_LABELS: ResolvedLabels = resolveLabels({});

/** Every editable key mapped to its current value. Mirror of defaultLabelValues. */
export function labelValues(labels: ResolvedLabels): Record<string, string> {
  const values: Record<string, string> = {};

  for (const [key, entity] of Object.entries(entities)) {
    const entityKey = key as EntityKey;
    values[entityLabelKey(entityKey, 'singular')] =
      labels.entity[entityKey].singular;
    values[entityLabelKey(entityKey, 'plural')] = labels.entity[entityKey].plural;
  }

  for (const entityKey of FIELD_ENTITY_KEYS) {
    const resolved = labels.field[entityKey] as Record<string, string>;
    for (const definition of fields[entityKey]) {
      values[fieldLabelKey(entityKey, definition.key)] = resolved[definition.key];
    }
  }

  for (const key of Object.keys(sections)) {
    values[sectionLabelKey(key as SectionKey)] = labels.section[key as SectionKey];
  }

  for (const key of Object.keys(pages)) {
    values[pageLabelKey(key as PageKey)] = labels.page[key as PageKey];
  }

  return Object.fromEntries(
    Object.entries(values).filter(([key]) => editableLabelKeys.has(key)),
  );
}

/**
 * Look a field label up by a runtime string key. Filter controls iterate
 * `columnMap` keys as plain strings, which the precise unions would reject,
 * and those lists include the three system keys.
 */
export function fieldLabel(
  labels: ResolvedLabels,
  entity: FieldEntityKey,
  key: string,
): string {
  const entityFields = labels.field[entity] as Record<string, string | undefined>;
  const system = labels.system as Record<string, string | undefined>;
  return entityFields[key] ?? system[key] ?? key;
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm test src/shared/labels/`
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
pnpm typecheck && pnpm check:write
git add src/shared/labels/
git commit -m "feat: add the label resolver"
```

---

### Task 5: Composition

**Files:**
- Create: `src/shared/labels/compose.ts`
- Test: `src/shared/labels/compose.test.ts`

**Interfaces:**
- Consumes: `ResolvedLabels`, `EntityLabels` from Tasks 2-4
- Produces:
  - `labelCompose` — `{ nav, tableTitle, create, edit, view, created, updated, deleted }`, each `(e: EntityLabels) => string`
  - `auditActionLabels(labels: ResolvedLabels): Record<AuditActionKey, string>`
  - `resourceTypeLabels(labels: ResolvedLabels): Record<ResourceTypeKey, string>`
  - `AuditActionKey`, `ResourceTypeKey`

- [ ] **Step 1: Write the failing tests**

The exhaustiveness tests are the point: the generated maps must not silently lose an entry the hand-written ones had.

Create `src/shared/labels/compose.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  auditActionLabels,
  labelCompose,
  resourceTypeLabels,
} from './compose';
import { DEFAULT_LABELS, resolveLabels } from './resolve';

const EXPECTED_AUDIT_ACTIONS = [
  'USER_CREATED', 'USER_UPDATED', 'USER_DELETED', 'USER_LOGIN', 'USER_LOGOUT',
  'CUSTOMER_CARD_CREATED', 'CUSTOMER_CARD_UPDATED', 'CUSTOMER_CARD_DELETED',
  'VISIT_CREATED', 'VISIT_UPDATED', 'VISIT_DELETED',
  'SETTINGS_UPDATED', 'PASSWORD_CHANGED', 'EMAIL_CHANGED', 'ROLE_CHANGED',
  'BUSINESS_GROUP_CREATED', 'BUSINESS_GROUP_UPDATED', 'BUSINESS_GROUP_DELETED',
  'BUSINESS_GROUP_CARD_UPDATED',
  'SALES_REPRESENTATIVE_CREATED', 'SALES_REPRESENTATIVE_UPDATED',
  'SALES_REPRESENTATIVE_DELETED',
  'ANNOUNCEMENT_CREATED', 'ANNOUNCEMENT_UPDATED', 'ANNOUNCEMENT_RESCHEDULED',
  'ANNOUNCEMENT_PUBLISHED', 'ANNOUNCEMENT_DELETED',
  'LABEL_UPDATED',
];

const EXPECTED_RESOURCE_TYPES = [
  'USER', 'CUSTOMER_CARD', 'VISIT', 'SETTINGS', 'PASSWORD', 'EMAIL', 'ROLE',
  'BUSINESS_GROUP', 'BUSINESS_GROUP_CARD', 'SALES_REPRESENTATIVE',
  'ANNOUNCEMENT', 'LABEL',
];

describe('labelCompose', () => {
  const customerCard = DEFAULT_LABELS.entity.customerCard;

  it('composes every wording from the tekil/çoğul pair', () => {
    expect(labelCompose.nav(customerCard)).toBe('Cari Kartları');
    expect(labelCompose.tableTitle(customerCard)).toBe('Cari Kartları');
    expect(labelCompose.create(customerCard)).toBe('Cari Kartı Ekle');
    expect(labelCompose.edit(customerCard)).toBe('Cari Kartı Düzenle');
    expect(labelCompose.view(customerCard)).toBe('Cari Kartı Görüntüle');
    expect(labelCompose.created(customerCard)).toBe('Cari Kartı Oluşturuldu');
    expect(labelCompose.updated(customerCard)).toBe('Cari Kartı Güncellendi');
    expect(labelCompose.deleted(customerCard)).toBe('Cari Kartı Silindi');
  });
});

describe('auditActionLabels', () => {
  it('covers exactly the known actions', () => {
    const actual = Object.keys(auditActionLabels(DEFAULT_LABELS)).sort();
    expect(actual).toEqual([...EXPECTED_AUDIT_ACTIONS].sort());
  });

  it('produces a non-empty string for every action', () => {
    for (const [key, value] of Object.entries(
      auditActionLabels(DEFAULT_LABELS),
    )) {
      expect(value, key).toBeTruthy();
    }
  });

  it('reproduces the previous hardcoded wording by default', () => {
    const actions = auditActionLabels(DEFAULT_LABELS);
    expect(actions.CUSTOMER_CARD_CREATED).toBe('Cari Kartı Oluşturuldu');
    expect(actions.VISIT_DELETED).toBe('Ziyaret Silindi');
    expect(actions.BUSINESS_GROUP_UPDATED).toBe('Meslek Grubu Güncellendi');
    expect(actions.SETTINGS_UPDATED).toBe('Ayarlar Güncellendi');
    expect(actions.USER_LOGIN).toBe('Kullanıcı Girişi');
    expect(actions.PASSWORD_CHANGED).toBe('Parola Değiştirildi');
  });

  it('follows a renamed entity', () => {
    const labels = resolveLabels({
      'entity.customerCard.singular': 'Firma Kartı',
    });
    expect(auditActionLabels(labels).CUSTOMER_CARD_CREATED).toBe(
      'Firma Kartı Oluşturuldu',
    );
  });

  it('follows a renamed Ayarlar page title', () => {
    const labels = resolveLabels({ 'page.settings.title': 'Tercihler' });
    expect(auditActionLabels(labels).SETTINGS_UPDATED).toBe(
      'Tercihler Güncellendi',
    );
  });
});

describe('resourceTypeLabels', () => {
  it('covers exactly the known resource types', () => {
    const actual = Object.keys(resourceTypeLabels(DEFAULT_LABELS)).sort();
    expect(actual).toEqual([...EXPECTED_RESOURCE_TYPES].sort());
  });

  it('reproduces the previous hardcoded wording by default', () => {
    const types = resourceTypeLabels(DEFAULT_LABELS);
    expect(types.CUSTOMER_CARD).toBe('Cari Kartı');
    expect(types.BUSINESS_GROUP_CARD).toBe('Meslek Grubu Kartı');
    expect(types.SETTINGS).toBe('Ayarlar');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test src/shared/labels/compose.test.ts`
Expected: FAIL — `Failed to resolve import "./compose"`.

- [ ] **Step 3: Write `src/shared/labels/compose.ts`**

```ts
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
    SALES_REPRESENTATIVE: entity.salesRepresentative.singular,
    ANNOUNCEMENT: entity.announcement.singular,
    LABEL: 'Etiket',
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test src/shared/labels/`
Expected: all PASS. If "reproduces the previous hardcoded wording" fails, compare against `src/lib/enum-map.ts` — that file is still the source of truth until Task 8.

- [ ] **Step 5: Commit**

```bash
pnpm typecheck && pnpm check:write
git add src/shared/labels/
git commit -m "feat: derive audit action and resource type labels from entity names"
```

---

### Task 6: Storage, schema and the label router

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `src/shared/zod-schemas/label.ts`
- Create: `src/server/api/routers/label.ts`
- Modify: `src/server/api/root.ts`
- Test: `src/shared/zod-schemas/label.test.ts`

**Interfaces:**
- Consumes: `editableLabelKeys`, `resolveLabels` from Task 4
- Produces:
  - `api.label.get` -> `ResolvedLabels` (protected)
  - `api.label.update` -> `{ success: true }` (admin), input `{ values: Record<string, string | null> }`
  - `LabelUpdateSchema`, `LABEL_MAX_LENGTH`

- [ ] **Step 1: Add the model to `prisma/schema.prisma`**

Append after the `SalesRepresentative` model:

```prisma
model LabelOverride {
  key         String   @id
  value       String
  updatedAt   DateTime @updatedAt
  updatedById String?
}
```

- [ ] **Step 2: Push the schema and regenerate the client**

```bash
pnpm db:push
```

Expected: `Your database is now in sync with your Prisma schema.` Restart any running dev server so it picks up the regenerated client from `generated/prisma`.

- [ ] **Step 3: Write the shared Zod schema**

Create `src/shared/zod-schemas/label.ts`:

```ts
import { z } from 'zod';
import { editableLabelKeys } from '~/shared/labels/resolve';

export const LABEL_MAX_LENGTH = 60;

export const LabelValueSchema = z
  .string()
  .trim()
  .max(LABEL_MAX_LENGTH, `Etiket en fazla ${LABEL_MAX_LENGTH} karakter olabilir`);

export const LabelUpdateSchema = z.object({
  values: z.record(z.string(), LabelValueSchema.nullable()),
});
```

**Why not `z.record(z.string().refine(...), ...)`:** this repo is on Zod 3.25.76,
where wrapping a record's key schema in `.refine()` produces a `ZodEffects`,
which `z.record` does not run as a key validator — unknown keys would slip
through silently. Validate the keys explicitly instead:

```ts
export const LabelUpdateSchema = z
  .object({
    values: z.record(z.string(), LabelValueSchema.nullable()),
  })
  .superRefine((input, ctx) => {
    for (const key of Object.keys(input.values)) {
      if (!editableLabelKeys.has(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['values', key],
          message: 'Bilinmeyen etiket anahtarı',
        });
      }
    }
  });
```

Use the `superRefine` version. The plain `z.object` above is shown only to make
the contrast explicit — do not ship it.

- [ ] **Step 4: Write the failing schema test**

Create `src/shared/zod-schemas/label.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { LabelUpdateSchema } from './label';

describe('LabelUpdateSchema', () => {
  it('accepts a known editable key', () => {
    const result = LabelUpdateSchema.safeParse({
      values: { 'field.customerCard.name': 'Firma Adı' },
    });
    expect(result.success).toBe(true);
  });

  it('accepts null as a reset', () => {
    const result = LabelUpdateSchema.safeParse({
      values: { 'field.customerCard.name': null },
    });
    expect(result.success).toBe(true);
  });

  it('rejects a key outside the registry', () => {
    const result = LabelUpdateSchema.safeParse({
      values: { 'field.customerCard.nope': 'x' },
    });
    expect(result.success).toBe(false);
  });

  it('rejects a key that exists but is not editable', () => {
    const result = LabelUpdateSchema.safeParse({
      values: { 'entity.user.singular': 'Hesap' },
    });
    expect(result.success).toBe(false);
  });

  it('rejects a value over the length limit', () => {
    const result = LabelUpdateSchema.safeParse({
      values: { 'field.customerCard.name': 'x'.repeat(61) },
    });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 5: Run the test**

Run: `pnpm test src/shared/zod-schemas/label.test.ts`
Expected: PASS.

- [ ] **Step 6: Write the router**

A value equal to its default is persisted as a **delete**, so "reset" and "never touched" converge and future default improvements still reach it.

Create `src/server/api/routers/label.ts`:

```ts
import { LabelUpdateSchema } from '~/shared/zod-schemas/label';
import { defaultLabelValues, resolveLabels } from '~/shared/labels/resolve';
import { adminProcedure, createAuditLog, createTRPCRouter, protectedProcedure } from '../trpc';

export const labelRouter = createTRPCRouter({
  get: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.labelOverride.findMany();
    const overrides = Object.fromEntries(
      rows.map((row) => [row.key, row.value]),
    );
    return resolveLabels(overrides);
  }),

  update: adminProcedure
    .input(LabelUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const toDelete: string[] = [];
      const toUpsert: { key: string; value: string }[] = [];

      for (const [key, value] of Object.entries(input.values)) {
        const trimmed = value?.trim() ?? '';
        // Empty means "use the default", and a value equal to the default
        // is stored as absence so improved defaults keep reaching it.
        if (!trimmed || trimmed === defaultLabelValues[key]) {
          toDelete.push(key);
        } else {
          toUpsert.push({ key, value: trimmed });
        }
      }

      try {
        await ctx.db.$transaction([
          ctx.db.labelOverride.deleteMany({ where: { key: { in: toDelete } } }),
          ...toUpsert.map((row) =>
            ctx.db.labelOverride.upsert({
              where: { key: row.key },
              update: { value: row.value, updatedById: ctx.session.user.id },
              create: { ...row, updatedById: ctx.session.user.id },
            }),
          ),
        ]);
      } catch (error) {
        await createAuditLog(
          ctx,
          'LABEL_UPDATED',
          'LABEL',
          'labels',
          'FAILURE',
          error instanceof Error ? error.message : 'Bilinmeyen hata',
        );
        throw error;
      }

      await createAuditLog(
        ctx,
        'LABEL_UPDATED',
        'LABEL',
        'labels',
        'SUCCESS',
        undefined,
        `${toUpsert.length} etiket güncellendi, ${toDelete.length} etiket varsayılana döndürüldü`,
      );

      return { success: true as const };
    }),
});
```

- [ ] **Step 7: Register the router in `src/server/api/root.ts`**

Add the import alongside the others and `label: labelRouter,` to the `createTRPCRouter({...})` object. Biome's assist will sort the import; run `pnpm check:write`.

```ts
import { labelRouter } from '~/server/api/routers/label';
```

- [ ] **Step 8: Verify and commit**

```bash
pnpm typecheck && pnpm test && pnpm check:write
git add prisma/schema.prisma src/shared/zod-schemas/label.ts src/shared/labels/ src/server/api/routers/label.ts src/server/api/root.ts
git commit -m "feat: add LabelOverride storage and the label router"
```

---

### Task 7: Delivery — the `useLabels` hook and layout prefetch

**Files:**
- Create: `src/hooks/use-labels.ts`
- Modify: `src/app/panel/layout.tsx`

**Interfaces:**
- Consumes: `api.label.get` from Task 6, `DEFAULT_LABELS` from Task 4
- Produces: `useLabels(): ResolvedLabels` — always a fully-shaped object, never `undefined`, so no downstream optional chaining

- [ ] **Step 1: Write the hook**

`initialData` seeded with the compiled-in defaults is what removes the undefined-on-first-render problem: worst case a user sees defaults for a few ms, never a blank header. Labels change approximately never, so `staleTime` is long.

Create `src/hooks/use-labels.ts`:

```ts
'use client';

import { DEFAULT_LABELS } from '~/shared/labels/resolve';
import type { ResolvedLabels } from '~/shared/labels/types';
import { api } from '~/trpc/react';

export function useLabels(): ResolvedLabels {
  const { data } = api.label.get.useQuery(undefined, {
    initialData: DEFAULT_LABELS,
    staleTime: 5 * 60 * 1000,
  });

  return data;
}
```

- [ ] **Step 2: Prefetch in the panel layout**

`src/app/panel/layout.tsx` is a server component. Add the prefetch before the return and wrap the existing tree in `HydrateClient`:

```tsx
import { api, HydrateClient } from '~/trpc/server';

export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get('sidebar_state')?.value === 'true';

  void api.label.get.prefetch();

  return (
    <HydrateClient>
      <SidebarProvider defaultOpen={defaultOpen}>
        {/* ...existing tree unchanged... */}
      </SidebarProvider>
    </HydrateClient>
  );
}
```

- [ ] **Step 3: Verify it renders**

```bash
pnpm dev
```

Open `http://localhost:3000/panel/dashboard`, confirm the page renders and the browser console has no errors. Stop the server.

- [ ] **Step 4: Commit**

```bash
pnpm typecheck && pnpm check:write
git add src/hooks/use-labels.ts src/app/panel/layout.tsx
git commit -m "feat: deliver resolved labels to the panel"
```

---

### Task 8: Reduce `column-map.ts` to keys and retire the audit maps

**Files:**
- Modify: `src/lib/column-map.ts`, `src/lib/enum-map.ts`
- Modify: `src/server/api/routers/customer-card.ts`, `visit.ts`, `business-group-card.ts`, `user.ts`, `user-report.ts`
- Modify: `src/app/panel/customer-cards/filter-controls.tsx`, `src/app/panel/visits/filter-controls.tsx` + `page-client.tsx`, `src/app/panel/business-group-cards/filter-controls.tsx` + `page-client.tsx`, `src/app/panel/users/filter-controls.tsx`
- Modify: `src/app/panel/audit-logs/columns.tsx`, `view-dialog.tsx`, `filter-controls.tsx`
- Modify: `src/app/panel/dashboard/page.tsx`
- Modify: `src/shared/labels/registry.test.ts`

**Interfaces:**
- Consumes: `fieldLabel` (Task 4), `auditActionLabels` / `resourceTypeLabels` (Task 5), `useLabels` (Task 7)
- Produces: `columnMap` as `Record<entity, readonly string[]>`; `enum-map.ts` no longer exports `auditAction` or `resourceType`

**This is one task, not two, because the two halves are the same edit:** `column-map.ts` and `enum-map.ts` each hold *keys* the server depends on tangled with *Turkish* the client renders. Both get untangled here so Tasks 9-11 consume only the final shape.

- [ ] **Step 1: Delete the dead `getColumnName` helper**

Run: `grep -rn "getColumnName" src`
Expected: only its definition in `src/lib/column-map.ts`. Delete it.

- [ ] **Step 2: Reduce `columnMap` to key arrays**

Order is preserved so the diff stays reviewable — the routers depend on the key *set*, not the order.

```ts
export const columnMap = {
  auditLog: ['id', 'action', 'resourceType', 'resourceId', 'result', 'error', 'details', 'userId', 'createdAt'],
  customerCard: ['id', 'sira', 'name', 'sicil', 'address', 'district', 'region', 'gsm1', 'contact1', 'gsm2', 'contact2', 'gsm3', 'contact3', 'businessGroup', 'color', 'status', 'authorizationDocument', 'vote', 'authorities', 'salesRepresentative', 'note', 'createdAt', 'updatedAt'],
  user: ['id', 'name', 'email', 'emailVerified', 'image', 'createdAt', 'updatedAt'],
  visit: ['id', 'date', 'time', 'via', 'note', 'createdAt', 'updatedAt'],
  businessGroupCard: ['id', 'businessGroupName', 'uyeSayisi', 'meclisSayisi', 'meclis1', 'meclis2', 'meclis3', 'baskan', 'baskanYardimcisi', 'uye1', 'uye2', 'uye3', 'uye4', 'uye5', 'yedekUye1', 'yedekUye2', 'yedekUye3', 'yedekUye4', 'yedekUye5', 'yedekUye6', 'yedekUye7', 'createdAt', 'updatedAt'],
} as const;
```

- [ ] **Step 3: Update the five routers**

`Object.keys(columnMap.X)` becomes `columnMap.X`. Spread into `z.enum` still needs a mutable array, so spread as before:

```ts
// src/server/api/routers/customer-card.ts:36 and business-group-card.ts:14, user.ts:22, user-report.ts:9, visit.ts:24
searchScope: z.enum(['all', ...columnMap.customerCard]).default('all'),
```

```ts
// src/server/api/routers/customer-card.ts:23 and visit.ts:17
const emptyFields = columnMap.customerCard.filter(/* ...existing predicate... */);
```

- [ ] **Step 4: Update the type positions**

Four files use `keyof typeof columnMap.X` as a type. With an array that becomes an indexed access:

```ts
type VisitSearchScope = 'all' | (typeof columnMap.visit)[number];
```

Apply in `src/app/panel/visits/page-client.tsx:30,60`, `src/app/panel/visits/filter-controls.tsx:16,18`, `src/app/panel/business-group-cards/page-client.tsx:19`, `src/app/panel/business-group-cards/filter-controls.tsx:15`.

- [ ] **Step 5: Update the four `filter-controls.tsx` files to resolve labels**

Each currently builds options from `Object.entries(columnMap.X)`. The keys now come from the array and the label from the resolver:

```tsx
const labels = useLabels();

const scopeOptions = [
  { key: 'all', label: 'Tümü' },
  ...columnMap.customerCard.map((key) => ({
    key,
    label: fieldLabel(labels, 'customerCard', key),
  })),
];
```

`src/app/panel/users/filter-controls.tsx:27` is the exception — `user` is a static entity with no field registry, so keep its labels hardcoded in that file rather than routing them through `fieldLabel`.

- [ ] **Step 6: Remove `auditAction` and `resourceType` from `src/lib/enum-map.ts`**

Delete those two exported consts. Keep `status`, `authorizationDocument`, `vote` and `auditResult` — enum *values*, not field labels, and out of scope.

- [ ] **Step 7: Update the four consumers of the removed maps**

```tsx
const labels = useLabels();
const auditAction = auditActionLabels(labels);
const resourceType = resourceTypeLabels(labels);
```

- `src/app/panel/audit-logs/columns.tsx` — `createColumns` is not a component, so thread `labels` in as a parameter (same shape as Tasks 9-11) rather than calling the hook inside it.
- `src/app/panel/audit-logs/view-dialog.tsx` and `filter-controls.tsx` — components, call `useLabels()` directly.
- `src/app/panel/dashboard/page.tsx:330` — a **server component**. Use `const labels = await api.label.get();` and `auditActionLabels(labels)`, not the hook.

- [ ] **Step 8: Update the registry invariant test**

In `src/shared/labels/registry.test.ts`, `Object.keys(columnMap[entity])` becomes `columnMap[entity]`:

```ts
const columns = columnMap[entity].filter((k) => !SYSTEM_KEYS.includes(k));
```

- [ ] **Step 9: Verify**

Run: `pnpm typecheck`
Expected: clean. Every error here names a `columnMap` consumer missed above — the compiler is enumerating the blast radius for you.

Run: `pnpm test`
Expected: all PASS, including "covers every non-system column key".

- [ ] **Step 10: Commit**

```bash
pnpm check:write
git add src/lib/ src/server/api/routers/ src/app/panel/ src/shared/labels/
git commit -m "refactor: reduce column-map to keys and derive audit text from labels"
```

---

### Task 9: Cari Kartları

**Files:**
- Modify: `src/app/panel/customer-cards/columns.tsx`, `page-client.tsx`, `create-dialog.tsx`, `view-dialog.tsx`, `filter-controls.tsx`

**Interfaces:**
- Consumes: `useLabels` (Task 7), `labelCompose` (Task 5)
- Produces: `createColumns(labels: ResolvedLabels, onViewCustomerCard: (c: CustomerCardRow) => void): ColumnDef<CustomerCardRow>[]`

**Why the signature change carries extra weight:** `src/app/_components/data-table.tsx` reads `columnDef.header` for both the Excel export (line ~248) and the column-visibility dropdown (line ~417). Putting the resolved string in `header` makes both follow automatically — no separate work.

- [ ] **Step 1: Thread labels into `columns.tsx`**

Change the signature and replace every `header:` string. `labels.field.customerCard.<key>` is typed `string` (not `string | undefined`) because the record uses a precise key union.

Keep every existing `cell` / `accessorFn` / `size` / `enableResizing` property
exactly as it is — only the `header` value changes. The column order in this
file is *not* the registry order, and must stay as it is; the registry order
drives the editor's numbering, not the table.

```tsx
export const createColumns = (
  labels: ResolvedLabels,
  onViewCustomerCard: (customerCard: CustomerCardRow) => void,
): ColumnDef<CustomerCardRow>[] => {
  const f = labels.field.customerCard;

  return [
    { id: 'actions', size: 60, enableResizing: false, cell: /* unchanged, except the two menu strings below */ },
    { accessorKey: 'sira', header: f.sira, enableSorting: true },
    { accessorKey: 'name', header: f.name, enableSorting: true },
    { accessorKey: 'authorities', header: f.authorities, enableSorting: true },
    { accessorKey: 'gsm1', header: f.gsm1, enableSorting: true },
    { accessorKey: 'contact1', header: f.contact1, enableSorting: true },
    { accessorKey: 'sicil', header: f.sicil, enableSorting: true },
    { accessorKey: 'address', header: f.address, enableSorting: true },
    { accessorKey: 'district', header: f.district, enableSorting: true, cell: /* unchanged */ },
    { accessorKey: 'region', header: f.region, enableSorting: true },
    { accessorKey: 'gsm2', header: f.gsm2, enableSorting: true },
    { accessorKey: 'contact2', header: f.contact2, enableSorting: true },
    { accessorKey: 'gsm3', header: f.gsm3, enableSorting: true },
    { accessorKey: 'contact3', header: f.contact3, enableSorting: true },
    { accessorKey: 'businessGroup', header: f.businessGroup, enableSorting: true },
    { accessorKey: 'color', header: f.color, enableSorting: true, accessorFn: /* unchanged */ },
    { accessorKey: 'status', header: f.status, enableSorting: true, cell: /* unchanged */ },
    { accessorKey: 'authorizationDocument', header: f.authorizationDocument, enableSorting: true, cell: /* unchanged */ },
    { accessorKey: 'vote', header: f.vote, enableSorting: true, cell: /* unchanged */ },
    { accessorKey: 'salesRepresentative', header: f.salesRepresentative, enableSorting: true },
    { accessorKey: 'note', header: f.note, enableSorting: true },
    { accessorKey: 'createdAt', header: labels.system.createdAt, enableSorting: true, cell: /* unchanged */ },
    { accessorKey: 'updatedAt', header: labels.system.updatedAt, enableSorting: true, cell: /* unchanged */ },
  ];
};
```

`businessGroup` and `salesRepresentative` resolve to the shared entities' tekil,
so renaming Meslek Grubu or Satış Temsilcisi renames these two headers.

In the actions dropdown, replace the two hardcoded strings:

```tsx
{customerCard.isRestricted
  ? labelCompose.view(labels.entity.customerCard)
  : labelCompose.edit(labels.entity.customerCard)}
```

and

```tsx
<Link href={`/panel/visits?customerCardId=${customerCard.id}`}>
  {labelCompose.nav(labels.entity.visit)}
</Link>
```

- [ ] **Step 2: Update `page-client.tsx`**

Add `const labels = useLabels();` inside the component, pass it to `createColumns(labels, handleView)`, and replace the table title at line ~383:

```tsx
<CardTitle className="mr-auto">
  {labelCompose.tableTitle(labels.entity.customerCard)}
</CardTitle>
```

- [ ] **Step 3: Update `create-dialog.tsx`**

Add `const labels = useLabels();`. Replace the dialog title, every `<Label>` text, and every placeholder. The asterisk is appended from the registry's `required` flag, never typed into a label:

```tsx
<DialogTitle>{labelCompose.create(labels.entity.customerCard)}</DialogTitle>
```

```tsx
<Label htmlFor="sira">{labels.field.customerCard.sira}</Label>
<Input {...register('sira')} id="sira" placeholder={labels.field.customerCard.sira} />

<Label htmlFor="name">{labels.field.customerCard.name} *</Label>
<Input {...register('name')} id="name" placeholder={labels.field.customerCard.name} />
```

Placeholders derive from the label, so `"Sıra no"` becomes `"Sıra"` and `"Sicil no"` becomes `"Sicil"` — an accepted loss so placeholders cannot go stale when a label is renamed.

Update the success and error toasts to compose from the entity:

```tsx
toast.success(`${labels.entity.customerCard.singular} başarıyla eklendi`);
toast.error(`${labels.entity.customerCard.singular} eklenirken bir hata oluştu`);
```

- [ ] **Step 4: Update `view-dialog.tsx`**

Same treatment. The title at line ~181 becomes:

```tsx
{canEdit
  ? labelCompose.edit(labels.entity.customerCard)
  : labelCompose.view(labels.entity.customerCard)}
```

- [ ] **Step 5: Update `filter-controls.tsx`**

The search-scope and empty-field dropdowns currently build options from `Object.entries(columnMap.customerCard)` (lines ~83 and ~147). Keep iterating `columnMap.customerCard` for the **keys** — that is the router's Zod contract — but take the label from the resolver:

```tsx
const labels = useLabels();

const scopeOptions = [
  { key: 'all', label: 'Tümü' },
  ...columnMap.customerCard.map((key) => ({
    key,
    label: fieldLabel(labels, 'customerCard', key),
  })),
];
```

`fieldLabel` (Task 4) is what makes this compile: `columnMap` keys are plain
strings, which `labels.field.customerCard` — typed with a precise key union —
would reject, and those lists include the three system keys that live under
`labels.system` rather than `labels.field`.


- [ ] **Step 6: Verify in the running app**

```bash
pnpm dev
```

At `/panel/customer-cards` confirm: table title reads `Cari Kartları`; column headers unchanged; the create dialog title reads `Cari Kartı Ekle`; the search-scope dropdown lists every field. Export to Excel and confirm the header row matches. Stop the server.

- [ ] **Step 7: Commit**

```bash
pnpm typecheck && pnpm test && pnpm check:write
git add src/app/panel/customer-cards/
git commit -m "refactor: source Cari Kartları display text from the label resolver"
```

---

### Task 10: Ziyaretler

**Files:**
- Modify: `src/app/panel/visits/columns.tsx`, `page-client.tsx`, `create-dialog.tsx`, `view-dialog.tsx`, `filter-controls.tsx`, `related-visits-dialog.tsx`

**Interfaces:**
- Consumes: `useLabels`, `labelCompose`
- Produces: `createColumns(labels: ResolvedLabels, ...existing params)` for visits

- [ ] **Step 1: Thread labels into `columns.tsx`**

The two borrowed columns use the **composed** entries, which already read `{Cari Kartı tekil} {that field's label}`:

```tsx
{ header: labels.field.visit.customerCardName, /* ...existing cell... */ },
{ header: labels.field.visit.customerCardGsm, /* ...existing cell... */ },
{ accessorKey: 'date', header: labels.field.visit.date, enableSorting: true },
{ accessorKey: 'time', header: labels.field.visit.time, enableSorting: true },
{ accessorKey: 'via', header: labels.field.visit.via, enableSorting: true, /* cell unchanged */ },
{ accessorKey: 'note', header: labels.field.visit.note, enableSorting: true },
{ accessorKey: 'createdAt', header: labels.system.createdAt, /* ... */ },
{ accessorKey: 'updatedAt', header: labels.system.updatedAt, /* ... */ },
```

Defaults shift here: `Müşteri Ünvanı` -> `Cari Kartı Ünvan`, `Müşteri GSM` -> `Cari Kartı GSM 1`. Intended.

- [ ] **Step 2: Update `page-client.tsx`**

`const labels = useLabels();`, pass to `createColumns`, and the table title at line ~225:

```tsx
<CardTitle className="mr-auto">
  {labelCompose.tableTitle(labels.entity.visit)}
</CardTitle>
```

- [ ] **Step 3: Update `create-dialog.tsx` and `view-dialog.tsx`**

Labels, in form order — note positions 1 and 2 are **inherited**, so they render the source entity's tekil:

```tsx
<Label htmlFor="customerCardId">{labels.field.visit.customerCardId} *</Label>
<Label htmlFor="salesRepresentativeId">{labels.field.visit.salesRepresentativeId}</Label>
<Label htmlFor="date">{labels.field.visit.date} *</Label>
<Label htmlFor="time">{labels.field.visit.time}</Label>
<Label htmlFor="via">{labels.field.visit.via}</Label>
<Label htmlFor="note">{labels.field.visit.note}</Label>
```

Two default shifts, both intended: `Müşteri Kartı` -> `Cari Kartı`, and the edit dialog's `Saat *` -> `Saat`. The latter is a **fix** — `time` is optional in `VisitCreateSchema`, so the asterisk was wrong; driving it from the registry's `required` flag corrects it by construction. Do not add `*` to `time`.

Dialog titles:

```tsx
<DialogTitle>{labelCompose.create(labels.entity.visit)}</DialogTitle>
```

```tsx
{canEdit
  ? labelCompose.edit(labels.entity.visit)
  : labelCompose.view(labels.entity.visit)}
```

- [ ] **Step 4: Update `filter-controls.tsx` and `related-visits-dialog.tsx`**

Same `columnMap.visit` keys + resolver labels pattern as Task 9 Step 5, substituting `labels.field.visit`. In `related-visits-dialog.tsx` replace any hardcoded `Ziyaret` / `Ziyaretler` with `labels.entity.visit.singular` / `labelCompose.nav(labels.entity.visit)`.

- [ ] **Step 5: Verify in the running app**

`pnpm dev`, then at `/panel/visits` confirm the table title, the two borrowed column headers now reading `Cari Kartı Ünvan` / `Cari Kartı GSM 1`, the `İletişim Türü` column, and that the edit dialog's Saat field has **no** asterisk. Stop the server.

- [ ] **Step 6: Commit**

```bash
pnpm typecheck && pnpm test && pnpm check:write
git add src/app/panel/visits/
git commit -m "refactor: source Ziyaretler display text from the label resolver"
```

---

### Task 11: Meslek Grubu Kartları

**Files:**
- Modify: `src/app/panel/business-group-cards/columns.tsx`, `page-client.tsx`, `edit-dialog.tsx`, `filter-controls.tsx`

**Interfaces:**
- Consumes: `useLabels`, `labelCompose`, `sectionOrder` (Task 3)
- Produces: `createColumns(labels: ResolvedLabels, ...existing params)` for business group cards

- [ ] **Step 1: Thread labels into `columns.tsx`**

```tsx
{ accessorKey: 'businessGroupName', header: labels.field.businessGroupCard.businessGroupName, /* ... */ },
{ accessorKey: 'uyeSayisi', header: labels.field.businessGroupCard.uyeSayisi, /* ... */ },
{ accessorKey: 'meclisSayisi', header: labels.field.businessGroupCard.meclisSayisi, /* ... */ },
{ accessorKey: 'updatedAt', header: labels.system.updatedAt, /* ... */ },
{ accessorKey: 'createdAt', header: labels.system.createdAt, /* ... */ },
```

`businessGroupName` is an **inherited** field — it resolves to `labels.entity.businessGroup.singular`, so renaming Meslek Grubu renames this header.

- [ ] **Step 2: Replace `FIELD_GROUPS` and `FIELD_LABELS` in `edit-dialog.tsx`**

Both module-level consts are now redundant with the registry. Replace `FIELD_GROUPS` with a keyed structure so section titles come from the resolver:

```tsx
const FIELD_GROUPS: { key: SectionKey; fields: (keyof Committee)[] }[] = [
  { key: 'meclis', fields: ['meclis1', 'meclis2', 'meclis3'] },
  { key: 'komite', fields: ['baskan', 'baskanYardimcisi', 'uye1', 'uye2'] },
  { key: 'meclisYedek', fields: ['uye3', 'uye4', 'uye5'] },
  {
    key: 'komiteYedek',
    fields: ['yedekUye1', 'yedekUye2', 'yedekUye3', 'yedekUye4'],
  },
  { key: 'yedekUyeler', fields: ['yedekUye5', 'yedekUye6', 'yedekUye7'] },
];
```

Delete `FIELD_LABELS` entirely. In the render, replace the three usages:

```tsx
<h4 className="font-medium text-sm">{labels.section[group.key]}</h4>
```

```tsx
<Label htmlFor={field}>{labels.field.businessGroupCard[field]}</Label>
```

And the two count inputs — note the guards now key off `group.key`, not the display title, which is what made the Üye Sayısı input disappear when the titles were renamed in `2422fd7` (fixed in `58b3230`). Keying off a stable identifier instead of display text prevents the whole class of bug:

```tsx
{group.key === 'meclis' && (
  <div className="space-y-2">
    <Label htmlFor="meclisSayisi">
      {labels.field.businessGroupCard.meclisSayisi}
    </Label>
    {/* ...Select unchanged... */}
  </div>
)}
{group.key === 'komite' && (
  <div className="space-y-2">
    <Label htmlFor="uyeSayisi">
      {labels.field.businessGroupCard.uyeSayisi}
    </Label>
    {/* ...Input unchanged... */}
  </div>
)}
```

Also update the dialog title at line ~150:

```tsx
{businessGroupCard.businessGroupName} — {labels.entity.businessGroupCard.singular}
```

- [ ] **Step 3: Update `page-client.tsx` and `filter-controls.tsx`**

Table title at line ~69:

```tsx
<CardTitle className="mr-auto">
  {labelCompose.tableTitle(labels.entity.businessGroupCard)}
</CardTitle>
```

`filter-controls.tsx` follows the Task 9 Step 5 pattern with `labels.field.businessGroupCard`.

- [ ] **Step 4: Verify in the running app**

`pnpm dev`, then at `/panel/business-group-cards` open a card's edit dialog. Confirm all five section headings render, **Meclis Sayısı appears above the Meclis group and Üye Sayısı above the Komite group**, and every committee field label matches the Komite / Meclis Yedek / Komite Yedek naming. Stop the server.

- [ ] **Step 5: Commit**

```bash
pnpm typecheck && pnpm test && pnpm check:write
git add src/app/panel/business-group-cards/
git commit -m "refactor: source Meslek Grubu Kartları display text from the label resolver"
```

---

### Task 12: Navigation, settings, dashboard and the remaining entity-naming sites

**Files:**
- Modify: `src/app/panel/_components/sidebar-nav.tsx`, `command-palette.tsx`, `business-group-alerts.tsx`, `account-sheet.tsx`, `account-visits-list.tsx`, `account-business-groups-list.tsx`
- Modify: `src/app/panel/settings/page.tsx`, `business-groups-table.tsx`, `sale-representatives-table.tsx`
- Modify: `src/app/panel/dashboard/page.tsx`
- Modify: `src/app/panel/users/view-dialog.tsx`

**Interfaces:**
- Consumes: `useLabels`, `labelCompose`, `api.label.get`
- Produces: no new exports

- [ ] **Step 1: Make the nav items dynamic in `sidebar-nav.tsx`**

`navigationItems`, `adminItems` and `settingsItems` are module-level consts holding hardcoded titles. Move the title out of the const and resolve it at render. Keep icons and hrefs in the const:

```tsx
const navigationItems = [
  { key: 'dashboard', icon: Home, href: '/panel/dashboard' },
  { key: 'customerCard', icon: BookUser, href: '/panel/customer-cards' },
  { key: 'visit', icon: Calendar, href: '/panel/visits' },
  {
    key: 'businessGroupCard',
    icon: Building2,
    href: '/panel/business-group-cards',
    adminOnly: true,
  },
] as const;
```

Inside the component, resolve each to a title — pages use `labels.page`, entities use `labelCompose.nav`:

```tsx
const labels = useLabels();

const titleFor = (key: string) =>
  key === 'dashboard'
    ? labels.page.dashboard
    : key === 'settings'
      ? labels.page.settings
      : key === 'users'
        ? labels.page.users
        : key === 'announcements'
          ? labels.page.announcements
          : key === 'auditLogs'
            ? labels.page.auditLogs
            : labelCompose.nav(
                labels.entity[key as keyof typeof labels.entity],
              );
```

Then use `titleFor(item.key)` in both the `tooltip` prop and the `<span>`.

- [ ] **Step 2: Apply the same to `command-palette.tsx`**

It holds a parallel list of the same titles (lines ~31-57). Use the identical `key` + `titleFor` approach so the palette and the sidebar can never disagree.

- [ ] **Step 3: Update the settings page**

`src/app/panel/settings/page.tsx` is a server component — use the caller, not the hook:

```tsx
const labels = await api.label.get();
```

```tsx
<h2 className="font-bold text-3xl tracking-tight">{labels.page.settings}</h2>
```

In `sale-representatives-table.tsx` (line ~111) and `business-groups-table.tsx` (line ~75) — both client components — the card titles become the shared entities' çoğul:

```tsx
<CardTitle className="sm:mr-auto">
  {labelCompose.tableTitle(labels.entity.salesRepresentative)}
</CardTitle>
```

```tsx
<CardTitle className="mr-auto">
  {labelCompose.tableTitle(labels.entity.businessGroup)}
</CardTitle>
```

**Do not** touch the columns of these two tables — `sale-representatives-columns.tsx` and `business-groups-columns.tsx` stay hardcoded (`Ad`, `Durum`, the timestamps). That is deliberate scope.

- [ ] **Step 4: Update the dashboard**

`src/app/panel/dashboard/page.tsx` is a server component; it already gained `const labels = await api.label.get();` in Task 8 Step 3. Now also replace:

```tsx
<h2 className="font-bold text-3xl tracking-tight">{labels.page.dashboard}</h2>
```

and line ~154:

```tsx
{labelCompose.nav(labels.entity.visit)} Sıralaması — {labelCompose.tableTitle(labels.entity.salesRepresentative)}
```

Audit the remaining `CardTitle` strings in this file and replace any that name an entity.

- [ ] **Step 5: Update the remaining Meslek Grupları / Ziyaretler mentions**

- `business-group-alerts.tsx:104` — `Renk Dağılımı — {labelCompose.tableTitle(labels.entity.businessGroup)}`
- `account-business-groups-list.tsx:26` — `Atanmış {labelCompose.tableTitle(labels.entity.businessGroup)}`
- `account-visits-list.tsx:35` — `Oluşturduğum {labelCompose.nav(labels.entity.visit)}`
- `account-sheet.tsx:126` — `Oluşturduğu {labelCompose.nav(labels.entity.visit)}`
- `account-sheet.tsx:147` — `Atanmış {labelCompose.tableTitle(labels.entity.businessGroup)}`
- `users/view-dialog.tsx:407` and `:437` — `{labelCompose.tableTitle(labels.entity.businessGroup)}` and `{labelCompose.tableTitle(labels.entity.businessGroup)}nı Kaydet`

- [ ] **Step 6: Verify**

Run: `pnpm typecheck && pnpm test`
Expected: clean, all PASS.

- [ ] **Step 7: Verify in the running app**

`pnpm dev`. Walk every panel page and confirm no blank titles or nav items. Stop the server.

- [ ] **Step 8: Commit**

```bash
pnpm check:write
git add src/
git commit -m "refactor: source navigation, settings and dashboard text from the label resolver"
```

---

### Task 13: The Etiketler editor

**Files:**
- Create: `src/app/panel/settings/labels-card.tsx`
- Create: `src/app/panel/settings/label-field-row.tsx`
- Modify: `src/app/panel/settings/page.tsx`

**Interfaces:**
- Consumes: `api.label.update` (Task 6), `useLabels` (Task 7), `entities`/`fields`/`pages`/`sections`/`sectionOrder` (Tasks 2-3), `defaultLabelValues` (Task 4)
- Produces: `<LabelsCard />` — admin-only

- [ ] **Step 1: Build the row component**

Create `src/app/panel/settings/label-field-row.tsx`. Three visual states: editable (input + reset), inherited (read-only + source badge), composed (read-only + source badge).

```tsx
'use client';

import { RotateCcw } from 'lucide-react';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';

type LabelFieldRowProps = {
  id: string;
  position: number;
  /** 'Formda Zorunlu' | 'Formda Opsiyonel' | 'Meslek Grubundan' | ... */
  badge: string;
  defaultValue: string;
  /** Read-only rows (inherited/composed) pass undefined. */
  value?: string;
  onChange?: (value: string) => void;
  onReset?: () => void;
  unit?: string;
};

export function LabelFieldRow({
  badge,
  defaultValue,
  id,
  onChange,
  onReset,
  position,
  unit = 'Alan',
  value,
}: LabelFieldRowProps) {
  const readOnly = onChange === undefined;

  return (
    <div className="flex items-center gap-3">
      <Label className="w-40 shrink-0 text-sm" htmlFor={id}>
        {position}. {unit}
      </Label>
      <Badge className="w-40 shrink-0 justify-center" variant="secondary">
        {badge}
      </Badge>
      {readOnly ? (
        <span className="flex-1 text-muted-foreground text-sm">
          {defaultValue}
        </span>
      ) : (
        <>
          <Input
            className="flex-1"
            id={id}
            onChange={(e) => onChange(e.target.value)}
            placeholder={defaultValue}
            value={value ?? ''}
          />
          <Button
            aria-label="Varsayılanı Getir"
            onClick={onReset}
            size="icon"
            type="button"
            variant="ghost"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Build the card with its four tabs**

Create `src/app/panel/settings/labels-card.tsx`.

**The draft state lives in this component, not in each tab.** That is what makes
switching tabs non-destructive — Radix unmounts an inactive `TabsContent`, but
the edits are held one level up, so nothing is lost and `forceMount` is not
needed.

```tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { useLabels } from '~/hooks/use-labels';
import { labelCompose } from '~/shared/labels/compose';
import { entities, fields, sectionOrder, sections } from '~/shared/labels/registry';
import { defaultLabelValues, labelValues } from '~/shared/labels/resolve';
import {
  entityLabelKey,
  fieldLabelKey,
  pageLabelKey,
  sectionLabelKey,
} from '~/shared/labels/types';
import type { EntityKey, FieldEntityKey, PageKey } from '~/shared/labels/types';
import { api } from '~/trpc/react';
import { LabelFieldRow } from './label-field-row';

/**
 * Turkish ablative suffixes vary by vowel, so the three that actually occur are
 * written out rather than generated from the entity name.
 */
const SOURCE_BADGE: Partial<Record<EntityKey, string>> = {
  businessGroup: 'Meslek Grubundan',
  salesRepresentative: 'Satış Temsilcisinden',
  customerCard: 'Cari Kartından',
};

type TabDefinition = {
  id: string;
  staticTitle?: string;
  titleEntity?: EntityKey;
  entityKeys: EntityKey[];
  fieldEntity?: FieldEntityKey;
  showSections?: boolean;
  pageKeys?: PageKey[];
};

const TABS: TabDefinition[] = [
  {
    id: 'customerCard',
    titleEntity: 'customerCard',
    entityKeys: ['customerCard'],
    fieldEntity: 'customerCard',
  },
  {
    id: 'visit',
    titleEntity: 'visit',
    entityKeys: ['visit'],
    fieldEntity: 'visit',
  },
  {
    id: 'businessGroupCard',
    titleEntity: 'businessGroupCard',
    entityKeys: ['businessGroupCard'],
    fieldEntity: 'businessGroupCard',
    showSections: true,
  },
  {
    id: 'genel',
    staticTitle: 'Genel',
    entityKeys: ['businessGroup', 'salesRepresentative'],
    pageKeys: ['dashboard', 'settings'],
  },
];

/** Every override key a tab owns, so save and dirty-check stay scoped to it. */
function keysForTab(tab: TabDefinition): string[] {
  const keys = tab.entityKeys.flatMap((key) => [
    entityLabelKey(key, 'singular'),
    entityLabelKey(key, 'plural'),
  ]);

  if (tab.fieldEntity) {
    for (const field of fields[tab.fieldEntity]) {
      if (field.kind === 'editable') {
        keys.push(fieldLabelKey(tab.fieldEntity, field.key));
      }
    }
  }

  if (tab.showSections) {
    keys.push(...sectionOrder.map(sectionLabelKey));
  }

  keys.push(...(tab.pageKeys ?? []).map(pageLabelKey));

  return keys;
}

export function LabelsCard() {
  const labels = useLabels();
  const utils = api.useUtils();
  const saved = useMemo(() => labelValues(labels), [labels]);
  const [draft, setDraft] = useState<Record<string, string>>(saved);
  const previousSaved = useRef(saved);

  // After a save the server may normalise a value (trim, or collapse it to the
  // default). Re-sync only the keys whose saved value actually moved, so edits
  // pending in other tabs survive.
  useEffect(() => {
    const changed = Object.keys(saved).filter(
      (key) => saved[key] !== previousSaved.current[key],
    );
    if (changed.length > 0) {
      setDraft((prev) => ({
        ...prev,
        ...Object.fromEntries(changed.map((key) => [key, saved[key] ?? ''])),
      }));
    }
    previousSaved.current = saved;
  }, [saved]);

  const updateMutation = api.label.update.useMutation({
    onSuccess: () => utils.label.get.invalidate(),
  });

  const set = (key: string, value: string) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  /** Writes the default TEXT into the inputs — not an empty string. */
  const resetKeys = (keys: string[]) =>
    setDraft((prev) => ({
      ...prev,
      ...Object.fromEntries(
        keys.map((key) => [key, defaultLabelValues[key] ?? '']),
      ),
    }));

  const isDirty = (keys: string[]) =>
    keys.some((key) => (draft[key] ?? '') !== (saved[key] ?? ''));

  const save = async (keys: string[]) => {
    const values = Object.fromEntries(
      keys.map((key) => [key, draft[key] ?? '']),
    );

    try {
      await updateMutation.mutateAsync({ values });
      toast.success('Etiketler kaydedildi');
    } catch (error) {
      console.error(error);
      toast.error('Etiketler kaydedilirken bir hata oluştu');
    }
  };

  const renderEntityPair = (entityKey: EntityKey) => {
    const singularKey = entityLabelKey(entityKey, 'singular');
    const pluralKey = entityLabelKey(entityKey, 'plural');

    return (
      <div key={entityKey}>
        <p className="mb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">
          {entities[entityKey].plural}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={singularKey}>Tekil</Label>
            <Input
              id={singularKey}
              onChange={(e) => set(singularKey, e.target.value)}
              placeholder={entities[entityKey].singular}
              value={draft[singularKey] ?? ''}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={pluralKey}>Çoğul</Label>
            <Input
              id={pluralKey}
              onChange={(e) => set(pluralKey, e.target.value)}
              placeholder={entities[entityKey].plural}
              value={draft[pluralKey] ?? ''}
            />
          </div>
        </div>
      </div>
    );
  };

  const renderFieldRows = (entity: FieldEntityKey) =>
    fields[entity].map((field, index) => {
      const position = index + 1;
      const rowId = `${entity}-${field.key}`;
      const resolved = labels.field[entity] as Record<string, string>;

      if (field.kind === 'inherited') {
        return (
          <LabelFieldRow
            badge={SOURCE_BADGE[field.from] ?? 'Devralınır'}
            defaultValue={labels.entity[field.from].singular}
            id={rowId}
            key={field.key}
            position={position}
          />
        );
      }

      if (field.kind === 'composed') {
        return (
          <LabelFieldRow
            badge={SOURCE_BADGE[field.fromEntity] ?? 'Devralınır'}
            defaultValue={resolved[field.key] ?? ''}
            id={rowId}
            key={field.key}
            position={position}
          />
        );
      }

      const key = fieldLabelKey(entity, field.key);

      return (
        <LabelFieldRow
          badge={field.required ? 'Formda Zorunlu' : 'Formda Opsiyonel'}
          defaultValue={field.default}
          id={rowId}
          key={field.key}
          onChange={(value) => set(key, value)}
          onReset={() => resetKeys([key])}
          position={position}
          value={draft[key]}
        />
      );
    });

  const renderSectionRows = () =>
    sectionOrder.map((sectionKey, index) => {
      const key = sectionLabelKey(sectionKey);

      return (
        <LabelFieldRow
          badge="Form Bölümü"
          defaultValue={sections[sectionKey]}
          id={key}
          key={sectionKey}
          onChange={(value) => set(key, value)}
          onReset={() => resetKeys([key])}
          position={index + 1}
          unit="Bölüm"
          value={draft[key]}
        />
      );
    });

  const renderPageRow = (pageKey: PageKey) => {
    const key = pageLabelKey(pageKey);

    return (
      <LabelFieldRow
        badge="Sayfa Başlığı"
        defaultValue={defaultLabelValues[key] ?? ''}
        id={key}
        key={pageKey}
        onChange={(value) => set(key, value)}
        onReset={() => resetKeys([key])}
        position={1}
        unit="Başlık"
        value={draft[key]}
      />
    );
  };

  const tabTitle = (tab: TabDefinition) =>
    tab.titleEntity
      ? labelCompose.tableTitle(labels.entity[tab.titleEntity])
      : (tab.staticTitle ?? tab.id);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Etiketler</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="customerCard">
          <TabsList>
            {TABS.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id}>
                {tabTitle(tab)}
                {isDirty(keysForTab(tab)) && (
                  <span className="ml-1.5 inline-block size-1.5 rounded-full bg-primary" />
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          {TABS.map((tab) => {
            const keys = keysForTab(tab);

            return (
              <TabsContent className="space-y-4" key={tab.id} value={tab.id}>
                <div className="space-y-4">
                  {tab.entityKeys.map(renderEntityPair)}
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    onClick={() => resetKeys(keys)}
                    type="button"
                    variant="outline"
                  >
                    Varsayılanları Getir
                  </Button>
                  <Button
                    disabled={!isDirty(keys) || updateMutation.isPending}
                    onClick={() => save(keys)}
                    type="button"
                  >
                    {updateMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
                  </Button>
                </div>

                {tab.fieldEntity && (
                  <div className="space-y-3 border-t pt-4">
                    <p className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
                      Alanlar
                    </p>
                    {renderFieldRows(tab.fieldEntity)}
                  </div>
                )}

                {tab.showSections && (
                  <div className="space-y-3 border-t pt-4">
                    <p className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
                      Bölüm Başlıkları
                    </p>
                    {renderSectionRows()}
                  </div>
                )}

                {tab.pageKeys && tab.pageKeys.length > 0 && (
                  <div className="space-y-3 border-t pt-4">
                    <p className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
                      Sayfa Başlıkları
                    </p>
                    {tab.pageKeys.map(renderPageRow)}
                  </div>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      </CardContent>
    </Card>
  );
}
```

**Known limitation to accept, not fix here:** `SOURCE_BADGE` does not follow a
rename — if an admin renames Meslek Grubu to Sektör, the badge still reads
`Meslek Grubundan`. Generating the ablative suffix correctly requires Turkish
vowel-harmony rules that are not worth carrying for an editor hint. Raise it
with the user if it proves confusing in practice.

- [ ] **Step 3: Mount it on the settings page**

`src/app/panel/settings/page.tsx` — restructure the wrapper so the card sits full-width below the existing two-column row:

```tsx
<HydrateClient>
  <div className="space-y-4">
    <div className={isAdmin ? 'grid grid-cols-1 gap-4 lg:grid-cols-2' : ''}>
      <SaleRepresentativesTable />
      {isAdmin && <BusinessGroupsTable />}
    </div>
    {isAdmin && <LabelsCard />}
  </div>
</HydrateClient>
```

- [ ] **Step 4: Verify the full loop by hand**

`pnpm dev`, log in as the admin from `DEFAULT_ADMIN_EMAIL`. At `/panel/settings`:

1. Etiketler -> Cari Kartları -> rename field 2 to `Firma Adı` -> Kaydet.
2. Confirm the change in: the Cari Kartları column header, the create dialog label, the edit dialog label, the search-scope dropdown, and the Ziyaretler `Cari Kartı Firma Adı` column.
3. Rename the çoğul to `Cariler` -> Kaydet -> confirm the nav item and table title.
4. Create a customer card, then check `/panel/audit-logs` for a row reading `Cari Kartı Oluşturuldu`.
5. `Varsayılanları Getir` -> Kaydet -> confirm everything reverts and `LabelOverride` is empty (`pnpm db:studio`).

Stop the server.

- [ ] **Step 5: Commit**

```bash
pnpm typecheck && pnpm test && pnpm check:write
git add src/app/panel/settings/
git commit -m "feat: add the Etiketler editor to the settings page"
```

---

### Task 14: End-to-end coverage

**Files:**
- Create: `e2e/labels.spec.ts`

**Interfaces:**
- Consumes: the running app via `playwright.config.ts` (Task 1)
- Produces: nothing importable

**Accepted cost:** there is no test database. This spec runs against whatever `DATABASE_URL` points at and writes real rows. It reverts its own labels and deletes its own record, but it is **not** isolated. This was chosen deliberately; adding a test DB is out of scope.

- [ ] **Step 1: Write the spec**

Create `e2e/labels.spec.ts`. It must be self-cleaning — the `finally` block runs even if an assertion fails, so a red test never leaves the app renamed.

```ts
import { expect, test } from '@playwright/test';

const ADMIN_EMAIL = process.env.DEFAULT_ADMIN_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD ?? '';

test.describe('admin-editable labels', () => {
  test.skip(
    !ADMIN_EMAIL || !ADMIN_PASSWORD,
    'DEFAULT_ADMIN_EMAIL / DEFAULT_ADMIN_PASSWORD must be set',
  );

  test('renaming a field propagates and reverts', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/e-posta/i).fill(ADMIN_EMAIL);
    await page.getByLabel(/parola/i).fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: /giriş/i }).click();
    await page.waitForURL('**/panel/**');

    try {
      await page.goto('/panel/settings');
      await page.getByRole('tab', { name: 'Cari Kartları' }).click();

      const input = page.getByLabel('2. Alan');
      await input.fill('Firma Adı');
      await page
        .getByRole('button', { name: 'Kaydet' })
        .first()
        .click();

      await page.goto('/panel/customer-cards');
      await expect(
        page.getByRole('columnheader', { name: 'Firma Adı' }),
      ).toBeVisible();

      await page.goto('/panel/visits');
      await expect(
        page.getByRole('columnheader', { name: 'Cari Kartı Firma Adı' }),
      ).toBeVisible();
    } finally {
      await page.goto('/panel/settings');
      await page.getByRole('tab', { name: /Cari/ }).click();
      await page
        .getByRole('button', { name: 'Varsayılanları Getir' })
        .first()
        .click();
      await page.getByRole('button', { name: 'Kaydet' }).first().click();
    }

    await page.goto('/panel/customer-cards');
    await expect(
      page.getByRole('columnheader', { name: 'Ünvan' }),
    ).toBeVisible();
  });
});
```

- [ ] **Step 2: Run it**

```bash
pnpm test:e2e
```

Expected: 1 passed. If selectors do not match, adjust them against the real DOM rather than loosening the assertions — `pnpm exec playwright test --ui` is the fastest way to inspect.

- [ ] **Step 3: Confirm cleanup**

```bash
pnpm db:studio
```

Check that `LabelOverride` is empty. If rows remain, the `finally` block did not run to completion — fix it before committing.

- [ ] **Step 4: Commit**

```bash
pnpm typecheck && pnpm check:write
git add e2e/
git commit -m "test: cover label renaming end to end"
```

---

## Post-implementation

- [ ] Run the full suite one last time: `pnpm typecheck && pnpm test && pnpm test:e2e`
- [ ] Confirm `pnpm check` reports only the pre-existing issues listed in Global Constraints
- [ ] Update `CLAUDE.md`: the "search-scope dropdown is driven by `columnMap.<entity>`" note now needs a second half — a new searchable field requires an entry in **both** `src/lib/column-map.ts` (the key array) and `src/shared/labels/registry.ts` (the label), or the registry invariant test fails
- [ ] Consider a release entry per the `release-checklist` skill (`src/constants/app-version.ts` + `src/constants/releases.ts`)
