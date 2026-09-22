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
- Most mutations that write data call `createAuditLog()` (defined in `trpc.ts`) for the audit trail — `feedback`, `dashboard-config`, `saved-filter`, and `activity` routers are current exceptions that don't audit-log
- The timing middleware adds ~100ms artificial delay in dev — intentional, do not remove

### Authentication

Configured in `src/server/better-auth/`. Uses email/password with the Prisma adapter and the `admin()` plugin. The `DEFAULT_ADMIN_EMAIL` / `DEFAULT_ADMIN_PASSWORD` env vars seed the initial admin account. Auth routes are at `/api/auth/[...all]`.

### Role-based access

- `User.role` is either `'admin'` or `'user'` (null treated as user)
- Admins see all business groups, customer cards, and visits. Non-admin scoping depends on the query: aggregate queries (`getStats`, `getTotal`) hard-filter to the user's assigned business groups; the main list queries (`customerCard.get`, `visit.get`) instead return every record and flag out-of-scope ones with `isRestricted: true` so the UI grays them out rather than hiding them (controlled by the `includeRestricted` input flag)
- Admin-only pages (`/panel/users`, `/panel/audit-logs`) redirect non-admins server-side
- The settings page is accessible to all; the BusinessGroupsTable is conditionally rendered for admins only

### Zod schemas

Shared schemas in `src/shared/zod-schemas/`. These are used by both tRPC router inputs and React Hook Form — always update schemas there rather than inline in routers or forms.

### Environment

Validated via `@t3-oss/env-nextjs` in `src/env.js`. Required variables: `DATABASE_URL`, `DEFAULT_ADMIN_EMAIL`, `DEFAULT_ADMIN_PASSWORD`. SMTP vars are optional (email verification falls back silently without them in dev).

### UI / Language

All UI text is in Turkish. shadcn/ui components are in `src/components/ui/`. Turkish common nouns take suffixes with **no apostrophe** — `Formda Zorunlu`, `Meslek Grubundan`, never `Form'da` / `Meslek Grubu'ndan`.

### Display text comes from the label resolver

Column headers, form input labels, table titles, page header titles, nav item labels and the audit-log action/resource strings are **not hardcoded**. They resolve at runtime from `src/shared/labels/`:

- `registry.ts` — the defaults, plus metadata (field order, `required`, inheritance). The only place this Turkish is typed.
- `resolve.ts` — layers an admin's stored overrides (the `LabelOverride` table) over those defaults.
- `compose.ts` — derives nav labels, table titles, dialog titles and audit strings from each entity's tekil/çoğul pair.

Client components read `useLabels()` (`~/hooks/use-labels`); server components `await api.label.get()`. Admins edit the editable subset in the **Etiketler** card on `/panel/settings`.

**Before adding a new page, a new field, or a new title, ask the user whether it should be admin-editable in the label editor.** Not everything is: `id` / `createdAt` / `updatedAt`, enum *values* (Geldi/Gelmedi, Aldı/Almadı), and the columns of the Satış Temsilcileri and Meslek Grupları tables are deliberately static, while entity names, their field labels, MGK's form section headings, and the Panel / Ayarlar page titles are editable. Route the text through the resolver either way — static entries still live in the registry — but which side of that line a new label falls on is a product decision, not one to assume.

Two rules that bite when adding a field:

- `src/lib/column-map.ts` holds **key arrays only** (no Turkish). Five routers build Zod enums from them, so the keys are a server-side contract. Adding a searchable field to a router's `searchableFields` requires adding the key there **and** a label entry in `registry.ts` — a registry invariant test fails otherwise, which is the intended safety net.
- Never bake a required asterisk into a label. Compose it in JSX as `{label} *`.

Strings are left hardcoded only when composing them would need a Turkish suffix that cannot be generated safely for an arbitrary renamed noun (genitive/possessive/accusative forms — e.g. "Meslek Gruplarını Kaydet", where the accusative buffer consonant depends on the plural's final vowel). Those sites carry an in-code comment saying so.

### Versioning and releases

See the `release-checklist` skill for the release process (keeping `app-version.ts` and `releases.ts` in sync).

### Git

Branch work merges into `main` with a **merge commit** — never fast-forwarded, so the branch stays visible as a unit:

```bash
git merge --no-ff <branch> -m "Merge branch '<branch>'"
git branch -d <branch>
```

`git log --oneline` on `main` reads as linear because feature branches are short, which makes `--ff-only` look like the matching choice. It isn't — check `git log --merges` rather than the last few subject lines.

Branches are named `feat/...` or `fix/...` (kebab-case).

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
