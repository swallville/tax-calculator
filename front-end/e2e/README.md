# E2E Tests

Playwright end-to-end tests for the Tax Calculator frontend. Tests run against
the full docker compose stack — real Next.js app talking to a real Flask backend
— so every test exercises the actual integration path.

See also: [front-end/README.md](../README.md)

---

## 1. Overview

The suite is configured in [`playwright.config.ts`](../playwright.config.ts) and
covers four browser projects:

| Project         | Device preset   |
| --------------- | --------------- |
| `chromium`      | Desktop Chrome  |
| `firefox`       | Desktop Firefox |
| `webkit`        | Desktop Safari  |
| `mobile-chrome` | Pixel 5         |

Tests run fully in parallel locally (`workers: undefined`). On CI workers are
serialised (`workers: 1`) and the retry count is raised to 2.

**Artifacts on failure**

| Artifact   | When captured                                   |
| ---------- | ----------------------------------------------- |
| Screenshot | Every failure (`screenshot: "only-on-failure"`) |
| Video      | First retry only (`video: "on-first-retry"`)    |
| Trace      | First retry only (`trace: "on-first-retry"`)    |

Artifacts land in `playwright-report/` and can be opened with
`npx playwright show-report`.

**Timeouts**

- Per-test hard limit: 60 s
- `expect` assertions: 15 s default (individual assertions may override this)
- `webServer` startup: 120 s

---

## 2. Running Tests

Docker services must be reachable on `http://localhost:3000` before invoking the
test runner. When `PLAYWRIGHT_REUSE_SERVER` is not set (the default for local
runs), Playwright will start `docker compose up --wait` automatically via the
`webServer` hook and reuse any already-running server. On CI the server is
always started fresh.

```bash
# Ensure the stack is up (first time, or after a restart)
docker compose up -d

# Run all specs against all four browser projects
npm run test:e2e

# Fastest feedback loop — Chromium only
npm run test:e2e:chromium

# Interactive Playwright UI with step-by-step trace viewer
npm run test:e2e:ui
```

---

## 3. Page Object Model

All locators and reusable interactions live in a single POM class:

**`pages/tax-calculator.page.ts`** — `TaxCalculatorPage`

### Locators

Two parallel sets of locators are maintained: ARIA-based locators are used as
the primary strategy; `data-testid` locators are supplementary for cases where
ARIA roles are ambiguous.

**ARIA-based locators**

| Property            | Selector strategy                                      |
| ------------------- | ------------------------------------------------------ |
| `salaryInput`       | `getByLabel("Annual Income")`                          |
| `yearSelect`        | `getByLabel("Tax Year")`                               |
| `calculateButton`   | `getByRole("button", { name: /Calculate/i })`          |
| `resultsSection`    | `getByLabel("Tax calculation results")`                |
| `errorAlert`        | `getByRole("alert")`                                   |
| `emptyState`        | `getByRole("status", { name: /No calculation yet/i })` |
| `loadingState`      | `getByRole("status", { name: /Loading/i })`            |
| `retryButton`       | `getByRole("button", { name: /Try Again/i })`          |
| `totalTaxCell`      | `locator("tfoot td").last()`                           |
| `effectiveRateText` | `getByText("Effective Rate")`                          |
| `skipLink`          | `getByRole("link", { name: /Skip to content/i })`      |

**`data-testid` locators**

| Property              | Selector                           |
| --------------------- | ---------------------------------- |
| `salaryInputById`     | `[data-testid="salary-input"]`     |
| `yearSelectById`      | `[data-testid="year-select"]`      |
| `calculateButtonById` | `[data-testid="calculate-button"]` |
| `taxBreakdown`        | `[data-testid="tax-breakdown"]`    |
| `errorState`          | `[data-testid="error-state"]`      |
| `emptyStateById`      | `[data-testid="empty-state"]`      |
| `loadingStateById`    | `[data-testid="loading-state"]`    |
| `retryButtonById`     | `[data-testid="retry-button"]`     |
| `resultsPanel`        | `[data-testid="results-panel"]`    |
| `salaryError`         | `[data-testid="salary-error"]`     |
| `yearError`           | `[data-testid="year-error"]`       |

### Helper methods

```ts
// Navigate to the app root
await calc.goto();

// Fill salary, select year, click Calculate — one call
await calc.calculate('100000', '2022');

// Assert results section is visible (30 s timeout)
await calc.waitForResults();

// Assert error alert is visible (30 s timeout)
await calc.waitForError();

// Retry calculate() up to maxRetries times, dismissing any error between
// attempts. Throws if results never appear.
await calc.retryUntilSuccess('100000', '2022', (maxRetries = 5));
```

`retryUntilSuccess` is the correct helper to use in any test that is asserting
on a successful result, because the Flask backend deliberately returns random
500 errors (see section 6).

---

## 4. Test Specs

| File                      | What it covers                                                                                                                                                                                                                                                                                                      |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `happy-path.spec.ts`      | Initial empty state, successful calculations for multiple salary/year combinations, loading state appearance                                                                                                                                                                                                        |
| `error-handling.spec.ts`  | Server 500 response shows error UI with retry button; retry button triggers a new calculation; 404 response shows "Year Not Supported" without a retry button                                                                                                                                                       |
| `form-validation.spec.ts` | Empty salary triggers validation alert; salary input attributes (`type="text"`, `inputmode="decimal"`); year dropdown contains exactly the four valid years; button label changes to "Calculating..." while pending                                                                                                 |
| `accessibility.spec.ts`   | `<html lang="en-CA">`, `<main>` landmark, single `<h1>`, skip-to-content link, labelled form inputs, `role="status"` on empty state, `aria-live="polite"` + `aria-atomic="true"` on results section, `<thead>`/`<tbody>`/`<tfoot>` with scoped column headers, Tab key order                                        |
| `responsive.spec.ts`      | Mobile (375 x 812), tablet (768 x 1024), and desktop (1440 x 900) viewports render core elements                                                                                                                                                                                                                    |
| `security.spec.ts`        | XSS payload in salary field does not execute; security response headers (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Content-Security-Policy`); error messages do not leak stack traces or internal field names; salary value does not appear in `<script>` or `<meta>` tags after calculation |

---

## 5. Gherkin / BDD

The `features/` directory holds a Cucumber-style feature file and its step
definitions, wired up with
[`playwright-bdd`](https://github.com/vitalets/playwright-bdd).

```
e2e/features/
  tax-calculation.feature        # Human-readable scenarios
  steps/
    tax-calculation.steps.ts     # Step implementations (Given/When/Then)
```

### Feature file structure

`tax-calculation.feature` is organised around a `Background` step that navigates
to the page, followed by individual `Scenario` and `Scenario Outline` blocks.

**Scenario Outline with Examples**

A `Scenario Outline` is a template scenario that is executed once per row in its
`Examples` table. Angle-bracket placeholders (`<salary>`, `<year>`,
`<brackets>`) are substituted with the column values for each run.

```gherkin
Scenario Outline: Calculate tax for various salaries
  When I enter "<salary>" as my annual income
  And I select "<year>" as the tax year
  And I click the calculate button
  Then I should see the tax breakdown with <brackets> bracket rows

  Examples:
    | salary  | year | brackets |
    | 50000   | 2022 | 5        |
    | 100000  | 2022 | 5        |
    | 100000  | 2021 | 5        |
```

This produces three independent test cases from one template.

### Step definitions

Steps use `playwright-bdd`'s `createBdd()` factory, which provides `Given`,
`When`, and `Then` functions that receive the Playwright `{ page }` fixture as
their first argument.

Cucumber expression parameters (`{string}`, `{int}`, `{word}`) map directly to
TypeScript function parameters:

```ts
When('I enter {string} as my annual income', async ({}, salary: string) => {
  await calc.salaryInput.fill(salary);
});
```

### Adding a new scenario

1. Add a `Scenario` or `Scenario Outline` block to `tax-calculation.feature`.
2. If the scenario needs a step phrase that does not exist yet, add a matching
   `Given`/`When`/`Then` implementation in `steps/tax-calculation.steps.ts`.
3. Run `npm run test:e2e:chromium` to validate the new scenario in isolation
   before pushing.

---

## 6. Backend Reliability

The Flask backend is configured to inject random faults:

- **25% probability** of returning HTTP 500 on any request
- **0–5 s random delay** on every response

This is intentional — it simulates real-world unreliability and ensures the
frontend's retry logic is exercised continuously.

**Consequence for happy-path tests**: a single `calculate()` call may hit a 500.
Happy-path specs therefore always use `retryUntilSuccess()`, which loops up to
five times and dismisses any error before retrying, so the test eventually lands
on a successful result.

**Consequence for error-path tests**: a test that needs to assert on the error
UI cannot rely on the backend randomly returning a 500 — that would make the
test flaky. Error-handling and security specs use `page.route()` to intercept
all requests matching `**/api/tax-calculator/**` and return a deterministic
response:

```ts
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
```

`page.route()` intercepts at the network layer inside the browser context, so
the Next.js proxy and Effector retry logic both run as normal — the mocked 500
is seen by the app, not bypassed.

The app retries internally three times (3 × 1 s back-off) before surfacing an
error to the user. When a test forces all calls to 500, the retry cycle exhausts
in roughly 3–4 s before the error alert becomes visible.

---

## 7. Adding New Tests

Follow these steps to add a new E2E spec.

**Step 1 — Choose the right file or create a new one**

Add to an existing spec if the scenario belongs to an established concern (happy
path, error handling, accessibility, etc.). Create a new `<concern>.spec.ts`
file if the scenario is genuinely orthogonal.

**Step 2 — Import the POM**

```ts
import { test, expect } from '@playwright/test';
import { TaxCalculatorPage } from './pages/tax-calculator.page';
```

**Step 3 — Set up the page object**

For most specs, instantiate the POM in `beforeEach`:

```ts
test.describe("My New Concern", () => {
  let calc: TaxCalculatorPage;

  test.beforeEach(async ({ page }) => {
    calc = new TaxCalculatorPage(page);
    await calc.goto();
  });
```

For tests that need per-test route mocking, instantiate inside the `test`
callback instead so the mock is registered before navigation.

**Step 4 — Use the correct helper for the assertion type**

- Asserting on a successful result: use `calc.retryUntilSuccess()`.
- Asserting on an error state: use `page.route()` to force a deterministic
  500/404, then call `calc.calculate()` directly and `calc.waitForError()`.

**Step 5 — Add new locators to the POM if needed**

If the scenario requires a locator that does not exist on `TaxCalculatorPage`,
add it to `pages/tax-calculator.page.ts`. Prefer ARIA-based locators
(`getByRole`, `getByLabel`, `getByText`) over `data-testid`. Add the
`data-testid` attribute to the component only when ARIA targeting is genuinely
ambiguous.

**Step 6 — Run in isolation before committing**

```bash
npx playwright test e2e/<your-file>.spec.ts --project=chromium
```

Pass `--headed` to watch the browser if you need to debug locators.

**Step 7 — Verify all four browser projects pass**

```bash
npm run test:e2e
```
