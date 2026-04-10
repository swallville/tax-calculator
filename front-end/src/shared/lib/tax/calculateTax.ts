import type { BandBreakdown, TaxBracket, TaxCalculationResult } from './types';

/**
 * Computes federal or provincial marginal tax for a given annual salary
 * against an ordered array of tax brackets.
 *
 * The algorithm is bracket-agnostic: it works with any contiguous or
 * non-contiguous bracket set returned by the API, applying each band
 * independently rather than relying on sorted order.
 *
 * @param salary   - Annual gross income in CAD. Must be a positive finite number.
 * @param brackets - Marginal tax brackets, each with `min`, optional `max`, and `rate`.
 * @returns Zero-value result for invalid inputs; otherwise total tax, effective
 *          rate, and a per-band breakdown.
 */
export function calculateTax(
  salary: number,
  brackets: TaxBracket[],
): TaxCalculationResult {
  // Guard against NaN, Infinity, negative values, and empty bracket lists —
  // all of which would produce meaningless or unsafe arithmetic below.
  if (!Number.isFinite(salary) || salary <= 0 || brackets.length === 0) {
    return { totalTax: 0, effectiveRate: 0, bands: [] };
  }

  const bands: BandBreakdown[] = brackets.map(bracket => {
    const { min, max, rate } = bracket;
    const upper = max ?? Infinity;

    // `Math.min(salary, upper) - Math.min(salary, min)` is the idiomatic way
    // to compute taxable income within a band without assuming brackets are
    // contiguous or sorted. If the salary falls below `min`, both operands
    // equal `salary` and the subtraction yields 0. If the salary exceeds
    // `upper`, `Math.min(salary, upper)` clamps to the band ceiling.
    const taxableInBand = Math.max(
      0,
      Math.min(salary, upper) - Math.min(salary, min),
    );

    // Round each band to the nearest cent individually to avoid accumulating
    // floating-point drift across many bands before the final summation.
    const tax = Math.round(taxableInBand * rate * 100) / 100;
    return { min, max, rate, tax };
  });

  const totalTax = bands.reduce((sum, band) => sum + band.tax, 0);
  const effectiveRate = totalTax / salary;

  return {
    // Re-round the summed total to absorb any residual cent-level drift from
    // per-band rounding.
    totalTax: Math.round(totalTax * 100) / 100,
    // 4 decimal places gives 2 significant digits when displayed as a percentage
    // (e.g. 0.2053 → "20.53 %").
    effectiveRate: Math.round(effectiveRate * 10000) / 10000,
    bands,
  };
}
