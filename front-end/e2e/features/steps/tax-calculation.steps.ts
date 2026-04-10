import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

import { TaxCalculatorPage } from '../../pages/tax-calculator.page';

const { Given, When, Then } = createBdd();

let calc: TaxCalculatorPage;

// --- Background ---

Given('I am on the tax calculator page', async ({ page }) => {
  calc = new TaxCalculatorPage(page);
  await calc.goto();
});

// --- Given (API mocking) ---

Given('the API returns a {int} error', async ({ page }, status: number) => {
  await page.route('**/api/tax-calculator/**', route =>
    route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify({
        errors: [
          {
            message: status === 404 ? 'Not found' : 'Database not found!',
            field: '',
            code: status === 404 ? 'NOT_FOUND' : 'INTERNAL_SERVER_ERROR',
          },
        ],
      }),
    }),
  );
});

// --- When (user actions) ---

When('I enter {string} as my annual income', async ({}, salary: string) => {
  await calc.salaryInput.fill(salary);
});

When('I select {string} as the tax year', async ({}, year: string) => {
  await calc.yearSelect.selectOption(year);
});

When('I click the calculate button', async () => {
  await calc.calculateButton.click();
});

When('I click the calculate button without entering a salary', async () => {
  await calc.calculateButton.click();
});

When('I click the retry button', async () => {
  await calc.retryButton.click();
});

// --- Then (assertions) ---

Then('I should see the empty state message', async () => {
  await expect(calc.emptyState).toBeVisible();
});

Then('I should not see the tax breakdown', async () => {
  await expect(calc.taxBreakdown).not.toBeVisible();
});

Then('I should see the tax breakdown', async () => {
  await expect(calc.taxBreakdown).toBeVisible({ timeout: 30_000 });
});

Then(
  'I should see the tax breakdown with {int} bracket rows',
  async ({}, count: number) => {
    await expect(calc.taxBreakdown).toBeVisible({ timeout: 30_000 });
    const rows = calc.page.locator("[data-testid^='band-row-']");
    await expect(rows).toHaveCount(count);
  },
);

Then('I should see the effective tax rate', async () => {
  await expect(calc.page.getByTestId('effective-rate')).toBeVisible();
});

Then(
  'I should see the error state with {string}',
  async ({}, errorTitle: string) => {
    await expect(calc.errorState).toBeVisible({ timeout: 30_000 });
    await expect(calc.page.getByText(errorTitle)).toBeVisible();
  },
);

Then('the retry button should be {word}', async ({}, visibility: string) => {
  if (visibility === 'visible') {
    await expect(calc.retryButton).toBeVisible();
  } else {
    await expect(calc.retryButton).not.toBeVisible();
  }
});

Then('I should see the retry button', async () => {
  await expect(calc.retryButton).toBeVisible();
});

Then('I should not see the retry button', async () => {
  await expect(calc.retryButton).not.toBeVisible();
});

Then('I should see a salary validation error', async () => {
  await expect(calc.salaryError).toBeVisible({ timeout: 5_000 });
});

Then('I should see either results or an error', async () => {
  await expect(calc.taxBreakdown.or(calc.errorState)).toBeVisible({
    timeout: 30_000,
  });
});
