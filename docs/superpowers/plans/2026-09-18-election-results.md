# Seçim Sonuçları Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an all-roles `/panel/election-results` page showing one inline-editable row per active business group, color-coded by whichever of Yeşil / Mavi / Turuncu is largest.

**Architecture:** A new `ElectionResult` model sits 1:1 with `BusinessGroup` and is backfilled on read, exactly like `BusinessGroupCard`. A `protectedProcedure` router returns rows with a server-computed `color` field, which the existing shared `DataTable` already knows how to paint. The page reuses that `DataTable` but replaces the usual 3-dot-menu-plus-dialog editing with per-row inline inputs driven by one React Hook Form instance.

**Tech Stack:** Next.js 16 App Router · tRPC 11 · Prisma 6 (PostgreSQL) · React Hook Form 7 + Zod 3.25 · shadcn/ui · TanStack Table 8 · Vitest · Biome

**Spec:** `docs/superpowers/specs/2026-09-18-election-results-design.md`

## Global Constraints

- **Package manager is `pnpm`.** If corepack complains, prefix with `COREPACK_ENABLE_STRICT=0`.
- **Prisma client is generated to `./generated/prisma`.** Import from `generated/prisma`, never `@prisma/client`.
- **Schema changes use `pnpm db:push`**, never `db:generate`. There is no migration history. Restart the dev server afterwards.
- **Import alias:** `~/*` → `./src/*`.
- **All UI text is Turkish.** Turkish common nouns take suffixes with **no apostrophe** — `Formda Zorunlu`, never `Form'da`.
- **Never bake a required asterisk into a label.** Compose it in JSX as `{label} *`.
- **Display text is never hardcoded.** Column headers and titles resolve at runtime from `src/shared/labels/`.
- **Zod schemas live in `src/shared/zod-schemas/`** and are shared by tRPC inputs and React Hook Form. Never inline a schema in a router or form.
- **tsconfig sets `noUncheckedIndexedAccess`.** Any array/record index yields `T | undefined` — handle it.
- **Vitest only collects `src/**/*.test.ts`** (note: `.ts`, not `.tsx`). Unit tests must be `.ts` files.
- **Verification commands:** `pnpm test`, `pnpm typecheck`, `pnpm check`.
- Every mutation that writes data calls `createAuditLog()` from `src/server/api/trpc.ts`.

---

### Task 1: Prisma model

**Files:**
- Modify: `prisma/schema.prisma`

**Interfaces:**
- Consumes: nothing.
- Produces: the `ElectionResult` Prisma model with fields `id: string`, `businessGroupId: string`, `toplamOy: number`, `kullanilanOy: number`, `gecerliOy: number`, `meclisUyeSayisi: number`, `yesil: number`, `mavi: number`, `turuncu: number`, `createdAt: Date`, `updatedAt: Date`. All seven counts are **non-null with a `0` default** — blank means zero, so there is no "unset" state anywhere downstream.

- [ ] **Step 1: Add the model**

Append to `prisma/schema.prisma`, next to the `BusinessGroupCard` model:

```prisma
// One row per BusinessGroup, backfilled on read (see electionResultRouter).
// Every count is non-null with a 0 default: product decided that leaving a
// field blank MEANS zero, so there is no "not yet entered" state to model.
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

- [ ] **Step 2: Add the back-relation**

In the existing `model BusinessGroup`, below the `card BusinessGroupCard?` line, add:

```prisma
  electionResult ElectionResult?
```

- [ ] **Step 3: Push the schema and regenerate the client**

Run: `pnpm db:push`
Expected: "Your database is now in sync with your Prisma schema." followed by "Generated Prisma Client".

- [ ] **Step 4: Verify the generated client exposes the model**

Run: `node -e "const {PrismaClient}=require('./generated/prisma');console.log(typeof new PrismaClient().electionResult.findMany)"`
Expected: `function`

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: add ElectionResult model"
```

---

### Task 2: Row color resolver

**Files:**
- Create: `src/lib/election-result-color.ts`
- Test: `src/lib/election-result-color.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `resolveElectionRowColor(yesil: number, mavi: number, turuncu: number): ElectionRowColor` and `type ElectionRowColor = 'green' | 'blue' | 'orange' | 'purple' | null`. Task 5's router calls this; `null` means "leave the row uncolored".

**Context an implementer needs:** the shared `DataTable` (`src/app/_components/data-table.tsx`, around line 539) reads `row.original.color` and maps `'green' | 'blue' | 'orange' | 'yellow' | 'gray' | 'purple'` onto Tailwind row backgrounds. Returning one of those strings from the router is the entire coloring mechanism — do not add row-styling code to the table.

Purple for a tie is a deliberate overload: purple already carries a configured business meaning via `src/lib/color-hints.ts`. This was reviewed and accepted. Do not "fix" it.

- [ ] **Step 1: Write the failing test**

Create `src/lib/election-result-color.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { resolveElectionRowColor } from './election-result-color';

describe('resolveElectionRowColor', () => {
  it('colors the row for a single leader', () => {
    expect(resolveElectionRowColor(10, 5, 3)).toBe('green');
    expect(resolveElectionRowColor(5, 10, 3)).toBe('blue');
    expect(resolveElectionRowColor(5, 3, 10)).toBe('orange');
  });

  it('returns purple for any tie at the top', () => {
    expect(resolveElectionRowColor(10, 10, 3)).toBe('purple');
    expect(resolveElectionRowColor(10, 3, 10)).toBe('purple');
    expect(resolveElectionRowColor(3, 10, 10)).toBe('purple');
    expect(resolveElectionRowColor(7, 7, 7)).toBe('purple');
  });

  it('ignores a tie that is not for the maximum', () => {
    expect(resolveElectionRowColor(9, 4, 4)).toBe('green');
  });

  it('returns null when every count is zero', () => {
    expect(resolveElectionRowColor(0, 0, 0)).toBeNull();
  });

  it('still colors a row whose leader is the only non-zero count', () => {
    expect(resolveElectionRowColor(0, 1, 0)).toBe('blue');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test src/lib/election-result-color.test.ts`
Expected: FAIL — "Failed to resolve import ./election-result-color".

- [ ] **Step 3: Write the implementation**

Create `src/lib/election-result-color.ts`:

```ts
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test src/lib/election-result-color.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/election-result-color.ts src/lib/election-result-color.test.ts
git commit -m "feat: add election result row color resolver"
```

---

### Task 3: Zod schema

**Files:**
- Create: `src/shared/zod-schemas/election-result.ts`
- Test: `src/shared/zod-schemas/election-result.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `electionResultCountKeys` — a `readonly ['toplamOy','kullanilanOy','gecerliOy','meclisUyeSayisi','yesil','mavi','turuncu']`.
  - `type ElectionResultCountKey` — that tuple's member union.
  - `ElectionResultUpdateSchema` — a `z.object` whose **output** type is `{ id: string } & Record<ElectionResultCountKey, number>` and whose **input** type allows `'' | number | null | undefined` for each count. Task 5 uses it as the router input; Task 7 uses it as the form resolver.
  - `type ElectionResultUpdateInput = z.output<typeof ElectionResultUpdateSchema>`
  - `type ElectionResultFormValues = z.input<typeof ElectionResultUpdateSchema>`

**Context an implementer needs:** input and output types genuinely differ here — the form holds `''` for an emptied cell, the router receives `0`. Both types are exported because React Hook Form is typed on the input and `handleSubmit` hands you the output.

- [ ] **Step 1: Write the failing test**

Create `src/shared/zod-schemas/election-result.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  ElectionResultUpdateSchema,
  electionResultCountKeys,
} from './election-result';

const base = {
  id: 'abc',
  toplamOy: 0,
  kullanilanOy: 0,
  gecerliOy: 0,
  meclisUyeSayisi: 0,
  yesil: 0,
  mavi: 0,
  turuncu: 0,
};

describe('ElectionResultUpdateSchema', () => {
  it('lists all seven count fields', () => {
    expect(electionResultCountKeys).toHaveLength(7);
  });

  it('coerces an empty string to zero', () => {
    const result = ElectionResultUpdateSchema.parse({ ...base, yesil: '' });
    expect(result.yesil).toBe(0);
  });

  it('coerces null and undefined to zero', () => {
    expect(
      ElectionResultUpdateSchema.parse({ ...base, mavi: null }).mavi,
    ).toBe(0);
    expect(
      ElectionResultUpdateSchema.parse({ ...base, turuncu: undefined })
        .turuncu,
    ).toBe(0);
  });

  it('coerces a numeric string to a number', () => {
    expect(
      ElectionResultUpdateSchema.parse({ ...base, toplamOy: '42' }).toplamOy,
    ).toBe(42);
  });

  it('accepts a fully blank row', () => {
    const blank = Object.fromEntries(
      electionResultCountKeys.map((key) => [key, '']),
    );
    const result = ElectionResultUpdateSchema.parse({ id: 'abc', ...blank });
    for (const key of electionResultCountKeys) {
      expect(result[key]).toBe(0);
    }
  });

  it('accepts large values — there is no upper bound', () => {
    expect(
      ElectionResultUpdateSchema.parse({ ...base, toplamOy: 9_999_999 })
        .toplamOy,
    ).toBe(9_999_999);
  });

  it('rejects a negative count', () => {
    expect(() =>
      ElectionResultUpdateSchema.parse({ ...base, gecerliOy: -1 }),
    ).toThrow();
  });

  it('rejects a non-integer count', () => {
    expect(() =>
      ElectionResultUpdateSchema.parse({ ...base, gecerliOy: 1.5 }),
    ).toThrow();
  });

  it('rejects text that is not a number', () => {
    expect(() =>
      ElectionResultUpdateSchema.parse({ ...base, gecerliOy: 'abc' }),
    ).toThrow();
  });

  it('applies no cross-field constraints', () => {
    // Kullanılan Oy exceeding Toplam Oy is accepted on purpose.
    expect(() =>
      ElectionResultUpdateSchema.parse({
        ...base,
        toplamOy: 10,
        kullanilanOy: 99,
      }),
    ).not.toThrow();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test src/shared/zod-schemas/election-result.test.ts`
Expected: FAIL — cannot resolve `./election-result`.

- [ ] **Step 3: Write the implementation**

Create `src/shared/zod-schemas/election-result.ts`:

```ts
import { z } from 'zod';

export const electionResultCountKeys = [
  'toplamOy',
  'kullanilanOy',
  'gecerliOy',
  'meclisUyeSayisi',
  'yesil',
  'mavi',
  'turuncu',
] as const;

export type ElectionResultCountKey = (typeof electionResultCountKeys)[number];

/**
 * Every count is optional to enter and a blank one MEANS zero (product
 * decision, 2026-09-18) — so the schema's output is always an integer and
 * nothing downstream handles null. The input side stays wide because the
 * inline table input holds `''` for a cleared cell.
 */
const OptionalCount = z.preprocess(
  (value) => (value === '' || value === null || value === undefined ? 0 : value),
  z.coerce.number().int().min(0),
);

export const ElectionResultUpdateSchema = z.object({
  id: z.string(),
  toplamOy: OptionalCount,
  kullanilanOy: OptionalCount,
  gecerliOy: OptionalCount,
  meclisUyeSayisi: OptionalCount,
  yesil: OptionalCount,
  mavi: OptionalCount,
  turuncu: OptionalCount,
});

/** What the router receives and the database stores — always integers. */
export type ElectionResultUpdateInput = z.output<
  typeof ElectionResultUpdateSchema
>;

/** What the form holds while editing — a cleared cell is `''`. */
export type ElectionResultFormValues = z.input<
  typeof ElectionResultUpdateSchema
>;
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test src/shared/zod-schemas/election-result.test.ts`
Expected: PASS, 10 tests.

- [ ] **Step 5: Commit**

```bash
git add src/shared/zod-schemas/election-result.ts src/shared/zod-schemas/election-result.test.ts
git commit -m "feat: add election result Zod schema"
```

---

### Task 4: Label registry wiring

**Files:**
- Modify: `src/shared/labels/types.ts`
- Modify: `src/shared/labels/registry.ts`
- Modify: `src/shared/labels/resolve.ts`
- Modify: `src/lib/column-map.ts`
- Modify: `src/shared/labels/registry.test.ts`
- Modify: `src/app/panel/settings/labels-card.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: `labels.entity.electionResult` (`{ singular, plural }`), `labels.field.electionResult` (a `Record<ElectionResultFieldKey, string>`), and a new `'static'` `FieldDefinition` kind. Tasks 5–8 read labels through `useLabels()` / `api.label.get()` and `labelCompose`.

**Context an implementer needs.** The registry currently has three field kinds: `editable` (admin-renameable, appears in the Etiketler editor), `inherited` (label follows another entity's singular), and `composed` (derived from another entity's field). Yeşil / Mavi / Turuncu must live in the registry — every header resolves through it — but must **not** be admin-renameable, and they are not derived from any other entity. No existing kind expresses that, so this task adds a fourth: `static`.

`businessGroupName` here is `editable` with default `Komite`, **not** `inherited` the way `businessGroupCard.businessGroupName` is. That is deliberate: this column is named Komite, and inheriting would make renaming the Meslek Grubu entity silently rename it.

- [ ] **Step 1: Write the failing test**

In `src/shared/labels/registry.test.ts`, update the first test's name and expectation from five entities to six, and add two new tests. Replace:

```ts
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
```

with:

```ts
  it('marks exactly the six renameable entities as editable', () => {
    const editable = Object.entries(entities)
      .filter(([, e]) => e.editable)
      .map(([k]) => k)
      .sort();

    expect(editable).toEqual([
      'businessGroup',
      'businessGroupCard',
      'customerCard',
      'electionResult',
      'salesRepresentative',
      'visit',
    ]);
  });

  it('gives electionResult its own editable pair', () => {
    expect(entities.electionResult.editable).toBe(true);
    expect(entities.electionResult.singular).toBe('Seçim Sonucu');
    expect(entities.electionResult.plural).toBe('Seçim Sonuçları');
  });
```

In the same file, extend the `entityKeys` array inside `covers every non-system column key`:

```ts
    const entityKeys: FieldEntityKey[] = [
      'customerCard',
      'visit',
      'businessGroupCard',
      'electionResult',
    ];
```

And add, inside the `field registry` describe block:

```ts
  it('keeps the three election colors static rather than editable', () => {
    const staticKeys = fields.electionResult
      .filter((f) => f.kind === 'static')
      .map((f) => f.key)
      .sort();

    expect(staticKeys).toEqual(['mavi', 'turuncu', 'yesil']);
  });

  it('names the election result business group column Komite independently', () => {
    const komite = fields.electionResult.find(
      (f) => f.key === 'businessGroupName',
    );

    // Deliberately `editable`, not `inherited` — renaming the Meslek Grubu
    // entity must not rename this column.
    expect(komite?.kind).toBe('editable');
    expect(komite).toMatchObject({ default: 'Komite' });
  });
```

Then add a test in `src/shared/labels/resolve.test.ts` confirming static labels resolve but cannot be overridden:

```ts
  it('resolves static field labels and refuses to override them', () => {
    const labels = resolveLabels({ 'field.electionResult.yesil': 'Kırmızı' });

    expect(labels.field.electionResult.yesil).toBe('Yeşil');
    expect(editableLabelKeys.has('field.electionResult.yesil')).toBe(false);
    expect(editableLabelKeys.has('field.electionResult.toplamOy')).toBe(true);
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test src/shared/labels`
Expected: FAIL — `entities.electionResult` is undefined and `fields.electionResult` does not exist.

- [ ] **Step 3: Extend the label types**

In `src/shared/labels/types.ts`:

Add `| 'electionResult'` to `EntityKey`, and change `FieldEntityKey` to:

```ts
export type FieldEntityKey =
  | 'customerCard'
  | 'visit'
  | 'businessGroupCard'
  | 'electionResult';
```

Add the new kind to `FieldDefinition`:

```ts
export type FieldDefinition<K extends string = string> =
  | { kind: 'editable'; key: K; default: string; required: boolean }
  | { kind: 'inherited'; key: K; from: EntityKey }
  | { kind: 'composed'; key: K; fromEntity: EntityKey; fromField: string }
  /**
   * In the registry so headers resolve through one place, but never
   * admin-renameable — the same treatment enum display values get.
   */
  | { kind: 'static'; key: K; default: string };
```

Add the field-key union next to `BusinessGroupCardFieldKey`:

```ts
export type ElectionResultFieldKey =
  | 'businessGroupName'
  | 'toplamOy'
  | 'kullanilanOy'
  | 'gecerliOy'
  | 'meclisUyeSayisi'
  | 'yesil'
  | 'mavi'
  | 'turuncu';
```

Add entries to both `FieldLabels` and `FieldRegistry`:

```ts
export type FieldLabels = {
  customerCard: Record<CustomerCardFieldKey, string>;
  visit: Record<VisitFieldKey, string>;
  businessGroupCard: Record<BusinessGroupCardFieldKey, string>;
  electionResult: Record<ElectionResultFieldKey, string>;
};

export type FieldRegistry = {
  customerCard: FieldDefinition<CustomerCardFieldKey>[];
  visit: FieldDefinition<VisitFieldKey>[];
  businessGroupCard: FieldDefinition<BusinessGroupCardFieldKey>[];
  electionResult: FieldDefinition<ElectionResultFieldKey>[];
};
```

- [ ] **Step 4: Add the registry entries**

In `src/shared/labels/registry.ts`, add to `entities` (after `businessGroupCard`):

```ts
  electionResult: {
    singular: 'Seçim Sonucu',
    plural: 'Seçim Sonuçları',
    editable: true,
  },
```

And add to `fields`, after the `businessGroupCard` array. The order here is the column order on the page:

```ts
  electionResult: [
    // `editable`, not `inherited` from businessGroup: this column is named
    // Komite, so renaming the Meslek Grubu entity must not rename it.
    {
      kind: 'editable',
      key: 'businessGroupName',
      default: 'Komite',
      required: false,
    },
    {
      kind: 'editable',
      key: 'toplamOy',
      default: 'Toplam Oy',
      required: false,
    },
    {
      kind: 'editable',
      key: 'kullanilanOy',
      default: 'Kullanılan Oy',
      required: false,
    },
    {
      kind: 'editable',
      key: 'gecerliOy',
      default: 'Geçerli Oy',
      required: false,
    },
    {
      kind: 'editable',
      key: 'meclisUyeSayisi',
      default: 'Meclis Üye Sayısı',
      required: false,
    },
    // Color names, not concepts — static like the enum display values.
    { kind: 'static', key: 'yesil', default: 'Yeşil' },
    { kind: 'static', key: 'mavi', default: 'Mavi' },
    { kind: 'static', key: 'turuncu', default: 'Turuncu' },
  ],
```

- [ ] **Step 5: Teach the resolver about the new entity and kind**

In `src/shared/labels/resolve.ts`, extend `FIELD_ENTITY_KEYS`:

```ts
const FIELD_ENTITY_KEYS: FieldEntityKey[] = [
  'customerCard',
  'visit',
  'businessGroupCard',
  'electionResult',
];
```

In `resolveLabels`, inside "Pass 1: editable fields", add a `static` branch so static keys are present in `field[entityKey]` (`labelValues` indexes every registered key, and `fieldLabel` falls through to the raw key otherwise):

```ts
      if (definition.kind === 'editable') {
        resolved[definition.key] = pick(
          override(fieldLabelKey(entityKey, definition.key)),
          definition.default,
        );
      }
      // Static labels resolve to their default and ignore any stored
      // override — they are never in editableLabelKeys to begin with.
      if (definition.kind === 'static') {
        resolved[definition.key] = definition.default;
      }
```

`editableLabelKeys` and `defaultLabelValues` already filter on `kind === 'editable'`, so static keys are excluded from both with no change.

- [ ] **Step 6: Add the column-map entry**

In `src/lib/column-map.ts`, add (keys only — no Turkish ever goes in this file):

```ts
  electionResult: [
    'id',
    'businessGroupName',
    'toplamOy',
    'kullanilanOy',
    'gecerliOy',
    'meclisUyeSayisi',
    'yesil',
    'mavi',
    'turuncu',
    'createdAt',
    'updatedAt',
  ],
```

This entity builds no search-scope enum (the page's search scope is fixed), but the entry keeps the `covers every non-system column key` invariant guarding it.

- [ ] **Step 7: Add the Etiketler tab**

In `src/app/panel/settings/labels-card.tsx`:

Add a tab to `TABS`, after the `businessGroupCard` entry:

```ts
  {
    id: 'electionResult',
    titleEntity: 'electionResult',
    entityKeys: ['electionResult'],
    fieldEntity: 'electionResult',
  },
```

Add a `static` branch to `renderFieldRow`, directly after the `composed` branch and before the `const key = fieldLabelKey(...)` line, so static entries render read-only:

```ts
    if (field.kind === 'static') {
      return (
        <LabelFieldRow
          badge="Sabit"
          defaultValue={field.default}
          id={rowId}
          key={field.key}
          position={position}
          unit={unit}
        />
      );
    }
```

Extend `isColumnOnlyField` so static entries land in the read-only "Sütunlar" list rather than the numbered "Alanlar" form list:

```ts
  const isColumnOnlyField = (entity: FieldEntityKey, field: FieldDefinition) =>
    field.kind === 'composed' ||
    field.kind === 'static' ||
    (field.kind === 'inherited' && entity === 'businessGroupCard');
```

- [ ] **Step 8: Run the tests to verify they pass**

Run: `pnpm test src/shared/labels && pnpm typecheck`
Expected: PASS on all label tests, and a clean typecheck. If `typecheck` reports a non-exhaustive switch or a missing `electionResult` key anywhere, add the missing case — the precise unions are deliberately strict.

- [ ] **Step 9: Commit**

```bash
git add src/shared/labels src/lib/column-map.ts src/app/panel/settings/labels-card.tsx
git commit -m "feat: register electionResult labels and add static field kind"
```

---

### Task 5: tRPC router

**Files:**
- Create: `src/server/api/routers/election-result.ts`
- Modify: `src/server/api/root.ts`

**Interfaces:**
- Consumes: `resolveElectionRowColor` (Task 2), `ElectionResultUpdateSchema` (Task 3).
- Produces:
  - `electionResultRouter`, registered as `electionResult` on `appRouter`.
  - `api.electionResult.get` — input `{ filter?: { search?: string }, sorting?: { id: string; desc: boolean }[], page?: number, itemsPerPage?: number }`; output `{ data: ElectionResultRow[], pagination: { totalItems: number, totalPages: number } }` where each row is the model's fields plus `businessGroupName: string` and `color: ElectionRowColor`.
  - `api.electionResult.update` — input `ElectionResultUpdateSchema`, output a single row in the same shape.

**Context an implementer needs.** Model this closely on `src/server/api/routers/business-group-card.ts` — same backfill, pagination and sorting plumbing — with three deliberate differences:

1. **`protectedProcedure`, not `adminProcedure`, on both procedures.** Business-group assignment deliberately does not gate this page at all: every logged-in user reads and edits every row. Confirmed product decision; do not add scoping.
2. **No search scope.** Search always and only matches the business group name.
3. **All eight columns sort**, unlike the card router where the committee columns do not.

The `passive` filter must be an explicit `OR`. Prisma's `not: true` on a nullable boolean compiles to `<> true`, which silently drops `NULL` rows — and most business groups have `passive = NULL`.

- [ ] **Step 1: Write the router**

Create `src/server/api/routers/election-result.ts`:

```ts
import { Prisma, type PrismaClient } from 'generated/prisma';
import { z } from 'zod';
import { resolveElectionRowColor } from '~/lib/election-result-color';
import { ElectionResultUpdateSchema } from '~/shared/zod-schemas/election-result';
import { findTurkishSearchMatches } from '../lib/turkish-search';
import { createAuditLog, createTRPCRouter, protectedProcedure } from '../trpc';

const filterSchema = z.object({
  /** Always matched against the business group name — this page has no
   *  search scope selector, unlike the other tables. */
  search: z.string().optional(),
});

const sortingSchema = z.object({
  id: z.string(),
  desc: z.boolean(),
});

const sortableFields = [
  'businessGroupName',
  'toplamOy',
  'kullanilanOy',
  'gecerliOy',
  'meclisUyeSayisi',
  'yesil',
  'mavi',
  'turuncu',
] as const;
type SortableField = (typeof sortableFields)[number];

/** Ensures every existing BusinessGroup has a (zero-filled) result row. */
async function backfillMissingRows(db: PrismaClient) {
  const groupsWithoutRow = await db.businessGroup.findMany({
    where: { electionResult: null },
    select: { id: true },
  });
  if (groupsWithoutRow.length === 0) return;
  await db.electionResult.createMany({
    data: groupsWithoutRow.map((g) => ({ businessGroupId: g.id })),
    skipDuplicates: true,
  });
}

type RowWithGroup = Prisma.ElectionResultGetPayload<{
  include: { businessGroup: { select: { name: true } } };
}>;

/** Flattens the group name onto the row and attaches the computed color. */
function toRow({ businessGroup, ...rest }: RowWithGroup) {
  return {
    ...rest,
    businessGroupName: businessGroup.name,
    color: resolveElectionRowColor(rest.yesil, rest.mavi, rest.turuncu),
  };
}

export const electionResultRouter = createTRPCRouter({
  // protectedProcedure, not adminProcedure: business-group assignment
  // deliberately does not gate this page — every logged-in user reads and
  // edits every row. Confirmed product decision, 2026-09-18.
  get: protectedProcedure
    .input(
      z.object({
        filter: filterSchema.optional(),
        sorting: z.array(sortingSchema).optional(),
        page: z.number().min(1).default(1),
        itemsPerPage: z.number().min(1).max(500).default(25),
      }),
    )
    .query(async ({ ctx, input }) => {
      await backfillMissingRows(ctx.db);

      // `passive` is nullable, and Prisma's `not: true` excludes NULL rows
      // (it translates to `<> true`, not `IS DISTINCT FROM true`) — an
      // explicit null/false OR is required to actually match "active".
      const whereClause: Prisma.ElectionResultWhereInput = {
        businessGroup: { OR: [{ passive: null }, { passive: false }] },
      };

      if (input.filter?.search) {
        whereClause.id = {
          in: await findTurkishSearchMatches(
            ctx.db,
            Prisma.raw(
              '"ElectionResult" er JOIN "BusinessGroup" bg ON bg.id = er."businessGroupId"',
            ),
            Prisma.raw('er.id'),
            [Prisma.raw('bg.name')],
            input.filter.search,
          ),
        };
      }

      const orderBy: Prisma.ElectionResultOrderByWithRelationInput[] = [];
      for (const sort of input.sorting ?? []) {
        if (!sortableFields.includes(sort.id as SortableField)) continue;
        if (sort.id === 'businessGroupName') {
          orderBy.push({ businessGroup: { name: sort.desc ? 'desc' : 'asc' } });
        } else {
          orderBy.push({ [sort.id]: sort.desc ? 'desc' : 'asc' });
        }
      }
      if (orderBy.length === 0) {
        orderBy.push({ businessGroup: { name: 'asc' } });
      }

      const [totalItems, rows] = await Promise.all([
        ctx.db.electionResult.count({ where: whereClause }),
        ctx.db.electionResult.findMany({
          where: whereClause,
          include: { businessGroup: { select: { name: true } } },
          orderBy,
          skip: (input.page - 1) * input.itemsPerPage,
          take: input.itemsPerPage,
        }),
      ]);

      return {
        data: rows.map(toRow),
        pagination: {
          totalItems,
          totalPages: Math.ceil(totalItems / input.itemsPerPage),
        },
      };
    }),

  update: protectedProcedure
    .input(ElectionResultUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...counts } = input;

      try {
        const result = await ctx.db.electionResult.update({
          where: { id },
          data: counts,
          include: { businessGroup: { select: { name: true } } },
        });

        await createAuditLog(
          ctx,
          'ELECTION_RESULT_UPDATED',
          'ELECTION_RESULT',
          result.id,
          'SUCCESS',
          undefined,
          `Seçim sonucu güncellendi: ${result.businessGroup.name}`,
        );

        return toRow(result);
      } catch (error) {
        await createAuditLog(
          ctx,
          'ELECTION_RESULT_UPDATED',
          'ELECTION_RESULT',
          id,
          'FAILURE',
          error instanceof Error ? error.message : 'Bilinmeyen hata',
          'Seçim sonucu güncellenemedi',
        );
        throw error;
      }
    }),
});
```

- [ ] **Step 2: Register the router**

In `src/server/api/root.ts`, add the import beside the other router imports:

```ts
import { electionResultRouter } from '~/server/api/routers/election-result';
```

and the entry inside `createTRPCRouter({ ... })`:

```ts
  electionResult: electionResultRouter,
```

- [ ] **Step 3: Wire the audit-log label strings**

In `src/shared/labels/compose.ts`, inside `auditActionLabels`, add beside the other entity CRUD entries:

```ts
    ELECTION_RESULT_UPDATED: labelCompose.updated(entity.electionResult),
```

and in `resourceTypeLabels` in the same file, add beside `BUSINESS_GROUP_CARD`:

```ts
    ELECTION_RESULT: entity.electionResult.singular,
```

- [ ] **Step 4: Verify it compiles**

Run: `pnpm typecheck`
Expected: no errors. If `Prisma.ElectionResultGetPayload` is unresolved, the client was not regenerated — rerun `pnpm db:push`.

- [ ] **Step 5: Commit**

```bash
git add src/server/api/routers/election-result.ts src/server/api/root.ts src/shared/labels/compose.ts
git commit -m "feat: add election result router"
```

---

### Task 6: Read-only page

**Files:**
- Create: `src/app/panel/election-results/page.tsx`
- Create: `src/app/panel/election-results/page-client.tsx`
- Create: `src/app/panel/election-results/columns.tsx`
- Create: `src/app/panel/election-results/filter-controls.tsx`

**Interfaces:**
- Consumes: `api.electionResult.get` (Task 5), `labels.field.electionResult` (Task 4).
- Produces: `type ElectionResultRow = RouterOutputs['electionResult']['get']['data'][number]` exported from `columns.tsx`, and `createColumns(labels: ResolvedLabels): ColumnDef<ElectionResultRow>[]`. Task 7 widens `createColumns` with an editing-context argument.

**Context an implementer needs.** This task ships a working, sortable, searchable, color-coded read-only table. Inline editing lands in Task 7 — resist building it here; a reviewer should be able to accept this table on its own.

There is no `redirect` guard in `page.tsx`: this page is for every role. Contrast with `business-group-cards/page.tsx`, which redirects non-admins — do not copy that line.

Row coloring needs no code here. The shared `DataTable` reads `row.original.color`, which the router already provides.

- [ ] **Step 1: Write the columns**

Create `src/app/panel/election-results/columns.tsx`:

```tsx
'use client';

import type { ColumnDef } from '@tanstack/react-table';
import type { ResolvedLabels } from '~/shared/labels/types';
import type { ElectionResultCountKey } from '~/shared/zod-schemas/election-result';
import { electionResultCountKeys } from '~/shared/zod-schemas/election-result';
import type { RouterOutputs } from '~/trpc/types';

export type ElectionResultRow =
  RouterOutputs['electionResult']['get']['data'][number];

function countColumn(
  key: ElectionResultCountKey,
  header: string,
): ColumnDef<ElectionResultRow> {
  return {
    accessorKey: key,
    header,
    enableSorting: true,
    size: 80,
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original[key]}</span>
    ),
  };
}

export const createColumns = (
  labels: ResolvedLabels,
): ColumnDef<ElectionResultRow>[] => {
  const f = labels.field.electionResult;

  return [
    {
      accessorKey: 'businessGroupName',
      header: f.businessGroupName,
      enableSorting: true,
    },
    ...electionResultCountKeys.map((key) => countColumn(key, f[key])),
  ];
};
```

- [ ] **Step 2: Write the filter controls**

Create `src/app/panel/election-results/filter-controls.tsx`. Note there is no `Combobox` — the scope is fixed to the business group name, so the only control is the search box:

```tsx
'use client';

import { SearchIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '~/components/ui/input-group';

export function FilterControls({
  search,
  onSearch,
}: {
  search: string;
  onSearch: (search: string) => void;
}) {
  return (
    <Card className="mb-4">
      <CardHeader className="flex flex-col items-center sm:flex-row">
        <CardTitle className="mb-2 max-sm:text-lg sm:mr-auto sm:mb-0">
          Filtreler
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <InputGroup className="sm:w-75">
          <InputGroupInput
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Ara"
            type="search"
            value={search}
          />
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
        </InputGroup>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Write the client page**

Create `src/app/panel/election-results/page-client.tsx`:

```tsx
'use client';

import type { PaginationState, SortingState } from '@tanstack/react-table';
import { useState } from 'react';
import { Card, CardHeader, CardTitle } from '~/components/ui/card';
import { Spinner } from '~/components/ui/spinner';
import { useLabels } from '~/hooks/use-labels';
import { cn } from '~/lib/utils';
import { labelCompose } from '~/shared/labels/compose';
import { api } from '~/trpc/react';

import { DataTable } from '../../_components/data-table';
import { createColumns } from './columns';
import { FilterControls } from './filter-controls';

export function ElectionResultsPageClient() {
  const labels = useLabels();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  });
  const [search, setSearch] = useState('');

  const { data, isLoading } = api.electionResult.get.useQuery({
    page: pagination.pageIndex + 1,
    itemsPerPage: pagination.pageSize,
    filter: { search },
    sorting,
  });

  const columns = createColumns(labels);

  return (
    <div className="w-full p-4 sm:p-6 lg:p-8">
      <div className="mx-auto w-full max-w-[1600px]">
        <div className="mb-4">
          <FilterControls onSearch={setSearch} search={search} />
        </div>
        <Card className={cn(!isLoading && 'rounded-b-none border-b-0')}>
          <CardHeader className="flex flex-row items-center">
            <CardTitle className="mr-auto">
              {labelCompose.tableTitle(labels.entity.electionResult)}
            </CardTitle>
          </CardHeader>
        </Card>
        {isLoading ? (
          <div className="flex justify-center">
            <Spinner className="mt-10 size-8" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <DataTable
              columns={columns}
              data={data?.data ?? []}
              exportFilename="secim_sonuclari"
              pageCount={data?.pagination?.totalPages ?? -1}
              pagination={pagination}
              setPagination={setPagination}
              setSorting={setSorting}
              sorting={sorting}
              tableId="election-results"
              totalCount={data?.pagination?.totalItems}
            />
          </div>
        )}
      </div>
    </div>
  );
}
```

Note the prop names: the shared `DataTable` takes `setSorting` / `setPagination`, **not** `onSortingChange` / `onPaginationChange`. `tableId` keys the persisted column visibility and sizing in `localStorage`, so it must be unique.

- [ ] **Step 4: Write the server page**

Create `src/app/panel/election-results/page.tsx`. Note the deliberate absence of a role guard:

```tsx
import { api, HydrateClient } from '~/trpc/server';
import { ElectionResultsPageClient } from './page-client';

// No role guard on purpose: this page is visible and editable to every role.
export default async function ElectionResultsPage() {
  await api.electionResult.get.prefetch({});

  return (
    <HydrateClient>
      <ElectionResultsPageClient />
    </HydrateClient>
  );
}
```

- [ ] **Step 5: Verify it compiles and renders**

Run: `pnpm typecheck && pnpm check`
Expected: clean.

Then run `pnpm dev`, sign in, and visit `/panel/election-results`. Expected: one row per active business group, all counts showing `0`, every row uncolored, all eight headers sortable, and typing a group name in Ara filtering the list.

- [ ] **Step 6: Commit**

```bash
git add src/app/panel/election-results
git commit -m "feat: add read-only Seçim Sonuçları page"
```

---

### Task 7: Inline row editing

**Files:**
- Modify: `src/app/panel/election-results/columns.tsx`
- Modify: `src/app/panel/election-results/page-client.tsx`

**Interfaces:**
- Consumes: `ElectionResultUpdateSchema`, `ElectionResultFormValues` (Task 3); `api.electionResult.update` (Task 5); `createColumns`, `ElectionResultRow` (Task 6).
- Produces: `createColumns(labels: ResolvedLabels, editing: EditingContext)` where

```ts
type EditingContext = {
  editingRowId: string | null;
  form: UseFormReturn<ElectionResultFormValues, unknown, ElectionResultUpdateInput>;
  isSaving: boolean;
  onEdit: (row: ElectionResultRow) => void;
  onCancel: () => void;
  onSave: () => void;
};
```

**Context an implementer needs.** This replaces the app's usual 3-dot-menu-and-dialog editing with inline cells — it is the only table in the codebase that works this way, so there is no existing pattern to copy. One row edits at a time, driven by a single React Hook Form instance that is `reset()` to the row's values when editing opens.

React Hook Form's three generics are `<TFieldValues, TContext, TTransformedValues>`. Because the Zod schema's input and output differ (`''` in, `0` out), the form is typed on `ElectionResultFormValues` and `handleSubmit` hands you `ElectionResultUpdateInput`.

Field errors get a red ring and a `title` tooltip, not message text — a table cell has no room for a sentence.

- [ ] **Step 1: Add the editing context to the columns**

Rewrite `src/app/panel/election-results/columns.tsx`:

```tsx
'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { CheckIcon, PencilIcon, XIcon } from 'lucide-react';
import type { UseFormReturn } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { cn } from '~/lib/utils';
import type { ResolvedLabels } from '~/shared/labels/types';
import type {
  ElectionResultCountKey,
  ElectionResultFormValues,
  ElectionResultUpdateInput,
} from '~/shared/zod-schemas/election-result';
import { electionResultCountKeys } from '~/shared/zod-schemas/election-result';
import type { RouterOutputs } from '~/trpc/types';

export type ElectionResultRow =
  RouterOutputs['electionResult']['get']['data'][number];

export type EditingContext = {
  editingRowId: string | null;
  form: UseFormReturn<
    ElectionResultFormValues,
    unknown,
    ElectionResultUpdateInput
  >;
  isSaving: boolean;
  onEdit: (row: ElectionResultRow) => void;
  onCancel: () => void;
  onSave: () => void;
};

function countColumn(
  key: ElectionResultCountKey,
  header: string,
  editing: EditingContext,
): ColumnDef<ElectionResultRow> {
  return {
    accessorKey: key,
    header,
    enableSorting: true,
    size: 90,
    cell: ({ row }) => {
      if (row.original.id !== editing.editingRowId) {
        return <span className="tabular-nums">{row.original[key]}</span>;
      }

      return (
        <Controller
          control={editing.form.control}
          name={key}
          render={({ field, fieldState }) => (
            <Input
              className={cn(
                'h-8 w-20 tabular-nums',
                fieldState.error && 'ring-2 ring-destructive',
              )}
              inputMode="numeric"
              name={field.name}
              onBlur={field.onBlur}
              onChange={field.onChange}
              onKeyDown={(e) => {
                if (e.key === 'Escape') editing.onCancel();
                if (e.key === 'Enter') {
                  e.preventDefault();
                  editing.onSave();
                }
              }}
              ref={field.ref}
              title={fieldState.error?.message}
              value={field.value === null ? '' : String(field.value ?? '')}
            />
          )}
        />
      );
    },
  };
}

export const createColumns = (
  labels: ResolvedLabels,
  editing: EditingContext,
): ColumnDef<ElectionResultRow>[] => {
  const f = labels.field.electionResult;

  return [
    {
      id: 'actions',
      enableHiding: false,
      size: 90,
      cell: ({ row }) => {
        const isEditing = row.original.id === editing.editingRowId;

        if (!isEditing) {
          return (
            <Button
              aria-label="Düzenle"
              onClick={() => editing.onEdit(row.original)}
              size="icon"
              variant="ghost"
            >
              <PencilIcon className="size-4" />
            </Button>
          );
        }

        return (
          <div className="flex gap-1">
            <Button
              aria-label="Kaydet"
              disabled={editing.isSaving}
              onClick={editing.onSave}
              size="icon"
              variant="ghost"
            >
              <CheckIcon className="size-4" />
            </Button>
            <Button
              aria-label="İptal"
              disabled={editing.isSaving}
              onClick={editing.onCancel}
              size="icon"
              variant="ghost"
            >
              <XIcon className="size-4" />
            </Button>
          </div>
        );
      },
    },
    {
      accessorKey: 'businessGroupName',
      header: f.businessGroupName,
      enableSorting: true,
    },
    ...electionResultCountKeys.map((key) => countColumn(key, f[key], editing)),
  ];
};
```

- [ ] **Step 2: Drive the editing state from the page client**

In `src/app/panel/election-results/page-client.tsx`, add these imports:

```tsx
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { ElectionResultUpdateSchema } from '~/shared/zod-schemas/election-result';
import type { ElectionResultRow } from './columns';
```

Inside the component, after the existing `useState` calls, add:

```tsx
  const utils = api.useUtils();
  const [editingRowId, setEditingRowId] = useState<string | null>(null);

  const form = useForm({
    resolver: zodResolver(ElectionResultUpdateSchema),
    defaultValues: {
      id: '',
      toplamOy: 0,
      kullanilanOy: 0,
      gecerliOy: 0,
      meclisUyeSayisi: 0,
      yesil: 0,
      mavi: 0,
      turuncu: 0,
    },
  });

  const updateMutation = api.electionResult.update.useMutation({
    onSuccess: async () => {
      setEditingRowId(null);
      await utils.electionResult.get.invalidate();
      toast.success(
        `${labels.entity.electionResult.singular} başarıyla güncellendi`,
      );
    },
    onError: (error) => {
      console.error(error);
      toast.error(
        `${labels.entity.electionResult.singular} güncellenirken bir hata oluştu`,
      );
    },
  });

  const handleEdit = (row: ElectionResultRow) => {
    // One row edits at a time. Rather than silently discarding a dirty row,
    // make the user resolve it — there is no dialog in a table cell.
    if (editingRowId && editingRowId !== row.id && form.formState.isDirty) {
      toast.warning('Önce mevcut satırı kaydedin veya iptal edin');
      return;
    }
    // Written out rather than built with Object.fromEntries, which widens to
    // Record<string, number> and no longer satisfies the form's value type.
    form.reset({
      id: row.id,
      toplamOy: row.toplamOy,
      kullanilanOy: row.kullanilanOy,
      gecerliOy: row.gecerliOy,
      meclisUyeSayisi: row.meclisUyeSayisi,
      yesil: row.yesil,
      mavi: row.mavi,
      turuncu: row.turuncu,
    });
    setEditingRowId(row.id);
  };

  const handleCancel = () => {
    setEditingRowId(null);
    form.reset();
  };

  const handleSave = form.handleSubmit((values) =>
    updateMutation.mutate(values),
  );

  const columns = createColumns(labels, {
    editingRowId,
    form,
    isSaving: updateMutation.isPending,
    onEdit: handleEdit,
    onCancel: handleCancel,
    onSave: handleSave,
  });
```

Remove the old `const columns = createColumns(labels);` line.

- [ ] **Step 3: Drop the edit state when the visible rows change**

Sorting or paginating while a row is open would leave the form bound to a row that is no longer on screen. Add, after the query:

```tsx
  // Sorting/paginating can scroll the edited row off the page; close the
  // editor rather than leave the form bound to an invisible row.
  // biome-ignore lint/correctness/useExhaustiveDependencies: keyed on the view, not the form
  useEffect(() => {
    setEditingRowId(null);
  }, [pagination.pageIndex, pagination.pageSize, sorting, search]);
```

and add `useEffect` to the `react` import.

- [ ] **Step 4: Verify types and lint**

Run: `pnpm typecheck && pnpm check`
Expected: clean. If `useForm`'s inferred generics fight the resolver, annotate explicitly as `useForm<ElectionResultFormValues, unknown, ElectionResultUpdateInput>({ ... })`.

- [ ] **Step 5: Manually verify the interaction**

Run `pnpm dev` and visit `/panel/election-results`. Confirm each of:

- Clicking the pencil turns that row's seven counts into inputs; Komite stays text.
- Typing `5` into Mavi and saving turns the row blue; the other rows are untouched.
- Making Yeşil and Mavi equal and saving turns the row purple.
- Setting all three colors back to 0 removes the row color.
- Escape in a cell cancels; Enter saves.
- Clearing a cell entirely and saving stores `0`.
- Typing `-1` shows a red ring and blocks the save.
- Clicking another row's pencil while the open row is dirty shows the warning toast.
- Sorting by Toplam Oy closes the editor.
- Signing in as a non-admin still shows the page and still permits editing.

- [ ] **Step 6: Commit**

```bash
git add src/app/panel/election-results
git commit -m "feat: add inline row editing to Seçim Sonuçları"
```

---

### Task 8: Navigation and final verification

**Files:**
- Modify: `src/app/panel/_components/sidebar-nav.tsx`
- Modify: `src/app/panel/_components/command-palette.tsx`

**Interfaces:**
- Consumes: `labels.entity.electionResult` (Task 4), the page route (Task 6).
- Produces: nothing downstream — this is the last task.

**Context an implementer needs.** `titleForKey` in `sidebar-nav.tsx` already falls through to `labelCompose.nav(labels.entity[key])` for any key that is not one of the hardcoded page keys, so an entity-keyed nav item needs no change there. The `adminOnly` flag must be **absent**, not `false` — compare with the `businessGroupCard` entry directly above, which has it.

- [ ] **Step 1: Add the sidebar entry**

In `src/app/panel/_components/sidebar-nav.tsx`, add to `navigationItems`, after the `businessGroupCard` entry:

```ts
  {
    key: 'electionResult',
    icon: Vote,
    href: '/panel/election-results',
  },
```

Add `Vote` to the existing `lucide-react` import.

- [ ] **Step 2: Add the command palette entry**

In `src/app/panel/_components/command-palette.tsx`, add to the `pages` array, after the `businessGroupCard` entry. The `businessGroupCard` entry above it carries `adminOnly: true`; this one must **not**:

```ts
  {
    key: 'electionResult',
    icon: Vote,
    href: '/panel/election-results',
  },
```

Add `Vote` to the existing `lucide-react` import in this file too.

- [ ] **Step 3: Run the full verification suite**

Run: `pnpm test && pnpm typecheck && pnpm check`
Expected: all tests pass, no type errors, no lint findings. Do not proceed past a failure — fix it.

- [ ] **Step 4: Verify the label editor round-trip**

Run `pnpm dev`, sign in as an admin, and go to `/panel/settings`. In the Etiketler card, confirm:

- A **Seçim Sonuçları** tab exists.
- It has editable rows for the tekil/çoğul pair, Komite, Toplam Oy, Kullanılan Oy, Geçerli Oy and Meclis Üye Sayısı.
- Yeşil, Mavi and Turuncu appear under **Sütunlar** as read-only rows badged `Sabit`.
- Renaming Komite to something else updates the column header on `/panel/election-results`.
- Renaming the **Meslek Grubu** entity does **not** change the Komite header.

- [ ] **Step 5: Commit**

```bash
git add src/app/panel/_components
git commit -m "feat: add Seçim Sonuçları to navigation"
```

---

## Notes for the reviewer

Three decisions in this plan look like mistakes but are deliberate, each confirmed with the product owner on 2026-09-18:

1. **No permission scoping whatsoever.** Every logged-in user reads and edits every row, including business groups they are not assigned to. This is the only table in the app that skips the role-scoping pattern.
2. **Blank means zero, so the columns are non-null.** A brand-new page shows a wall of `0`s rather than empty cells. That is the intended reading of the requirement, not an unfinished state.
3. **Purple marks a tie**, despite purple already carrying a configured meaning through `src/lib/color-hints.ts` and being used for duplicate-name highlighting on the Meslek Grubu Kartları page. The overload was raised and accepted.

One thing to watch: `src/shared/labels/types.ts` gains a fourth `FieldDefinition` kind, `static`. Any `switch` or `if/else` chain over field kinds elsewhere in the codebase must handle it. `pnpm typecheck` catches the exhaustive ones; the non-exhaustive `if` chain in `labels-card.tsx` is handled in Task 4 Step 7.
