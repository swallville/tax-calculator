// `Intl.NumberFormat` instances are expensive to construct because they resolve
// locale data and ICU collation tables on creation. Hoisting them to module
// scope means the cost is paid once per module load rather than on every render
// or calculation cycle.

const currencyFormatter = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const percentFormatter = new Intl.NumberFormat('en-CA', {
  style: 'percent',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Formats a numeric amount as a Canadian dollar currency string.
 *
 * Uses `en-CA` locale so the output matches the expected `$1,234.56` pattern
 * for the Canadian market. Always renders exactly two decimal places.
 *
 * @param amount - Numeric value in CAD.
 * @returns Locale-formatted currency string (e.g. `"$1,234.56"`).
 */
export function formatCurrency(amount: number): string {
  return currencyFormatter.format(amount);
}

/**
 * Formats a decimal rate as a percentage string.
 *
 * The `Intl.NumberFormat` `'percent'` style multiplies the input by 100
 * automatically, so pass the raw decimal (e.g. `0.205` → `"20.50%"`).
 *
 * @param rate - Rate as a decimal fraction (e.g. `0.205` for 20.5 %).
 * @returns Locale-formatted percentage string (e.g. `"20.50%"`).
 */
export function formatPercent(rate: number): string {
  return percentFormatter.format(rate);
}
