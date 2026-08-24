# Device Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Identify browsers/devices via an `HttpOnly` `device_uuid` cookie and regroup the admin user report one level deeper — `user → device → IP` instead of today's `user → IP` — including a one-time backfill for history that predates the cookie.

**Architecture:** A new global `Device` + `DeviceUser` join, with a nullable `deviceId` added to the three existing telemetry tables (`LoginEvent`, `UserDailyActivity`, `AuditLog`). A Next.js proxy (`src/proxy.ts` — this Next.js version renamed `middleware.ts`) mints/forwards the cookie; a shared `resolveDeviceId` helper upserts `Device`/`DeviceUser` from the three existing write paths. The report UI gains a device-level table that expands to today's per-IP table. A plain-JS backfill script, wrapped in one Prisma interactive transaction, assigns best-effort devices to historical rows.

**Tech Stack:** Next.js 16.2.11 App Router, tRPC 11, Prisma 6 (PostgreSQL), better-auth, shadcn/ui, TanStack Table, ua-parser-js.

**Spec:** `docs/superpowers/specs/2026-08-24-device-tracking-design.md`

## Global Constraints

- No migration history in this repo — schema changes go out via `pnpm db:push`, never `prisma migrate`. Restart the dev server after pushing so the regenerated Prisma client (`./generated/prisma`) is picked up.
- No automated test suite exists (`CLAUDE.md`'s command list has no test runner). Every task's verification step is `pnpm typecheck` + `pnpm check`, plus a manual/browser or `pnpm db:studio` check where called for — there is no red/green test cycle to follow here.
- This Next.js version (16.2.11) renamed `middleware.ts` to `proxy.ts` — the file exports a `proxy` function (not `middleware`), and defaults to the Node.js runtime (not Edge). Confirmed against `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`.
- `pnpm` is this project's package manager (there's a `pnpm-lock.yaml`, no `package-lock.json`).
- The backfill script (Task 11) is plain JavaScript run directly via `node`, not TypeScript/`tsx` — production can't run `tsx`, and it must work with nothing beyond what's already installed to run the app.
- Only commit when a task's steps say to. Each task is one commit.

---

## Task 1: Schema — `Device`, `DeviceUser`, and `deviceId` on the three telemetry tables

**Files:**
- Modify: `prisma/schema.prisma`

**Interfaces:**
- Produces: `Device { id, deviceUuid (unique), lastUserAgent, createdAt }`, `DeviceUser { deviceId, userId, firstSeenAt, lastSeenAt }` (compound id `deviceId_userId`), `LoginEvent.deviceId: string | null`, `AuditLog.deviceId: string | null`, `UserDailyActivity.deviceId: string | null` with unique key `(userId, date, ipAddress, deviceId)` (compound name `userId_date_ipAddress_deviceId`), `User.devices: DeviceUser[]`. Every later task's Prisma calls depend on these exact names.

- [ ] **Step 1: Add `deviceId` to `AuditLog`**

In `prisma/schema.prisma`, change:

```prisma
model AuditLog {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())

  userId String?
  user   User?   @relation(fields: [userId], references: [id])

  action       String
  resourceType String
  resourceId   String?

  result AuditResult @default(SUCCESS)
  error  String?

  details   String?
  ipAddress String  @default("unknown")

  @@index([userId])
  @@index([createdAt])
  @@index([action])
  @@index([resourceType])
}
```

to:

```prisma
model AuditLog {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())

  userId String?
  user   User?   @relation(fields: [userId], references: [id])

  action       String
  resourceType String
  resourceId   String?

  result AuditResult @default(SUCCESS)
  error  String?

  details   String?
  ipAddress String  @default("unknown")

  deviceId String?
  device   Device? @relation(fields: [deviceId], references: [id], onDelete: SetNull)

  @@index([userId])
  @@index([createdAt])
  @@index([action])
  @@index([resourceType])
  @@index([deviceId])
}
```

- [ ] **Step 2: Add `deviceId` to `LoginEvent`, widen `UserDailyActivity`'s unique key**

Change:

```prisma
model LoginEvent {
  id     String @id @default(cuid())
  userId String
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())
  ipAddress String   @default("unknown")
  userAgent String?

  @@index([userId])
}

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

to:

```prisma
model LoginEvent {
  id     String @id @default(cuid())
  userId String
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())
  ipAddress String   @default("unknown")
  userAgent String?

  deviceId String?
  device   Device? @relation(fields: [deviceId], references: [id], onDelete: SetNull)

  @@index([userId])
  @@index([deviceId])
}

model UserDailyActivity {
  id     String @id @default(cuid())
  userId String
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  date          DateTime @db.Date
  ipAddress     String   @default("unknown")
  activeSeconds Int      @default(0)

  deviceId String?
  device   Device? @relation(fields: [deviceId], references: [id], onDelete: SetNull)

  updatedAt DateTime @updatedAt

  @@unique([userId, date, ipAddress, deviceId])
  @@index([date])
  @@index([deviceId])
}
```

- [ ] **Step 3: Add the `Device` and `DeviceUser` models**

Immediately after the `UserDailyActivity` model (before `model SavedFilter`), insert:

```prisma
model Device {
  id            String   @id @default(cuid())
  deviceUuid    String   @unique
  lastUserAgent String?
  createdAt     DateTime @default(now())

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

- [ ] **Step 4: Add the `devices` relation to `User`**

Find this block in the `User` model:

```prisma
  loginEvents LoginEvent[]

  @@unique([email])
  @@map("user")
```

and change it to:

```prisma
  loginEvents LoginEvent[]
  devices     DeviceUser[]

  @@unique([email])
  @@map("user")
```

- [ ] **Step 5: Push the schema and regenerate the client**

Run: `pnpm db:push`

Expected: Prisma reports the schema is in sync and regenerates the client into `./generated/prisma`. If `pnpm` complains about corepack, prefix with `COREPACK_ENABLE_STRICT=0` per `CLAUDE.md`.

- [ ] **Step 6: Typecheck**

Run: `pnpm typecheck`

Expected: passes — nothing in the app references `deviceId`/`Device`/`DeviceUser` yet, so this only confirms the schema itself is valid and the client regenerated cleanly.

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: add Device/DeviceUser models and deviceId to telemetry tables"
```

---

## Task 2: Device constants and the `resolveDeviceId`/`getDeviceUuid` helper

**Files:**
- Create: `src/constants/device.ts`
- Create: `src/server/lib/resolve-device-id.ts`

**Interfaces:**
- Consumes: `Device`, `DeviceUser` from Task 1.
- Produces: `DEVICE_UUID_COOKIE`, `DEVICE_UUID_HEADER`, `DEVICE_UUID_COOKIE_MAX_AGE_SECONDS` (Task 3 consumes these); `getDeviceUuid(headers: Headers): string | null` and `resolveDeviceId(deviceUuid: string | null, userId: string): Promise<string | null>` (Tasks 4, 5, 6 consume both).

- [ ] **Step 1: Write the constants**

Create `src/constants/device.ts`:

```ts
// Cookie the proxy mints to identify a browser/device across sessions and
// IPs — see src/proxy.ts. HttpOnly so client JS can't read or forge it.
export const DEVICE_UUID_COOKIE = 'device_uuid';

// Header the proxy forwards on every matched request (whether the value
// came from an existing cookie or one just minted) so downstream server
// code never needs to parse the raw Cookie header itself.
export const DEVICE_UUID_HEADER = 'x-device-uuid';

// ~2 years.
export const DEVICE_UUID_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365 * 2;
```

- [ ] **Step 2: Write the helper**

Create `src/server/lib/resolve-device-id.ts`:

```ts
import { DEVICE_UUID_HEADER } from '~/constants/device';
import { db } from '~/server/db';

// Reads the device id the proxy (src/proxy.ts) forwards on every matched
// request — never parses the raw Cookie header, since the proxy already
// normalizes both the "existing cookie" and "just minted" cases into this
// one header.
export function getDeviceUuid(headers: Headers): string | null {
  return headers.get(DEVICE_UUID_HEADER);
}

// Finds-or-creates the Device row for a deviceUuid and records that this
// user has been seen on it (bumping DeviceUser.lastSeenAt via @updatedAt,
// even though the update payload itself is empty). Returns null when
// there's no deviceUuid to resolve (e.g. a request that bypassed the
// proxy) or if the upserts fail — callers treat a null deviceId as
// "unknown device", not an error, matching how ipAddress already falls
// back to an 'unknown' sentinel elsewhere in this codebase rather than
// letting a telemetry failure break the primary action.
export async function resolveDeviceId(
  deviceUuid: string | null,
  userId: string,
): Promise<string | null> {
  if (!deviceUuid) return null;

  try {
    const device = await db.device.upsert({
      where: { deviceUuid },
      update: {},
      create: { deviceUuid },
    });

    await db.deviceUser.upsert({
      where: { deviceId_userId: { deviceId: device.id, userId } },
      update: {},
      create: { deviceId: device.id, userId },
    });

    return device.id;
  } catch (err) {
    console.error('Failed to resolve device:', err);
    return null;
  }
}
```

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`

Expected: passes (nothing imports this yet).

- [ ] **Step 4: Commit**

```bash
git add src/constants/device.ts src/server/lib/resolve-device-id.ts
git commit -m "feat: add device constants and resolveDeviceId helper"
```

---

## Task 3: `src/proxy.ts` — mint and forward the `device_uuid` cookie

**Files:**
- Create: `src/proxy.ts`

**Interfaces:**
- Consumes: `DEVICE_UUID_COOKIE`, `DEVICE_UUID_HEADER`, `DEVICE_UUID_COOKIE_MAX_AGE_SECONDS` from Task 2.
- Produces: every request matching `config.matcher` carries an `x-device-uuid` request header with a stable UUID, and gets a `Set-Cookie: device_uuid=...` response header the first time it's seen without one.

- [ ] **Step 1: Write the proxy**

Create `src/proxy.ts`:

```ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  DEVICE_UUID_COOKIE,
  DEVICE_UUID_COOKIE_MAX_AGE_SECONDS,
  DEVICE_UUID_HEADER,
} from '~/constants/device';

export function proxy(request: NextRequest) {
  const existing = request.cookies.get(DEVICE_UUID_COOKIE)?.value;
  const deviceUuid = existing ?? crypto.randomUUID();

  // Forward the id upstream even on the very request that mints it — the
  // client won't have stored the Set-Cookie response yet, so downstream
  // code (better-auth hooks, tRPC context) reads this header instead of
  // ever parsing the request's raw Cookie header itself.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(DEVICE_UUID_HEADER, deviceUuid);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  if (!existing) {
    response.cookies.set(DEVICE_UUID_COOKIE, deviceUuid, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: DEVICE_UUID_COOKIE_MAX_AGE_SECONDS,
      path: '/',
    });
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`

Expected: passes.

- [ ] **Step 3: Manual verification**

Start the dev server (`pnpm dev`). In a browser with no existing cookies for this site, open the app and check DevTools → Application → Cookies: a `device_uuid` cookie is set, marked `HttpOnly`. Reload the page — the same `device_uuid` value persists (proxy doesn't mint a new one when the cookie is already present).

- [ ] **Step 4: Commit**

```bash
git add src/proxy.ts
git commit -m "feat: add proxy to mint and forward the device_uuid cookie"
```

---

## Task 4: Resolve devices in the better-auth login/logout hooks

**Files:**
- Modify: `src/server/better-auth/config.ts`

**Interfaces:**
- Consumes: `getDeviceUuid`, `resolveDeviceId` from Task 2; `LoginEvent.deviceId`, `Device.lastUserAgent`, `AuditLog.deviceId` from Task 1; the `x-device-uuid` header from Task 3.
- Produces: every real login writes a `deviceId` onto its `LoginEvent` row, refreshes `Device.lastUserAgent`, and both the `USER_LOGIN`/`USER_LOGOUT` `AuditLog` rows carry `deviceId` too.

- [ ] **Step 1: Import the helper**

In `src/server/better-auth/config.ts`, change:

```ts
import { auditLogEmitter } from '~/server/audit-log-emitter';
import { db } from '~/server/db';
import { normalizeIp } from '~/server/lib/normalize-ip';
import { getVerificationEmailHtml, sendEmail } from './email';
```

to:

```ts
import { auditLogEmitter } from '~/server/audit-log-emitter';
import { db } from '~/server/db';
import { normalizeIp } from '~/server/lib/normalize-ip';
import { getDeviceUuid, resolveDeviceId } from '~/server/lib/resolve-device-id';
import { getVerificationEmailHtml, sendEmail } from './email';
```

- [ ] **Step 2: Add a `deviceId` parameter to `createAuthAuditLog`**

Replace:

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
        ipAddress: normalizeIp(ipAddress),
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
  deviceId: string | null,
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
        ipAddress: normalizeIp(ipAddress),
        deviceId,
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

- [ ] **Step 3: Resolve the device in the `databaseHooks.session.create.after` hook**

Replace:

```ts
        after: async (session, context) => {
          if (
            context?.path !== '/sign-in/email' &&
            context?.path !== '/verify-email'
          ) {
            return;
          }
          const ipAddress = normalizeIp(session.ipAddress);
          try {
            await db.loginEvent.create({
              data: {
                userId: session.userId,
                ipAddress,
                userAgent: session.userAgent ?? null,
              },
            });
            await db.user.update({
              where: { id: session.userId },
              data: { lastLoginAt: session.createdAt },
            });
          } catch (err) {
            console.error('Failed to record login event:', err);
          }
        },
```

with:

```ts
        after: async (session, context) => {
          if (
            context?.path !== '/sign-in/email' &&
            context?.path !== '/verify-email'
          ) {
            return;
          }
          const ipAddress = normalizeIp(session.ipAddress);
          const userAgent = session.userAgent ?? null;
          const deviceUuid = context?.headers
            ? getDeviceUuid(context.headers)
            : null;
          try {
            const deviceId = await resolveDeviceId(
              deviceUuid,
              session.userId,
            );
            if (deviceId) {
              await db.device.update({
                where: { id: deviceId },
                data: { lastUserAgent: userAgent },
              });
            }
            await db.loginEvent.create({
              data: {
                userId: session.userId,
                ipAddress,
                userAgent,
                deviceId,
              },
            });
            await db.user.update({
              where: { id: session.userId },
              data: { lastLoginAt: session.createdAt },
            });
          } catch (err) {
            console.error('Failed to record login event:', err);
          }
        },
```

- [ ] **Step 4: Pass `deviceId` at both `createAuthAuditLog` call sites**

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
          ctx.context.newSession?.session.ipAddress,
          'USER_LOGIN',
          'USER',
          response.user.id,
          'SUCCESS',
          undefined,
          `Kullanıcı giriş yaptı: ${response.user.name} (${response.user.email})`,
        );

        // Single-session enforcement: a new login ends every other active
        // session for the user, so signing in on one device signs the user
        // out everywhere else.
        const newSessionToken = ctx.context.newSession?.session.token;
        if (newSessionToken) {
          const sessions = await ctx.context.internalAdapter.listSessions(
            response.user.id,
            { onlyActiveSessions: true },
          );
          const otherTokens = sessions
            .map((s) => s.token)
            .filter((token) => token !== newSessionToken);
          if (otherTokens.length > 0) {
            await ctx.context.internalAdapter.deleteSessions(otherTokens);
          }
        }
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

with:

```ts
      if (
        path === '/sign-in/email' &&
        response &&
        'user' in response &&
        response.user
      ) {
        const loginDeviceId = await resolveDeviceId(
          getDeviceUuid(ctx.headers),
          response.user.id,
        );
        await createAuthAuditLog(
          response.user.id,
          ctx.context.newSession?.session.ipAddress,
          loginDeviceId,
          'USER_LOGIN',
          'USER',
          response.user.id,
          'SUCCESS',
          undefined,
          `Kullanıcı giriş yaptı: ${response.user.name} (${response.user.email})`,
        );

        // Single-session enforcement: a new login ends every other active
        // session for the user, so signing in on one device signs the user
        // out everywhere else.
        const newSessionToken = ctx.context.newSession?.session.token;
        if (newSessionToken) {
          const sessions = await ctx.context.internalAdapter.listSessions(
            response.user.id,
            { onlyActiveSessions: true },
          );
          const otherTokens = sessions
            .map((s) => s.token)
            .filter((token) => token !== newSessionToken);
          if (otherTokens.length > 0) {
            await ctx.context.internalAdapter.deleteSessions(otherTokens);
          }
        }
      }

      if (path === '/sign-out' && ctx.context.session?.user) {
        const logoutDeviceId = await resolveDeviceId(
          getDeviceUuid(ctx.headers),
          ctx.context.session.user.id,
        );
        await createAuthAuditLog(
          ctx.context.session.user.id,
          ctx.context.session.session.ipAddress,
          logoutDeviceId,
          'USER_LOGOUT',
          'USER',
          ctx.context.session.user.id,
          'SUCCESS',
          undefined,
          `Kullanıcı çıkış yaptı: ${ctx.context.session.user.name} (${ctx.context.session.user.email})`,
        );
      }
```

- [ ] **Step 5: Typecheck and lint**

Run: `pnpm typecheck && pnpm check`

Expected: both pass. If `ctx.headers` doesn't typecheck as a `Headers` in the `createAuthMiddleware` callback, check the actual field name/type on `GenericEndpointContext` at `node_modules/.pnpm/@better-auth+core@*/node_modules/@better-auth/core/dist/types/context.d.mts` and adjust — `context?.headers` in Step 3 already follows the same optional-chaining pattern the surrounding code uses for `context?.path`.

- [ ] **Step 6: Manual verification**

Start the dev server, sign out, sign back in with a test account, then open `pnpm db:studio`:
- `Device`: a row exists with a non-null `lastUserAgent` matching your browser.
- `LoginEvent`: the newest row has that `Device`'s id as `deviceId`.
- `DeviceUser`: a row links that `Device` to your test account, with a recent `lastSeenAt`.
- `AuditLog`: the `USER_LOGIN` row has the same `deviceId`.

- [ ] **Step 7: Commit**

```bash
git add src/server/better-auth/config.ts
git commit -m "feat: resolve device on login/logout and tag LoginEvent/AuditLog"
```

---

## Task 5: Device-aware heartbeat and daily activity flush

**Files:**
- Modify: `src/server/activity-tracker.ts`
- Modify: `src/server/api/routers/activity.ts`

**Interfaces:**
- Consumes: `getDeviceUuid`, `resolveDeviceId` from Task 2; `UserDailyActivity.deviceId` + widened unique key from Task 1.
- Produces: `recordHeartbeat(userId: string, ipAddress: string, deviceUuid: string | null): void` — replaces the two-arg signature. Device resolution (the DB upsert) happens in `flushActivity`, not on every heartbeat, to keep the heartbeat mutation's existing "never touches the DB directly" property.

- [ ] **Step 1: Carry `deviceUuid` through the in-memory accumulator**

In `src/server/activity-tracker.ts`, replace:

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

with:

```ts
interface UserAccumulator {
  userId: string;
  ipAddress: string;
  deviceUuid: string | null;
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

function accumulatorKey(
  userId: string,
  ipAddress: string,
  deviceUuid: string | null,
) {
  return `${userId}:${ipAddress}:${deviceUuid ?? ''}`;
}

export function recordHeartbeat(
  userId: string,
  ipAddress: string,
  deviceUuid: string | null,
) {
  const now = Date.now();
  const key = accumulatorKey(userId, ipAddress, deviceUuid);
  const existing = accumulator.get(key);

  if (existing && now - existing.lastCreditedAt < MIN_CREDIT_GAP_MS) {
    return;
  }

  accumulator.set(key, {
    userId,
    ipAddress,
    deviceUuid,
    pendingSeconds:
      (existing?.pendingSeconds ?? 0) + HEARTBEAT_INTERVAL_SECONDS,
    lastCreditedAt: now,
  });
}
```

- [ ] **Step 2: Resolve the device once per flush entry, then upsert `UserDailyActivity` with it**

Replace:

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

with:

```ts
export async function flushActivity() {
  if (accumulator.size === 0) return;

  const entries = [...accumulator.values()];
  accumulator.clear();

  const date = startOfTodayUtc();

  await Promise.all(
    entries.map(async ({ userId, ipAddress, deviceUuid, pendingSeconds }) => {
      if (pendingSeconds <= 0) return;

      try {
        // Resolving here (once per flush, every ~2 minutes per active
        // user+ip+device) rather than per-heartbeat (every ~30s) keeps the
        // heartbeat mutation itself DB-free, matching the batching this
        // module already does for UserDailyActivity/totalActiveSeconds.
        const deviceId = await resolveDeviceId(deviceUuid, userId);
        await db.$transaction([
          db.user.update({
            where: { id: userId },
            data: { totalActiveSeconds: { increment: pendingSeconds } },
          }),
          db.userDailyActivity.upsert({
            where: {
              userId_date_ipAddress_deviceId: {
                userId,
                date,
                ipAddress,
                deviceId,
              },
            },
            update: { activeSeconds: { increment: pendingSeconds } },
            create: {
              userId,
              date,
              ipAddress,
              deviceId,
              activeSeconds: pendingSeconds,
            },
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

- [ ] **Step 3: Import `resolveDeviceId`**

Replace:

```ts
import { HEARTBEAT_INTERVAL_SECONDS } from '~/constants/activity';
import { db } from '~/server/db';
```

with:

```ts
import { HEARTBEAT_INTERVAL_SECONDS } from '~/constants/activity';
import { db } from '~/server/db';
import { resolveDeviceId } from '~/server/lib/resolve-device-id';
```

- [ ] **Step 4: Pass the device uuid from the heartbeat procedure**

In `src/server/api/routers/activity.ts`, replace:

```ts
import { recordHeartbeat } from '~/server/activity-tracker';
import { normalizeIp } from '~/server/lib/normalize-ip';
import { createTRPCRouter, protectedProcedure } from '../trpc';

export const activityRouter = createTRPCRouter({
  // Intentionally not audit-logged — this fires every ~30s per active tab,
  // and only ever touches an in-memory buffer (see activity-tracker.ts), so
  // logging it would just relocate the write-volume problem into AuditLog.
  heartbeat: protectedProcedure.mutation(({ ctx }) => {
    recordHeartbeat(
      ctx.session.user.id,
      normalizeIp(ctx.session.session.ipAddress),
    );
  }),
});
```

with:

```ts
import { recordHeartbeat } from '~/server/activity-tracker';
import { normalizeIp } from '~/server/lib/normalize-ip';
import { getDeviceUuid } from '~/server/lib/resolve-device-id';
import { createTRPCRouter, protectedProcedure } from '../trpc';

export const activityRouter = createTRPCRouter({
  // Intentionally not audit-logged — this fires every ~30s per active tab,
  // and only ever touches an in-memory buffer (see activity-tracker.ts), so
  // logging it would just relocate the write-volume problem into AuditLog.
  // getDeviceUuid is a pure header read (no DB) — the actual device
  // resolution/upsert is deferred to the periodic flush, same reasoning.
  heartbeat: protectedProcedure.mutation(({ ctx }) => {
    recordHeartbeat(
      ctx.session.user.id,
      normalizeIp(ctx.session.session.ipAddress),
      getDeviceUuid(ctx.headers),
    );
  }),
});
```

- [ ] **Step 5: Typecheck and lint**

Run: `pnpm typecheck && pnpm check`

Expected: both pass.

- [ ] **Step 6: Manual verification**

Start the dev server, stay on an authenticated page for a couple of minutes so at least one heartbeat flush fires (flush interval is 2 minutes — `FLUSH_INTERVAL_MS` in `activity-tracker.ts`), then check `pnpm db:studio`: `UserDailyActivity` has a row for today with a real `deviceId` (matching the `Device` row from Task 4's verification), and `User.totalActiveSeconds` increased.

- [ ] **Step 7: Commit**

```bash
git add src/server/activity-tracker.ts src/server/api/routers/activity.ts
git commit -m "feat: resolve device for daily activity at flush time"
```

---

## Task 6: Resolve devices in `createAuditLog`

**Files:**
- Modify: `src/server/api/trpc.ts`

**Interfaces:**
- Consumes: `getDeviceUuid`, `resolveDeviceId` from Task 2; `AuditLog.deviceId` from Task 1.
- Produces: every audited mutation (the ~61 existing call sites, none of which change) now tags its `AuditLog` row with `deviceId`.

- [ ] **Step 1: Import the helper**

Replace:

```ts
import { auditLogEmitter } from '~/server/audit-log-emitter';
import { auth } from '~/server/better-auth';
import { db } from '~/server/db';
import { normalizeIp } from '~/server/lib/normalize-ip';
```

with:

```ts
import { auditLogEmitter } from '~/server/audit-log-emitter';
import { auth } from '~/server/better-auth';
import { db } from '~/server/db';
import { normalizeIp } from '~/server/lib/normalize-ip';
import { getDeviceUuid, resolveDeviceId } from '~/server/lib/resolve-device-id';
```

- [ ] **Step 2: Widen `createAuditLog`'s ctx type and resolve the device**

Replace:

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
        ipAddress: normalizeIp(ctx.session.session.ipAddress),
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
    headers: Headers;
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
    const deviceId = await resolveDeviceId(
      getDeviceUuid(ctx.headers),
      ctx.session.user.id,
    );
    await ctx.db.auditLog.create({
      data: {
        userId: ctx.session.user.id,
        ipAddress: normalizeIp(ctx.session.session.ipAddress),
        deviceId,
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

No call sites need updating — every one of the ~61 callers across the routers already passes the full tRPC `ctx`, which already carries `.headers` (`createTRPCContext` spreads `...opts`); only the declared type needed widening.

- [ ] **Step 3: Typecheck and lint**

Run: `pnpm typecheck && pnpm check`

Expected: both pass with zero changes needed outside `trpc.ts`.

- [ ] **Step 4: Manual verification**

Start the dev server, sign in as an admin, perform any audited action (e.g. edit a customer card), then check `pnpm db:studio`: the new `AuditLog` row has the same `deviceId` as your `Device` row from Task 4.

- [ ] **Step 5: Commit**

```bash
git add src/server/api/trpc.ts
git commit -m "feat: resolve device for every audit log entry"
```

---

## Task 7: `userReport` router — `getDeviceBreakdown` and `getDeviceIpBreakdown`

**Files:**
- Modify: `src/server/api/routers/user-report.ts`

**Interfaces:**
- Consumes: `deviceId` on `LoginEvent`/`UserDailyActivity`/`AuditLog`, `DeviceUser`, `Device.lastUserAgent` from Task 1.
- Produces:
  - `userReport.getDeviceBreakdown(input: { userId: string }) => { deviceId: string | null; lastUserAgent: string | null; firstSeenAt: Date | null; lastSeenAt: Date | null; loginCount: number; activeSeconds: number; actionCount: number; ipCount: number }[]`
  - `userReport.getDeviceIpBreakdown(input: { userId: string; deviceId: string | null }) => { deviceId: string | null; ipAddress: string; loginCount: number; lastLoginAt: Date | null; userAgent: string | null; activeSeconds: number; actionCount: number }[]`
  - Removes `userReport.getIpBreakdown` (superseded by the two above).

- [ ] **Step 1: Replace `getIpBreakdown` with a shared row-fetcher plus the two new procedures**

In `src/server/api/routers/user-report.ts`, replace the entire `getIpBreakdown` procedure (everything from `getIpBreakdown: adminProcedure` through its closing `}),` before the router's final `});`):

```ts
  getIpBreakdown: adminProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const [logins, loginCounts, activity, actions] = await Promise.all([
        // Not a groupBy: we also need the most recent userAgent per IP, and
        // groupBy can only aggregate (count/sum/max) — it can't return a
        // sibling field like userAgent from the row that produced the max.
        // `distinct: ['ipAddress']` + desc order gives Postgres a
        // SELECT DISTINCT ON, so this returns exactly one (the freshest)
        // row per IP instead of the user's entire login history.
        ctx.db.loginEvent.findMany({
          where: { userId: input.userId },
          orderBy: { createdAt: 'desc' },
          distinct: ['ipAddress'],
          select: { ipAddress: true, createdAt: true, userAgent: true },
        }),
        ctx.db.loginEvent.groupBy({
          by: ['ipAddress'],
          where: { userId: input.userId },
          _count: true,
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
          userAgent: string | null;
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
            userAgent: null,
            activeSeconds: 0,
            actionCount: 0,
          };
          rows.set(ip, row);
        }
        return row;
      };

      // logins holds one (the freshest, per the desc + distinct query above)
      // row per IP — exactly the lastLoginAt/userAgent we want.
      for (const l of logins) {
        const row = getRow(l.ipAddress);
        row.lastLoginAt = l.createdAt;
        row.userAgent = l.userAgent;
      }
      for (const c of loginCounts) {
        getRow(c.ipAddress).loginCount = c._count;
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
```

with:

```ts
  getDeviceBreakdown: adminProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const [ipRows, deviceUsers] = await Promise.all([
        getDeviceIpRows(ctx.db, input.userId),
        ctx.db.deviceUser.findMany({
          where: { userId: input.userId },
          select: {
            deviceId: true,
            firstSeenAt: true,
            lastSeenAt: true,
            device: { select: { lastUserAgent: true } },
          },
        }),
      ]);

      const deviceMeta = new Map(deviceUsers.map((du) => [du.deviceId, du]));

      const devices = new Map<
        string | null,
        {
          deviceId: string | null;
          lastUserAgent: string | null;
          firstSeenAt: Date | null;
          lastSeenAt: Date | null;
          loginCount: number;
          activeSeconds: number;
          actionCount: number;
          ipCount: number;
        }
      >();

      const getDevice = (deviceId: string | null) => {
        let device = devices.get(deviceId);
        if (!device) {
          const meta = deviceId ? deviceMeta.get(deviceId) : undefined;
          device = {
            deviceId,
            lastUserAgent: meta?.device.lastUserAgent ?? null,
            firstSeenAt: meta?.firstSeenAt ?? null,
            lastSeenAt: meta?.lastSeenAt ?? null,
            loginCount: 0,
            activeSeconds: 0,
            actionCount: 0,
            ipCount: 0,
          };
          devices.set(deviceId, device);
        }
        return device;
      };

      // ipRows already has exactly one entry per (deviceId, ipAddress) pair
      // for this user, so summing across matching rows per device also
      // gives the correct distinct-IP count (ipCount) for free.
      for (const row of ipRows) {
        const device = getDevice(row.deviceId);
        device.loginCount += row.loginCount;
        device.activeSeconds += row.activeSeconds;
        device.actionCount += row.actionCount;
        device.ipCount += 1;
      }

      return Array.from(devices.values()).sort(
        (a, b) => b.loginCount - a.loginCount,
      );
    }),
  getDeviceIpBreakdown: adminProcedure
    .input(z.object({ userId: z.string(), deviceId: z.string().nullable() }))
    .query(async ({ ctx, input }) => {
      const ipRows = await getDeviceIpRows(ctx.db, input.userId);
      return ipRows
        .filter((row) => row.deviceId === input.deviceId)
        .sort((a, b) => b.loginCount - a.loginCount);
    }),
```

- [ ] **Step 2: Add the shared `getDeviceIpRows` helper**

Directly above `export const userReportRouter = createTRPCRouter({`, add:

```ts
interface DeviceIpRow {
  deviceId: string | null;
  ipAddress: string;
  loginCount: number;
  lastLoginAt: Date | null;
  userAgent: string | null;
  activeSeconds: number;
  actionCount: number;
}

// Shared by getDeviceBreakdown (aggregated up to one row per device) and
// getDeviceIpBreakdown (filtered down to one device) — both need the same
// per-(device, IP) union across LoginEvent/UserDailyActivity/AuditLog, the
// same three-groupBy-merged-in-JS approach the old getIpBreakdown used,
// just with deviceId added as a second grouping dimension.
async function getDeviceIpRows(
  db: PrismaClient,
  userId: string,
): Promise<DeviceIpRow[]> {
  const [logins, loginCounts, activity, actions] = await Promise.all([
    db.loginEvent.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      distinct: ['deviceId', 'ipAddress'],
      select: { deviceId: true, ipAddress: true, createdAt: true, userAgent: true },
    }),
    db.loginEvent.groupBy({
      by: ['deviceId', 'ipAddress'],
      where: { userId },
      _count: true,
    }),
    db.userDailyActivity.groupBy({
      by: ['deviceId', 'ipAddress'],
      where: { userId },
      _sum: { activeSeconds: true },
    }),
    db.auditLog.groupBy({
      by: ['deviceId', 'ipAddress'],
      where: { userId },
      _count: true,
    }),
  ]);

  const rows = new Map<string, DeviceIpRow>();
  const rowKey = (deviceId: string | null, ipAddress: string) =>
    `${deviceId ?? ''}:${ipAddress}`;

  const getRow = (deviceId: string | null, ipAddress: string) => {
    const k = rowKey(deviceId, ipAddress);
    let row = rows.get(k);
    if (!row) {
      row = {
        deviceId,
        ipAddress,
        loginCount: 0,
        lastLoginAt: null,
        userAgent: null,
        activeSeconds: 0,
        actionCount: 0,
      };
      rows.set(k, row);
    }
    return row;
  };

  for (const l of logins) {
    const row = getRow(l.deviceId, l.ipAddress);
    row.lastLoginAt = l.createdAt;
    row.userAgent = l.userAgent;
  }
  for (const c of loginCounts) {
    getRow(c.deviceId, c.ipAddress).loginCount = c._count;
  }
  for (const a of activity) {
    getRow(a.deviceId, a.ipAddress).activeSeconds = a._sum.activeSeconds ?? 0;
  }
  for (const a of actions) {
    getRow(a.deviceId, a.ipAddress).actionCount = a._count;
  }

  return Array.from(rows.values());
}
```

- [ ] **Step 3: Add the `PrismaClient` type import**

`getDeviceIpRows` above is typed against `PrismaClient` (what `ctx.db` actually is). Replace:

```ts
import type { Prisma } from 'generated/prisma';
```

with:

```ts
import type { Prisma, PrismaClient } from 'generated/prisma';
```

- [ ] **Step 4: Typecheck and lint**

Run: `pnpm typecheck && pnpm check`

Expected: both pass.

- [ ] **Step 5: Manual verification**

With the test data from Tasks 4–6 in place (a login, a heartbeat flush, an audited action, all tagged with the same device), confirm via `pnpm db:studio` that querying is sane: your test user's `LoginEvent`/`UserDailyActivity`/`AuditLog` rows all share one `deviceId`. (The UI to actually call these procedures lands in Tasks 9–10.)

- [ ] **Step 6: Commit**

```bash
git add src/server/api/routers/user-report.ts
git commit -m "feat: replace getIpBreakdown with getDeviceBreakdown/getDeviceIpBreakdown"
```

---

## Task 8: `auditLog.get` — add a `deviceId` filter

**Files:**
- Modify: `src/server/api/routers/audit-log.ts`

**Interfaces:**
- Consumes: `AuditLog.deviceId` from Task 1.
- Produces: `auditLog.get`'s `filter` input gains an optional, nullable `deviceId`. Passing `null` explicitly filters to the "unknown device" bucket; omitting the field applies no device filter at all.

- [ ] **Step 1: Add `deviceId` to `filterSchema`**

Replace:

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

with:

```ts
const filterSchema = z.object({
  search: z.string().optional(),
  action: z.string().optional(),
  resourceType: z.string().optional(),
  result: z.enum(['SUCCESS', 'FAILURE', 'all']).default('all'),
  userId: z.string().optional(),
  ipAddress: z.string().optional(),
  deviceId: z.string().nullable().optional(),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
});
```

- [ ] **Step 2: Apply it in the `where` clause**

Replace:

```ts
      // IP address filter
      if (input.filter?.ipAddress) {
        whereClause.ipAddress = input.filter.ipAddress;
      }
```

with:

```ts
      // IP address filter
      if (input.filter?.ipAddress) {
        whereClause.ipAddress = input.filter.ipAddress;
      }

      // Device filter — checked against undefined (not truthiness) because
      // an explicit null is a meaningful filter value (the "unknown
      // device" bucket), distinct from the field being omitted entirely.
      if (input.filter?.deviceId !== undefined) {
        whereClause.deviceId = input.filter.deviceId;
      }
```

- [ ] **Step 3: Typecheck and lint**

Run: `pnpm typecheck && pnpm check`

Expected: both pass.

- [ ] **Step 4: Commit**

```bash
git add src/server/api/routers/audit-log.ts
git commit -m "feat: add deviceId filter to auditLog.get"
```

---

## Task 9: Device breakdown table component

**Files:**
- Create: `src/app/panel/users/report-device-breakdown.tsx`
- Delete: `src/app/panel/users/report-ip-breakdown.tsx`

**Interfaces:**
- Consumes: `userReport.getDeviceBreakdown`, `userReport.getDeviceIpBreakdown` from Task 7; `formatDuration` (existing, `src/lib/format-duration.ts`); `BrandIcon`/`getBrowserIcon`/`getOsIcon` (existing, `src/app/panel/_components/brand-icon.tsx`).
- Produces: `DeviceBreakdownTable({ userId, userName, onOpenActions }): JSX.Element` where `onOpenActions: (userId: string, userName: string, target: { deviceId?: string | null; ipAddress?: string }) => void`. Consumed by Task 10.

- [ ] **Step 1: Delete the old per-IP-only component**

Run: `rm src/app/panel/users/report-ip-breakdown.tsx`

(Task 10 removes the last import of it; deleting it now means Step 3's typecheck in this task will show the expected, temporary breakage in `report-tab.tsx` — that's fixed in Task 10, not here.)

- [ ] **Step 2: Write the new two-level component**

Create `src/app/panel/users/report-device-breakdown.tsx`:

```tsx
'use client';

import { ChevronDown, ChevronRight, Globe, Info, Monitor } from 'lucide-react';
import { Fragment, useState } from 'react';
import { UAParser } from 'ua-parser-js';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '~/components/ui/tooltip';
import { formatDuration } from '~/lib/format-duration';
import { api } from '~/trpc/react';
import { BrandIcon, getBrowserIcon, getOsIcon } from '../_components/brand-icon';

type OpenActionsTarget = { deviceId?: string | null; ipAddress?: string };

interface DeviceBreakdownTableProps {
  userId: string;
  userName: string;
  onOpenActions: (
    userId: string,
    userName: string,
    target: OpenActionsTarget,
  ) => void;
}

export function DeviceBreakdownTable({
  userId,
  userName,
  onOpenActions,
}: DeviceBreakdownTableProps) {
  // undefined = nothing expanded; a device's own deviceId (string or null
  // for the "unknown device" bucket) = that device's IP rows are shown.
  const [expandedDeviceId, setExpandedDeviceId] = useState<
    string | null | undefined
  >(undefined);

  const { data, isLoading } = api.userReport.getDeviceBreakdown.useQuery({
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
          <TableHead className="w-10" />
          <TableHead>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex cursor-help items-center gap-1">
                    Cihaz
                    <Info className="h-3.5 w-3.5 text-muted-foreground" />
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs text-xs">
                    device_uuid çerezinden önceki geçmiş veriler, giriş
                    kayıtlarındaki tarayıcı bilgisine göre en iyi tahminle
                    cihazlara eşleştirilmiştir; kesin olmayabilir
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </TableHead>
          <TableHead>İlk Görülme</TableHead>
          <TableHead>Son Görülme</TableHead>
          <TableHead>Giriş Sayısı</TableHead>
          <TableHead>Toplam Süre</TableHead>
          <TableHead>Eylem Sayısı</TableHead>
          <TableHead>IP Sayısı</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((device) => {
          const { browser, os } = new UAParser(
            device.lastUserAgent ?? '',
          ).getResult();
          const isExpanded = expandedDeviceId === device.deviceId;
          const rowKey = device.deviceId ?? 'unknown';

          return (
            <Fragment key={rowKey}>
              <TableRow>
                <TableCell>
                  <Button
                    className="h-8 w-8 p-0"
                    onClick={() =>
                      setExpandedDeviceId((current) =>
                        current === device.deviceId
                          ? undefined
                          : device.deviceId,
                      )
                    }
                    size="icon-sm"
                    variant="ghost"
                  >
                    <span className="sr-only">IP'leri Göster</span>
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                </TableCell>
                <TableCell>
                  {device.lastUserAgent ? (
                    <div className="flex items-center gap-2">
                      <div className="flex shrink-0 items-center gap-1.5">
                        <BrandIcon
                          className="size-4"
                          fallback={Globe}
                          icon={getBrowserIcon(browser.name)}
                        />
                        <BrandIcon
                          className="size-4"
                          fallback={Monitor}
                          icon={getOsIcon(os.name)}
                        />
                      </div>
                      <span className="text-sm">
                        {browser.name ?? 'Bilinmeyen tarayıcı'}
                        {os.name && ` · ${os.name}`}
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">
                      Bilinmeyen cihaz
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  {device.firstSeenAt
                    ? new Date(device.firstSeenAt).toLocaleDateString('tr-TR')
                    : '-'}
                </TableCell>
                <TableCell>
                  {device.lastSeenAt
                    ? new Date(device.lastSeenAt).toLocaleString('tr-TR')
                    : '-'}
                </TableCell>
                <TableCell>{device.loginCount}</TableCell>
                <TableCell>{formatDuration(device.activeSeconds)}</TableCell>
                <TableCell>
                  <Button
                    className="h-auto px-0"
                    onClick={() =>
                      onOpenActions(userId, userName, {
                        deviceId: device.deviceId,
                      })
                    }
                    variant="link"
                  >
                    {device.actionCount}
                  </Button>
                </TableCell>
                <TableCell>{device.ipCount}</TableCell>
              </TableRow>
              {isExpanded && (
                <TableRow>
                  <TableCell className="p-0" colSpan={8}>
                    <DeviceIpRows
                      deviceId={device.deviceId}
                      onOpenActions={(ip) =>
                        onOpenActions(userId, userName, { ipAddress: ip })
                      }
                      userId={userId}
                    />
                  </TableCell>
                </TableRow>
              )}
            </Fragment>
          );
        })}
      </TableBody>
    </Table>
  );
}

interface DeviceIpRowsProps {
  userId: string;
  deviceId: string | null;
  onOpenActions: (ipAddress: string) => void;
}

function DeviceIpRows({ userId, deviceId, onOpenActions }: DeviceIpRowsProps) {
  const { data, isLoading } = api.userReport.getDeviceIpBreakdown.useQuery({
    userId,
    deviceId,
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
    <Table className="bg-muted/60">
      <TableHeader>
        <TableRow>
          <TableHead>IP Adresi</TableHead>
          <TableHead>Tarayıcı / İşletim Sistemi</TableHead>
          <TableHead>Giriş Sayısı</TableHead>
          <TableHead>Son Giriş</TableHead>
          <TableHead>Toplam Süre</TableHead>
          <TableHead>Eylem Sayısı</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row) => {
          const { browser, os } = new UAParser(row.userAgent ?? '').getResult();

          return (
            <TableRow key={row.ipAddress}>
              <TableCell className="font-mono text-xs">
                {!row.ipAddress || row.ipAddress === 'unknown'
                  ? 'Bilinmiyor'
                  : row.ipAddress}
              </TableCell>
              <TableCell>
                {row.userAgent ? (
                  <div className="flex items-center gap-2">
                    <div className="flex shrink-0 items-center gap-1.5">
                      <BrandIcon
                        className="size-4"
                        fallback={Globe}
                        icon={getBrowserIcon(browser.name)}
                      />
                      <BrandIcon
                        className="size-4"
                        fallback={Monitor}
                        icon={getOsIcon(os.name)}
                      />
                    </div>
                    <span className="text-sm">
                      {browser.name ?? 'Bilinmeyen tarayıcı'}
                      {os.name && ` · ${os.name}`}
                    </span>
                  </div>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
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
                  onClick={() => onOpenActions(row.ipAddress)}
                  variant="link"
                >
                  {row.actionCount}
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`

Expected: fails in `src/app/panel/users/report-tab.tsx` (it still imports the just-deleted `report-ip-breakdown.tsx`) — that's expected and fixed in Task 10. Confirm the only errors are in `report-tab.tsx`, and that `report-device-breakdown.tsx` itself has none.

- [ ] **Step 4: Commit**

```bash
git add src/app/panel/users/report-device-breakdown.tsx src/app/panel/users/report-ip-breakdown.tsx
git commit -m "feat: add two-level device/IP breakdown table"
```

---

## Task 10: Wire the device breakdown into the report tab and actions dialog

**Files:**
- Modify: `src/app/panel/users/report-tab.tsx`
- Modify: `src/app/panel/users/report-actions-dialog.tsx`

**Interfaces:**
- Consumes: `DeviceBreakdownTable` from Task 9; `auditLog.get`'s `deviceId` filter from Task 8.
- Produces: the report tab's expand toggle now shows devices (grouping IPs underneath), and the action-count drill-down modal filters by device or IP depending on which was clicked.

- [ ] **Step 1: Add `deviceId` support to `ReportActionsDialog`**

In `src/app/panel/users/report-actions-dialog.tsx`, replace:

```tsx
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
              ? `${userName} — ${ipAddress === 'unknown' ? 'Bilinmiyor' : ipAddress} Eylemleri`
              : `${userName} — Tüm Eylemler`}
          </DialogTitle>
        </DialogHeader>
```

with:

```tsx
interface ReportActionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  ipAddress?: string;
  deviceId?: string | null;
}

export function ReportActionsDialog({
  open,
  onOpenChange,
  userId,
  userName,
  ipAddress,
  deviceId,
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
      filter: { userId, ipAddress, deviceId },
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
              ? `${userName} — ${ipAddress === 'unknown' ? 'Bilinmiyor' : ipAddress} Eylemleri`
              : deviceId !== undefined
                ? `${userName} — ${deviceId === null ? 'Bilinmeyen Cihaz' : 'Cihaz'} Eylemleri`
                : `${userName} — Tüm Eylemler`}
          </DialogTitle>
        </DialogHeader>
```

- [ ] **Step 2: Wire `DeviceBreakdownTable` into `report-tab.tsx`**

In `src/app/panel/users/report-tab.tsx`, replace:

```tsx
import { ReportActionsDialog } from './report-actions-dialog';
import { createReportColumns } from './report-columns';
import { IpBreakdownTable } from './report-ip-breakdown';

interface ActionsTarget {
  userId: string;
  userName: string;
  ipAddress?: string;
}
```

with:

```tsx
import { ReportActionsDialog } from './report-actions-dialog';
import { createReportColumns } from './report-columns';
import { DeviceBreakdownTable } from './report-device-breakdown';

interface ActionsTarget {
  userId: string;
  userName: string;
  ipAddress?: string;
  deviceId?: string | null;
}
```

- [ ] **Step 3: Update `renderSubRow` and the dialog's props**

Replace:

```tsx
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
```

with:

```tsx
            renderSubRow={(row) =>
              row.id === expandedUserId ? (
                <DeviceBreakdownTable
                  onOpenActions={(userId, userName, target) =>
                    openActions({ userId, userName, ...target })
                  }
                  userId={row.id}
                  userName={row.name}
                />
              ) : null
            }
```

Then replace:

```tsx
      {actionsTarget && (
        <ReportActionsDialog
          ipAddress={actionsTarget.ipAddress}
          key={`${actionsTarget.userId}:${actionsTarget.ipAddress ?? ''}`}
          onOpenChange={setActionsOpen}
          open={actionsOpen}
          userId={actionsTarget.userId}
          userName={actionsTarget.userName}
        />
      )}
```

with:

```tsx
      {actionsTarget && (
        <ReportActionsDialog
          deviceId={actionsTarget.deviceId}
          ipAddress={actionsTarget.ipAddress}
          key={`${actionsTarget.userId}:${actionsTarget.ipAddress ?? ''}:${actionsTarget.deviceId ?? ''}`}
          onOpenChange={setActionsOpen}
          open={actionsOpen}
          userId={actionsTarget.userId}
          userName={actionsTarget.userName}
        />
      )}
```

- [ ] **Step 4: Typecheck and lint**

Run: `pnpm typecheck && pnpm check`

Expected: both pass, with no remaining reference to the deleted `report-ip-breakdown.tsx` anywhere in the project (confirm with `grep -rn "report-ip-breakdown\|IpBreakdownTable" src/`, expect no output).

- [ ] **Step 5: Manual verification**

Start the dev server, sign in as an admin, go to `/panel/users` → "Kullanıcı Raporu" tab, and expand a user with existing login/activity/action data:
- The expanded row shows a device table (not a flat IP table).
- Expanding a device row shows that device's IPs underneath, in the same style the old flat table used.
- Clicking a device's "Eylem Sayısı" opens the actions dialog titled for that device and filtered accordingly (compare the row count against `pnpm db:studio`'s `AuditLog` count for that `deviceId`).
- Clicking an IP row's "Eylem Sayısı" (inside an expanded device) opens the actions dialog titled for that IP, same as before this feature.

- [ ] **Step 6: Commit**

```bash
git add src/app/panel/users/report-tab.tsx src/app/panel/users/report-actions-dialog.tsx
git commit -m "feat: wire device breakdown into the user report tab"
```

---

## Task 11: Backfill script for pre-cookie history

**Files:**
- Create: `scripts/backfill-devices.js`

**Interfaces:**
- Consumes: `Device`, `DeviceUser`, `deviceId` columns from Task 1. Standalone — runs independently of the app process.
- Produces: every `LoginEvent` row with a non-empty `userAgent` gets a synthetic `Device`; every `UserDailyActivity`/`AuditLog` row whose `(userId, ipAddress)` matches one of those devices' login history gets that `deviceId` too. Safe to re-run.

- [ ] **Step 1: Write the script**

Create `scripts/backfill-devices.js` (plain JS, ESM — this repo's `package.json` has `"type": "module"`):

```js
import { PrismaClient } from '../generated/prisma/index.js';

const db = new PrismaClient();

// Groups LoginEvent rows with no deviceId by (userId, userAgent) and gives
// each group a synthetic Device — userAgent is the closest available proxy
// for "device" in data that predates the device_uuid cookie. Rows with no
// userAgent are left alone (deviceId stays null) rather than inventing a
// device for "no user agent" — they fall into the report's per-user
// "Bilinmeyen cihaz" bucket, same as any other unmatched row.
async function synthesizeLegacyDevices(tx) {
  const ungrouped = await tx.loginEvent.findMany({
    where: { deviceId: null, userAgent: { not: null } },
    select: { id: true, userId: true, userAgent: true, createdAt: true },
  });

  const groups = new Map();
  for (const row of ungrouped) {
    if (!row.userAgent) continue;
    const key = `${row.userId}:${row.userAgent}`;
    let group = groups.get(key);
    if (!group) {
      group = {
        userId: row.userId,
        userAgent: row.userAgent,
        loginEventIds: [],
        firstSeenAt: row.createdAt,
        lastSeenAt: row.createdAt,
      };
      groups.set(key, group);
    }
    group.loginEventIds.push(row.id);
    if (row.createdAt < group.firstSeenAt) group.firstSeenAt = row.createdAt;
    if (row.createdAt > group.lastSeenAt) group.lastSeenAt = row.createdAt;
  }

  let devicesCreated = 0;
  for (const group of groups.values()) {
    const device = await tx.device.create({
      data: {
        deviceUuid: `legacy-${crypto.randomUUID()}`,
        lastUserAgent: group.userAgent,
      },
    });
    await tx.deviceUser.create({
      data: {
        deviceId: device.id,
        userId: group.userId,
        firstSeenAt: group.firstSeenAt,
        lastSeenAt: group.lastSeenAt,
      },
    });
    await tx.loginEvent.updateMany({
      where: { id: { in: group.loginEventIds } },
      data: { deviceId: device.id },
    });
    devicesCreated += 1;
  }

  return devicesCreated;
}

// For each (userId, ipAddress) pair seen in the just-assigned LoginEvent
// rows, picks the device with the most logins from that IP (tie-break:
// most recent) — the best guess for "which device used this IP" when
// backfilling tables that never recorded a userAgent of their own.
async function buildIpDeviceMap(tx) {
  const assigned = await tx.loginEvent.findMany({
    where: { deviceId: { not: null } },
    select: { userId: true, ipAddress: true, deviceId: true, createdAt: true },
  });

  const counts = new Map();
  for (const row of assigned) {
    const key = `${row.userId}:${row.ipAddress}:${row.deviceId}`;
    const existing = counts.get(key);
    if (!existing) {
      counts.set(key, {
        userId: row.userId,
        ipAddress: row.ipAddress,
        deviceId: row.deviceId,
        count: 1,
        lastSeenAt: row.createdAt,
      });
    } else {
      existing.count += 1;
      if (row.createdAt > existing.lastSeenAt) existing.lastSeenAt = row.createdAt;
    }
  }

  const best = new Map();
  for (const entry of counts.values()) {
    const key = `${entry.userId}:${entry.ipAddress}`;
    const current = best.get(key);
    if (
      !current ||
      entry.count > current.count ||
      (entry.count === current.count && entry.lastSeenAt > current.lastSeenAt)
    ) {
      best.set(key, entry);
    }
  }

  const ipDeviceMap = new Map();
  for (const entry of best.values()) {
    ipDeviceMap.set(`${entry.userId}:${entry.ipAddress}`, entry.deviceId);
  }
  return ipDeviceMap;
}

async function backfillByIp(tx, model, ipDeviceMap) {
  const rows = await tx[model].findMany({
    where: { deviceId: null },
    select: { id: true, userId: true, ipAddress: true },
  });

  let updated = 0;
  for (const row of rows) {
    const deviceId = ipDeviceMap.get(`${row.userId}:${row.ipAddress}`);
    if (!deviceId) continue;
    await tx[model].update({ where: { id: row.id }, data: { deviceId } });
    updated += 1;
  }
  return updated;
}

async function main() {
  const result = await db.$transaction(
    async (tx) => {
      const devicesCreated = await synthesizeLegacyDevices(tx);
      const ipDeviceMap = await buildIpDeviceMap(tx);
      const activityUpdated = await backfillByIp(
        tx,
        'userDailyActivity',
        ipDeviceMap,
      );
      const auditLogUpdated = await backfillByIp(tx, 'auditLog', ipDeviceMap);
      return { devicesCreated, activityUpdated, auditLogUpdated };
    },
    { timeout: 5 * 60 * 1000 },
  );

  console.log('Backfill complete:', result);
}

main()
  .catch((err) => {
    console.error('Backfill failed, transaction rolled back:', err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
```

- [ ] **Step 2: Dry-run against the dev database**

Run: `node scripts/backfill-devices.js`

Expected: prints `Backfill complete: { devicesCreated: N, activityUpdated: N, auditLogUpdated: N }`. If `DATABASE_URL` isn't already in your shell environment, run `node --env-file=.env scripts/backfill-devices.js` instead (Node 20.6+ native env-file loading, no `dotenv` dependency needed).

- [ ] **Step 3: Verify with `pnpm db:studio`**

Open `Device` — confirm rows exist with `deviceUuid` starting `legacy-`, each with a plausible `lastUserAgent`. Pick one such device's id, then check `LoginEvent` filtered to that `deviceId` — all rows should share the same `userAgent`. Check a `UserDailyActivity` or `AuditLog` row that previously had a real (non-`'unknown'`) `ipAddress` for a user who also has legacy `LoginEvent` history — confirm it now has a `deviceId` pointing at one of that user's legacy devices.

- [ ] **Step 4: Re-run to confirm idempotency**

Run: `node scripts/backfill-devices.js` again.

Expected: `devicesCreated: 0` (every `LoginEvent` row already has a `deviceId`, so the `deviceId: null` filter in `synthesizeLegacyDevices` finds nothing), and `activityUpdated`/`auditLogUpdated` also `0` or close to it (only genuinely still-unmatched rows would update, and a second run over the same data shouldn't find any new matches).

- [ ] **Step 5: Commit**

```bash
git add scripts/backfill-devices.js
git commit -m "feat: add device backfill script for pre-cookie history"
```

---

## Task 12: Full end-to-end verification pass

**Files:** none (verification only).

**Interfaces:** none — this task exercises the whole feature built in Tasks 1–11 together.

- [ ] **Step 1: Fresh-browser cookie mint**

In a private/incognito window (no existing `device_uuid` cookie), start the dev server and load the sign-in page. Check DevTools → Application → Cookies: `device_uuid` is present, `HttpOnly`, before you've even submitted the login form — confirming the proxy mints it on the page-load request, ahead of the sign-in POST.

- [ ] **Step 2: Same device, two IPs**

Sign in as a test user in that same browser. Confirm via `pnpm db:studio` that a `Device`/`DeviceUser` pair exists. Without clearing cookies, simulate a second "IP" for the same device by manually inserting one extra `LoginEvent`/`UserDailyActivity` row for that same `userId`/`deviceId` with a different `ipAddress` via `pnpm db:studio`. Reload `/panel/users`' report tab and expand that user: confirm the device row's `ipCount` is 2 and expanding it shows both IPs.

- [ ] **Step 3: Unknown-device bucket renders**

Via `pnpm db:studio`, create one `AuditLog` row for your test user with `deviceId: null` (leave `userId` pointing at the test user). Reload the report tab: confirm a "Bilinmeyen cihaz" device row appears alongside the real one, its action count includes that row, and clicking it opens the dialog titled "Bilinmeyen Cihaz Eylemleri".

- [ ] **Step 4: Full command sweep**

Run: `pnpm typecheck && pnpm check`

Expected: both pass with zero errors/warnings across the whole feature (not just the most recently touched files).

- [ ] **Step 5: Clean up test data**

Via `pnpm db:studio`, delete any rows you manually inserted for Steps 2–3 (the extra `LoginEvent`/`UserDailyActivity`/`AuditLog` rows) so the dev database doesn't carry synthetic test data forward. Leave real rows created by actually signing in/using the app during this verification pass — those are genuine.

- [ ] **Step 6: No commit for this task**

This task is verification-only — nothing to stage. If Step 4 or any manual check surfaces a bug, fix it in the relevant earlier task's files and re-run that task's own verification before returning here.
