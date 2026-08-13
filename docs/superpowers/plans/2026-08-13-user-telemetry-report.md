# User Telemetry Report Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an admin-facing report tab on `/panel/users` showing per-user login count, last login, elapsed active time, and action count — each expandable into a per-IP breakdown, with a drill-down modal into the underlying audit log entries.

**Architecture:** Extend three existing tables (`LoginEvent`, `AuditLog`, `UserDailyActivity`) with an `ipAddress` column instead of building a new unified table. A new `user-report` tRPC router aggregates across them; the report UI reuses the existing `DataTable`/`FilterControls` pattern plus the audit-logs page's column/dialog components for the drill-down.

**Tech Stack:** Next.js 16 App Router, tRPC 11, Prisma 6 (PostgreSQL), better-auth, shadcn/ui, TanStack Table.

**Spec:** `docs/superpowers/specs/2026-08-13-user-telemetry-report-design.md`

## Global Constraints

- No migration history in this repo — schema changes go out via `pnpm db:push`, never `prisma migrate`. Restart the dev server after pushing so the regenerated Prisma client (`./generated/prisma`) is picked up.
- No automated test suite exists (`CLAUDE.md`'s command list has no test runner). Every task's verification step is `pnpm typecheck` + `pnpm check`, plus a manual/browser check where the spec calls for one — there is no red/green test cycle to follow here.
- All UI text is Turkish. Enum/column label maps live in `src/lib/enum-map.ts` / `src/lib/column-map.ts` — this plan doesn't add new enums or searchable fields, so neither file needs new entries.
- `pnpm` is this project's package manager (there's a `pnpm-lock.yaml`, no `package-lock.json`).
- Only commit when a task's steps say to. Each task is one commit.

---

## Task 1: Schema — add `ipAddress` columns, widen `UserDailyActivity`'s unique key, add `User.lastLoginAt`

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/backfill-last-login.sql`

**Interfaces:**
- Produces: `LoginEvent.ipAddress: string` (default `"unknown"`), `AuditLog.ipAddress: string` (default `"unknown"`), `UserDailyActivity.ipAddress: string` (default `"unknown"`) with unique key `(userId, date, ipAddress)`, `User.lastLoginAt: Date | null`. Every later task's Prisma calls depend on these exact field names.

- [ ] **Step 1: Add `ipAddress` to `LoginEvent`**

In `prisma/schema.prisma`, change:

```prisma
model LoginEvent {
  id     String @id @default(cuid())
  userId String
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())

  @@index([userId])
}
```

to:

```prisma
model LoginEvent {
  id     String @id @default(cuid())
  userId String
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())
  ipAddress String   @default("unknown")

  @@index([userId])
}
```

- [ ] **Step 2: Add `ipAddress` to `AuditLog`**

Change:

```prisma
  details String?

  @@index([userId])
```

to:

```prisma
  details   String?
  ipAddress String  @default("unknown")

  @@index([userId])
```

(This is the `AuditLog` model near the top of the file — don't confuse it with `LoginEvent`'s `@@index([userId])`, which was already edited in Step 1.)

- [ ] **Step 3: Widen `UserDailyActivity`'s unique key**

Change:

```prisma
model UserDailyActivity {
  id     String @id @default(cuid())
  userId String
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  date          DateTime @db.Date
  activeSeconds Int      @default(0)

  updatedAt DateTime @updatedAt

  @@unique([userId, date])
  @@index([date])
}
```

to:

```prisma
model UserDailyActivity {
  id     String @id @default(cuid())
  userId String
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  date          DateTime @db.Date
  ipAddress     String   @default("unknown")
  activeSeconds Int      @default(0)

  updatedAt DateTime @updatedAt

  @@unique([userId, date, ipAddress])
  @@index([date])
}
```

- [ ] **Step 4: Add `lastLoginAt` to `User`**

Find this block in the `User` model:

```prisma
  totalActiveSeconds Int                 @default(0)
  dailyActivity      UserDailyActivity[]

  loginEvents LoginEvent[]
```

and change it to:

```prisma
  totalActiveSeconds Int                 @default(0)
  dailyActivity      UserDailyActivity[]
  lastLoginAt        DateTime?

  loginEvents LoginEvent[]
```

- [ ] **Step 5: Push the schema and regenerate the client**

Run: `pnpm db:push`

Expected: Prisma reports the schema is in sync and regenerates the client into `./generated/prisma`. If `pnpm` complains about corepack, prefix with `COREPACK_ENABLE_STRICT=0` per `CLAUDE.md`.

- [ ] **Step 6: Write the one-time `lastLoginAt` backfill script**

`LoginEvent` already has real history from earlier work this session, so without this, users with existing logins would show a login count but `lastLoginAt: null`. Create `prisma/backfill-last-login.sql`:

```sql
UPDATE "user" u
SET "lastLoginAt" = sub."maxCreatedAt"
FROM (
  SELECT "userId", MAX("createdAt") AS "maxCreatedAt"
  FROM "LoginEvent"
  GROUP BY "userId"
) sub
WHERE u.id = sub."userId";
```

- [ ] **Step 7: Run the backfill**

Run: `pnpm exec prisma db execute --file prisma/backfill-last-login.sql --schema prisma/schema.prisma`

Expected: command reports success. Verify with `pnpm db:studio` — open the `user` table and confirm any user with existing `LoginEvent` rows now has a non-null `lastLoginAt` matching their most recent login.

- [ ] **Step 8: Typecheck**

Run: `pnpm typecheck`

Expected: fails in several router files that reference the old `createAuditLog(db, userId, ...)` shape once the generated types shift — that's expected and fixed in Task 2. Confirm specifically that there are no *schema-related* errors (e.g. no complaints about `LoginEvent.ipAddress`, `AuditLog.ipAddress`, `UserDailyActivity.ipAddress`, or `User.lastLoginAt` not existing).

- [ ] **Step 9: Commit**

```bash
git add prisma/schema.prisma prisma/backfill-last-login.sql
git commit -m "feat: add ipAddress tracking columns and User.lastLoginAt to schema"
```

---

## Task 2: Simplify `createAuditLog` to derive `userId`/`ipAddress` from `ctx`

**Files:**
- Modify: `src/server/api/trpc.ts`
- Modify: `src/server/api/routers/announcement.ts`
- Modify: `src/server/api/routers/business-group-card.ts`
- Modify: `src/server/api/routers/audit-log.ts`
- Modify: `src/server/api/routers/business-group.ts`
- Modify: `src/server/api/routers/sales-representative.ts`
- Modify: `src/server/api/routers/customer-card.ts`
- Modify: `src/server/api/routers/user.ts`
- Modify: `src/server/api/routers/visit.ts`

**Interfaces:**
- Consumes: `AuditLog.ipAddress` from Task 1.
- Produces: `createAuditLog(ctx, action, resourceType, resourceId, result, error, details?)` — every router in this repo that writes an audit log entry calls it this way from now on.

- [ ] **Step 1: Change `createAuditLog`'s signature in `src/server/api/trpc.ts`**

Replace:

```ts
export async function createAuditLog(
  db: PrismaClient,
  userId: string | undefined,
  action: string,
  resourceType: string,
  resourceId: string,
  result: 'SUCCESS' | 'FAILURE',
  error: string | undefined,
  details?: string,
) {
  try {
    await db.auditLog.create({
      data: {
        userId,
        action,
        resourceType,
        resourceId,
        result,
        error,
        details,
      },
    });
    auditLogEmitter.emit('new-log');
  } catch (error) {
    console.error('Audit log failed:', error);
  }
}
```

with:

```ts
export async function createAuditLog(
  ctx: {
    db: PrismaClient;
    session: { user: { id: string }; session: { ipAddress?: string | null } };
  },
  action: string,
  resourceType: string,
  resourceId: string,
  result: 'SUCCESS' | 'FAILURE',
  error: string | undefined,
  details?: string,
) {
  try {
    await ctx.db.auditLog.create({
      data: {
        userId: ctx.session.user.id,
        ipAddress: ctx.session.session.ipAddress ?? 'unknown',
        action,
        resourceType,
        resourceId,
        result,
        error,
        details,
      },
    });
    auditLogEmitter.emit('new-log');
  } catch (error) {
    console.error('Audit log failed:', error);
  }
}
```

- [ ] **Step 2: Update all 61 call sites**

Every call site in the 8 router files above currently looks like:

```ts
await createAuditLog(
  ctx.db,
  ctx.session.user.id,
  'SOME_ACTION',
  ...
```

They all need to become:

```ts
await createAuditLog(
  ctx,
  'SOME_ACTION',
  ...
```

Run this from the repo root to do all 61 mechanically (it only touches lines matching the exact `createAuditLog(\n<indent>ctx.db,\n<indent>ctx.session.user.id,\n` pattern, preserving each call site's original indentation):

```bash
perl -0777 -pi -e 's/createAuditLog\(\n(\s*)ctx\.db,\n\s*ctx\.session\.user\.id,\n/createAuditLog(\n$1ctx,\n/g' \
  src/server/api/routers/announcement.ts \
  src/server/api/routers/business-group-card.ts \
  src/server/api/routers/audit-log.ts \
  src/server/api/routers/business-group.ts \
  src/server/api/routers/sales-representative.ts \
  src/server/api/routers/customer-card.ts \
  src/server/api/routers/user.ts \
  src/server/api/routers/visit.ts
```

- [ ] **Step 3: Confirm no old-style call sites remain**

Run: `grep -rn "createAuditLog(" src/server/api/routers/*.ts -A1 | grep "ctx.db"`

Expected: no output. If anything prints, that call site didn't match the mechanical pattern (e.g. different indentation) — fix it by hand the same way (drop the `ctx.db,` / `ctx.session.user.id,` lines, pass `ctx,` instead).

- [ ] **Step 4: Typecheck and lint**

Run: `pnpm typecheck && pnpm check`

Expected: both pass. If `pnpm check` flags formatting on the touched files, run `pnpm check:write` and re-run `pnpm check`.

- [ ] **Step 5: Commit**

```bash
git add src/server/api/trpc.ts src/server/api/routers/announcement.ts \
  src/server/api/routers/business-group-card.ts src/server/api/routers/audit-log.ts \
  src/server/api/routers/business-group.ts src/server/api/routers/sales-representative.ts \
  src/server/api/routers/customer-card.ts src/server/api/routers/user.ts \
  src/server/api/routers/visit.ts
git commit -m "refactor: derive audit log userId/ipAddress from ctx instead of separate args"
```

---

## Task 3: Capture `ipAddress` and `lastLoginAt` in better-auth hooks

**Files:**
- Modify: `src/server/better-auth/config.ts`

**Interfaces:**
- Consumes: `LoginEvent.ipAddress`, `User.lastLoginAt`, `AuditLog.ipAddress` from Task 1.
- Produces: every real login/logout going forward writes a non-`'unknown'` `ipAddress` (when better-auth can resolve one) into `LoginEvent`, `AuditLog`, and updates `User.lastLoginAt`.

- [ ] **Step 1: Capture IP and set `lastLoginAt` in the `databaseHooks.session.create.after` hook**

Replace:

```ts
  databaseHooks: {
    session: {
      create: {
        // Fires for every session row, including admin impersonation and the
        // session refresh after a password change. Path-filter to the two
        // endpoints that represent an actual user login.
        after: async (session, context) => {
          if (
            context?.path !== '/sign-in/email' &&
            context?.path !== '/verify-email'
          ) {
            return;
          }
          try {
            await db.loginEvent.create({ data: { userId: session.userId } });
          } catch (err) {
            console.error('Failed to record login event:', err);
          }
        },
      },
    },
  },
```

with:

```ts
  databaseHooks: {
    session: {
      create: {
        // Fires for every session row, including admin impersonation and the
        // session refresh after a password change. Path-filter to the two
        // endpoints that represent an actual user login.
        after: async (session, context) => {
          if (
            context?.path !== '/sign-in/email' &&
            context?.path !== '/verify-email'
          ) {
            return;
          }
          const ipAddress = session.ipAddress ?? 'unknown';
          try {
            await db.loginEvent.create({
              data: { userId: session.userId, ipAddress },
            });
            await db.user.update({
              where: { id: session.userId },
              data: { lastLoginAt: session.createdAt },
            });
          } catch (err) {
            console.error('Failed to record login event:', err);
          }
        },
      },
    },
  },
```

- [ ] **Step 2: Add an `ipAddress` parameter to the local `createAuthAuditLog` helper**

Replace:

```ts
async function createAuthAuditLog(
  userId: string | undefined,
  action: string,
  resourceType: string,
  resourceId: string,
  result: 'SUCCESS' | 'FAILURE',
  error: string | undefined,
  details?: string,
) {
  try {
    await db.auditLog.create({
      data: {
        userId,
        action,
        resourceType,
        resourceId,
        result,
        error,
        details,
      },
    });
    auditLogEmitter.emit('new-log');
  } catch (err) {
    console.error('Auth audit log failed:', err);
  }
}
```

with:

```ts
async function createAuthAuditLog(
  userId: string | undefined,
  ipAddress: string | null | undefined,
  action: string,
  resourceType: string,
  resourceId: string,
  result: 'SUCCESS' | 'FAILURE',
  error: string | undefined,
  details?: string,
) {
  try {
    await db.auditLog.create({
      data: {
        userId,
        ipAddress: ipAddress ?? 'unknown',
        action,
        resourceType,
        resourceId,
        result,
        error,
        details,
      },
    });
    auditLogEmitter.emit('new-log');
  } catch (err) {
    console.error('Auth audit log failed:', err);
  }
}
```

- [ ] **Step 3: Pass IP at both `createAuthAuditLog` call sites**

Replace:

```ts
      if (
        path === '/sign-in/email' &&
        response &&
        'user' in response &&
        response.user
      ) {
        await createAuthAuditLog(
          response.user.id,
          'USER_LOGIN',
          'USER',
          response.user.id,
          'SUCCESS',
          undefined,
          `Kullanıcı giriş yaptı: ${response.user.name} (${response.user.email})`,
        );
      }

      if (path === '/sign-out' && ctx.context.session?.user) {
        await createAuthAuditLog(
          ctx.context.session.user.id,
          'USER_LOGOUT',
          'USER',
          ctx.context.session.user.id,
          'SUCCESS',
          undefined,
          `Kullanıcı çıkış yaptı: ${ctx.context.session.user.name} (${ctx.context.session.user.email})`,
        );
      }
```

with:

```ts
      if (
        path === '/sign-in/email' &&
        response &&
        'user' in response &&
        response.user
      ) {
        await createAuthAuditLog(
          response.user.id,
          ctx.context.newSession?.session.ipAddress,
          'USER_LOGIN',
          'USER',
          response.user.id,
          'SUCCESS',
          undefined,
          `Kullanıcı giriş yaptı: ${response.user.name} (${response.user.email})`,
        );
      }

      if (path === '/sign-out' && ctx.context.session?.user) {
        await createAuthAuditLog(
          ctx.context.session.user.id,
          ctx.context.session.session.ipAddress,
          'USER_LOGOUT',
          'USER',
          ctx.context.session.user.id,
          'SUCCESS',
          undefined,
          `Kullanıcı çıkış yaptı: ${ctx.context.session.user.name} (${ctx.context.session.user.email})`,
        );
      }
```

`ctx.context.newSession` is only populated inside an `after` hook, which this already is — see better-auth's hooks docs (`newSession` on `ctx.context`, available post-endpoint-execution).

- [ ] **Step 4: Typecheck and lint**

Run: `pnpm typecheck && pnpm check`

Expected: both pass.

- [ ] **Step 5: Manual verification**

Start the dev server (`pnpm dev`), sign out, sign back in with a test account, then open `pnpm db:studio`:
- `LoginEvent`: newest row has a non-`'unknown'` `ipAddress` (will be `::1` or `127.0.0.1` locally).
- `user` table: that account's `lastLoginAt` matches the new `LoginEvent.createdAt`.
- `AuditLog`: the `USER_LOGIN` row has the same `ipAddress`.

- [ ] **Step 6: Commit**

```bash
git add src/server/better-auth/config.ts
git commit -m "feat: capture ipAddress and lastLoginAt on login/logout"
```

---

## Task 4: Scope the activity accumulator and `UserDailyActivity` by IP

**Files:**
- Modify: `src/server/activity-tracker.ts`
- Modify: `src/server/api/routers/activity.ts`

**Interfaces:**
- Consumes: `UserDailyActivity.ipAddress` + `@@unique([userId, date, ipAddress])` from Task 1.
- Produces: `recordHeartbeat(userId: string, ipAddress: string): void` — replaces the old single-arg signature.

- [ ] **Step 1: Re-key the accumulator by `userId` + `ipAddress` in `src/server/activity-tracker.ts`**

Replace:

```ts
interface UserAccumulator {
  pendingSeconds: number;
  lastCreditedAt: number;
}

declare global {
  var __activityAccumulator: Map<string, UserAccumulator> | undefined;
  var __activityFlushStarted: boolean | undefined;
}

const accumulator =
  globalThis.__activityAccumulator ?? new Map<string, UserAccumulator>();
globalThis.__activityAccumulator = accumulator;

export function recordHeartbeat(userId: string) {
  const now = Date.now();
  const existing = accumulator.get(userId);

  if (existing && now - existing.lastCreditedAt < MIN_CREDIT_GAP_MS) {
    return;
  }

  accumulator.set(userId, {
    pendingSeconds:
      (existing?.pendingSeconds ?? 0) + HEARTBEAT_INTERVAL_SECONDS,
    lastCreditedAt: now,
  });
}
```

with:

```ts
interface UserAccumulator {
  userId: string;
  ipAddress: string;
  pendingSeconds: number;
  lastCreditedAt: number;
}

declare global {
  var __activityAccumulator: Map<string, UserAccumulator> | undefined;
  var __activityFlushStarted: boolean | undefined;
}

const accumulator =
  globalThis.__activityAccumulator ?? new Map<string, UserAccumulator>();
globalThis.__activityAccumulator = accumulator;

function accumulatorKey(userId: string, ipAddress: string) {
  return `${userId}:${ipAddress}`;
}

export function recordHeartbeat(userId: string, ipAddress: string) {
  const now = Date.now();
  const key = accumulatorKey(userId, ipAddress);
  const existing = accumulator.get(key);

  if (existing && now - existing.lastCreditedAt < MIN_CREDIT_GAP_MS) {
    return;
  }

  accumulator.set(key, {
    userId,
    ipAddress,
    pendingSeconds:
      (existing?.pendingSeconds ?? 0) + HEARTBEAT_INTERVAL_SECONDS,
    lastCreditedAt: now,
  });
}
```

- [ ] **Step 2: Update `flushActivity` to write `UserDailyActivity` per `(userId, ipAddress)`**

Replace:

```ts
export async function flushActivity() {
  if (accumulator.size === 0) return;

  const entries = [...accumulator.entries()];
  accumulator.clear();

  const date = startOfTodayUtc();

  await Promise.all(
    entries.map(async ([userId, { pendingSeconds }]) => {
      if (pendingSeconds <= 0) return;

      try {
        await db.$transaction([
          db.user.update({
            where: { id: userId },
            data: { totalActiveSeconds: { increment: pendingSeconds } },
          }),
          db.userDailyActivity.upsert({
            where: { userId_date: { userId, date } },
            update: { activeSeconds: { increment: pendingSeconds } },
            create: { userId, date, activeSeconds: pendingSeconds },
          }),
        ]);
      } catch (error) {
        // Analytics-grade counter, not billing — drop on failure (e.g. the
        // user was deleted between heartbeat and flush) rather than retry.
        console.error(`Activity flush failed for user ${userId}:`, error);
      }
    }),
  );
}
```

with:

```ts
export async function flushActivity() {
  if (accumulator.size === 0) return;

  const entries = [...accumulator.values()];
  accumulator.clear();

  const date = startOfTodayUtc();

  await Promise.all(
    entries.map(async ({ userId, ipAddress, pendingSeconds }) => {
      if (pendingSeconds <= 0) return;

      try {
        await db.$transaction([
          db.user.update({
            where: { id: userId },
            data: { totalActiveSeconds: { increment: pendingSeconds } },
          }),
          db.userDailyActivity.upsert({
            where: { userId_date_ipAddress: { userId, date, ipAddress } },
            update: { activeSeconds: { increment: pendingSeconds } },
            create: { userId, date, ipAddress, activeSeconds: pendingSeconds },
          }),
        ]);
      } catch (error) {
        // Analytics-grade counter, not billing — drop on failure (e.g. the
        // user was deleted between heartbeat and flush) rather than retry.
        console.error(`Activity flush failed for user ${userId}:`, error);
      }
    }),
  );
}
```

- [ ] **Step 3: Pass the request's IP from the heartbeat procedure**

In `src/server/api/routers/activity.ts`, replace:

```ts
import { recordHeartbeat } from '~/server/activity-tracker';
import { createTRPCRouter, protectedProcedure } from '../trpc';

export const activityRouter = createTRPCRouter({
  // Intentionally not audit-logged — this fires every ~30s per active tab,
  // and only ever touches an in-memory buffer (see activity-tracker.ts), so
  // logging it would just relocate the write-volume problem into AuditLog.
  heartbeat: protectedProcedure.mutation(({ ctx }) => {
    recordHeartbeat(ctx.session.user.id);
  }),
});
```

with:

```ts
import { recordHeartbeat } from '~/server/activity-tracker';
import { createTRPCRouter, protectedProcedure } from '../trpc';

export const activityRouter = createTRPCRouter({
  // Intentionally not audit-logged — this fires every ~30s per active tab,
  // and only ever touches an in-memory buffer (see activity-tracker.ts), so
  // logging it would just relocate the write-volume problem into AuditLog.
  heartbeat: protectedProcedure.mutation(({ ctx }) => {
    recordHeartbeat(
      ctx.session.user.id,
      ctx.session.session.ipAddress ?? 'unknown',
    );
  }),
});
```

- [ ] **Step 4: Typecheck and lint**

Run: `pnpm typecheck && pnpm check`

Expected: both pass.

- [ ] **Step 5: Manual verification**

Start the dev server, stay on an authenticated page for a couple of minutes so at least one heartbeat flush fires (flush interval is 2 minutes — `FLUSH_INTERVAL_MS` in `activity-tracker.ts`), then check `pnpm db:studio`: `UserDailyActivity` has a row for today with a real `ipAddress` (not `'unknown'`), and `User.totalActiveSeconds` increased.

- [ ] **Step 6: Commit**

```bash
git add src/server/activity-tracker.ts src/server/api/routers/activity.ts
git commit -m "feat: scope elapsed-time accumulator by IP address"
```

---

## Task 5: `userReport` router — per-user list and per-IP breakdown

**Files:**
- Create: `src/server/api/routers/user-report.ts`
- Modify: `src/server/api/root.ts`

**Interfaces:**
- Consumes: `User.lastLoginAt`, `User._count.loginEvents`, `User._count.audits` (Task 1/existing relations), `columnMap.user`, `findTurkishSearchMatchesInTable` (existing).
- Produces:
  - `userReport.get(input: { filter?: { search?: string; searchScope?: 'all' | 'name' | 'email' }; sorting?: { id: string; desc: boolean }[]; page?: number; itemsPerPage?: number }) => { data: { id: string; name: string; email: string; totalActiveSeconds: number; lastLoginAt: Date | null; loginCount: number; actionCount: number }[]; pagination: { totalItems: number; totalPages: number } }`
  - `userReport.getIpBreakdown(input: { userId: string }) => { ipAddress: string; loginCount: number; lastLoginAt: Date | null; activeSeconds: number; actionCount: number }[]`

- [ ] **Step 1: Create the router**

Create `src/server/api/routers/user-report.ts`:

```ts
import type { Prisma } from 'generated/prisma';
import { z } from 'zod';
import { columnMap } from '~/lib/column-map';
import { findTurkishSearchMatchesInTable } from '../lib/turkish-search';
import { adminProcedure, createTRPCRouter } from '../trpc';

const filterSchema = z.object({
  search: z.string().optional(),
  searchScope: z.enum(['all', ...Object.keys(columnMap.user)]).default('all'),
});

const sortingSchema = z.object({
  id: z.string(),
  desc: z.boolean(),
});

const searchableFields = ['name', 'email'] as const;
type SearchableField = (typeof searchableFields)[number];

const sortableFields = [
  'name',
  'email',
  'lastLoginAt',
  'totalActiveSeconds',
  'loginCount',
  'actionCount',
] as const;
type SortableField = (typeof sortableFields)[number];

function buildOrderBy(
  sorting: { id: string; desc: boolean }[] | undefined,
): Prisma.UserOrderByWithRelationInput[] {
  const orderBy: Prisma.UserOrderByWithRelationInput[] = [];

  for (const sort of sorting ?? []) {
    if (!sortableFields.includes(sort.id as SortableField)) continue;
    const dir = sort.desc ? 'desc' : 'asc';

    if (sort.id === 'loginCount') {
      orderBy.push({ loginEvents: { _count: dir } });
    } else if (sort.id === 'actionCount') {
      orderBy.push({ audits: { _count: dir } });
    } else {
      orderBy.push({ [sort.id]: dir } as Prisma.UserOrderByWithRelationInput);
    }
  }

  if (orderBy.length === 0) orderBy.push({ lastLoginAt: 'desc' });
  return orderBy;
}

export const userReportRouter = createTRPCRouter({
  get: adminProcedure
    .input(
      z.object({
        filter: filterSchema.optional(),
        sorting: z.array(sortingSchema).optional(),
        page: z.number().min(1).default(1),
        itemsPerPage: z.number().min(1).max(500).default(25),
      }),
    )
    .query(async ({ ctx, input }) => {
      const whereClause: Prisma.UserWhereInput = {};

      if (input.filter?.search) {
        const searchValue = input.filter.search;
        const scope = input.filter.searchScope;
        const fields =
          scope === 'all'
            ? searchableFields
            : searchableFields.includes(scope as SearchableField)
              ? [scope as SearchableField]
              : [];

        if (fields.length > 0) {
          whereClause.id = {
            in: await findTurkishSearchMatchesInTable(
              ctx.db,
              'user',
              fields,
              searchValue,
            ),
          };
        }
      }

      const orderBy = buildOrderBy(input.sorting);

      const totalItems = await ctx.db.user.count({ where: whereClause });
      const totalPages = Math.ceil(totalItems / input.itemsPerPage);

      const users = await ctx.db.user.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          email: true,
          totalActiveSeconds: true,
          lastLoginAt: true,
          _count: { select: { loginEvents: true, audits: true } },
        },
        orderBy,
        skip: (input.page - 1) * input.itemsPerPage,
        take: input.itemsPerPage,
      });

      return {
        data: users.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          totalActiveSeconds: u.totalActiveSeconds,
          lastLoginAt: u.lastLoginAt,
          loginCount: u._count.loginEvents,
          actionCount: u._count.audits,
        })),
        pagination: { totalItems, totalPages },
      };
    }),
  getIpBreakdown: adminProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const [logins, activity, actions] = await Promise.all([
        ctx.db.loginEvent.groupBy({
          by: ['ipAddress'],
          where: { userId: input.userId },
          _count: true,
          _max: { createdAt: true },
        }),
        ctx.db.userDailyActivity.groupBy({
          by: ['ipAddress'],
          where: { userId: input.userId },
          _sum: { activeSeconds: true },
        }),
        ctx.db.auditLog.groupBy({
          by: ['ipAddress'],
          where: { userId: input.userId },
          _count: true,
        }),
      ]);

      const rows = new Map<
        string,
        {
          ipAddress: string;
          loginCount: number;
          lastLoginAt: Date | null;
          activeSeconds: number;
          actionCount: number;
        }
      >();

      const getRow = (ip: string) => {
        let row = rows.get(ip);
        if (!row) {
          row = {
            ipAddress: ip,
            loginCount: 0,
            lastLoginAt: null,
            activeSeconds: 0,
            actionCount: 0,
          };
          rows.set(ip, row);
        }
        return row;
      };

      for (const l of logins) {
        const row = getRow(l.ipAddress);
        row.loginCount = l._count;
        row.lastLoginAt = l._max.createdAt;
      }
      for (const a of activity) {
        getRow(a.ipAddress).activeSeconds = a._sum.activeSeconds ?? 0;
      }
      for (const a of actions) {
        getRow(a.ipAddress).actionCount = a._count;
      }

      return Array.from(rows.values()).sort(
        (a, b) => b.loginCount - a.loginCount,
      );
    }),
});
```

- [ ] **Step 2: Register the router**

In `src/server/api/root.ts`, add the import:

```ts
import { userReportRouter } from '~/server/api/routers/user-report';
```

(alphabetically after the `userRouter` import), and add to `appRouter`:

```ts
  user: userRouter,
  userReport: userReportRouter,
```

- [ ] **Step 3: Typecheck and lint**

Run: `pnpm typecheck && pnpm check`

Expected: both pass.

- [ ] **Step 4: Manual verification**

Start the dev server, sign in as an admin, and in the browser console on any authenticated page run (via the tRPC React Query client, or just check the Network tab after Task 13 wires up the UI — for now, confirm via Prisma Studio that the data these queries would read is sane): open `pnpm db:studio`, confirm at least one `user` row has non-zero `loginEvents`/`audits` relation counts so the report will show real numbers once the UI lands.

- [ ] **Step 5: Commit**

```bash
git add src/server/api/routers/user-report.ts src/server/api/root.ts
git commit -m "feat: add userReport router with per-user and per-IP aggregates"
```

---

## Task 6: Extend `auditLog.get` with an `ipAddress` filter

**Files:**
- Modify: `src/server/api/routers/audit-log.ts`

**Interfaces:**
- Consumes: `AuditLog.ipAddress` from Task 1.
- Produces: `auditLog.get`'s `filter` input gains an optional `ipAddress: string`.

- [ ] **Step 1: Add `ipAddress` to `filterSchema`**

Replace:

```ts
const filterSchema = z.object({
  search: z.string().optional(),
  action: z.string().optional(),
  resourceType: z.string().optional(),
  result: z.enum(['SUCCESS', 'FAILURE', 'all']).default('all'),
  userId: z.string().optional(),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
});
```

with:

```ts
const filterSchema = z.object({
  search: z.string().optional(),
  action: z.string().optional(),
  resourceType: z.string().optional(),
  result: z.enum(['SUCCESS', 'FAILURE', 'all']).default('all'),
  userId: z.string().optional(),
  ipAddress: z.string().optional(),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
});
```

- [ ] **Step 2: Apply it in the `where` clause**

Replace:

```ts
      // User filter
      if (input.filter?.userId) {
        whereClause.userId = input.filter.userId;
      }
```

with:

```ts
      // User filter
      if (input.filter?.userId) {
        whereClause.userId = input.filter.userId;
      }

      // IP address filter
      if (input.filter?.ipAddress) {
        whereClause.ipAddress = input.filter.ipAddress;
      }
```

- [ ] **Step 3: Typecheck and lint**

Run: `pnpm typecheck && pnpm check`

Expected: both pass.

- [ ] **Step 4: Commit**

```bash
git add src/server/api/routers/audit-log.ts
git commit -m "feat: add ipAddress filter to auditLog.get"
```

---

## Task 7: `formatDuration` helper

**Files:**
- Create: `src/lib/format-duration.ts`

**Interfaces:**
- Produces: `formatDuration(totalSeconds: number): string`, used by Tasks 10 and 11.

- [ ] **Step 1: Write the helper**

Create `src/lib/format-duration.ts`:

```ts
export function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours === 0 && minutes === 0) return "1 dk'dan az";
  if (hours === 0) return `${minutes} dk`;
  if (minutes === 0) return `${hours} sa`;
  return `${hours} sa ${minutes} dk`;
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`

Expected: passes (nothing imports this yet, so it's a no-op check that the file itself is valid TS).

- [ ] **Step 3: Manual sanity check**

Confirm by inspection: `formatDuration(0)` → `"1 dk'dan az"`, `formatDuration(90)` → `"1 dk"`, `formatDuration(3600)` → `"1 sa"`, `formatDuration(3665)` → `"1 sa 1 dk"`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/format-duration.ts
git commit -m "feat: add formatDuration helper"
```

---

## Task 8: Add `renderSubRow` support to `DataTable`

**Files:**
- Modify: `src/app/_components/data-table.tsx`

**Interfaces:**
- Produces: `DataTable`'s props gain `renderSubRow?: (row: TData) => ReactNode`. When it returns a truthy value for a row, an extra full-width row is rendered directly beneath that row's own `<TableRow>`.

- [ ] **Step 1: Import `Fragment`**

Replace:

```ts
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
```

with:

```ts
import {
  Fragment,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
```

- [ ] **Step 2: Add the prop to `DataTableProps`**

Replace:

```ts
  getRowId?: (row: TData) => string;
  /** Rows for which this returns true render with a neutral "restricted" style instead of their color-coding. */
  getRowRestricted?: (row: TData) => boolean;
}
```

with:

```ts
  getRowId?: (row: TData) => string;
  /** Rows for which this returns true render with a neutral "restricted" style instead of their color-coding. */
  getRowRestricted?: (row: TData) => boolean;
  /** Renders extra content in a full-width row directly below the given row; return null/undefined to render nothing. */
  renderSubRow?: (row: TData) => ReactNode;
}
```

- [ ] **Step 3: Destructure the new prop**

Replace:

```ts
  getRowId,
  getRowRestricted,
}: DataTableProps<TData, TValue>) {
```

with:

```ts
  getRowId,
  getRowRestricted,
  renderSubRow,
}: DataTableProps<TData, TValue>) {
```

- [ ] **Step 4: Render the sub-row in the table body**

Replace the whole `table.getRowModel().rows.map((row) => { ... })` block:

```tsx
              table.getRowModel().rows.map((row) => {
                const color = (row.original as Record<string, unknown>).color as
                  | 'green'
                  | 'blue'
                  | 'orange'
                  | 'yellow'
                  | 'gray'
                  | 'purple'
                  | null
                  | undefined;
                const restricted = getRowRestricted?.(row.original) ?? false;
                return (
                  <TableRow
                    className={cn(
                      restricted
                        ? 'bg-muted/70 text-muted-foreground opacity-70 hover:bg-muted/90 dark:bg-muted/40 dark:hover:bg-muted/60'
                        : cn(
                            color === 'green' &&
                              'bg-green-200 hover:bg-green-300 dark:bg-green-900/80 dark:hover:bg-green-900/90',
                            color === 'blue' &&
                              'bg-blue-200 hover:bg-blue-300 dark:bg-blue-900/80 dark:hover:bg-blue-900/90',
                            color === 'orange' &&
                              'bg-orange-200 hover:bg-orange-300 dark:bg-orange-900/80 dark:hover:bg-orange-900/90',
                            color === 'yellow' &&
                              'bg-yellow-200 hover:bg-yellow-300 dark:bg-yellow-900/80 dark:hover:bg-yellow-900/90',
                            color === 'gray' &&
                              'bg-gray-200 hover:bg-gray-300 dark:bg-gray-500/80 dark:hover:bg-gray-500/90',
                            color === 'purple' &&
                              'bg-purple-200 hover:bg-purple-300 dark:bg-purple-900/80 dark:hover:bg-purple-900/90',
                          ),
                    )}
                    data-state={row.getIsSelected() && 'selected'}
                    key={row.id}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        className={cn(
                          'overflow-hidden text-ellipsis',
                          cell.column.columnDef.meta?.cellClassName?.(
                            row.original,
                          ),
                        )}
                        key={cell.id}
                        style={{
                          width: `${(cell.column.getSize() / table.getTotalSize()) * 100}%`,
                        }}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
```

with:

```tsx
              table.getRowModel().rows.map((row) => {
                const color = (row.original as Record<string, unknown>).color as
                  | 'green'
                  | 'blue'
                  | 'orange'
                  | 'yellow'
                  | 'gray'
                  | 'purple'
                  | null
                  | undefined;
                const restricted = getRowRestricted?.(row.original) ?? false;
                const subRow = renderSubRow?.(row.original);
                return (
                  <Fragment key={row.id}>
                    <TableRow
                      className={cn(
                        restricted
                          ? 'bg-muted/70 text-muted-foreground opacity-70 hover:bg-muted/90 dark:bg-muted/40 dark:hover:bg-muted/60'
                          : cn(
                              color === 'green' &&
                                'bg-green-200 hover:bg-green-300 dark:bg-green-900/80 dark:hover:bg-green-900/90',
                              color === 'blue' &&
                                'bg-blue-200 hover:bg-blue-300 dark:bg-blue-900/80 dark:hover:bg-blue-900/90',
                              color === 'orange' &&
                                'bg-orange-200 hover:bg-orange-300 dark:bg-orange-900/80 dark:hover:bg-orange-900/90',
                              color === 'yellow' &&
                                'bg-yellow-200 hover:bg-yellow-300 dark:bg-yellow-900/80 dark:hover:bg-yellow-900/90',
                              color === 'gray' &&
                                'bg-gray-200 hover:bg-gray-300 dark:bg-gray-500/80 dark:hover:bg-gray-500/90',
                              color === 'purple' &&
                                'bg-purple-200 hover:bg-purple-300 dark:bg-purple-900/80 dark:hover:bg-purple-900/90',
                            ),
                      )}
                      data-state={row.getIsSelected() && 'selected'}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell
                          className={cn(
                            'overflow-hidden text-ellipsis',
                            cell.column.columnDef.meta?.cellClassName?.(
                              row.original,
                            ),
                          )}
                          key={cell.id}
                          style={{
                            width: `${(cell.column.getSize() / table.getTotalSize()) * 100}%`,
                          }}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                    {subRow && (
                      <TableRow>
                        <TableCell
                          className="p-0"
                          colSpan={row.getVisibleCells().length}
                        >
                          {subRow}
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })
```

- [ ] **Step 5: Typecheck and lint**

Run: `pnpm typecheck && pnpm check`

Expected: both pass. No existing `DataTable` consumer passes `renderSubRow`, so this is purely additive — every other page using `DataTable` should behave identically.

- [ ] **Step 6: Manual verification**

Start the dev server and open `/panel/users` (or `/panel/audit-logs`) — confirm the existing table still renders and paginates normally (no visual regression from the `Fragment` wrapping).

- [ ] **Step 7: Commit**

```bash
git add src/app/_components/data-table.tsx
git commit -m "feat: add renderSubRow support to DataTable"
```

---

## Task 9: Add the shadcn `Tabs` component

**Files:**
- Create: `src/components/ui/tabs.tsx` (generated)
- Modify: `package.json`, `pnpm-lock.yaml` (dependency added by the CLI)

**Interfaces:**
- Produces: `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` from `~/components/ui/tabs`, used by Task 13.

- [ ] **Step 1: Run the shadcn CLI**

Run: `pnpm dlx shadcn@latest add tabs -y`

Expected: it adds `@radix-ui/react-tabs` to `package.json` and creates `src/components/ui/tabs.tsx` in the project's "new-york" style (matching `components.json`). If it prompts interactively despite `-y`, answer to overwrite nothing (there's no existing `tabs.tsx`) and proceed with defaults.

- [ ] **Step 2: Typecheck and lint**

Run: `pnpm typecheck && pnpm check`

Expected: both pass. If `pnpm check` flags the generated file's formatting, run `pnpm check:write` and re-run `pnpm check`.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/tabs.tsx package.json pnpm-lock.yaml
git commit -m "feat: add shadcn Tabs component"
```

---

## Task 10: Report table columns

**Files:**
- Create: `src/app/panel/users/report-columns.tsx`

**Interfaces:**
- Consumes: `formatDuration` (Task 7).
- Produces: `UserReportRow` type and `createReportColumns(expandedUserId, onToggleExpand, onOpenActions): ColumnDef<UserReportRow>[]`, consumed by Task 13.

- [ ] **Step 1: Write the columns**

Create `src/app/panel/users/report-columns.tsx`:

```tsx
'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { formatDuration } from '~/lib/format-duration';

export interface UserReportRow {
  id: string;
  name: string;
  email: string;
  totalActiveSeconds: number;
  lastLoginAt: Date | null;
  loginCount: number;
  actionCount: number;
}

export const createReportColumns = (
  expandedUserId: string | null,
  onToggleExpand: (userId: string) => void,
  onOpenActions: (userId: string, userName: string) => void,
): ColumnDef<UserReportRow>[] => [
  {
    id: 'expand',
    size: 40,
    enableResizing: false,
    enableSorting: false,
    cell: ({ row }) => (
      <Button
        className="h-8 w-8 p-0"
        onClick={() => onToggleExpand(row.original.id)}
        size="icon-sm"
        variant="ghost"
      >
        <span className="sr-only">Oturumları Göster</span>
        {expandedUserId === row.original.id ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </Button>
    ),
  },
  {
    accessorKey: 'name',
    header: 'Ad',
    enableSorting: true,
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-medium text-sm">{row.original.name}</span>
        <span className="text-muted-foreground text-xs">
          {row.original.email}
        </span>
      </div>
    ),
  },
  {
    accessorKey: 'loginCount',
    header: 'Giriş Sayısı',
    enableSorting: true,
    cell: ({ row }) => row.original.loginCount,
  },
  {
    accessorKey: 'lastLoginAt',
    header: 'Son Giriş',
    enableSorting: true,
    cell: ({ row }) => {
      const date = row.original.lastLoginAt;
      if (!date) return <span className="text-muted-foreground">-</span>;
      return (
        <div className="flex flex-col">
          <span className="text-sm">
            {new Date(date).toLocaleDateString('tr-TR')}
          </span>
          <span className="text-muted-foreground text-xs">
            {new Date(date).toLocaleTimeString('tr-TR')}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: 'totalActiveSeconds',
    header: 'Toplam Süre',
    enableSorting: true,
    cell: ({ row }) => formatDuration(row.original.totalActiveSeconds),
  },
  {
    accessorKey: 'actionCount',
    header: 'Eylem Sayısı',
    enableSorting: true,
    cell: ({ row }) => (
      <Button
        className="h-auto px-0"
        onClick={() => onOpenActions(row.original.id, row.original.name)}
        variant="link"
      >
        {row.original.actionCount}
      </Button>
    ),
  },
];
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`

Expected: passes (nothing imports this yet).

- [ ] **Step 3: Commit**

```bash
git add src/app/panel/users/report-columns.tsx
git commit -m "feat: add user report table columns"
```

---

## Task 11: Per-IP breakdown sub-table

**Files:**
- Create: `src/app/panel/users/report-ip-breakdown.tsx`

**Interfaces:**
- Consumes: `userReport.getIpBreakdown` (Task 5), `formatDuration` (Task 7).
- Produces: `IpBreakdownTable({ userId, userName, onOpenActions }): JSX.Element`, consumed by Task 13's `renderSubRow`.

- [ ] **Step 1: Write the component**

Create `src/app/panel/users/report-ip-breakdown.tsx`:

```tsx
'use client';

import { Button } from '~/components/ui/button';
import { Spinner } from '~/components/ui/spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table';
import { formatDuration } from '~/lib/format-duration';
import { api } from '~/trpc/react';

interface IpBreakdownTableProps {
  userId: string;
  userName: string;
  onOpenActions: (userId: string, userName: string, ipAddress: string) => void;
}

export function IpBreakdownTable({
  userId,
  userName,
  onOpenActions,
}: IpBreakdownTableProps) {
  const { data, isLoading } = api.userReport.getIpBreakdown.useQuery({
    userId,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center p-4">
        <Spinner className="size-5" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground text-sm">
        Henüz oturum verisi yok
      </div>
    );
  }

  return (
    <Table className="bg-muted/30">
      <TableHeader>
        <TableRow>
          <TableHead>IP Adresi</TableHead>
          <TableHead>Giriş Sayısı</TableHead>
          <TableHead>Son Giriş</TableHead>
          <TableHead>Toplam Süre</TableHead>
          <TableHead>Eylem Sayısı</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row) => (
          <TableRow key={row.ipAddress}>
            <TableCell className="font-mono text-xs">
              {row.ipAddress === 'unknown' ? 'Bilinmiyor' : row.ipAddress}
            </TableCell>
            <TableCell>{row.loginCount}</TableCell>
            <TableCell>
              {row.lastLoginAt
                ? new Date(row.lastLoginAt).toLocaleString('tr-TR')
                : '-'}
            </TableCell>
            <TableCell>{formatDuration(row.activeSeconds)}</TableCell>
            <TableCell>
              <Button
                className="h-auto px-0"
                onClick={() => onOpenActions(userId, userName, row.ipAddress)}
                variant="link"
              >
                {row.actionCount}
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`

Expected: passes (nothing imports this yet).

- [ ] **Step 3: Commit**

```bash
git add src/app/panel/users/report-ip-breakdown.tsx
git commit -m "feat: add per-IP breakdown sub-table"
```

---

## Task 12: Action-count drill-down modal

**Files:**
- Create: `src/app/panel/users/report-actions-dialog.tsx`

**Interfaces:**
- Consumes: `auditLog.get` with its new `ipAddress` filter (Task 6), `createColumns`/`ViewAuditLogDialog` from `src/app/panel/audit-logs/columns.tsx` and `view-dialog.tsx` (existing, unmodified), `DataTable` (Task 8, though this task doesn't use `renderSubRow`).
- Produces: `ReportActionsDialog({ open, onOpenChange, userId, userName, ipAddress? }): JSX.Element`, consumed by Task 13.

- [ ] **Step 1: Write the component**

Create `src/app/panel/users/report-actions-dialog.tsx`:

```tsx
'use client';

import type { PaginationState, SortingState } from '@tanstack/react-table';
import type { AuditLog, User } from 'generated/prisma';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import { Spinner } from '~/components/ui/spinner';
import { api } from '~/trpc/react';
import { DataTable } from '../../_components/data-table';
import { createColumns } from '../audit-logs/columns';
import { ViewAuditLogDialog } from '../audit-logs/view-dialog';

type AuditLogWithUser = AuditLog & {
  user: Pick<User, 'id' | 'name' | 'email' | 'image'> | null;
};

interface ReportActionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  ipAddress?: string;
}

export function ReportActionsDialog({
  open,
  onOpenChange,
  userId,
  userName,
  ipAddress,
}: ReportActionsDialogProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  });
  const [selectedAuditLog, setSelectedAuditLog] =
    useState<AuditLogWithUser | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  const { data, isLoading } = api.auditLog.get.useQuery(
    {
      page: pagination.pageIndex + 1,
      itemsPerPage: pagination.pageSize,
      filter: { userId, ipAddress },
      sorting,
    },
    { enabled: open },
  );

  const columns = createColumns((auditLog) => {
    setSelectedAuditLog(auditLog);
    setViewDialogOpen(true);
  });

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[1100px]">
        <DialogHeader>
          <DialogTitle>
            {ipAddress
              ? `${userName} — ${ipAddress} Eylemleri`
              : `${userName} — Tüm Eylemler`}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center p-8">
            <Spinner className="size-8" />
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={data?.data ?? []}
            pageCount={data?.pagination?.totalPages ?? -1}
            pagination={pagination}
            setPagination={setPagination}
            setSorting={setSorting}
            sorting={sorting}
            tableId="report-actions"
            totalCount={data?.pagination?.totalItems}
          />
        )}

        {selectedAuditLog && (
          <ViewAuditLogDialog
            auditLog={selectedAuditLog}
            onOpenChange={setViewDialogOpen}
            open={viewDialogOpen}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`

Expected: passes (nothing imports this yet).

- [ ] **Step 3: Commit**

```bash
git add src/app/panel/users/report-actions-dialog.tsx
git commit -m "feat: add action-count drill-down modal"
```

---

## Task 13: Wire the report tab into `/panel/users`

**Files:**
- Create: `src/app/panel/users/report-tab.tsx`
- Modify: `src/app/panel/users/page-client.tsx`

**Interfaces:**
- Consumes: `userReport.get` (Task 5), `createReportColumns`/`UserReportRow` (Task 10), `IpBreakdownTable` (Task 11), `ReportActionsDialog` (Task 12), `DataTable`'s `renderSubRow` (Task 8), `Tabs`/`TabsList`/`TabsTrigger`/`TabsContent` (Task 9), the existing `FilterControls` (`src/app/panel/users/filter-controls.tsx`, unmodified — it's already generic over `keyof User`).
- Produces: the finished feature — nothing else in this plan consumes this task's output.

- [ ] **Step 1: Write the report tab**

Create `src/app/panel/users/report-tab.tsx`:

```tsx
'use client';

import type { PaginationState, SortingState } from '@tanstack/react-table';
import type { User } from 'generated/prisma';
import { useState } from 'react';
import { Card, CardHeader, CardTitle } from '~/components/ui/card';
import { Spinner } from '~/components/ui/spinner';
import { api } from '~/trpc/react';
import { DataTable } from '../../_components/data-table';
import { FilterControls } from './filter-controls';
import { createReportColumns } from './report-columns';
import { ReportActionsDialog } from './report-actions-dialog';
import { IpBreakdownTable } from './report-ip-breakdown';

interface ActionsTarget {
  userId: string;
  userName: string;
  ipAddress?: string;
}

export function UserReportTab() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  });
  const [search, setSearch] = useState('');
  const [searchScope, setSearchScope] = useState<'all' | keyof User>('all');
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  // actionsTarget holds the modal's data and is intentionally NOT cleared on
  // close — only actionsOpen toggles, so ReportActionsDialog's close
  // animation can play instead of the modal unmounting mid-transition. Same
  // split as ViewUserDialog's selectedUser/viewDialogOpen pair above.
  const [actionsTarget, setActionsTarget] = useState<ActionsTarget | null>(
    null,
  );
  const [actionsOpen, setActionsOpen] = useState(false);

  const { data, isLoading } = api.userReport.get.useQuery({
    page: pagination.pageIndex + 1,
    itemsPerPage: pagination.pageSize,
    filter: { search, searchScope },
    sorting,
  });

  const openActions = (target: ActionsTarget) => {
    setActionsTarget(target);
    setActionsOpen(true);
  };

  const columns = createReportColumns(
    expandedUserId,
    (userId) =>
      setExpandedUserId((current) => (current === userId ? null : userId)),
    (userId, userName) => openActions({ userId, userName }),
  );

  return (
    <div>
      <div className="mb-4">
        <FilterControls
          onSearch={setSearch}
          onSearchScope={setSearchScope}
          search={search}
          searchScope={searchScope}
        />
      </div>
      <Card className={isLoading ? undefined : 'rounded-b-none border-b-0'}>
        <CardHeader>
          <CardTitle>Kullanıcı Raporu</CardTitle>
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
            pageCount={data?.pagination?.totalPages ?? -1}
            pagination={pagination}
            renderSubRow={(row) =>
              row.id === expandedUserId ? (
                <IpBreakdownTable
                  onOpenActions={(userId, userName, ipAddress) =>
                    openActions({ userId, userName, ipAddress })
                  }
                  userId={row.id}
                  userName={row.name}
                />
              ) : null
            }
            setPagination={setPagination}
            setSorting={setSorting}
            sorting={sorting}
            tableId="user-report"
            totalCount={data?.pagination?.totalItems}
          />
        </div>
      )}

      {actionsTarget && (
        <ReportActionsDialog
          ipAddress={actionsTarget.ipAddress}
          onOpenChange={setActionsOpen}
          open={actionsOpen}
          userId={actionsTarget.userId}
          userName={actionsTarget.userName}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Wrap `page-client.tsx`'s content in `Tabs`**

In `src/app/panel/users/page-client.tsx`, add these imports alongside the existing ones:

```ts
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { UserReportTab } from './report-tab';
```

Then replace the component's `return` statement — from:

```tsx
  return (
    <div className="w-full p-4 sm:p-6 lg:p-8">
      <div className="mx-auto w-full max-w-[1600px]">
        <div className="mb-4">
          <FilterControls
            onSearch={setSearch}
            onSearchScope={setSearchScope}
            search={search}
            searchScope={searchScope}
          />
        </div>
        <Card className={cn(!isLoading && 'rounded-b-none border-b-0')}>
          <CardHeader className="flex flex-row items-center">
            <CardTitle className="mr-auto">Kullanıcılar</CardTitle>
            <div className="ml-auto">
              <CreateUserDialog />
            </div>
          </CardHeader>
        </Card>
        {isLoading ? (
          <div className="flex justify-center">
            <Spinner className="mt-10 size-8" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <DataTable
              bulkActionsBar={bulkActionsBar}
              columns={columns}
              data={data?.data ?? []}
              exportFilename="kullanıcılar"
              onRowSelectionChange={setRowSelection}
              pageCount={data?.pagination?.totalPages ?? -1}
              pagination={pagination}
              rowSelection={rowSelection}
              setPagination={setPagination}
              setSorting={setSorting}
              sorting={sorting}
              tableId="users"
              totalCount={data?.pagination?.totalItems}
            />
          </div>
        )}

        {selectedUser && (
          <ViewUserDialog
            onOpenChange={setViewDialogOpen}
            onUpdate={(updatedUser) => {
              setSelectedUser(updatedUser);
              if (pagination.pageSize === 500) {
                // Largest page size — avoid re-fetching all 500 rows on
                // every save, patch the already-cached page instead
                utils.user.get.setData(userQueryInput, (old) =>
                  old
                    ? {
                        ...old,
                        data: old.data.map((u) =>
                          u.id === updatedUser.id ? updatedUser : u,
                        ),
                      }
                    : old,
                );
              } else {
                utils.user.get.invalidate();
              }
            }}
            open={viewDialogOpen}
            user={selectedUser}
          />
        )}

        <Dialog onOpenChange={setDeleteConfirmOpen} open={deleteConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Toplu Silme</DialogTitle>
              <DialogDescription>
                {selectedIds.length} kullanıcıyı silmek istediğinizden emin
                misiniz? Bu işlem geri alınamaz.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                onClick={() => setDeleteConfirmOpen(false)}
                variant="outline"
              >
                İptal
              </Button>
              <Button
                disabled={bulkDeleteMutation.isPending}
                onClick={() => bulkDeleteMutation.mutate({ ids: selectedIds })}
                variant="destructive"
              >
                {bulkDeleteMutation.isPending ? 'Siliniyor...' : 'Evet, Sil'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
```

to:

```tsx
  return (
    <div className="w-full p-4 sm:p-6 lg:p-8">
      <div className="mx-auto w-full max-w-[1600px]">
        <Tabs defaultValue="users">
          <TabsList className="mb-4">
            <TabsTrigger value="users">Kullanıcılar</TabsTrigger>
            <TabsTrigger value="report">Kullanıcı Raporu</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <div className="mb-4">
              <FilterControls
                onSearch={setSearch}
                onSearchScope={setSearchScope}
                search={search}
                searchScope={searchScope}
              />
            </div>
            <Card className={cn(!isLoading && 'rounded-b-none border-b-0')}>
              <CardHeader className="flex flex-row items-center">
                <CardTitle className="mr-auto">Kullanıcılar</CardTitle>
                <div className="ml-auto">
                  <CreateUserDialog />
                </div>
              </CardHeader>
            </Card>
            {isLoading ? (
              <div className="flex justify-center">
                <Spinner className="mt-10 size-8" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <DataTable
                  bulkActionsBar={bulkActionsBar}
                  columns={columns}
                  data={data?.data ?? []}
                  exportFilename="kullanıcılar"
                  onRowSelectionChange={setRowSelection}
                  pageCount={data?.pagination?.totalPages ?? -1}
                  pagination={pagination}
                  rowSelection={rowSelection}
                  setPagination={setPagination}
                  setSorting={setSorting}
                  sorting={sorting}
                  tableId="users"
                  totalCount={data?.pagination?.totalItems}
                />
              </div>
            )}

            {selectedUser && (
              <ViewUserDialog
                onOpenChange={setViewDialogOpen}
                onUpdate={(updatedUser) => {
                  setSelectedUser(updatedUser);
                  if (pagination.pageSize === 500) {
                    // Largest page size — avoid re-fetching all 500 rows on
                    // every save, patch the already-cached page instead
                    utils.user.get.setData(userQueryInput, (old) =>
                      old
                        ? {
                            ...old,
                            data: old.data.map((u) =>
                              u.id === updatedUser.id ? updatedUser : u,
                            ),
                          }
                        : old,
                    );
                  } else {
                    utils.user.get.invalidate();
                  }
                }}
                open={viewDialogOpen}
                user={selectedUser}
              />
            )}

            <Dialog
              onOpenChange={setDeleteConfirmOpen}
              open={deleteConfirmOpen}
            >
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Toplu Silme</DialogTitle>
                  <DialogDescription>
                    {selectedIds.length} kullanıcıyı silmek istediğinizden
                    emin misiniz? Bu işlem geri alınamaz.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    onClick={() => setDeleteConfirmOpen(false)}
                    variant="outline"
                  >
                    İptal
                  </Button>
                  <Button
                    disabled={bulkDeleteMutation.isPending}
                    onClick={() =>
                      bulkDeleteMutation.mutate({ ids: selectedIds })
                    }
                    variant="destructive"
                  >
                    {bulkDeleteMutation.isPending ? 'Siliniyor...' : 'Evet, Sil'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

          <TabsContent value="report">
            <UserReportTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Typecheck and lint**

Run: `pnpm typecheck && pnpm check`

Expected: both pass. If `pnpm check` flags formatting, run `pnpm check:write` and re-run `pnpm check`.

- [ ] **Step 4: Manual E2E verification**

Start the dev server, sign in as an admin, go to `/panel/users`:
1. Confirm the "Kullanıcılar" tab still works exactly as before (list, search, create, delete).
2. Switch to "Kullanıcı Raporu" — confirm the list loads with Giriş Sayısı / Son Giriş / Toplam Süre / Eylem Sayısı columns, and that search and column-header sorting all work.
3. Click the expand chevron on a row with login history — confirm the per-IP breakdown appears below it, and collapses again on a second click.
4. On a row with no activity yet, confirm expanding it shows "Henüz oturum verisi yok".
5. Click the parent row's "Eylem Sayısı" number — confirm a modal opens titled "`<name>` — Tüm Eylemler" listing that user's audit log entries across all IPs, and that its own pagination/sorting work.
6. Expand a row, then click a per-IP "Eylem Sayısı" number — confirm a modal opens titled "`<name>` — `<ip>` Eylemleri" listing only that IP's entries.
7. From inside either drill-down modal, open a row's detail via its row menu — confirm `ViewAuditLogDialog` opens on top (dialog-in-dialog) and displays correctly.
8. Confirm any `ipAddress` shown as `'unknown'` in the data renders as "Bilinmiyor" in both the breakdown table and (if applicable) nowhere else needs it.

- [ ] **Step 5: Commit**

```bash
git add src/app/panel/users/report-tab.tsx src/app/panel/users/page-client.tsx
git commit -m "feat: add user telemetry report tab to /panel/users"
```

---

## Self-Review Notes

- **Spec coverage:** data model changes → Task 1; `createAuditLog`/`createAuthAuditLog` IP capture → Tasks 2–3; activity accumulator IP scoping → Task 4; `userReport.get`/`getIpBreakdown` → Task 5; `auditLog.get` IP filter → Task 6; `formatDuration` → Task 7; `DataTable` row expansion → Task 8; `Tabs` → Task 9; report UI (columns, breakdown, modal, tab wiring) → Tasks 10–13. `lastLoginAt` backfill from the spec's error-handling section → Task 1, Steps 6–7. Every spec section has a task.
- **Placeholder scan:** no TBD/TODO markers; every step has literal code or an exact shell command.
- **Type consistency:** `UserReportRow` (Task 10) matches `userReport.get`'s mapped return shape (Task 5) field-for-field (`id`, `name`, `email`, `totalActiveSeconds`, `lastLoginAt`, `loginCount`, `actionCount`). `IpBreakdownTable`'s consumed shape matches `getIpBreakdown`'s return (`ipAddress`, `loginCount`, `lastLoginAt`, `activeSeconds`, `actionCount`) exactly. `recordHeartbeat(userId, ipAddress)`'s new signature (Task 4) is used consistently at its one call site in `activity.ts` (same task). `createAuditLog(ctx, ...)`'s new signature (Task 2) is used consistently at all 61 call sites via the mechanical replace, verified by Task 2 Step 3's grep check.
- **Fixed during review:** Task 13's first draft closed `ReportActionsDialog` by nulling the same state it used to decide whether to render at all, which would have skipped Radix's close animation (unmount instead of an animated close). Reworked to split `actionsTarget` (sticky data, mirrors `ViewUserDialog`'s `selectedUser`) from `actionsOpen` (the toggle), matching the convention already used elsewhere in `page-client.tsx`.
