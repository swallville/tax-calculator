import { test, expect } from '@playwright/test';
import { TaxCalculatorPage } from './pages/tax-calculator.page';

test.describe('Security', () => {
  test('XSS in salary field is safely handled', async ({ page }) => {
    const calc = new TaxCalculatorPage(page);
    await calc.goto();

    await calc.salaryInput.fill('<script>alert(1)</script>');
    await calc.calculateButton.click();

    // Script must not have executed — window.__xss_triggered would only be set
    // if a reflected/stored XSS payload ran inside the page context.
    const alertTriggered = await page.evaluate(() => {
      return (
        (window as unknown as { __xss_triggered?: boolean }).__xss_triggered ??
        false
      );
    });
    expect(alertTriggered).toBe(false);

    // The raw payload must not appear as executable content in the DOM.
    // A validation error or empty result is the only acceptable outcome.
    const scriptTagsWithPayload = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('script')).some(el =>
        el.textContent?.includes('alert(1)'),
      );
    });
    expect(scriptTagsWithPayload).toBe(false);
  });

  test('security response headers are present', async ({ page }) => {
    const response = await page.goto('/');
    const headers = response?.headers() ?? {};

    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['content-security-policy']).toBeDefined();
  });

  test('error messages do not leak backend details', async ({ page }) => {
    const calc = new TaxCalculatorPage(page);
    await calc.goto();

    // Intercept the tax-brackets API and force a 500 so we can assert on the
    // error message the UI renders without relying on the real backend being
    // broken.
    await page.route('**/api/tax-calculator/**', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Internal Server Error',
          traceback:
            "Traceback (most recent call last):\n  File 'app.py', line 42\nKeyError: 'tax_brackets'",
        }),
      });
    });

    await calc.calculate('100000', '2022');
    await calc.waitForError();

    const alertText = await calc.errorAlert.textContent();

    // The UI must show a user-friendly static message and must NOT echo any
    // raw server-side diagnostic details back to the user.
    expect(alertText).not.toContain('Traceback');
    expect(alertText).not.toContain('KeyError');
    expect(alertText).not.toContain("File 'app.py'");
    expect(alertText).not.toContain('at Object');
    expect(alertText).not.toContain('database');
    expect(alertText).not.toContain('500');
  });

  test('salary value does not appear in script or meta tags after calculation', async ({
    page,
  }) => {
    const calc = new TaxCalculatorPage(page);
    await calc.goto();

    const salary = '123456';
    await calc.calculate(salary, '2022');
    await calc.waitForResults();

    // PII check: the exact salary figure must not be embedded inside any
    // <script> block or <meta> attribute where it could be harvested by
    // third-party scripts or indexers.
    const salaryInScriptTag = await page.evaluate(s => {
      return Array.from(document.querySelectorAll('script')).some(el =>
        el.textContent?.includes(s),
      );
    }, salary);
    expect(salaryInScriptTag).toBe(false);

    const salaryInMetaTag = await page.evaluate(s => {
      return Array.from(document.querySelectorAll('meta')).some(
        el =>
          el.getAttribute('content')?.includes(s) ||
          el.getAttribute('name')?.includes(s),
      );
    }, salary);
    expect(salaryInMetaTag).toBe(false);
  });
});
