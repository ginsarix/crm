# User Telemetry Report — Design

Status: Approved for planning
Date: 2026-08-13

## Problem

The app separately tracks login events (`LoginEvent`) and elapsed active
time (`User.totalActiveSeconds`, `UserDailyActivity`), both added earlier
in the same work session as this design. Neither carries an IP address.
There's no report that surfaces this data to admins, and no way to see
whether a user's activity is concentrated on one IP or spread across
several (e.g. shared/suspicious credentials, multiple devices, VPN use).

## Goal

A report, added as a new tab on the existing `/panel/users` admin page,
listing per-user: login count, last login date, total elapsed active
time, and total action count (defined as audit log entry count). Each
row can be expanded to show the same four metrics broken down by the
unique IP addresses seen for that user. Action counts (both the
per-user total and each per-IP figure) are clickable and open a
filtered view of the underlying audit log entries.

## Non-goals

- No new unified "telemetry" table. Each existing subsystem
  (`LoginEvent`, `AuditLog`, `UserDailyActivity`) gains an `ipAddress`
  dimension instead — see [Rejected alternatives](#rejected-alternatives).
- No historical IP backfill for `LoginEvent`/`AuditLog` rows created
  before this ships — not possible without re-deriving from data that
  was never captured. Existing rows get a `'unknown'` sentinel.
- No date-range filtering on the report — all figures are all-time
  totals, matching how `totalActiveSeconds` already works.
- No per-day-per-IP UI — `UserDailyActivity` gains the IP dimension
  (see below) so it's available if a future feature needs it, but this
  report only surfaces all-time-per-IP totals, not a daily breakdown.

## Data model changes

All changes are additive columns / a widened unique key on existing
tables — no new tables.

### `LoginEvent`

```prisma
model LoginEvent {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  ipAddress String   @default("unknown") // new

  @@index([userId])
}
```

Captured in the existing `databaseHooks.session.create.after` hook in
`src/server/better-auth/config.ts` — the `session` row passed into that
hook already has `.ipAddress` set by better-auth, so this is a one-line
addition, not a new capture mechanism.

### `AuditLog`

```prisma
model AuditLog {
  // ...existing fields
  ipAddress String @default("unknown") // new
}
```

Captured by changing `createAuditLog()` (`src/server/api/trpc.ts`) to
take `ctx` instead of separately-threaded `db`/`userId`, deriving both
`userId` (from `ctx.session.user.id`) and `ipAddress` (from
`ctx.session.session.ipAddress`) internally. Every one of its ~61 call
sites currently calls it as `createAuditLog(ctx.db, ctx.session.user.id,
...)`, so this is a mechanical per-site edit that removes an argument
rather than adding one. `createAuthAuditLog()` in
`src/server/better-auth/config.ts` (login/logout audit entries) gets
the equivalent change using the hook's own context.

### `UserDailyActivity`

```prisma
model UserDailyActivity {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  date          DateTime @db.Date
  ipAddress     String   @default("unknown") // new
  activeSeconds Int      @default(0)
  updatedAt     DateTime @updatedAt

  @@unique([userId, date, ipAddress]) // was [userId, date]
  @@index([date])
}
```

No consumers read this table yet (only `activity-tracker.ts` writes to
it), so widening the unique key is safe.

`src/server/activity-tracker.ts`'s in-memory accumulator changes its
map key from `userId` to `` `${userId}:${ipAddress}` ``. The dedup
window (collapsing multiple tabs into one credit) now naturally scopes
to a single user+IP pair instead of just user — this is a slight
correctness improvement, not a behavior change, since multiple tabs on
one physical client already share an IP. `recordHeartbeat()` takes an
additional `ipAddress` parameter, sourced from
`ctx.session.session.ipAddress` in `activity.heartbeat`.

The flush loop upserts `UserDailyActivity` per `(userId, ipAddress)`
entry and still increments `User.totalActiveSeconds` per user (summed
across that user's IP entries within a flush batch — see
[Error handling](#error-handling--edge-cases)). `User.totalActiveSeconds`
itself is unchanged and remains the source for the report's unscoped
total elapsed time.

### `User`

```prisma
model User {
  // ...existing fields
  lastLoginAt DateTime? // new
}
```

Denormalized for cheap sorting (see [API design](#api--report-queries)),
mirroring how `totalActiveSeconds` already exists for the same reason.
Set in the same `databaseHooks.session.create.after` hook as
`LoginEvent`.

## API / report queries

New router `src/server/api/routers/user-report.ts`, registered in
`root.ts`, kept separate from `user.ts` to keep CRUD and reporting
concerns apart (matching the existing `business-group` /
`business-group-card` split). Both procedures use `adminProcedure`,
matching `user.ts`'s own convention for admin-facing data.

### `userReport.get`

Same input/output shape as `user.get` (`filter.search` /
`filter.searchScope` over `columnMap.user`, `sorting`, `page`,
`itemsPerPage`) — reuses `findTurkishSearchMatchesInTable` for search,
no new `column-map.ts` entries needed since no new searchable fields
are introduced.

```ts
db.user.findMany({
  where: whereClause, // same search-by-name/email as user.get
  select: {
    id: true, name: true, email: true,
    totalActiveSeconds: true, lastLoginAt: true,
    _count: { select: { loginEvents: true, audits: true } },
  },
  orderBy, skip, take,
})
```

`orderBy` supports all four report columns natively: `lastLoginAt` and
`totalActiveSeconds` as plain columns, `loginEvents`/`audits` counts via
Prisma's relation-count ordering (`orderBy: { loginEvents: { _count:
'desc' } } }`). This is why `lastLoginAt` is denormalized onto `User`
rather than derived via `_max` — Prisma's `orderBy` supports `_count`
on to-many relations but not `_max`, and a raw-SQL query here would be
inconsistent with how the rest of the codebase does things (raw SQL is
used narrowly, only for Turkish-text search). Pagination via
`db.user.count({ where })`, identical to `user.get`.

### `userReport.getIpBreakdown`

Input: `{ userId: string }`. Fetched lazily — only when a row's
"sessions" toggle is expanded (`enabled: isExpanded` on the client
query). Not paginated or sortable; it's a small expanded list, not a
top-level table.

Three `groupBy` queries scoped to `userId`, merged in JS into one row
per `ipAddress` (union of IPs across all three sources, missing metrics
default to 0/null):

- `LoginEvent.groupBy({ by: ['ipAddress'], where: { userId }, _count: true, _max: { createdAt: true } })`
- `UserDailyActivity.groupBy({ by: ['ipAddress'], where: { userId }, _sum: { activeSeconds: true } })`
- `AuditLog.groupBy({ by: ['ipAddress'], where: { userId }, _count: true })`

### `auditLog.get` filter extension

`src/server/api/routers/audit-log.ts`'s `filterSchema` gains an
optional `ipAddress: z.string().optional()`, applied to `whereClause`
the same way the existing `userId` filter already is. This is what
powers the action-count drill-down modal (below) without a bespoke
query.

## UI

- `/panel/users` gains a shadcn `Tabs` component (not yet in the
  project — `pnpm dlx shadcn add tabs`): "Kullanıcılar" (existing table,
  unchanged) and a new "Kullanıcı Raporu" tab.
- The report tab reuses `FilterControls` + `DataTable` for
  search/sort/pagination, same pattern as the existing tab.
- `DataTable` (`src/app/_components/data-table.tsx`) doesn't support row
  expansion today. Add it as a narrow, opt-in capability (e.g. a
  `renderSubRow?: (row) => ReactNode` prop plus a toggle column) rather
  than forking the component, since expand/collapse is a table-level
  concern that may be useful elsewhere later.
- Report columns: Ad Soyad, E-posta, Giriş Sayısı, Son Giriş, Toplam
  Süre, Eylem Sayısı (clickable — see below), plus an expand toggle.
- Expanding a row fires `userReport.getIpBreakdown`, rendering a nested
  table: IP Adresi, Giriş Sayısı, Son Giriş, Toplam Süre, Eylem Sayısı
  (also clickable). Rows with `ipAddress === 'unknown'` are labeled
  "Bilinmiyor". Empty result renders "Henüz oturum verisi yok" instead
  of blank space.
- No existing seconds→duration formatter in the codebase
  (`totalActiveSeconds` has no UI consumer yet) — add a small
  `src/lib/format-duration.ts` helper, used in both the main and nested
  tables.

### Action-count drill-down modal

New component (e.g. `src/app/panel/users/report-actions-dialog.tsx`): a
wide `Dialog` containing a self-contained, read-only `DataTable` (no row
selection or bulk-delete wiring), reusing `createColumns` from
`../audit-logs/columns.tsx` and `ViewAuditLogDialog` for row-level
detail — both are already generic components with no page-specific
coupling. It queries `auditLog.get` with `filter: { userId, ipAddress }`
(`ipAddress` omitted for the parent-row case), its own local
pagination/sorting state, and `enabled: open`.

Both the **parent row's** "Eylem Sayısı" and each **per-IP row's**
"Eylem Sayısı" are clickable and open this same modal — the parent
passes just `userId` (all of that user's actions across every IP), a
per-IP row passes `userId` + `ipAddress`.

## Error handling & edge cases

- **IP resolution gaps**: all three sources fall back to the
  `'unknown'` sentinel consistently when better-auth can't resolve a
  request IP — the UI never has to special-case a raw `null`.
- **`User.lastLoginAt` backfill**: this is a new column, so it starts
  `null` for everyone. But `LoginEvent` already has real history from
  earlier today — so a user with existing login events would show
  `loginCount > 0` yet `lastLoginAt: null` until their next login. Fix:
  a one-time backfill (`lastLoginAt = MAX(LoginEvent.createdAt)` per
  user) run once after the migration lands, as a rollout step rather
  than app code.
- **`UserDailyActivity`'s widened unique key**: existing rows get
  `ipAddress` backfilled to `'unknown'` via the column default, which
  is safe — each pre-existing row was already unique on `(userId,
  date)`, so adding a same-valued third column can't collide.
- **Multi-IP-in-one-flush-window**: the accumulator's flush loop
  increments `User.totalActiveSeconds` once per `(userId, ip)` entry
  rather than pre-summing by user first; Prisma's `increment` is
  atomic, so doing it twice in one transaction for the same user (rare
  — concurrent sessions from two IPs within one 2-minute flush window)
  still nets out correctly.
- **Deleted users**: unaffected — the report only ever lists rows from
  `User.findMany`, and `LoginEvent`/`AuditLog`'s existing cascade/
  set-null behavior on user deletion is untouched.

## Testing

No automated test suite exists in this repo (per `CLAUDE.md`'s command
list, and consistent with how the login-event and activity-tracking
features were verified earlier in this same session). Same convention
applies: `pnpm typecheck` + `pnpm check`, then manual/browser-driven E2E
covering:

- Report tab search/sort/pagination
- Row-expand loading the per-IP breakdown, including the empty state
- `'unknown'`-IP labeling
- Both action-count click targets (parent and per-IP) opening the modal
  pre-filtered correctly
- `ViewAuditLogDialog` opening correctly from inside the drill-down
  modal (dialog-in-dialog)

## Rejected alternatives

**Unified telemetry table.** Replace `LoginEvent` / `UserDailyActivity`
/ the relevant `AuditLog` rows with one polymorphic events table
(`type`, `userId`, `ipAddress`, `timestamp`). Rejected: this would be a
much larger rewrite touching all three subsystems' write paths, and
directly works against the activity tracker's deliberate low-write-
volume design (a batched flush instead of a row per heartbeat). The
per-subsystem extension achieves the same report with a much smaller,
lower-risk diff.

**Relying on `Session` for login history.** better-auth's `Session`
table already has `ipAddress` and one row per real login (not per
request — `updateAge: 0` extends the existing row rather than creating
new ones on every slide). Rejected as the login-count/last-login source
because sessions are deleted on logout, so it can't serve as a durable
historical log — which is why `LoginEvent` exists as a separate table
in the first place.
