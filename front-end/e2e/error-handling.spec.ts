import { test, expect } from '@playwright/test';

import { TaxCalculatorPage } from './pages/tax-calculator.page';

test.describe('Error Handling', () => {
  test('shows server error with retry button on forced 500', async ({
    page,
  }) => {
    // Intercept API calls and force 500 to test error UI deterministically
    await page.route('**/api/tax-calculator/**', route =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          errors: [
            {
              message: 'Database not found!',
              field: '',
              code: 'INTERNAL_SERVER_ERROR',
            },
          ],
        }),
      }),
    );

    const calc = new TaxCalculatorPage(page);
    await calc.goto();
    await calc.calculate('100000', '2022');

    // Wait for retry cycle to exhaust (3 retries × 1s delay = ~3-4s)
    await expect(calc.errorAlert).toBeVisible({ timeout: 30_000 });
    await expect(calc.page.getByTestId('error-title')).toBeVisible();
    await expect(calc.retryButton).toBeVisible();
  });

  test('retry button triggers new calculation after error', async ({
    page,
  }) => {
    let callCount = 0;

    await page.route('**/api/tax-calculator/**', route => {
      callCount++;
      if (callCount <= 4) {
        // First batch: force 500 (1 original + 3 retries)
        return route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            errors: [
              {
                message: 'Database not found!',
                field: '',
                code: 'INTERNAL_SERVER_ERROR',
              },
            ],
          }),
        });
      }
      // After retry click: return success
      return route.fulfill({
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
      });
    });

    const calc = new TaxCalculatorPage(page);
    await calc.goto();
    await calc.calculate('100000', '2022');

    await expect(calc.errorAlert).toBeVisible({ timeout: 30_000 });
    await calc.retryButton.click();

    // Should show results after retry succeeds
    await expect(calc.resultsSection).toBeVisible({ timeout: 30_000 });
  });

  test('not_found error shows without retry button on 404', async ({
    page,
  }) => {
    // Force a 404 response
    await page.route('**/api/tax-calculator/**', route =>
      route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({
          errors: [
            { message: 'That url was not found', field: '', code: 'NOT_FOUND' },
          ],
        }),
      }),
    );

    const calc = new TaxCalculatorPage(page);
    await calc.goto();
    await calc.calculate('100000', '2022');

    await expect(calc.errorAlert).toBeVisible({ timeout: 15_000 });
    await expect(calc.page.getByTestId('error-title')).toBeVisible();
    // 404 should NOT show retry button
    await expect(calc.retryButton).not.toBeVisible();
  });
});
