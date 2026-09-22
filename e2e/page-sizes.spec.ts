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

    // Scoped by the test hook, not by DOM-walking from the (admin-renameable)
    // Turkish heading. Within the section, both the value inputs and the
    // default radios share an aria-label across rows, so every lookup below
    // is indexed with `.nth()` rather than relying on the label alone.
    const section = page.getByTestId('page-size-section-customerCard');

    // The DataTable's own rows-per-page control shares its label text with
    // the editor's value inputs, so it can't be found with getByLabel from
    // the page root. It sits in the same flex row as the
    // "Sayfa Başı Satır Sayısı" caption text, as the caption's only sibling
    // with role="combobox" — the filter toolbar above the table has several
    // other comboboxes, so `getByRole('combobox').first()` would not resolve
    // to the pagination control.
    const pageSizeSelect = page
      .getByText('Sayfa Başı Satır Sayısı', { exact: true })
      .locator('..')
      .getByRole('combobox');

    try {
      await page.goto('/panel/settings?tab=page-sizes');

      // Reduce Cari Kartları to a distinctive, deliberately unsorted set so
      // the ascending-on-save guarantee is actually exercised: the router
      // sorts on write, and out-of-order input is what proves that rather
      // than assumes it.
      const inputs = section.getByLabel('Sayfa Başı Satır Sayısı');
      await expect(inputs.first()).toBeVisible();

      // Trim the built-in four options (25/50/100/500) down to two, then set
      // them to 20 and 10 in that order with 10 marked default.
      while ((await inputs.count()) > 2) {
        await section.getByLabel('Seçeneği Sil').last().click();
      }
      await inputs.nth(0).fill('20');
      await inputs.nth(1).fill('10');
      await section.getByLabel('Varsayılan').nth(1).check();

      await section.getByRole('button', { name: 'Kaydet' }).click();
      // Wait for the save to land before navigating away — the mutation is
      // async and a bare click doesn't wait for it.
      await page.getByText(SAVED_TOAST).waitFor();

      await page.goto('/panel/customer-cards');
      await expect(pageSizeSelect).toHaveText('10');

      await pageSizeSelect.click();
      await expect(page.getByRole('option')).toHaveText(['10', '20']);
      await page.keyboard.press('Escape');
    } finally {
      await page.goto('/panel/settings?tab=page-sizes');
      await section
        .getByRole('button', { name: 'Varsayılanları Getir' })
        .click();
      await section.getByRole('button', { name: 'Kaydet' }).click();
      await page.getByText(SAVED_TOAST).waitFor();
    }

    await page.goto('/panel/customer-cards');
    await expect(pageSizeSelect).toHaveText('25');
  });
});
