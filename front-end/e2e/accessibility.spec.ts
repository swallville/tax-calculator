import { test, expect } from '@playwright/test';
import { TaxCalculatorPage } from './pages/tax-calculator.page';

test.describe('Accessibility', () => {
  let calc: TaxCalculatorPage;

  test.beforeEach(async ({ page }) => {
    calc = new TaxCalculatorPage(page);
    await calc.goto();
  });

  test('page has correct lang attribute', async ({ page }) => {
    const html = page.locator('html');
    await expect(html).toHaveAttribute('lang', 'en-CA');
  });

  test('has main landmark', async ({ page }) => {
    await expect(page.getByRole('main')).toBeVisible();
  });

  test('has h1 heading (sr-only)', async ({ page }) => {
    const h1 = page.getByRole('heading', { level: 1 });
    await expect(h1).toHaveCount(1);
  });

  test('has skip-to-content link', async () => {
    await expect(calc.skipLink).toHaveCount(1);
    await expect(calc.skipLink).toHaveAttribute('href', '#main-content');
  });

  test('form inputs have labels', async () => {
    await expect(calc.salaryInput).toBeVisible();
    await expect(calc.yearSelect).toBeVisible();
  });

  test('empty state has status role', async () => {
    await expect(calc.emptyState).toBeVisible();
  });

  test('persistent results panel has aria-live for screen reader announcements', async () => {
    // The live region is on the persistent results-panel wrapper (page.tsx),
    // not on TaxBreakdown itself — this ensures NVDA/JAWS register it at
    // page load before content is injected.
    await expect(calc.resultsPanel).toHaveAttribute('aria-live', 'polite');
    await expect(calc.resultsPanel).toHaveAttribute('aria-atomic', 'true');
  });

  test('table has proper semantic structure', async () => {
    await calc.retryUntilSuccess('100000', '2022');
    const table = calc.page.locator('table');
    await expect(table).toBeVisible();
    await expect(calc.page.locator('thead')).toBeVisible();
    await expect(calc.page.locator('tbody')).toBeVisible();
    await expect(calc.page.locator('tfoot')).toBeVisible();
    const headers = calc.page.locator("th[scope='col']");
    await expect(headers).toHaveCount(3);
  });

  test('keyboard navigation visits form fields in DOM order', async ({
    page,
    browserName,
  }) => {
    // WebKit/Safari on macOS requires "Full Keyboard Access" to be enabled in
    // System Settings for Tab to move focus between form controls. In
    // Playwright's headless WebKit this behaves inconsistently, so we verify
    // each element is independently focusable instead of testing Tab chains.
    await calc.salaryInput.focus();
    await expect(calc.salaryInput).toBeFocused();

    await calc.yearSelect.focus();
    await expect(calc.yearSelect).toBeFocused();

    await calc.calculateButton.focus();
    await expect(calc.calculateButton).toBeFocused();

    // On Chromium/Firefox, verify that Tab key actually moves focus forward
    // from salary → year. This is the core "Tab order" assertion.
    if (browserName === 'chromium' || browserName === 'firefox') {
      await calc.salaryInput.focus();
      await page.keyboard.press('Tab');
      await expect(calc.yearSelect).toBeFocused();
    }
  });
});
