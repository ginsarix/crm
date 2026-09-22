---
name: release-checklist
description: Use when cutting a new app release — updating the version badge and changelog — or when deciding whether a finished change belongs in the changelog at all. Covers the two files that must stay in sync (src/constants/app-version.ts and src/constants/releases.ts) and how the new-version nudge dialog works.
---

## Versioning and releases

The app version is tracked in two files that must always stay in sync:

- **`src/constants/app-version.ts`** — exports `APP_VERSION` (a plain string, e.g. `'1.15'`). This drives the version badge in the panel header and the new-version nudge dialog.
- **`src/constants/releases.ts`** — exports the `RELEASES` array (newest entry first). Each entry has `id` (`'v{major}-{minor}'`), `version`, `date` (Turkish locale, e.g. `'12 Haziran 2026'`), and `changes[]` with `type` (`'new' | 'fix' | 'improved' | 'changed' | 'removed'`), `title`, and optional `desc`.

**How the new-version dialog works:** `useNewVersionNudge` (`src/hooks/use-new-version-nudge.ts`) compares `APP_VERSION` against the value stored under the `'app-version'` key in `localStorage`. If they differ, the dialog fires on the user's next visit, showing the top 3 changes from `RELEASES[0]` with a link to `/panel/changelog`. Dismissing writes the current `APP_VERSION` back to storage.

## What earns a changelog entry

The changelog answers one question for the user: *what is different for me since the last time I used this?* "Does this change affect users" is the wrong test — nearly everything does, and answering it fills the list with entries nobody recognizes.

An entry is earned only if the change clears all three:

1. **They meet it without going looking.** Name what the user is doing when they notice. If naming it needs "if they happen to" — hit that one field, make that one mistake, type that one character — it does not clear this.
2. **It is aimed at them.** Admin-facing work does not clear this even when it is large and visible: the Etiketler card, kullanıcı yönetimi, denetim kayıtları. Admins do not read that as something put there for them.
3. **There is something new to recognize.** A change to what the app does clears this. A correction that makes the app finally behave the way users already assumed it did does not — they experience it as nothing having happened.

**Aggregate before testing, not after.** One reworded validation message fails (1). Ten of them, entered once as "Alan doğrulama mesajları daha netleştirilmiştir", is something the user meets in ordinary use. Test the aggregate and enter it once; never enter the pieces.

**A change that earns no entry ships silently.** Most commits in a release are not in `RELEASES`, and that is the normal case, not an oversight.

| Change | Entry? | Why |
|---|---|---|
| 25 satır seçeneği kaldırıldı, varsayılan 50 oldu | Yes | The table looks different on their next visit |
| Yeni bir kolon, filtre ya da sayfa | Yes | Sitting there every time the page opens |
| Arama artık "hacibektas" yazınca HACIBEKTAŞ'ı buluyor | No | Fails (3) — it does what they always assumed it did |
| Etiketler kartına yeni bir düzenlenebilir alan | No | Fails (2) — admin-facing |
| Tek bir doğrulama mesajı düzeltildi | No | Fails (1) — only the user who makes that exact mistake |
| Doğrulama mesajları toptan netleştirildi | Yes | The same work, aggregated: met in ordinary use |
| Bir sorgu hızlandırıldı | No | Fails (1) and (3) |

**Release checklist — do both edits together:**

1. Decide which of the release's changes earn an entry, by the three tests above.
2. Prepend a new entry to `RELEASES` in `src/constants/releases.ts` (it must be the new `[0]` element).
3. Update `APP_VERSION` in `src/constants/app-version.ts` to match the new entry's `version` string.

Updating only one of the two files will cause the badge and the dialog to show different versions.
