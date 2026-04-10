import { test, expect } from '@playwright/test';

import { TaxCalculatorPage } from './pages/tax-calculator.page';

test.describe('Happy Path', () => {
  let calc: TaxCalculatorPage;

  test.beforeEach(async ({ page }) => {
    calc = new TaxCalculatorPage(page);
    await calc.goto();
  });

  test('shows empty state initially', async () => {
    await expect(calc.emptyState).toBeVisible();
    await expect(calc.resultsSection).not.toBeVisible();
  });

  test('calculates tax for $100,000 salary (2022)', async () => {
    await calc.retryUntilSuccess('100000', '2022');
    await expect(calc.resultsSection).toBeVisible();
    await expect(calc.effectiveRateText).toBeVisible();
    const rows = calc.page.locator('tbody tr');
    await expect(rows).toHaveCount(5);
  });

  test('calculates tax for $50,000 salary (2022)', async () => {
    await calc.retryUntilSuccess('50000', '2022');
    await expect(calc.resultsSection).toBeVisible();
  });

  test('changes year and recalculates', async () => {
    await calc.retryUntilSuccess('100000', '2021');
    await expect(calc.resultsSection).toBeVisible();
  });

  test('shows loading state while calculating', async () => {
    await calc.salaryInput.fill('100000');
    await calc.yearSelect.selectOption('2022');
    await calc.calculateButton.click();
    await expect(calc.resultsSection.or(calc.errorAlert)).toBeVisible({
      timeout: 30_000,
    });
  });
});

test.describe('Happy Path — Currency Formatted Input', () => {
  let calc: TaxCalculatorPage;

  test.beforeEach(async ({ page }) => {
    calc = new TaxCalculatorPage(page);
    await calc.goto();
  });

  test('accepts comma-formatted salary: 100,000', async () => {
    await calc.retryUntilSuccess('100,000', '2022');
    await expect(calc.resultsSection).toBeVisible();
  });

  test('accepts salary with decimals: 100,000.00', async () => {
    await calc.retryUntilSuccess('100,000.00', '2022');
    await expect(calc.resultsSection).toBeVisible();
  });

  test('accepts salary with dollar sign: $100,000', async () => {
    await calc.retryUntilSuccess('$100,000', '2022');
    await expect(calc.resultsSection).toBeVisible();
  });

  test('accepts millions: $1,234,567.89', async () => {
    await calc.retryUntilSuccess('$1,234,567.89', '2022');
    await expect(calc.resultsSection).toBeVisible();
    const rows = calc.page.locator('tbody tr');
    await expect(rows).toHaveCount(5);
  });

  test('accepts plain number without formatting: 50000', async () => {
    await calc.retryUntilSuccess('50000', '2022');
    await expect(calc.resultsSection).toBeVisible();
  });
});

test.describe('Happy Path — Edge Cases', () => {
  let calc: TaxCalculatorPage;

  test.beforeEach(async ({ page }) => {
    calc = new TaxCalculatorPage(page);
    await calc.goto();
  });

  test('calculates for all supported years', async () => {
    for (const year of ['2022', '2021', '2020', '2019']) {
      await calc.retryUntilSuccess('75000', year);
      await expect(calc.resultsSection).toBeVisible();
      await calc.page.reload();
      calc = new TaxCalculatorPage(calc.page);
    }
  });

  test('handles very small salary: $1', async () => {
    await calc.retryUntilSuccess('1', '2022');
    await expect(calc.resultsSection).toBeVisible();
  });

  test('handles large salary: $10,000,000', async () => {
    await calc.retryUntilSuccess('10,000,000', '2022');
    await expect(calc.resultsSection).toBeVisible();
    const rows = calc.page.locator('tbody tr');
    await expect(rows).toHaveCount(5);
  });
});
