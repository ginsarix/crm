import { expect, test } from '@playwright/test';

const ADMIN_EMAIL = process.env.DEFAULT_ADMIN_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD ?? '';

const SAVED_TOAST = 'Etiketler kaydedildi';

test.describe('admin-editable labels', () => {
  test.skip(
    !ADMIN_EMAIL || !ADMIN_PASSWORD,
    'DEFAULT_ADMIN_EMAIL / DEFAULT_ADMIN_PASSWORD must be set',
  );

  test('renaming a field propagates and reverts', async ({ page }) => {
    await page.goto('/login');
    // Login1 has no <label> elements — the inputs are only identified by
    // placeholder text, and the submit button reads "Devam", not "Giriş".
    await page.getByPlaceholder(/e-posta/i).fill(ADMIN_EMAIL);
    await page.getByPlaceholder(/parola/i).fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: /devam/i }).click();
    await page.waitForURL('**/panel/**');

    try {
      await page.goto('/panel/settings');
      await page.getByRole('tab', { name: 'Cari Kartları' }).click();

      // Exact match: "2. Alan" is otherwise a substring of "12. Alan".
      const input = page.getByLabel('2. Alan', { exact: true });
      await input.fill('Firma Adı');
      await page.getByRole('button', { name: 'Kaydet' }).first().click();
      // Wait for the save to actually land before navigating away — the
      // mutation is async and a bare click doesn't wait for it.
      await page.getByText(SAVED_TOAST).waitFor();

      await page.goto('/panel/customer-cards');
      await expect(
        page.getByRole('columnheader', { name: 'Firma Adı' }),
      ).toBeVisible();

      await page.goto('/panel/visits');
      await expect(
        page.getByRole('columnheader', { name: 'Cari Kartı Firma Adı' }),
      ).toBeVisible();
    } finally {
      await page.goto('/panel/settings');
      await page.getByRole('tab', { name: /Cari/ }).click();
      await page
        .getByRole('button', { name: 'Varsayılanları Getir' })
        .first()
        .click();
      await page.getByRole('button', { name: 'Kaydet' }).first().click();
      await page.getByText(SAVED_TOAST).waitFor();
    }

    await page.goto('/panel/customer-cards');
    await expect(
      page.getByRole('columnheader', { name: 'Ünvan' }),
    ).toBeVisible();
  });
});
