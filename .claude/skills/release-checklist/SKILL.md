---
name: release-checklist
description: Use when cutting a new app release — updating the version badge and changelog. Covers the two files that must stay in sync (src/constants/app-version.ts and src/constants/releases.ts) and how the new-version nudge dialog works.
---

## Versioning and releases

The app version is tracked in two files that must always stay in sync:

- **`src/constants/app-version.ts`** — exports `APP_VERSION` (a plain string, e.g. `'1.15'`). This drives the version badge in the panel header and the new-version nudge dialog.
- **`src/constants/releases.ts`** — exports the `RELEASES` array (newest entry first). Each entry has `id` (`'v{major}-{minor}'`), `version`, `date` (Turkish locale, e.g. `'12 Haziran 2026'`), and `changes[]` with `type` (`'new' | 'fix' | 'improved' | 'changed' | 'removed'`), `title`, and optional `desc`.

**How the new-version dialog works:** `useNewVersionNudge` (`src/hooks/use-new-version-nudge.ts`) compares `APP_VERSION` against the value stored under the `'app-version'` key in `localStorage`. If they differ, the dialog fires on the user's next visit, showing the top 3 changes from `RELEASES[0]` with a link to `/panel/changelog`. Dismissing writes the current `APP_VERSION` back to storage.

**Release checklist — do both edits together:**

1. Prepend a new entry to `RELEASES` in `src/constants/releases.ts` (it must be the new `[0]` element).
2. Update `APP_VERSION` in `src/constants/app-version.ts` to match the new entry's `version` string.

Updating only one of the two files will cause the badge and the dialog to show different versions.
