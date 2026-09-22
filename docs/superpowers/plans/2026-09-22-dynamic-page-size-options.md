# Dynamic Page Size Options Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let admins add, edit, remove and default the rows-per-page options of every table from the settings page, which gains a tab shell.

**Architecture:** A sparse `PageSizeConfig` table (one row per diverged table, JSONB option list) layered over a code registry by a pure resolver, exactly mirroring how `LabelOverride` layers over `src/shared/labels/registry.ts`. Each route's server `page.tsx` fetches the resolved config and passes the relevant slice to its page-client as a prop, which seeds `useState` and feeds `DataTable`. The editor is a card in a new `?tab=`-driven settings tab shell.

**Tech Stack:** Next.js 16 App Router · tRPC 11 · Prisma 6 (PostgreSQL) · Zod · shadcn/ui · TanStack Table · Vitest (node env) · Playwright

**Spec:** `docs/superpowers/specs/2026-09-22-dynamic-page-size-options-design.md`

## Global Constraints

- **Package manager is `pnpm`.** If corepack complains, prefix with `COREPACK_ENABLE_STRICT=0`.
- **Prisma client is imported from `generated/prisma`, never `@prisma/client`.** After schema changes run `pnpm db:push` (never `db:generate` — this repo has no migration history) and restart the dev server.
- **Import alias:** `~/*` → `./src/*`.
- **All UI text is Turkish.** Turkish common nouns take suffixes with **no apostrophe** — `Formda Zorunlu`, never `Form'da`.
- **Never bake a required asterisk into a label.** Compose as `{label} *` in JSX.
- **Vitest is `environment: 'node'` and includes `src/**/*.test.ts` only** — no `.tsx`, no component tests. Logic that needs testing must live in a `.ts` file.
- **Option value bounds: integer 1–500 inclusive.** Matches the existing `itemsPerPage: z.number().min(1).max(500)` in every router. No router validation changes.
- **Option count bounds: 1–5 inclusive.**
- **Verification commands:** `pnpm test`, `pnpm typecheck`, `pnpm check` (Biome). Run all three before any commit that touches source.
- **`pnpm check` already fails on `main`** with 6 pre-existing findings (`data-table.tsx:558`, `changelog/page.tsx:90` and `:274`, `report-device-breakdown.tsx:3` and `:16`, `visits/columns.tsx:119`). The gate is **no new Biome findings in files this branch creates or modifies** — a non-zero exit caused only by those six does not block a task, and fixing them is out of scope for this branch. Task 7 modifies `data-table.tsx`, which carries one of them; leave it alone.
- **Do not remove the ~100ms artificial timing delay** in `src/server/api/trpc.ts` — it is intentional in dev.
- **Branch and merge.** Work on `feat/dynamic-page-size-options`, never directly on `main`. Merge with a merge commit, never fast-forwarded:
  ```bash
  git merge --no-ff feat/dynamic-page-size-options -m "Merge branch 'feat/dynamic-page-size-options'"
  git branch -d feat/dynamic-page-size-options
  ```
- **No release/version bump, and no changelog entry.** Leave `src/constants/app-version.ts` and `releases.ts` alone. Per the `release-checklist` skill's three tests, this feature ships silently: the editor and the settings tab shell are admin-facing, so they fail test (2), and the newly-guaranteed ascending dropdown order fails test (3) because every current option list is already ascending — nothing looks different to a user on their next visit. The entry is earned later, by whatever an admin *configures*, not by shipping the ability to configure it.

---

## File Structure

**Created:**

| File | Responsibility |
| --- | --- |
| `src/shared/page-sizes/types.ts` | `PageSizeTableKey`, `PageSizeTableConfig`, `ResolvedPageSizes` |
| `src/shared/page-sizes/registry.ts` | The 9 static keys, their built-in configs and display-name source |
| `src/shared/page-sizes/registry.test.ts` | Registry invariants |
| `src/shared/page-sizes/resolve.ts` | Layers DB rows over the registry |
| `src/shared/page-sizes/resolve.test.ts` | Fallback, override, sort, malformed-row behavior |
| `src/shared/page-sizes/mutate.ts` | Pure editor-state transitions (add/remove/set-value/set-default) |
| `src/shared/page-sizes/mutate.test.ts` | The default-tracking rules |
| `src/shared/zod-schemas/page-size.ts` | `PageSizeTableConfigSchema`, `PageSizeUpdateSchema` |
| `src/shared/zod-schemas/page-size.test.ts` | Boundary validation |
| `src/server/api/routers/page-size.ts` | `get` / `update` procedures |
| `src/server/api/routers/page-size.test.ts` | Sort-on-write, delete-when-default |
| `src/app/panel/settings/settings-tabs.tsx` | Admin tab shell, URL-synced |
| `src/app/panel/settings/page-sizes-card.tsx` | The editor UI |
| `src/app/panel/settings/page-size-row.tsx` | One option row (input + default radio + remove) |
| `e2e/page-sizes.spec.ts` | End-to-end config → table behavior |

**Modified:**

| File | Change |
| --- | --- |
| `prisma/schema.prisma` | Add `PageSizeConfig` model |
| `src/server/api/root.ts` | Register `pageSize` router |
| `src/shared/labels/compose.ts:66,88` | Add `PAGE_SIZE_UPDATED` action and `PAGE_SIZE` resource |
| `src/app/_components/data-table.tsx:111,315` | `pageSizeOptions` becomes required, default removed |
| `src/app/panel/customer-cards/[[...slug]]/page.tsx` | Fetch + pass config |
| `src/app/panel/customer-cards/page-client.tsx:62,439` | Prop-seeded `useState`, dynamic largest-page check |
| `src/app/panel/visits/[[...slug]]/page.tsx` | Fetch + pass config |
| `src/app/panel/visits/page-client.tsx:50,266` | Same |
| `src/app/panel/business-group-cards/page.tsx` | Fetch + pass config |
| `src/app/panel/business-group-cards/page-client.tsx:28,103,120` | Same |
| `src/app/panel/election-results/page.tsx` | Fetch + pass config |
| `src/app/panel/election-results/page-client.tsx:36` | Prop-seeded `useState` |
| `src/app/panel/audit-logs/page.tsx` | Fetch + pass config |
| `src/app/panel/audit-logs/page-client.tsx:44` | Prop-seeded `useState` |
| `src/app/panel/users/page.tsx` | Fetch + pass config |
| `src/app/panel/users/page-client.tsx:40,164` | Prop-seeded, threads 2 slices down |
| `src/app/panel/users/report-tab.tsx:26` | Accepts + threads config |
| `src/app/panel/users/report-actions-dialog.tsx:43` | Accepts config |
| `src/app/panel/settings/page.tsx` | Fetch config, branch admin/non-admin |
| `src/app/panel/settings/sale-representatives-table.tsx:41` | Accepts config |
| `e2e/labels.spec.ts:25,47` | Click the `Etiketler` outer tab first |

---

### Task 0: Branch

- [ ] **Step 1: Cut the feature branch**

```bash
git switch -c feat/dynamic-page-size-options
```

Every task below commits onto this branch. Task 11 merges it.

---

### Task 1: Registry, types and Zod schema

The pure foundation. No DB, no React. Everything later imports from here.

**Files:**
- Create: `src/shared/page-sizes/types.ts`
- Create: `src/shared/page-sizes/registry.ts`
- Create: `src/shared/zod-schemas/page-size.ts`
- Test: `src/shared/page-sizes/registry.test.ts`
- Test: `src/shared/zod-schemas/page-size.test.ts`

**Interfaces:**
- Consumes: `EntityKey` from `~/shared/labels/types`
- Produces:
  - `type PageSizeTableKey` — union of the 9 keys
  - `type PageSizeTableConfig = { options: number[]; defaultValue: number }`
  - `type ResolvedPageSizes = Record<PageSizeTableKey, PageSizeTableConfig>`
  - `pageSizeTables` — the registry object
  - `pageSizeTableKeys: PageSizeTableKey[]`
  - `PageSizeTableConfigSchema`, `PageSizeUpdateSchema`

- [ ] **Step 1: Write the failing tests**

Create `src/shared/zod-schemas/page-size.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { PageSizeTableConfigSchema } from './page-size';

const config = (options: number[], defaultValue: number) => ({
  options,
  defaultValue,
});

describe('PageSizeTableConfigSchema', () => {
  it('accepts a single option', () => {
    expect(PageSizeTableConfigSchema.safeParse(config([25], 25)).success).toBe(
      true,
    );
  });

  it('accepts five options', () => {
    expect(
      PageSizeTableConfigSchema.safeParse(config([1, 2, 3, 4, 5], 3)).success,
    ).toBe(true);
  });

  it('rejects zero options', () => {
    expect(PageSizeTableConfigSchema.safeParse(config([], 25)).success).toBe(
      false,
    );
  });

  it('rejects six options', () => {
    expect(
      PageSizeTableConfigSchema.safeParse(config([1, 2, 3, 4, 5, 6], 3)).success,
    ).toBe(false);
  });

  it('rejects duplicate values', () => {
    expect(
      PageSizeTableConfigSchema.safeParse(config([25, 50, 25], 25)).success,
    ).toBe(false);
  });

  it('accepts the boundary values 1 and 500', () => {
    expect(
      PageSizeTableConfigSchema.safeParse(config([1, 500], 1)).success,
    ).toBe(true);
  });

  it('rejects 0 and 501', () => {
    expect(PageSizeTableConfigSchema.safeParse(config([0], 0)).success).toBe(
      false,
    );
    expect(PageSizeTableConfigSchema.safeParse(config([501], 501)).success).toBe(
      false,
    );
  });

  it('rejects a non-integer value', () => {
    expect(PageSizeTableConfigSchema.safeParse(config([25.5], 25.5)).success).toBe(
      false,
    );
  });

  it('rejects a default that is not among the options', () => {
    expect(
      PageSizeTableConfigSchema.safeParse(config([25, 50], 100)).success,
    ).toBe(false);
  });

  it('accepts options in descending order (sorting is the router’s job)', () => {
    expect(
      PageSizeTableConfigSchema.safeParse(config([500, 25], 25)).success,
    ).toBe(true);
  });
});
```

Create `src/shared/page-sizes/registry.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { PageSizeTableConfigSchema } from '~/shared/zod-schemas/page-size';
import { pageSizeTableKeys, pageSizeTables } from './registry';

/**
 * The keys are a contract with the 9 DataTable call sites listed in the spec.
 * A key added here and forgotten there (or vice versa) is exactly the drift
 * this test exists to catch.
 */
const EXPECTED_KEYS = [
  'customerCard',
  'visit',
  'businessGroupCard',
  'electionResult',
  'user',
  'auditLog',
  'salesRepresentative',
  'userReport',
  'userReportActions',
];

describe('page size registry', () => {
  it('has exactly the expected table keys', () => {
    expect([...pageSizeTableKeys].sort()).toEqual([...EXPECTED_KEYS].sort());
  });

  it.each(Object.entries(pageSizeTables))(
    '%s has a built-in config satisfying the schema',
    (_key, table) => {
      const result = PageSizeTableConfigSchema.safeParse({
        options: [...table.options],
        defaultValue: table.defaultValue,
      });
      expect(result.success).toBe(true);
    },
  );

  it.each(Object.entries(pageSizeTables))(
    '%s has exactly one display-name source',
    (_key, table) => {
      const hasEntity = 'titleEntity' in table;
      const hasStatic = 'staticTitle' in table;
      expect(hasEntity !== hasStatic).toBe(true);
    },
  );
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test src/shared/page-sizes src/shared/zod-schemas/page-size.test.ts`
Expected: FAIL — cannot resolve `./page-size` and `./registry`.

- [ ] **Step 3: Write the types**

Create `src/shared/page-sizes/types.ts`:

```ts
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
```

- [ ] **Step 4: Write the registry**

Create `src/shared/page-sizes/registry.ts`. The values reproduce today's hardcoded behavior exactly — `businessGroupCard` is the one table that already differs (`pageSizeOptions={[50, 100, 500]}`, default 50).

```ts
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
```

- [ ] **Step 5: Write the Zod schema**

Create `src/shared/zod-schemas/page-size.ts`:

```ts
import { z } from 'zod';
import { pageSizeTableKeys } from '~/shared/page-sizes/registry';
import type { PageSizeTableKey } from '~/shared/page-sizes/types';

export const MIN_PAGE_SIZE = 1;
export const MAX_PAGE_SIZE = 500;
export const MIN_OPTION_COUNT = 1;
export const MAX_OPTION_COUNT = 5;

/**
 * Ascending order is deliberately NOT validated here. The router sorts before
 * writing, so sorted-on-read holds regardless of what the form submits.
 */
const baseConfig = z.object({
  options: z
    .array(z.number().int().min(MIN_PAGE_SIZE).max(MAX_PAGE_SIZE))
    .min(MIN_OPTION_COUNT)
    .max(MAX_OPTION_COUNT)
    .refine(
      (options) => new Set(options).size === options.length,
      'Aynı değerden birden fazla olamaz',
    ),
  defaultValue: z.number().int().min(MIN_PAGE_SIZE).max(MAX_PAGE_SIZE),
});

const defaultIsAnOption = (config: {
  options: number[];
  defaultValue: number;
}) => config.options.includes(config.defaultValue);

const DEFAULT_NOT_IN_OPTIONS = 'Varsayılan, seçenekler arasında olmalı';

export const PageSizeTableConfigSchema = baseConfig.refine(
  defaultIsAnOption,
  DEFAULT_NOT_IN_OPTIONS,
);

/**
 * Built by extending the base object rather than intersecting the refined
 * schema: `.refine` returns a ZodEffects, and `z.intersection` over one does
 * not compose the way `.extend` does.
 */
export const PageSizeUpdateSchema = baseConfig
  .extend({
    tableKey: z.enum(
      pageSizeTableKeys as [PageSizeTableKey, ...PageSizeTableKey[]],
    ),
  })
  .refine(defaultIsAnOption, DEFAULT_NOT_IN_OPTIONS);

export type PageSizeUpdateInput = z.infer<typeof PageSizeUpdateSchema>;
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `pnpm test src/shared/page-sizes src/shared/zod-schemas/page-size.test.ts`
Expected: PASS, all cases green.

- [ ] **Step 7: Typecheck and lint**

Run: `pnpm typecheck && pnpm check`
Expected: no errors. If Biome reformats, accept its formatting with `pnpm check:write`.

- [ ] **Step 8: Commit**

```bash
git add src/shared/page-sizes src/shared/zod-schemas/page-size.ts src/shared/zod-schemas/page-size.test.ts
git commit -m "feat: add page size registry, types and validation schema"
```

---

### Task 2: Editor state transitions

The pure functions the editor card will hold the result of. Extracted into a `.ts` file specifically so the default-tracking rules — the subtlest part of this feature — are testable in the existing node-environment Vitest setup.

**Files:**
- Create: `src/shared/page-sizes/mutate.ts`
- Test: `src/shared/page-sizes/mutate.test.ts`

**Interfaces:**
- Consumes: `MAX_OPTION_COUNT`, `MIN_OPTION_COUNT` from `~/shared/zod-schemas/page-size`
- Produces:
  - `type DraftConfig = { options: string[]; defaultValue: string }` — values are **strings** because they are bound to text inputs and pass through `''` and partial numbers while typing
  - `setOptionValue(draft: DraftConfig, index: number, nextValue: string): DraftConfig`
  - `removeOption(draft: DraftConfig, index: number): DraftConfig`
  - `addOption(draft: DraftConfig): DraftConfig`
  - `setDefaultOption(draft: DraftConfig, index: number): DraftConfig`
  - `toDraft(config: PageSizeTableConfig): DraftConfig`
  - `fromDraft(draft: DraftConfig): { options: number[]; defaultValue: number }`

- [ ] **Step 1: Write the failing test**

Create `src/shared/page-sizes/mutate.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  addOption,
  type DraftConfig,
  fromDraft,
  removeOption,
  setDefaultOption,
  setOptionValue,
  toDraft,
} from './mutate';

const draft = (options: string[], defaultValue: string): DraftConfig => ({
  options,
  defaultValue,
});

describe('setOptionValue', () => {
  it('carries the default when the default row is edited', () => {
    const result = setOptionValue(draft(['25', '50', '100'], '50'), 1, '60');
    expect(result.options).toEqual(['25', '60', '100']);
    expect(result.defaultValue).toBe('60');
  });

  it('leaves the default alone when another row is edited', () => {
    const result = setOptionValue(draft(['25', '50', '100'], '50'), 0, '30');
    expect(result.options).toEqual(['30', '50', '100']);
    expect(result.defaultValue).toBe('50');
  });

  it('carries the default through an empty intermediate value', () => {
    const result = setOptionValue(draft(['25', '50'], '50'), 1, '');
    expect(result.defaultValue).toBe('');
  });

  it('does not reorder while editing', () => {
    const result = setOptionValue(draft(['25', '50', '100'], '25'), 2, '10');
    expect(result.options).toEqual(['25', '50', '10']);
  });
});

describe('removeOption', () => {
  it('reassigns the default to the smallest remaining when the default is removed', () => {
    const result = removeOption(draft(['25', '50', '100'], '50'), 1);
    expect(result.options).toEqual(['25', '100']);
    expect(result.defaultValue).toBe('25');
  });

  it('leaves the default alone when another row is removed', () => {
    const result = removeOption(draft(['25', '50', '100'], '50'), 2);
    expect(result.options).toEqual(['25', '50']);
    expect(result.defaultValue).toBe('50');
  });

  it('is a no-op at one option', () => {
    const only = draft(['25'], '25');
    expect(removeOption(only, 0)).toEqual(only);
  });

  it('ignores unparseable remaining values when picking the smallest', () => {
    const result = removeOption(draft(['', '50', '100'], '100'), 2);
    expect(result.defaultValue).toBe('50');
  });
});

describe('addOption', () => {
  it('appends an empty row at the bottom', () => {
    const result = addOption(draft(['25', '50'], '25'));
    expect(result.options).toEqual(['25', '50', '']);
    expect(result.defaultValue).toBe('25');
  });

  it('is a no-op at five options', () => {
    const full = draft(['1', '2', '3', '4', '5'], '1');
    expect(addOption(full)).toEqual(full);
  });
});

describe('setDefaultOption', () => {
  it('moves the default to the given row', () => {
    const result = setDefaultOption(draft(['25', '50'], '25'), 1);
    expect(result.defaultValue).toBe('50');
  });
});

describe('toDraft / fromDraft', () => {
  it('round-trips a config', () => {
    const config = { options: [25, 50, 100], defaultValue: 50 };
    expect(fromDraft(toDraft(config))).toEqual(config);
  });

  it('sorts options ascending on the way out', () => {
    expect(fromDraft(draft(['100', '25', '50'], '25')).options).toEqual([
      25, 50, 100,
    ]);
  });

  it('yields NaN for an unparseable draft so the schema rejects it', () => {
    expect(Number.isNaN(fromDraft(draft([''], '')).defaultValue)).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test src/shared/page-sizes/mutate.test.ts`
Expected: FAIL — cannot resolve `./mutate`.

- [ ] **Step 3: Write the implementation**

Create `src/shared/page-sizes/mutate.ts`:

```ts
import {
  MAX_OPTION_COUNT,
  MIN_OPTION_COUNT,
} from '~/shared/zod-schemas/page-size';
import type { PageSizeTableConfig } from './types';

/**
 * Editor state. Option values are strings, not numbers, because they are bound
 * to text inputs and legitimately pass through '' and partial numbers while
 * the admin types. Zod parses at submit; save stays disabled until then.
 *
 * The default is tracked BY VALUE rather than by a synthetic row id — values
 * are unique within any valid state, so the value identifies the row. The two
 * mutation paths below are what keep that identity intact: without them,
 * editing or removing the default row leaves `defaultValue` pointing at a row
 * that no longer exists.
 */
export type DraftConfig = {
  options: string[];
  defaultValue: string;
};

/** '' parses to 0, not NaN, so an empty row would otherwise win Math.min and
 * pass the finite check. Screen it out explicitly. */
const toNumbers = (values: string[]) =>
  values
    .filter((value) => value.trim() !== '')
    .map(Number)
    .filter((value) => Number.isInteger(value));

/** An empty field is not the number zero. Yield NaN so the schema rejects it
 * rather than silently submitting 0. */
const parseValue = (value: string) =>
  value.trim() === '' ? Number.NaN : Number(value);

export function toDraft(config: PageSizeTableConfig): DraftConfig {
  return {
    options: config.options.map(String),
    defaultValue: String(config.defaultValue),
  };
}

export function fromDraft(draft: DraftConfig) {
  return {
    options: draft.options.map(parseValue).sort((a, b) => a - b),
    defaultValue: parseValue(draft.defaultValue),
  };
}

export function setOptionValue(
  draft: DraftConfig,
  index: number,
  nextValue: string,
): DraftConfig {
  const previousValue = draft.options[index];
  const options = draft.options.map((value, i) =>
    i === index ? nextValue : value,
  );

  return {
    options,
    // The edited row was the default, so the default follows it.
    defaultValue:
      previousValue === draft.defaultValue ? nextValue : draft.defaultValue,
  };
}

export function removeOption(draft: DraftConfig, index: number): DraftConfig {
  if (draft.options.length <= MIN_OPTION_COUNT) return draft;

  const removedValue = draft.options[index];
  const options = draft.options.filter((_, i) => i !== index);
  if (removedValue !== draft.defaultValue) {
    return { options, defaultValue: draft.defaultValue };
  }

  // The default was removed; hand it to the smallest remaining option.
  // Unparseable rows (mid-edit '' or '4x') cannot be a default, so skip them —
  // and if every remaining row is unparseable, keep the field empty and let
  // validation block the save.
  const parsed = toNumbers(options);
  return {
    options,
    defaultValue: parsed.length > 0 ? String(Math.min(...parsed)) : '',
  };
}

export function addOption(draft: DraftConfig): DraftConfig {
  if (draft.options.length >= MAX_OPTION_COUNT) return draft;
  return { ...draft, options: [...draft.options, ''] };
}

export function setDefaultOption(
  draft: DraftConfig,
  index: number,
): DraftConfig {
  const value = draft.options[index];
  if (value === undefined) return draft;
  return { ...draft, defaultValue: value };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test src/shared/page-sizes/mutate.test.ts`
Expected: PASS.

- [ ] **Step 5: Typecheck, lint and commit**

```bash
pnpm typecheck && pnpm check
git add src/shared/page-sizes/mutate.ts src/shared/page-sizes/mutate.test.ts
git commit -m "feat: add page size editor state transitions"
```

---

### Task 3: Resolver

**Files:**
- Create: `src/shared/page-sizes/resolve.ts`
- Test: `src/shared/page-sizes/resolve.test.ts`

**Interfaces:**
- Consumes: `pageSizeTables`, `pageSizeTableKeys` (Task 1), `PageSizeTableConfigSchema` (Task 1)
- Produces:
  - `DEFAULT_PAGE_SIZES: ResolvedPageSizes`
  - `resolvePageSizes(rows: PageSizeConfigRow[]): ResolvedPageSizes`
  - `type PageSizeConfigRow = { tableKey: string; options: unknown; defaultValue: number }`

- [ ] **Step 1: Write the failing test**

Create `src/shared/page-sizes/resolve.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { pageSizeTables } from './registry';
import { DEFAULT_PAGE_SIZES, resolvePageSizes } from './resolve';

describe('resolvePageSizes', () => {
  it('falls back to the registry for a table with no row', () => {
    const resolved = resolvePageSizes([]);
    expect(resolved.customerCard).toEqual({
      options: [25, 50, 100, 500],
      defaultValue: 25,
    });
    expect(resolved.businessGroupCard).toEqual({
      options: [50, 100, 500],
      defaultValue: 50,
    });
  });

  it('returns every registry key even when rows are sparse', () => {
    const resolved = resolvePageSizes([
      { tableKey: 'visit', options: [10], defaultValue: 10 },
    ]);
    expect(Object.keys(resolved).sort()).toEqual(
      Object.keys(pageSizeTables).sort(),
    );
  });

  it('applies a stored row over the registry default', () => {
    const resolved = resolvePageSizes([
      { tableKey: 'customerCard', options: [10, 20], defaultValue: 20 },
    ]);
    expect(resolved.customerCard).toEqual({
      options: [10, 20],
      defaultValue: 20,
    });
  });

  it('sorts stored options ascending regardless of stored order', () => {
    const resolved = resolvePageSizes([
      { tableKey: 'visit', options: [100, 10, 50], defaultValue: 10 },
    ]);
    expect(resolved.visit.options).toEqual([10, 50, 100]);
  });

  it('sorts registry defaults ascending too', () => {
    for (const config of Object.values(resolvePageSizes([]))) {
      expect(config.options).toEqual([...config.options].sort((a, b) => a - b));
    }
  });

  it('ignores a row whose key is not in the registry', () => {
    const resolved = resolvePageSizes([
      { tableKey: 'retiredTable', options: [7], defaultValue: 7 },
    ]);
    expect(resolved).toEqual(DEFAULT_PAGE_SIZES);
  });

  it.each([
    ['options is not an array', { options: 'nope', defaultValue: 25 }],
    ['an option is out of range', { options: [900], defaultValue: 900 }],
    ['there are six options', { options: [1, 2, 3, 4, 5, 6], defaultValue: 1 }],
    ['there are no options', { options: [], defaultValue: 25 }],
    ['the default is not an option', { options: [10, 20], defaultValue: 99 }],
    ['options contains a non-number', { options: [10, 'x'], defaultValue: 10 }],
  ])('falls back to the registry when %s', (_name, row) => {
    const resolved = resolvePageSizes([{ tableKey: 'customerCard', ...row }]);
    expect(resolved.customerCard).toEqual(DEFAULT_PAGE_SIZES.customerCard);
  });

  it('does not throw on a malformed row', () => {
    expect(() =>
      resolvePageSizes([
        { tableKey: 'customerCard', options: null, defaultValue: 0 },
      ]),
    ).not.toThrow();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test src/shared/page-sizes/resolve.test.ts`
Expected: FAIL — cannot resolve `./resolve`.

- [ ] **Step 3: Write the implementation**

Create `src/shared/page-sizes/resolve.ts`:

```ts
import { PageSizeTableConfigSchema } from '~/shared/zod-schemas/page-size';
import { pageSizeTableKeys, pageSizeTables } from './registry';
import type {
  PageSizeTableConfig,
  PageSizeTableKey,
  ResolvedPageSizes,
} from './types';

/** The shape a `PageSizeConfig` row arrives in. `options` is JSONB, so it is
 * `unknown` until the schema has vouched for it. */
export type PageSizeConfigRow = {
  tableKey: string;
  options: unknown;
  defaultValue: number;
};

const sorted = (options: number[]) => [...options].sort((a, b) => a - b);

const registryConfig = (key: PageSizeTableKey): PageSizeTableConfig => {
  const table = pageSizeTables[key];
  return { options: sorted(table.options), defaultValue: table.defaultValue };
};

export const DEFAULT_PAGE_SIZES: ResolvedPageSizes = Object.fromEntries(
  pageSizeTableKeys.map((key) => [key, registryConfig(key)]),
) as ResolvedPageSizes;

const isTableKey = (key: string): key is PageSizeTableKey =>
  key in pageSizeTables;

/**
 * Layers stored rows over the registry. A row that fails validation — a
 * hand-edited DB, or a key retired in code — is discarded in favour of the
 * registry default rather than throwing: a single bad row must never take the
 * panel down.
 */
export function resolvePageSizes(
  rows: PageSizeConfigRow[],
): ResolvedPageSizes {
  const overrides = new Map<PageSizeTableKey, PageSizeTableConfig>();

  for (const row of rows) {
    if (!isTableKey(row.tableKey)) continue;

    const parsed = PageSizeTableConfigSchema.safeParse({
      options: row.options,
      defaultValue: row.defaultValue,
    });
    if (!parsed.success) continue;

    overrides.set(row.tableKey, {
      options: sorted(parsed.data.options),
      defaultValue: parsed.data.defaultValue,
    });
  }

  return Object.fromEntries(
    pageSizeTableKeys.map((key) => [
      key,
      overrides.get(key) ?? registryConfig(key),
    ]),
  ) as ResolvedPageSizes;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test src/shared/page-sizes/resolve.test.ts`
Expected: PASS.

- [ ] **Step 5: Typecheck, lint and commit**

```bash
pnpm typecheck && pnpm check
git add src/shared/page-sizes/resolve.ts src/shared/page-sizes/resolve.test.ts
git commit -m "feat: add page size config resolver"
```

---

### Task 4: Prisma model, router and audit strings

**Files:**
- Modify: `prisma/schema.prisma` (after the `LabelOverride` model, around line 165)
- Create: `src/server/api/routers/page-size.ts`
- Modify: `src/server/api/root.ts`
- Modify: `src/shared/labels/compose.ts:66` and `:88`
- Test: `src/server/api/routers/page-size.test.ts`

**Interfaces:**
- Consumes: `resolvePageSizes`, `DEFAULT_PAGE_SIZES` (Task 3), `PageSizeUpdateSchema` (Task 1), `createAuditLog` from `~/server/api/trpc`
- Produces:
  - `pageSizeRouter` with `get` (protected) and `update` (admin)
  - `normalizeUpdate(input)` — exported for testing: returns `{ options, defaultValue, matchesRegistry }`

- [ ] **Step 1: Add the Prisma model**

Add to `prisma/schema.prisma` directly after the `LabelOverride` model:

```prisma
model PageSizeConfig {
  tableKey     String   @id
  options      Json
  defaultValue Int
  updatedAt    DateTime @updatedAt
  updatedById  String?
}
```

- [ ] **Step 2: Push the schema and regenerate the client**

Run: `pnpm db:push`
Expected: "Your database is now in sync with your Prisma schema." followed by client generation into `./generated/prisma`.

If the dev server is running, restart it so it picks up the regenerated client.

- [ ] **Step 3: Write the failing test**

Create `src/server/api/routers/page-size.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { normalizeUpdate } from './page-size';

describe('normalizeUpdate', () => {
  it('sorts options ascending', () => {
    const result = normalizeUpdate({
      tableKey: 'customerCard',
      options: [500, 25, 100],
      defaultValue: 25,
    });
    expect(result.options).toEqual([25, 100, 500]);
  });

  it('flags a config identical to the registry default', () => {
    const result = normalizeUpdate({
      tableKey: 'customerCard',
      options: [25, 50, 100, 500],
      defaultValue: 25,
    });
    expect(result.matchesRegistry).toBe(true);
  });

  it('flags an out-of-order config that still equals the registry default', () => {
    const result = normalizeUpdate({
      tableKey: 'businessGroupCard',
      options: [500, 50, 100],
      defaultValue: 50,
    });
    expect(result.matchesRegistry).toBe(true);
  });

  it('does not flag a config with a different default', () => {
    const result = normalizeUpdate({
      tableKey: 'customerCard',
      options: [25, 50, 100, 500],
      defaultValue: 50,
    });
    expect(result.matchesRegistry).toBe(false);
  });

  it('does not flag a config with different options', () => {
    const result = normalizeUpdate({
      tableKey: 'customerCard',
      options: [25, 50],
      defaultValue: 25,
    });
    expect(result.matchesRegistry).toBe(false);
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `pnpm test src/server/api/routers/page-size.test.ts`
Expected: FAIL — cannot resolve `./page-size`.

- [ ] **Step 5: Write the router**

Create `src/server/api/routers/page-size.ts`:

```ts
import { pageSizeTables } from '~/shared/page-sizes/registry';
import {
  type PageSizeConfigRow,
  resolvePageSizes,
} from '~/shared/page-sizes/resolve';
import type { PageSizeTableConfig } from '~/shared/page-sizes/types';
import {
  type PageSizeUpdateInput,
  PageSizeUpdateSchema,
} from '~/shared/zod-schemas/page-size';
import {
  adminProcedure,
  createAuditLog,
  createTRPCRouter,
  protectedProcedure,
} from '~/server/api/trpc';

const sameConfig = (a: PageSizeTableConfig, b: PageSizeTableConfig) =>
  a.defaultValue === b.defaultValue &&
  a.options.length === b.options.length &&
  a.options.every((value, index) => value === b.options[index]);

/**
 * Sorts the submitted options and reports whether the result is identical to
 * the table's built-in config. An identical config is stored as the ABSENCE of
 * a row, which is what keeps the table sparse — same contract as
 * `LabelOverride`, where an override equal to its default is deleted rather
 * than written.
 */
export function normalizeUpdate(input: PageSizeUpdateInput) {
  const options = [...input.options].sort((a, b) => a - b);
  const registry = pageSizeTables[input.tableKey];
  const registryConfig: PageSizeTableConfig = {
    options: [...registry.options].sort((a, b) => a - b),
    defaultValue: registry.defaultValue,
  };

  return {
    options,
    defaultValue: input.defaultValue,
    matchesRegistry: sameConfig(
      { options, defaultValue: input.defaultValue },
      registryConfig,
    ),
  };
}

const describeChange = (
  tableKey: string,
  next: { options: number[]; defaultValue: number },
  previous: PageSizeTableConfig | null,
) => {
  const format = (config: { options: number[]; defaultValue: number }) =>
    `${config.options.join(', ')} (varsayılan ${config.defaultValue})`;

  return previous
    ? `${tableKey}: ${format(previous)} → ${format(next)}`
    : `${tableKey}: ${format(next)}`;
};

export const pageSizeRouter = createTRPCRouter({
  get: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.pageSizeConfig.findMany();
    return resolvePageSizes(rows as PageSizeConfigRow[]);
  }),

  update: adminProcedure
    .input(PageSizeUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const { options, defaultValue, matchesRegistry } = normalizeUpdate(input);

      // Read before writing so the audit detail describes what actually
      // changed rather than what was submitted.
      const existingRow = await ctx.db.pageSizeConfig.findUnique({
        where: { tableKey: input.tableKey },
      });
      const previous = existingRow
        ? resolvePageSizes([existingRow as PageSizeConfigRow])[input.tableKey]
        : null;

      try {
        if (matchesRegistry) {
          await ctx.db.pageSizeConfig.deleteMany({
            where: { tableKey: input.tableKey },
          });
        } else {
          await ctx.db.pageSizeConfig.upsert({
            where: { tableKey: input.tableKey },
            update: {
              options,
              defaultValue,
              updatedById: ctx.session.user.id,
            },
            create: {
              tableKey: input.tableKey,
              options,
              defaultValue,
              updatedById: ctx.session.user.id,
            },
          });
        }
      } catch (error) {
        await createAuditLog(
          ctx,
          'PAGE_SIZE_UPDATED',
          'PAGE_SIZE',
          input.tableKey,
          'FAILURE',
          error instanceof Error ? error.message : 'Bilinmeyen hata',
        );
        throw error;
      }

      await createAuditLog(
        ctx,
        'PAGE_SIZE_UPDATED',
        'PAGE_SIZE',
        input.tableKey,
        'SUCCESS',
        undefined,
        describeChange(input.tableKey, { options, defaultValue }, previous),
      );

      return { success: true as const };
    }),
});
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `pnpm test src/server/api/routers/page-size.test.ts`
Expected: PASS.

- [ ] **Step 7: Register the router**

In `src/server/api/root.ts`, add the import alongside the others and the entry in `createTRPCRouter`:

```ts
import { pageSizeRouter } from '~/server/api/routers/page-size';
```

```ts
  label: labelRouter,
  pageSize: pageSizeRouter,
  user: userRouter,
```

- [ ] **Step 8: Add the audit strings**

In `src/shared/labels/compose.ts`, add to `auditActionLabels`'s returned object, directly after `LABEL_UPDATED`:

```ts
    LABEL_UPDATED: 'Etiketler Güncellendi',
    PAGE_SIZE_UPDATED: 'Sayfa Boyutu Güncellendi',
```

and to `resourceTypeLabels`, after `LABEL`:

```ts
    LABEL: 'Etiket',
    PAGE_SIZE: 'Sayfa Boyutu',
```

- [ ] **Step 9: Verify the whole suite, typecheck and lint**

Run: `pnpm test && pnpm typecheck && pnpm check`
Expected: all green. `compose.test.ts` may assert on the shape of the returned maps — if it enumerates keys, add the two new ones there.

- [ ] **Step 10: Commit**

```bash
git add prisma/schema.prisma src/server/api/routers/page-size.ts src/server/api/routers/page-size.test.ts src/server/api/root.ts src/shared/labels/compose.ts
git commit -m "feat: add page size config model and router"
```

---

### Task 5: Migrate the six main routes

Each route's server page fetches the resolved config and hands its slice to the page-client. `pageSizeOptions` stays optional on `DataTable` for now — Task 7 makes it required once every call site passes it, so typecheck stays green throughout.

**Files:**
- Modify: `src/app/panel/customer-cards/[[...slug]]/page.tsx`, `src/app/panel/customer-cards/page-client.tsx:62`
- Modify: `src/app/panel/visits/[[...slug]]/page.tsx`, `src/app/panel/visits/page-client.tsx:50`
- Modify: `src/app/panel/business-group-cards/page.tsx`, `src/app/panel/business-group-cards/page-client.tsx:28,103`
- Modify: `src/app/panel/election-results/page.tsx`, `src/app/panel/election-results/page-client.tsx:36`
- Modify: `src/app/panel/audit-logs/page.tsx`, `src/app/panel/audit-logs/page-client.tsx:44`
- Modify: `src/app/panel/users/page.tsx`, `src/app/panel/users/page-client.tsx:40`

**Interfaces:**
- Consumes: `api.pageSize.get` (Task 4), `PageSizeTableConfig` (Task 1)
- Produces: each page-client gains a required `pageSize: PageSizeTableConfig` prop

- [ ] **Step 1: Migrate the customer-cards route**

In `src/app/panel/customer-cards/[[...slug]]/page.tsx`, add the config fetch to the existing `Promise.all` and pass the slice down:

```tsx
import { api, HydrateClient } from '~/trpc/server';
import { CustomerCardsPageClient } from '../page-client';

export default async function CustomerCardsPage() {
  const [, , , pageSizes] = await Promise.all([
    api.customerCard.get.prefetch({}),
    api.businessGroup.get.prefetch(),
    api.salesRepresentative.get.prefetch(),
    api.pageSize.get(),
  ]);

  return (
    <HydrateClient>
      <CustomerCardsPageClient pageSize={pageSizes.customerCard} />
    </HydrateClient>
  );
}
```

Note this is `api.pageSize.get()` — an actual call whose value we use — not `.prefetch()`.

- [ ] **Step 2: Accept the prop in the customer-cards page-client**

In `src/app/panel/customer-cards/page-client.tsx`, add the import, the prop, and seed `useState` from it (currently line 62, `pageSize: 25`):

```tsx
import type { PageSizeTableConfig } from '~/shared/page-sizes/types';

export function CustomerCardsPageClient({
  pageSize,
}: {
  pageSize: PageSizeTableConfig;
}) {
  // ...
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: pageSize.defaultValue,
  });
```

If the component already takes props, add `pageSize` to the existing props object and type rather than replacing them.

Then pass the options to `DataTable`:

```tsx
<DataTable
  // ...existing props
  pageSizeOptions={pageSize.options}
/>
```

- [ ] **Step 3: Verify the customer-cards route**

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 4: Repeat for visits**

`src/app/panel/visits/[[...slug]]/page.tsx`:

```tsx
import { api, HydrateClient } from '~/trpc/server';
import { VisitsPageClient } from '../page-client';

export default async function VisitsPage() {
  const [, pageSizes] = await Promise.all([
    api.visit.get.prefetch({}),
    api.pageSize.get(),
  ]);

  return (
    <HydrateClient>
      <VisitsPageClient pageSize={pageSizes.visit} />
    </HydrateClient>
  );
}
```

In `src/app/panel/visits/page-client.tsx`, the same three edits as Steps 2: import the type, accept `pageSize: PageSizeTableConfig`, seed `useState` (line 50) with `pageSize.defaultValue`, pass `pageSizeOptions={pageSize.options}` to `DataTable`.

- [ ] **Step 5: Repeat for business-group-cards**

`src/app/panel/business-group-cards/page.tsx` keeps its admin redirect:

```tsx
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '~/server/better-auth';
import { api, HydrateClient } from '~/trpc/server';
import { BusinessGroupCardsPageClient } from './page-client';

export default async function BusinessGroupCardsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.user?.role !== 'admin') redirect('/panel/dashboard');

  const [, pageSizes] = await Promise.all([
    api.businessGroupCard.get.prefetch({}),
    api.pageSize.get(),
  ]);

  return (
    <HydrateClient>
      <BusinessGroupCardsPageClient pageSize={pageSizes.businessGroupCard} />
    </HydrateClient>
  );
}
```

In `page-client.tsx`: seed `useState` (line 28) with `pageSize.defaultValue`, and **replace** the existing hardcoded `pageSizeOptions={[50, 100, 500]}` at line 103 with `pageSizeOptions={pageSize.options}`.

- [ ] **Step 6: Repeat for election-results**

`src/app/panel/election-results/page.tsx` — keep the existing comment about the absent role guard:

```tsx
import { api, HydrateClient } from '~/trpc/server';
import { ElectionResultsPageClient } from './page-client';

// No role guard on purpose: this page is visible and editable to every role.
export default async function ElectionResultsPage() {
  const [, pageSizes] = await Promise.all([
    api.electionResult.get.prefetch({}),
    api.pageSize.get(),
  ]);

  return (
    <HydrateClient>
      <ElectionResultsPageClient pageSize={pageSizes.electionResult} />
    </HydrateClient>
  );
}
```

Then the same page-client edits (line 36).

- [ ] **Step 7: Repeat for audit-logs**

`src/app/panel/audit-logs/page.tsx` keeps its admin redirect; fetch alongside `api.auditLog.get.prefetch({})` and pass `pageSizes.auditLog`. Same page-client edits (line 44).

- [ ] **Step 8: Repeat for users**

`src/app/panel/users/page.tsx` keeps its admin redirect. This page passes the **whole** resolved object, because Task 6 threads two more slices through this client:

```tsx
  const [, pageSizes] = await Promise.all([
    api.user.get.prefetch({}),
    api.pageSize.get(),
  ]);

  return (
    <HydrateClient>
      <UsersPageClient pageSizes={pageSizes} />
    </HydrateClient>
  );
```

In `src/app/panel/users/page-client.tsx`, accept `pageSizes: ResolvedPageSizes`, seed `useState` (line 40) with `pageSizes.user.defaultValue`, and pass `pageSizeOptions={pageSizes.user.options}` to its `DataTable`.

- [ ] **Step 9: Verify all six routes**

Run: `pnpm typecheck && pnpm check && pnpm test`
Expected: all green.

- [ ] **Step 10: Manually smoke-test**

Run: `pnpm dev`, then visit `/panel/customer-cards`, `/panel/visits`, `/panel/business-group-cards`, `/panel/election-results`, `/panel/audit-logs`, `/panel/users`.
Expected: each table opens at the same page size it did before (25 everywhere except Meslek Grubu Kartları at 50) and its dropdown shows the same options.

- [ ] **Step 11: Commit**

```bash
git add src/app/panel
git commit -m "feat: source page size config from the server on the six main tables"
```

---

### Task 6: Migrate the settings and nested Kullanıcılar tables

**Files:**
- Modify: `src/app/panel/settings/page.tsx`
- Modify: `src/app/panel/settings/sale-representatives-table.tsx:41`
- Modify: `src/app/panel/users/page-client.tsx` (renders `<UserReportTab />`)
- Modify: `src/app/panel/users/report-tab.tsx:26` (renders `<ReportActionsDialog />`)
- Modify: `src/app/panel/users/report-actions-dialog.tsx:43`

**Interfaces:**
- Consumes: `pageSizes: ResolvedPageSizes` already reaching `UsersPageClient` (Task 5, Step 8)
- Produces: `SaleRepresentativesTable`, `UserReportTab` and `ReportActionsDialog` each take a `pageSize: PageSizeTableConfig` prop; `UserReportTab` additionally takes `actionsPageSize: PageSizeTableConfig`

- [ ] **Step 1: Thread the config into the settings SR table**

In `src/app/panel/settings/page.tsx`, add the fetch to the existing `Promise.all` block. The current code builds a `prefetches` array; fetch the config separately so its value is usable:

```tsx
  const [labels, pageSizes] = await Promise.all([
    api.label.get(),
    api.pageSize.get(),
  ]);

  const prefetches = [
    api.salesRepresentative.getPaginated.prefetch({
      page: 1,
      itemsPerPage: pageSizes.salesRepresentative.defaultValue,
      filter: { search: '' },
      sorting: [],
    }),
  ];
  if (isAdmin) prefetches.push(api.businessGroup.get.prefetch());
  await Promise.all(prefetches);
```

Note the prefetch's `itemsPerPage` now matches what the client will actually request — otherwise the prefetched page is for a different size and is discarded.

Then pass it down:

```tsx
<SaleRepresentativesTable pageSize={pageSizes.salesRepresentative} />
```

- [ ] **Step 2: Accept the prop in the SR table**

In `src/app/panel/settings/sale-representatives-table.tsx`:

```tsx
import type { PageSizeTableConfig } from '~/shared/page-sizes/types';

export default function SaleRepresentativesTable({
  pageSize,
}: {
  pageSize: PageSizeTableConfig;
}) {
  const labels = useLabels();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: pageSize.defaultValue,
  });
```

and on the `DataTable` at line 131, add `pageSizeOptions={pageSize.options}`.

- [ ] **Step 3: Thread the two report slices down**

In `src/app/panel/users/page-client.tsx`, find `<UserReportTab />` (inside `<TabsContent value="report">`) and pass both slices:

```tsx
<TabsContent value="report">
  <UserReportTab
    actionsPageSize={pageSizes.userReportActions}
    pageSize={pageSizes.userReport}
  />
</TabsContent>
```

- [ ] **Step 4: Accept and forward in the report tab**

In `src/app/panel/users/report-tab.tsx`:

```tsx
import type { PageSizeTableConfig } from '~/shared/page-sizes/types';

export function UserReportTab({
  actionsPageSize,
  pageSize,
}: {
  actionsPageSize: PageSizeTableConfig;
  pageSize: PageSizeTableConfig;
}) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: pageSize.defaultValue,
  });
```

Add `pageSizeOptions={pageSize.options}` to this file's `DataTable`, and forward the other slice to the dialog:

```tsx
<ReportActionsDialog
  // ...existing props
  pageSize={actionsPageSize}
/>
```

- [ ] **Step 5: Accept the prop in the actions dialog**

In `src/app/panel/users/report-actions-dialog.tsx`, add `pageSize: PageSizeTableConfig` to `ReportActionsDialogProps`, destructure it, seed `useState` (line 43) with `pageSize.defaultValue`, and add `pageSizeOptions={pageSize.options}` to its `DataTable`.

- [ ] **Step 6: Verify**

Run: `pnpm typecheck && pnpm check && pnpm test`
Expected: all green.

- [ ] **Step 7: Manually smoke-test**

Run: `pnpm dev`, visit `/panel/settings` and `/panel/users` → Kullanıcı Raporu tab → open a user's actions dialog.
Expected: all three tables open at 25 with the four standard options, exactly as before.

- [ ] **Step 8: Commit**

```bash
git add src/app/panel
git commit -m "feat: source page size config on the settings and user report tables"
```

---

### Task 7: Make the prop required and derive the largest page size

Every call site now passes config, so the fallback can go — and the four hardcoded `=== 500` checks can start meaning what they say.

**Files:**
- Modify: `src/app/_components/data-table.tsx:111,315`
- Modify: `src/app/panel/customer-cards/page-client.tsx:439`
- Modify: `src/app/panel/business-group-cards/page-client.tsx:120`
- Modify: `src/app/panel/users/page-client.tsx:164`
- Modify: `src/app/panel/visits/page-client.tsx:266`

**Interfaces:**
- Consumes: every migrated call site from Tasks 5 and 6
- Produces: `DataTableProps.pageSizeOptions` is `number[]`, no longer optional

- [ ] **Step 1: Express pagination as all-or-nothing**

> **Superseded during execution.** The step below assumed all call sites
> paginate and told you to make `pageSizeOptions` unconditionally required.
> There are ten call sites, and the Meslek Grupları table is unpaginated, so the
> prop became part of a union instead: `pagination`, `setPagination` and
> `pageSizeOptions` are all present or all absent. The default value is still
> removed. See the spec's "DataTable" section for the implemented shape.


In `src/app/_components/data-table.tsx`, change line 111 in `DataTableProps`:

```ts
  pageSizeOptions: number[];
```

and remove the default from the destructure at line 315:

```ts
  pageSizeOptions,
```

- [ ] **Step 2: Run typecheck as the migration checklist**

Run: `pnpm typecheck`
Expected: PASS. Any error naming a `DataTable` usage is a call site Tasks 5 or 6 missed — fix it by passing that table's `pageSize.options` rather than by reinstating the default.

- [ ] **Step 3: Replace the four largest-page-size checks**

In each of the four page-clients, add near the other derived values at the top of the component:

```ts
// The largest configured option: at that size the whole result set is already
// on screen, so a save patches the cached page instead of refetching it.
const largestPageSize = Math.max(...pageSize.options);
```

For `users/page-client.tsx` the config object is named `pageSizes`, so use `Math.max(...pageSizes.user.options)`.

Then replace each `if (pagination.pageSize === 500) {` with:

```ts
if (pagination.pageSize === largestPageSize) {
```

and update the comment above it, which currently reads "Largest page size — avoid re-fetching all 500 rows on every save", to drop the literal 500:

```ts
// Largest page size — avoid re-fetching the whole page on
// every save, patch the already-cached page instead
```

- [ ] **Step 4: Verify**

Run: `pnpm typecheck && pnpm check && pnpm test`
Expected: all green.

Confirm no hardcoded checks survive:

Run: `grep -rn "pageSize === 500" src/`
Expected: no output.

- [ ] **Step 5: Manually verify the cache-patch path still fires**

Run: `pnpm dev`, go to `/panel/customer-cards`, set the dropdown to 500, open a card, edit a field and save.
Expected: the row updates in place with no full-table refetch (the table does not flash a loading state).

- [ ] **Step 6: Commit**

```bash
git add src/app/_components/data-table.tsx src/app/panel
git commit -m "refactor: require page size options and derive the largest page size"
```

---

### Task 8: Settings tab shell

**Files:**
- Create: `src/app/panel/settings/settings-tabs.tsx`
- Modify: `src/app/panel/settings/page.tsx`
- Modify: `e2e/labels.spec.ts:25,47`

**Interfaces:**
- Consumes: `SaleRepresentativesTable` (Task 6), `BusinessGroupsTable`, `LabelsCard`, `labels.entity` from `api.label.get()`
- Produces: `SettingsTabs` — takes `pageSizes: ResolvedPageSizes`; Task 9 adds the fourth panel to it

- [ ] **Step 1: Write the tab shell**

Create `src/app/panel/settings/settings-tabs.tsx`. Slugs are stable English identifiers, never derived from labels — they are a URL contract and a renamed entity must not break saved links.

```tsx
'use client';

import { useSearchParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { useLabels } from '~/hooks/use-labels';
import { labelCompose } from '~/shared/labels/compose';
import type { ResolvedPageSizes } from '~/shared/page-sizes/types';
import BusinessGroupsTable from './business-groups-table';
import { LabelsCard } from './labels-card';
import SaleRepresentativesTable from './sale-representatives-table';

const TAB_SLUGS = [
  'sales-representatives',
  'business-groups',
  'labels',
  'page-sizes',
] as const;

type TabSlug = (typeof TAB_SLUGS)[number];

const isTabSlug = (value: string | null): value is TabSlug =>
  value !== null && TAB_SLUGS.includes(value as TabSlug);

export function SettingsTabs({ pageSizes }: { pageSizes: ResolvedPageSizes }) {
  const labels = useLabels();
  const searchParams = useSearchParams();
  const param = searchParams.get('tab');
  const active: TabSlug = isTabSlug(param) ? param : 'sales-representatives';

  /**
   * `window.history.replaceState` rather than `router.replace`: this is the
   * documented shallow-routing path for this Next version, and it syncs with
   * `useSearchParams` without an RSC round-trip. `replaceState` rather than
   * `pushState` so tab switches do not fill the back button — Back should
   * leave the settings page, not walk the tabs.
   */
  const handleChange = (value: string) => {
    const next = new URLSearchParams(searchParams.toString());
    next.set('tab', value);
    window.history.replaceState(null, '', `?${next.toString()}`);
  };

  return (
    <Tabs onValueChange={handleChange} value={active}>
      <TabsList className="mb-4">
        <TabsTrigger value="sales-representatives">
          {labelCompose.tableTitle(labels.entity.salesRepresentative)}
        </TabsTrigger>
        <TabsTrigger value="business-groups">
          {labelCompose.tableTitle(labels.entity.businessGroup)}
        </TabsTrigger>
        <TabsTrigger value="labels">Etiketler</TabsTrigger>
        <TabsTrigger value="page-sizes">Sayfa Boyutu</TabsTrigger>
      </TabsList>

      <TabsContent value="sales-representatives">
        <SaleRepresentativesTable pageSize={pageSizes.salesRepresentative} />
      </TabsContent>

      <TabsContent value="business-groups">
        <BusinessGroupsTable />
      </TabsContent>

      <TabsContent value="labels">
        <LabelsCard />
      </TabsContent>

      <TabsContent value="page-sizes">
        {/* Replaced by <PageSizesCard /> in Task 9 */}
        <div />
      </TabsContent>
    </Tabs>
  );
}
```

- [ ] **Step 2: Branch the settings page on role**

Rewrite the render block of `src/app/panel/settings/page.tsx`. Non-admins get the SR table with no tab strip; admins get the shell. The header stays above both.

```tsx
  return (
    <div className="w-full p-4 sm:p-6 lg:p-8">
      <div className="mx-auto w-full max-w-[1600px]">
        <div className="mb-6">
          <h2 className="font-bold text-3xl tracking-tight">
            {labels.page.settings}
          </h2>
          <p className="text-muted-foreground">
            Genel ayarlar, tanımlar ve tercihler
          </p>
        </div>

        <HydrateClient>
          {isAdmin ? (
            <SettingsTabs pageSizes={pageSizes} />
          ) : (
            <SaleRepresentativesTable
              pageSize={pageSizes.salesRepresentative}
            />
          )}
        </HydrateClient>
      </div>
    </div>
  );
```

Update the imports: `SettingsTabs` comes in, and `BusinessGroupsTable` / `LabelsCard` are no longer referenced here (they moved into the shell).

- [ ] **Step 3: Verify**

Run: `pnpm typecheck && pnpm check`
Expected: no errors, and no unused-import warnings from Biome.

- [ ] **Step 4: Manually test the shell**

Run: `pnpm dev`, visit `/panel/settings` as an admin.
Expected: four tabs, Satış Temsilcileri active, full width. Clicking Etiketler puts `?tab=labels` in the URL without a page reload. Reloading on `?tab=labels` lands on Etiketler. `?tab=nonsense` falls back to the first tab. Back leaves the settings page rather than stepping through tabs.

Then log in as a non-admin: `/panel/settings` shows the SR table alone, no tab strip.

- [ ] **Step 5: Fix the labels e2e spec**

`e2e/labels.spec.ts` reaches the labels card's nested tabs immediately after `goto('/panel/settings')`. They are now behind the `Etiketler` outer tab. Add a click in **both** places.

At line 24-25, before the nested tab click:

```ts
      await page.goto('/panel/settings');
      await page.getByRole('tab', { name: 'Etiketler' }).click();
      await page.getByRole('tab', { name: 'Cari Kartları' }).click();
```

and in the `finally` block at line 45-47:

```ts
      await page.goto('/panel/settings');
      await page.getByRole('tab', { name: 'Etiketler' }).click();
      await page.getByRole('tab', { name: /Cari/ }).click();
```

- [ ] **Step 6: Run the e2e spec**

Run: `pnpm test:e2e e2e/labels.spec.ts`
Expected: PASS. It skips if `DEFAULT_ADMIN_EMAIL` / `DEFAULT_ADMIN_PASSWORD` are unset — if it skips, set them in `.env` and re-run, because this spec is the regression net for the shell.

- [ ] **Step 7: Commit**

```bash
git add src/app/panel/settings e2e/labels.spec.ts
git commit -m "feat: give the admin settings page a tab shell"
```

---

### Task 9: The page size editor

**Files:**
- Create: `src/app/panel/settings/page-size-row.tsx`
- Create: `src/app/panel/settings/page-sizes-card.tsx`
- Modify: `src/app/panel/settings/settings-tabs.tsx` (swap the Task 8 placeholder)

**Interfaces:**
- Consumes: `mutate.ts` helpers (Task 2), `PageSizeTableConfigSchema` (Task 1), `pageSizeTableOrder`, `pageSizeTables` (Task 1), `api.pageSize` (Task 4)
- Produces: `PageSizesCard` — takes `pageSizes: ResolvedPageSizes`

- [ ] **Step 1: Write the option row component**

Create `src/app/panel/settings/page-size-row.tsx`:

```tsx
'use client';

import { Trash2 } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { cn } from '~/lib/utils';

export function PageSizeRow({
  canRemove,
  error,
  isDefault,
  onChange,
  onRemove,
  onSetDefault,
  value,
}: {
  canRemove: boolean;
  error?: string;
  isDefault: boolean;
  onChange: (value: string) => void;
  onRemove: () => void;
  onSetDefault: () => void;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <input
        aria-label="Varsayılan"
        checked={isDefault}
        className="mt-3 cursor-pointer"
        onChange={onSetDefault}
        type="radio"
      />
      <div className="flex-1">
        <Input
          aria-label="Sayfa Başı Satır Sayısı"
          className={cn('w-28', error && 'border-destructive')}
          inputMode="numeric"
          onChange={(event) => onChange(event.target.value)}
          value={value}
        />
        {error && <p className="mt-1 text-destructive text-xs">{error}</p>}
      </div>
      <Button
        aria-label="Seçeneği Sil"
        className="cursor-pointer"
        disabled={!canRemove}
        onClick={onRemove}
        size="icon"
        type="button"
        variant="ghost"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Write the card**

Create `src/app/panel/settings/page-sizes-card.tsx`. It follows `LabelsCard`'s conventions — local draft state, a per-section dirty dot and a per-section Kaydet — rather than React Hook Form, so the two editors sitting next to each other behave the same way.

```tsx
'use client';

import { Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { useLabels } from '~/hooks/use-labels';
import { labelCompose } from '~/shared/labels/compose';
import {
  addOption,
  type DraftConfig,
  fromDraft,
  removeOption,
  setDefaultOption,
  setOptionValue,
  toDraft,
} from '~/shared/page-sizes/mutate';
import {
  pageSizeTableOrder,
  pageSizeTables,
} from '~/shared/page-sizes/registry';
import type {
  PageSizeTableKey,
  ResolvedPageSizes,
} from '~/shared/page-sizes/types';
import {
  MAX_OPTION_COUNT,
  MAX_PAGE_SIZE,
  MIN_OPTION_COUNT,
  MIN_PAGE_SIZE,
  PageSizeTableConfigSchema,
} from '~/shared/zod-schemas/page-size';
import { api } from '~/trpc/react';
import { PageSizeRow } from './page-size-row';

type Drafts = Record<PageSizeTableKey, DraftConfig>;

/** Per-row message, or undefined when the row is fine. Duplicates mark every
 * row sharing the value, so the admin sees both halves of the collision. */
function rowErrors(draft: DraftConfig): (string | undefined)[] {
  const counts = new Map<string, number>();
  for (const value of draft.options) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return draft.options.map((value) => {
    if (value.trim() === '') return 'Geçerli bir sayı girin';
    const parsed = Number(value);
    if (!Number.isInteger(parsed)) return 'Geçerli bir sayı girin';
    if (parsed < MIN_PAGE_SIZE || parsed > MAX_PAGE_SIZE) {
      return `${MIN_PAGE_SIZE} ile ${MAX_PAGE_SIZE} arasında olmalı`;
    }
    if ((counts.get(value) ?? 0) > 1) return 'Aynı değerden birden fazla olamaz';
    return undefined;
  });
}

const isValid = (draft: DraftConfig) =>
  PageSizeTableConfigSchema.safeParse(fromDraft(draft)).success;

const sameDraft = (a: DraftConfig, b: DraftConfig) =>
  a.defaultValue === b.defaultValue &&
  a.options.length === b.options.length &&
  a.options.every((value, index) => value === b.options[index]);

export function PageSizesCard({ pageSizes }: { pageSizes: ResolvedPageSizes }) {
  const labels = useLabels();
  const utils = api.useUtils();
  /**
   * The dirty baseline must come from the query, not the `pageSizes` prop.
   * The prop is fixed for the life of the page, so after a successful save the
   * prop would still hold the pre-save config and every saved section would
   * stay marked dirty forever. `initialData` keeps the first render
   * synchronous — unlike the table page-clients, nothing here seeds `useState`
   * from it, so there is no mount-time race.
   */
  const { data: saved } = api.pageSize.get.useQuery(undefined, {
    initialData: pageSizes,
  });
  const [drafts, setDrafts] = useState<Drafts>(
    () =>
      Object.fromEntries(
        pageSizeTableOrder.map((key) => [key, toDraft(pageSizes[key])]),
      ) as Drafts,
  );

  const updateMutation = api.pageSize.update.useMutation({
    onSuccess: async () => {
      toast.success('Sayfa boyutu kaydedildi');
      // Refreshes both this card's dirty baseline and the option lists of
      // every mounted table.
      await utils.pageSize.get.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const edit = (key: PageSizeTableKey, next: DraftConfig) =>
    setDrafts((current) => ({ ...current, [key]: next }));

  const tableTitle = (key: PageSizeTableKey) => {
    const table = pageSizeTables[key];
    return 'titleEntity' in table
      ? labelCompose.tableTitle(labels.entity[table.titleEntity])
      : table.staticTitle;
  };

  const save = (key: PageSizeTableKey) => {
    const parsed = PageSizeTableConfigSchema.safeParse(fromDraft(drafts[key]));
    if (!parsed.success) return;
    updateMutation.mutate({ tableKey: key, ...parsed.data });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sayfa Boyutu</CardTitle>
      </CardHeader>
      <CardContent className="space-y-8">
        {pageSizeTableOrder.map((key) => {
          const draft = drafts[key];
          const dirty = !sameDraft(draft, toDraft(saved[key]));
          const errors = rowErrors(draft);

          return (
            <div className="space-y-3" key={key}>
              <div className="flex items-center gap-2">
                <p className="font-medium text-sm">{tableTitle(key)}</p>
                {dirty && (
                  <span className="inline-block size-1.5 rounded-full bg-primary" />
                )}
              </div>

              <div className="space-y-2">
                {draft.options.map((value, index) => (
                  <PageSizeRow
                    canRemove={draft.options.length > MIN_OPTION_COUNT}
                    error={errors[index]}
                    isDefault={
                      value === draft.defaultValue &&
                      draft.options.indexOf(value) === index
                    }
                    // Index is a stable key here: rows are never reordered
                    // while editing — the sort happens on save.
                    key={`${key}-${index}`}
                    onChange={(next) =>
                      edit(key, setOptionValue(draft, index, next))
                    }
                    onRemove={() => edit(key, removeOption(draft, index))}
                    onSetDefault={() => edit(key, setDefaultOption(draft, index))}
                    value={value}
                  />
                ))}
              </div>

              <div className="flex items-center justify-between">
                <Button
                  className="cursor-pointer"
                  disabled={draft.options.length >= MAX_OPTION_COUNT}
                  onClick={() => edit(key, addOption(draft))}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <Plus className="h-4 w-4" />
                  Seçenek Ekle {draft.options.length}/{MAX_OPTION_COUNT}
                </Button>

                <div className="flex gap-2">
                  <Button
                    className="cursor-pointer"
                    onClick={() =>
                      edit(
                        key,
                        toDraft({
                          options: [...pageSizeTables[key].options].sort(
                            (a, b) => a - b,
                          ),
                          defaultValue: pageSizeTables[key].defaultValue,
                        }),
                      )
                    }
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    Varsayılanları Getir
                  </Button>
                  <Button
                    className="cursor-pointer"
                    disabled={
                      !dirty || !isValid(draft) || updateMutation.isPending
                    }
                    onClick={() => save(key)}
                    size="sm"
                    type="button"
                  >
                    {updateMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Slot the card into the shell**

In `src/app/panel/settings/settings-tabs.tsx`, replace the Task 8 placeholder:

```tsx
      <TabsContent value="page-sizes">
        <PageSizesCard pageSizes={pageSizes} />
      </TabsContent>
```

and add `import { PageSizesCard } from './page-sizes-card';`.

- [ ] **Step 4: Verify**

Run: `pnpm typecheck && pnpm check && pnpm test`
Expected: all green.

- [ ] **Step 5: Manually test every rule**

Run: `pnpm dev`, go to `/panel/settings?tab=page-sizes` as an admin. Check each:

| Action | Expected |
| --- | --- |
| Edit the default row's value 25 → 30 | The radio stays on that row; it now reads 30 |
| Remove the default row | The radio moves to the smallest remaining option |
| Remove rows down to one | The last row's delete button is disabled |
| Add options up to five | Seçenek Ekle disables and the counter reads 5/5 |
| Type a duplicate of another row | Both rows show `Aynı değerden birden fazla olamaz`, Kaydet disabled |
| Type 501 | `1 ile 500 arasında olmalı`, Kaydet disabled |
| Clear a field | `Geçerli bir sayı girin`, Kaydet disabled |
| Enter 100, 25, 50 and save | Toast appears; after the refetch the dropdown on the target page lists 25, 50, 100 |
| Save, then Varsayılanları Getir and save again | The row is deleted; check with `pnpm db:studio` that `PageSizeConfig` has no row for that key |
| Edit one table, leave another dirty | Each section's Kaydet is independent |

- [ ] **Step 6: Commit**

```bash
git add src/app/panel/settings
git commit -m "feat: add the page size options editor"
```

---

### Task 10: End-to-end spec

**Files:**
- Create: `e2e/page-sizes.spec.ts`

**Interfaces:**
- Consumes: everything above
- Produces: nothing downstream

- [ ] **Step 1: Write the spec**

Create `e2e/page-sizes.spec.ts`, following `e2e/labels.spec.ts`'s shape — the same login flow, the same `finally` restore so a failed run does not leave the DB configured.

```ts
import { expect, test } from '@playwright/test';

const ADMIN_EMAIL = process.env.DEFAULT_ADMIN_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD ?? '';

const SAVED_TOAST = 'Sayfa boyutu kaydedildi';

test.describe('admin-configurable page sizes', () => {
  test.skip(
    !ADMIN_EMAIL || !ADMIN_PASSWORD,
    'DEFAULT_ADMIN_EMAIL / DEFAULT_ADMIN_PASSWORD must be set',
  );

  test('configuring options changes the table and reverts', async ({
    page,
  }) => {
    await page.goto('/login');
    // Login1 has no <label> elements — the inputs are only identified by
    // placeholder text, and the submit button reads "Devam", not "Giriş".
    await page.getByPlaceholder(/e-posta/i).fill(ADMIN_EMAIL);
    await page.getByPlaceholder(/parola/i).fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: /devam/i }).click();
    await page.waitForURL('**/panel/**');

    const section = page
      .locator('div')
      .filter({ hasText: /^Cari Kartları$/ })
      .first()
      .locator('..');

    try {
      await page.goto('/panel/settings?tab=page-sizes');

      // Reduce Cari Kartları to a distinctive, deliberately unsorted set so
      // the ascending-on-save guarantee is actually exercised.
      const inputs = section.getByLabel('Sayfa Başı Satır Sayısı');
      await expect(inputs.first()).toBeVisible();

      // Trim down to two rows, then set them to 20 and 10 in that order.
      while ((await inputs.count()) > 2) {
        await section.getByLabel('Seçeneği Sil').last().click();
      }
      await inputs.nth(0).fill('20');
      await inputs.nth(1).fill('10');
      await section.getByRole('radio').nth(1).check();

      await section.getByRole('button', { name: 'Kaydet' }).click();
      // Wait for the save to land before navigating away — the mutation is
      // async and a bare click doesn't wait for it.
      await page.getByText(SAVED_TOAST).waitFor();

      await page.goto('/panel/customer-cards');
      const select = page.getByRole('combobox').first();
      await expect(select).toHaveText('10');

      await select.click();
      await expect(page.getByRole('option')).toHaveText(['10', '20']);
      await page.keyboard.press('Escape');
    } finally {
      await page.goto('/panel/settings?tab=page-sizes');
      await section.getByRole('button', { name: 'Varsayılanları Getir' }).click();
      await section.getByRole('button', { name: 'Kaydet' }).click();
      await page.getByText(SAVED_TOAST).waitFor();
    }

    await page.goto('/panel/customer-cards');
    await expect(page.getByRole('combobox').first()).toHaveText('25');
  });
});
```

- [ ] **Step 2: Run the spec**

Run: `pnpm test:e2e e2e/page-sizes.spec.ts`
Expected: PASS.

If the `section` locator does not resolve, adjust it to match the markup `PageSizesCard` actually produced — the assertion that matters is that it scopes to the Cari Kartları block, not the exact selector. Prefer adding a `data-testid` to the section wrapper in `page-sizes-card.tsx` over a brittle DOM-walking locator.

- [ ] **Step 3: Run the full suite**

Run: `pnpm test && pnpm typecheck && pnpm check && pnpm test:e2e`
Expected: all green, including `labels.spec.ts`.

- [ ] **Step 4: Commit**

```bash
git add e2e/page-sizes.spec.ts
git commit -m "test: add end-to-end coverage for configurable page sizes"
```

---

---

### Task 11: Merge

- [ ] **Step 1: Run the full suite one more time on the branch**

Run: `pnpm test && pnpm typecheck && pnpm check && pnpm test:e2e`
Expected: all green.

- [ ] **Step 2: Merge with a merge commit**

```bash
git switch main
git merge --no-ff feat/dynamic-page-size-options -m "Merge branch 'feat/dynamic-page-size-options'"
git branch -d feat/dynamic-page-size-options
```

Never `--ff-only`. `git log --oneline` on `main` reads linear because feature branches are short, which makes fast-forward look like the matching choice; check `git log --merges` rather than the last few subject lines.

---

## Verification

After Task 11, the feature is complete when all of these hold:

- [ ] `pnpm test` passes — registry, schema, resolver, mutate and router tests
- [ ] `pnpm typecheck` passes with `pageSizeOptions` required on `DataTable`
- [ ] `pnpm check` passes
- [ ] `pnpm test:e2e e2e/page-sizes.spec.ts` passes (verified stable: 9/9 runs)
- [ ] `e2e/labels.spec.ts` is no worse than `main` — it fails on `main` too, from a
      pre-existing hydration mismatch in `sidebar-nav.tsx` that the user has
      confirmed as known and WONTFIX. Not this branch's to fix.
- [ ] `pnpm build` succeeds
- [ ] `git diff main..HEAD` on the four Meslek Grupları files is empty
- [ ] `grep -rn "pageSize === 500" src/` returns nothing
- [ ] `grep -rn "pageSizeOptions = \[" src/` returns nothing
- [ ] A fresh database with no `PageSizeConfig` rows renders every table exactly as it did before this work
- [ ] An admin can configure each of the 9 tables and see the change take effect on its page
- [ ] A non-admin sees no tab strip on `/panel/settings` and cannot reach the editor
- [ ] `git log --merges -1` shows the feature branch's merge commit on `main`
- [ ] `src/constants/app-version.ts` and `src/constants/releases.ts` are untouched
