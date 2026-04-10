import { test, expect } from '@playwright/test';

import { TaxCalculatorPage } from './pages/tax-calculator.page';

test.describe('Edge Cases — Input Validation', () => {
  let calc: TaxCalculatorPage;

  test.beforeEach(async ({ page }) => {
    calc = new TaxCalculatorPage(page);
    await calc.goto();
  });

  test("rejects non-numeric input like 'abc'", async () => {
    await calc.salaryInput.fill('abc');
    await calc.calculateButton.click();
    await expect(calc.page.getByTestId('salary-error')).toBeVisible({
      timeout: 5_000,
    });
  });

  test("rejects negative salary '-5000'", async () => {
    await calc.salaryInput.fill('-5000');
    await calc.calculateButton.click();
    await expect(calc.page.getByTestId('salary-error')).toBeVisible({
      timeout: 5_000,
    });
  });

  test("rejects special characters '!@#%'", async () => {
    await calc.salaryInput.fill('!@#%');
    await calc.calculateButton.click();
    await expect(calc.page.getByTestId('salary-error')).toBeVisible({
      timeout: 5_000,
    });
  });

  test('accepts zero salary without crashing', async () => {
    await calc.salaryInput.fill('0');
    await calc.calculateButton.click();
    // Zero salary either shows empty state or validation error — both are valid
    await expect(
      calc.page.getByTestId('salary-error').or(calc.emptyState),
    ).toBeVisible({ timeout: 5_000 });
  });
});

test.describe('Edge Cases — API Errors', () => {
  test('handles malformed JSON response gracefully', async ({ page }) => {
    await page.route('**/api/tax-calculator/**', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: 'NOT VALID JSON {{{',
      }),
    );

    const calc = new TaxCalculatorPage(page);
    await calc.goto();
    await calc.calculate('100000', '2022');

    // Should show error state, not crash
    await expect(calc.errorAlert.or(calc.emptyState)).toBeVisible({
      timeout: 15_000,
    });
  });

  test('handles empty response body on 500', async ({ page }) => {
    await page.route('**/api/tax-calculator/**', route =>
      route.fulfill({
        status: 500,
        contentType: 'text/plain',
        body: '',
      }),
    );

    const calc = new TaxCalculatorPage(page);
    await calc.goto();
    await calc.calculate('100000', '2022');

    await expect(calc.errorAlert).toBeVisible({ timeout: 30_000 });
    await expect(calc.page.getByTestId('error-title')).toBeVisible();
  });

  test('handles network timeout simulation', async ({ page }) => {
    await page.route('**/api/tax-calculator/**', route =>
      route.abort('timedout'),
    );

    const calc = new TaxCalculatorPage(page);
    await calc.goto();
    await calc.calculate('100000', '2022');

    // Network abort → error state (may take time due to retries)
    await expect(calc.errorAlert.or(calc.emptyState)).toBeVisible({
      timeout: 30_000,
    });
  });

  test('handles 503 Service Unavailable', async ({ page }) => {
    await page.route('**/api/tax-calculator/**', route =>
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ errors: [{ message: 'Service down' }] }),
      }),
    );

    const calc = new TaxCalculatorPage(page);
    await calc.goto();
    await calc.calculate('100000', '2022');

    await expect(calc.errorAlert).toBeVisible({ timeout: 30_000 });
    await expect(calc.page.getByTestId('error-title')).toBeVisible();
  });
});

test.describe('Edge Cases — Large Values', () => {
  test('handles very large salary ($999,999,999)', async ({ page }) => {
    await page.route('**/api/tax-calculator/**', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          tax_brackets: [
            { min: 0, max: 50197, rate: 0.15 },
            { min: 50197, max: 100392, rate: 0.205 },
            { min: 100392, max: 155625, rate: 0.26 },
            { min: 155625, max: 221708, rate: 0.29 },
            { min: 221708, rate: 0.33 },
          ],
        }),
      }),
    );

    const calc = new TaxCalculatorPage(page);
    await calc.goto();
    await calc.calculate('999,999,999', '2022');

    await expect(calc.resultsSection).toBeVisible({ timeout: 15_000 });
    // Should render without NaN or Infinity
    const pageText = await calc.page.textContent('body');
    expect(pageText).not.toContain('NaN');
    expect(pageText).not.toContain('Infinity');
  });

  test('handles very small salary ($0.01)', async ({ page }) => {
    await page.route('**/api/tax-calculator/**', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          tax_brackets: [{ min: 0, max: 50197, rate: 0.15 }],
        }),
      }),
    );

    const calc = new TaxCalculatorPage(page);
    await calc.goto();
    await calc.calculate('0.01', '2022');

    await expect(calc.resultsSection).toBeVisible({ timeout: 15_000 });
  });
});

test.describe('Edge Cases — State Transitions', () => {
  test('error clears when new successful calculation arrives', async ({
    page,
  }) => {
    // Use 404 (not 500) to avoid 3x1s retry delays
    await page.route('**/api/tax-calculator/**', route =>
      route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({
          errors: [{ message: 'Not found', code: 'NOT_FOUND' }],
        }),
      }),
    );

    const calc = new TaxCalculatorPage(page);
    await calc.goto();
    await calc.calculate('100000', '2022');

    await expect(calc.errorAlert).toBeVisible({ timeout: 15_000 });

    // Switch to success response and recalculate
    await page.unroute('**/api/tax-calculator/**');
    await page.route('**/api/tax-calculator/**', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          tax_brackets: [{ min: 0, max: 50197, rate: 0.15 }],
        }),
      }),
    );

    await calc.calculate('100000', '2022');
    await expect(calc.resultsSection).toBeVisible({ timeout: 15_000 });
  });
});
