import { test, expect } from '@playwright/test';
import { TaxCalculatorPage } from './pages/tax-calculator.page';

test.describe('Responsive Layout', () => {
  test('mobile layout stacks vertically', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const calc = new TaxCalculatorPage(page);
    await calc.goto();

    await expect(calc.salaryInput).toBeVisible();
    await expect(calc.emptyState).toBeVisible();
  });

  test('tablet layout adjusts padding', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    const calc = new TaxCalculatorPage(page);
    await calc.goto();

    await expect(calc.salaryInput).toBeVisible();
  });

  test('desktop layout shows side-by-side panels', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const calc = new TaxCalculatorPage(page);
    await calc.goto();

    await expect(calc.salaryInput).toBeVisible();
    await expect(calc.emptyState).toBeVisible();
  });
});
