import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object Model for the Tax Calculator page.
 *
 * Uses `data-testid` as the primary locator strategy because testids are
 * stable contracts between components and tests — they never change with
 * copy updates, CSS changes, or markup refactors. ARIA-based locators
 * (getByLabel, getByRole) are kept as secondary for tests that specifically
 * verify accessibility semantics.
 */
export class TaxCalculatorPage {
  readonly page: Page;

  // Primary locators (data-testid — stable across copy/markup changes)
  readonly salaryInput: Locator;
  readonly yearSelect: Locator;
  readonly calculateButton: Locator;
  readonly taxBreakdown: Locator;
  readonly errorState: Locator;
  readonly emptyState: Locator;
  readonly loadingState: Locator;
  readonly retryButton: Locator;
  readonly resultsPanel: Locator;
  readonly salaryError: Locator;
  readonly yearError: Locator;
  readonly errorTitle: Locator;
  readonly errorMessage: Locator;
  readonly totalRow: Locator;
  readonly effectiveRate: Locator;
  readonly skipLink: Locator;

  // Secondary locators (ARIA — used only in accessibility-specific tests)
  readonly mainLandmark: Locator;
  readonly calculateButtonByRole: Locator;

  // Aliases kept for backward compatibility with older specs
  readonly resultsSection: Locator; // alias for taxBreakdown
  readonly errorAlert: Locator; // alias for errorState
  readonly effectiveRateText: Locator; // alias for effectiveRate

  constructor(page: Page) {
    this.page = page;

    // Primary — data-testid based
    this.salaryInput = page.getByTestId('salary-input');
    this.yearSelect = page.getByTestId('year-select');
    this.calculateButton = page.getByTestId('calculate-button');
    this.taxBreakdown = page.getByTestId('tax-breakdown');
    this.errorState = page.getByTestId('error-state');
    this.emptyState = page.getByTestId('empty-state');
    this.loadingState = page.getByTestId('loading-state');
    this.retryButton = page.getByTestId('retry-button');
    this.resultsPanel = page.getByTestId('results-panel');
    this.salaryError = page.getByTestId('salary-error');
    this.yearError = page.getByTestId('year-error');
    this.errorTitle = page.getByTestId('error-title');
    this.errorMessage = page.getByTestId('error-message');
    this.totalRow = page.getByTestId('total-row');
    this.effectiveRate = page.getByTestId('effective-rate');
    this.skipLink = page.getByTestId('skip-link');

    // Secondary — ARIA-based for a11y tests
    this.mainLandmark = page.getByRole('main');
    this.calculateButtonByRole = page.getByRole('button', {
      name: /Calculate/i,
    });

    // Aliases for backward compatibility
    this.resultsSection = this.taxBreakdown;
    this.errorAlert = this.errorState;
    this.effectiveRateText = this.effectiveRate;
  }

  async goto() {
    await this.page.goto('/');
  }

  async calculate(salary: string, year: string) {
    await this.salaryInput.fill(salary);
    await this.yearSelect.selectOption(year);
    await this.calculateButton.click();
  }

  async waitForResults() {
    await expect(this.taxBreakdown).toBeVisible({ timeout: 30_000 });
  }

  async waitForError() {
    await expect(this.errorState).toBeVisible({ timeout: 30_000 });
  }

  /**
   * Retries calculation up to `maxRetries` times to handle the backend's
   * 25% random 500 failure rate. Used by happy-path tests that run against
   * the real Docker-composed backend.
   */
  async retryUntilSuccess(salary: string, year: string, maxRetries = 5) {
    for (let i = 0; i < maxRetries; i++) {
      await this.calculate(salary, year);
      try {
        await expect(this.taxBreakdown).toBeVisible({ timeout: 20_000 });
        return;
      } catch {
        const hasError = await this.errorState.isVisible().catch(() => false);
        if (hasError) {
          await this.retryButton.click().catch(() => {});
          continue;
        }
      }
    }
    throw new Error(`Failed to get results after ${maxRetries} retries`);
  }
}
