# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # Start dev server
pnpm build        # Production build
pnpm typecheck    # TypeScript check (tsc --noEmit)
pnpm check        # Biome lint/format check
pnpm check:write  # Auto-fix lint/format issues
pnpm db:push      # Sync Prisma schema → DB (no migration history — always use this, not db:generate)
pnpm db:studio    # Open Prisma Studio
```

> pnpm may require `COREPACK_ENABLE_STRICT=0 pnpm ...` if installed via fnm and corepack complains.

## Architecture

**Stack:** Next.js 16 App Router · tRPC 11 · Prisma 6 (PostgreSQL) · better-auth · shadcn/ui · React Hook Form + Zod

**Import alias:** `~/*` → `./src/*`

**Prisma client** is generated to `./generated/prisma` (not the default location). Import from `generated/prisma`, not `@prisma/client`. After schema changes run `pnpm db:push` and restart the dev server to pick up the regenerated client.

### tRPC

- Routers live in `src/server/api/routers/` and are registered in `src/server/api/root.ts`
- Three procedure types in `src/server/api/trpc.ts`:
  - `publicProcedure` — no auth
  - `protectedProcedure` — session required
  - `adminProcedure` — session + `role === 'admin'`
- All mutations that write data call `createAuditLog()` (defined in `trpc.ts`) for the audit trail
- The timing middleware adds ~100ms artificial delay in dev — intentional, do not remove

### Authentication

Configured in `src/server/better-auth/`. Uses email/password with the Prisma adapter and the `admin()` plugin. The `DEFAULT_ADMIN_EMAIL` / `DEFAULT_ADMIN_PASSWORD` env vars seed the initial admin account. Auth routes are at `/api/auth/[...all]`.

### Role-based access

- `User.role` is either `'admin'` or `'user'` (null treated as user)
- Admins see all business groups and customer cards; non-admins see only their assigned business groups and the customer cards whose `businessGroup` string matches those group names
- Admin-only pages (`/panel/users`, `/panel/audit-logs`) redirect non-admins server-side
- The settings page is accessible to all; the BusinessGroupsTable is conditionally rendered for admins only

### Zod schemas

Shared schemas in `src/shared/zod-schemas/`. These are used by both tRPC router inputs and React Hook Form — always update schemas there rather than inline in routers or forms.

### Environment

Validated via `@t3-oss/env-nextjs` in `src/env.js`. Required variables: `DATABASE_URL`, `DEFAULT_ADMIN_EMAIL`, `DEFAULT_ADMIN_PASSWORD`. SMTP vars are optional (email verification falls back silently without them in dev).

### UI / Language

All UI text is in Turkish. Enum→display mappings live in `src/lib/enum-map.ts`; column header mappings in `src/lib/column-map.ts`. shadcn/ui components are in `src/components/ui/`.
