/**
 * A single marginal tax bracket as returned by the tax-rates API.
 *
 * `max` is omitted for the top bracket, which extends to infinity.
 * Boundaries are inclusive on the lower end and exclusive on the upper end,
 * matching standard Canadian federal/provincial bracket conventions.
 */
export interface TaxBracket {
  min: number;
  /** Absent on the highest bracket — treated as `Infinity` during calculation. */
  max?: number;
  /** Marginal rate expressed as a decimal fraction (e.g. `0.205` for 20.5 %). */
  rate: number;
}

/**
 * Per-band contribution to the total tax liability, enriched with the
 * resolved bounds for display in a breakdown table.
 */
export interface BandBreakdown {
  min: number;
  /** `undefined` when this is the top (open-ended) bracket. */
  max: number | undefined;
  /** Marginal rate for this band as a decimal fraction. */
  rate: number;
  /** Tax owed within this band, rounded to the nearest cent. */
  tax: number;
}

/**
 * Aggregated result of a full tax calculation for a given salary.
 */
export interface TaxCalculationResult {
  /** Sum of tax across all bands, rounded to the nearest cent. */
  totalTax: number;
  /** `totalTax / salary`, rounded to 4 decimal places for display as a percentage. */
  effectiveRate: number;
  /** Per-band breakdown in the same order as the source brackets array. */
  bands: BandBreakdown[];
}
