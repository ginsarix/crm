# Device Tracking — Design

Status: Approved for planning
Date: 2026-08-24

## Problem

The user report (added in [2026-08-13-user-telemetry-report-design.md](2026-08-13-user-telemetry-report-design.md))
groups a user's telemetry by IP address: `user → IP`. An IP is a weak proxy
for "who is this" — a device roaming across networks (mobile data → home
WiFi) shows up as several unrelated rows, and two different devices behind
the same NAT/office IP collapse into one. There's no durable, stable
identifier for "this specific browser/device" independent of network.

## Goal

Introduce a `Device` identified by an `HttpOnly` `device_uuid` cookie, and
regroup the user report one level deeper: `user → device → IP`. Existing
per-IP metrics (login count, active time, action count) move under each
device, summed across that device's IPs; each device row still expands to
show the per-IP detail it has today. A one-off backfill script assigns a
best-effort device to historical rows that predate the cookie.

## Non-goals

- **No "Devices Report" (devices → users) UI/router in this pass.** The
  schema (a global `Device` + `DeviceUser` join, not a per-user device) is
  chosen so that report is a straightforward addition later, but building
  it is out of scope here.
- **No perfect historical reconstruction.** `UserDailyActivity` and
  `AuditLog` never recorded `userAgent`, only `ipAddress` — backfilling
  those two is an IP-matching heuristic (below), not exact. Rows that
  can't be matched land in a per-user "Bilinmeyen cihaz" (unknown device)
  bucket rather than being dropped or guessed further.
- **No cross-user device identity guarantees.** A shared computer used by
  two different users produces two separate `DeviceUser` rows pointing at
  the same `Device` (same cookie value) — this is intentional, not a bug
  to solve.
- **No change to `Session`'s own `ipAddress`/`userAgent` fields** —
  better-auth's own session tracking is untouched; `Device` is additive.

## Data model changes

### New: `Device` and `DeviceUser`

```prisma
model Device {
  id             String   @id @default(cuid())
  deviceUuid     String   @unique
  lastUserAgent  String?
  createdAt      DateTime @default(now())

  users         DeviceUser[]
  loginEvents   LoginEvent[]
  dailyActivity UserDailyActivity[]
  auditLogs     AuditLog[]
}

model DeviceUser {
  deviceId String
  device   Device @relation(fields: [deviceId], references: [id], onDelete: Cascade)
  userId   String
  user     User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  firstSeenAt DateTime @default(now())
  lastSeenAt  DateTime @updatedAt

  @@id([deviceId, userId])
  @@index([userId])
}
```

`Device` is global, keyed only by `deviceUuid` — not scoped to a user —
so a device seen across multiple users (shared computer) is one row, with
one `DeviceUser` row per user who's used it. `DeviceUser` is what makes a
future devices→users report cheap: querying "which users have used this
device" is a direct index lookup, not a scan across three event tables.

`lastUserAgent` is set when the `Device` row is first created and
refreshed only on `LoginEvent` writes (not on every heartbeat/audit
write) — cheap, and a login is frequent enough to keep it fresh without
touching this column on every request.

### `LoginEvent`, `UserDailyActivity`, `AuditLog`

Each gains:

```prisma
deviceId String?
device   Device? @relation(fields: [deviceId], references: [id], onDelete: SetNull)
```

Nullable because pre-cookie history and any stray cookie-less request
(programmatic API access, cookie blocked/cleared) have no device to point
at — these fall into the per-user "Bilinmeyen cihaz" bucket in the UI
rather than being treated as an error case.

`UserDailyActivity`'s unique key widens from `[userId, date, ipAddress]`
to `[userId, date, ipAddress, deviceId]`, so two devices sharing an IP on
the same day accrue separate rows instead of one merged total. Existing
rows all have `deviceId: null` at migration time, which is a valid,
distinct value for the constraint — no collision with pre-existing rows.

## Cookie mechanism

- `src/proxy.ts` runs on every request — confirmed against
  `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`
  that in this Next.js version (16.2.11) the `middleware.ts` convention
  is deprecated and renamed to `proxy.ts`, exporting a `proxy` function
  (not `middleware`), and defaults to the **Node.js runtime** (not Edge)
  as of v16 — so no edge-runtime restrictions apply here. If the
  `device_uuid` cookie is absent, mint one (`crypto.randomUUID()`), set
  it `HttpOnly`, `Secure` in production, `SameSite=Lax`, ~2 year
  `maxAge`, and forward it on the same pass via
  `NextResponse.next({ request: { headers } })` so the *current* request
  already has it — this closes the gap where the very request that mints
  the cookie also needs to use it (the client won't have stored the
  `Set-Cookie` yet).
- A shared helper, `resolveDeviceId(headers, userId)`
  (`src/server/lib/resolve-device-id.ts`), reads the id (forwarded header,
  falling back to parsing the `Cookie` header directly), `upsert`s the
  `Device` row by `deviceUuid`, `upsert`s the matching `DeviceUser` row
  (bumping `lastSeenAt`), and returns `device.id`.

### Write paths

- **`LoginEvent`** (`databaseHooks.session.create.after` in
  `src/server/better-auth/config.ts`): the hook's `context` already
  carries request headers (confirmed via `better-call`'s
  `EndpointContext` type, which `GenericEndpointContext` extends). Calls
  `resolveDeviceId`, and additionally sets/refreshes `Device.lastUserAgent`
  here.
- **`UserDailyActivity`** (the heartbeat mutation feeding
  `src/server/activity-tracker.ts`): `deviceId` threads through
  `recordHeartbeat`/`flushActivity` alongside the existing `ipAddress`,
  same accumulator-key pattern (`` `${userId}:${ipAddress}:${deviceId}` ``).
- **`AuditLog`** (`createAuditLog` in `src/server/api/trpc.ts`): callers
  already pass the full tRPC `ctx`, which already carries `.headers`
  (`createTRPCContext` spreads `...opts`) — only `createAuditLog`'s
  narrow ctx *type* needs widening to declare it. **No call-site changes**
  across the ~61 routers that call it.

### Known limitation

Two simultaneous first-ever requests from the same browser (e.g. two
tabs opened before any cookie exists) can each mint a different UUID
before either `Set-Cookie` reaches the client; whichever one the browser
persists "wins," and the other request's device is a one-event orphan.
Rare (only possible on a browser's literal first two requests) and low-
stakes (an extra single-login device row, not a correctness bug) —
accepted rather than engineered around (would need cross-request
locking).

## Backfill script

`scripts/backfill-devices.js` — plain JS (this repo is `"type": "module"`),
run directly via `node scripts/backfill-devices.js` against
`generated/prisma`. No new dependency (no `tsx`, no `psql` access path to
set up) — it runs anywhere `next start` already runs, since it's the same
Node binary and the same generated Prisma Client.

The entire backfill executes inside one Prisma **interactive
transaction** — `db.$transaction(async (tx) => { ... }, { timeout: 5 *
60 * 1000 })` — which issues a real Postgres `BEGIN`, and only `COMMIT`s
if every step below completes without throwing; any error rolls back
everything. Same atomicity guarantee a hand-written SQL `BEGIN...COMMIT`
script would give, and using Prisma's own `create()` for new rows means
generated ids are real `cuid()`s, consistent with every other row in the
table — no raw-SQL id-generation workaround needed. The explicit timeout
override exists because the default (5s) is too short for a bulk pass
over the full login/audit history.

1. **Synthesize legacy devices from `LoginEvent`.** Group all
   `LoginEvent` rows with `deviceId: null` by `(userId, userAgent)`. For
   each group with a non-null `userAgent`: create a `Device`
   (`deviceUuid` prefixed `legacy-<random>` so it's visibly distinct from
   a real cookie value), `lastUserAgent` set to that exact string, and a
   `DeviceUser` row with `firstSeenAt`/`lastSeenAt` from the group's
   earliest/latest `createdAt`. Bulk-update the group's `LoginEvent` rows
   to the new `deviceId`. Groups with a null/empty `userAgent` are left
   alone — they fall into the unknown-device bucket rather than inventing
   a device for "no user agent."
2. **Build an IP → device lookup.** From the `LoginEvent` rows just
   assigned, for each `(userId, ipAddress)` pick the device with the most
   `LoginEvent`s from that IP (tie-break: most recent).
3. **Backfill `UserDailyActivity` and `AuditLog`.** For each row with
   `deviceId: null`, look up `(userId, ipAddress)` in the map from step 2
   and assign if found. No match (including `ipAddress: 'unknown'`)
   stays `null`.

Because the whole run is one transaction, there's no partial-completion
state to design around — either the full backfill lands, or (on any
error, including a timeout) none of it does and it's safe to fix the
issue and re-run from scratch.

Run order: `pnpm db:push` (new schema) → deploy code with cookie
minting + device-aware write paths → run the backfill script once
against the target database.

## API / report queries

`src/server/api/routers/user-report.ts`:

- **`getIpBreakdown` → `getDeviceBreakdown(userId)`**: one row per
  device — `{ deviceId, lastUserAgent, firstSeenAt, lastSeenAt,
  loginCount, activeSeconds, actionCount, ipCount }`, aggregated across
  that device's IPs via the same three-`groupBy`-merged-in-JS pattern the
  current `getIpBreakdown` uses, just grouped by `deviceId` instead of
  `ipAddress`. Includes one synthetic `deviceId: null` row ("Bilinmeyen
  cihaz") rolling up everything still unassigned.
- **New `getDeviceIpBreakdown(userId, deviceId)`** (`deviceId` nullable):
  today's `getIpBreakdown` logic, scoped to one device (or the null
  bucket) instead of the whole user.
- **`auditLog.get` filter** (`src/server/api/routers/audit-log.ts`)
  gains an optional `deviceId: z.string().nullable().optional()` filter
  alongside the existing `ipAddress` one.

## UI

- `report-ip-breakdown.tsx` → `report-device-breakdown.tsx`: outer plain
  `<Table>` of devices (label parsed from `lastUserAgent` via the
  existing `UAParser` + `BrandIcon` pattern, first/last seen, login
  count, total duration, action count, IP count). Each device row keeps
  its own local expand toggle (`expandedDeviceId` state inside this
  component — independent of `report-tab.tsx`'s existing
  `expandedUserId`) revealing today's per-IP table, unchanged, scoped via
  `getDeviceIpBreakdown`. `DataTable` itself (`renderSubRow`) needs no
  changes — it already renders arbitrary content per row, and this
  nesting is two independent levels of local component state, not a
  recursive table feature.
- `ReportActionsDialog` gains an optional `deviceId` prop alongside
  `ipAddress`. Clicking a device's action count filters `auditLog.get` by
  `userId + deviceId` (all IPs under it); clicking an IP's action count
  inside an expanded device still filters by `userId + ipAddress`, as
  today.
- Reuse the existing tracking-start-date tooltip pattern
  (`report-columns.tsx`'s `LOGIN_COUNT_START_DATE`) on the device
  breakdown, since pre-migration devices are heuristically reconstructed.

## Testing

Same convention as the rest of the report (`pnpm typecheck` + `pnpm
check`, no automated suite in this repo), plus manual/browser-driven E2E
covering:

- First-visit cookie minting (including that the very first request
  already carries a usable device id via the forwarded header)
- Returning-visit cookie reuse (same device across multiple logins/IPs
  groups under one device row)
- Device-row expand → per-IP breakdown, including the "Bilinmeyen cihaz"
  bucket's empty/non-empty states
- Both action-count click targets (device-level and IP-level) opening
  the modal pre-filtered correctly
- Backfill script against a copy of production data: spot-check that
  known multi-IP users end up grouped sensibly, and that total
  login/action/duration counts before and after backfill match (no data
  lost, only regrouped)

## Rejected alternatives

**Per-user `Device` (unique on `userId` + `deviceUuid`) instead of a
global `Device` + `DeviceUser` join.** Simpler — no join table, no
many-to-many concern. Rejected because it forecloses the planned devices→
users report: recovering "which users have used this device" would mean
scanning `LoginEvent`/`UserDailyActivity`/`AuditLog` for matching
`deviceUuid` values across per-user rows, instead of a direct
`DeviceUser` lookup.

**Deriving device↔user association on read (no `DeviceUser` table) from
the three event tables.** Avoids a new table entirely. Rejected: slower
for the future devices→users report (three-table scan instead of an
indexed join), and loses clean `firstSeenAt`/`lastSeenAt` metadata for a
device/user pair that isn't `MIN`/`MAX`-able across three differently-
shaped tables without extra query complexity.

**Capturing `lastUserAgent` at cookie-mint time in `proxy.ts`.**
Would make the field available immediately on first sight of a device.
Rejected: proxy runs on every request, including anonymous and
static-asset ones, and Postgres writes from there are a much hotter and
messier path than the three existing, already-authenticated write sites.

**Plain `.sql` file for the backfill, run via `psql`.** Considered
because it's a set-based relational transform (SQL's natural fit) and
avoids any Node/TS runtime dependency in production. Rejected in favor
of the plain-JS-via-Prisma-transaction approach above: raw SQL can't
call Prisma's client-side `cuid()` generator, so new `Device` rows would
get `gen_random_uuid()`-shaped ids sitting inconsistently next to
cuid-shaped ids everywhere else in the table. `db.$transaction(async
(tx) => {...})` gives the identical atomicity guarantee (a real Postgres
`BEGIN`/`COMMIT`/`ROLLBACK`) while reusing the same id generation as
every other write path in the app — and a plain-JS script run via `node`
has the same "needs nothing but what's already installed" property a
`.sql` file would.
