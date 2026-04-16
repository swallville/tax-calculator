import type { BandBreakdown } from '#/shared/lib/tax';

// Re-exported so entity-internal modules can import domain types via
// `../types` without reaching into `#/shared/lib/tax` directly.
export type { BandBreakdown } from '#/shared/lib/tax';

/**
 * Discriminated error state for the tax brackets feature.
 *
 * `null` means no error; the two string literals allow consumers to render
 * distinct recovery UI (e.g. "try a different year" vs "try again later")
 * without inspecting raw error messages.
 */
export type ErrorType = 'server_error' | 'not_found' | null;

/**
 * Shape of the `$taxBrackets` Effector store.
 *
 * All calculation outputs are co-located so a single store update atomically
 * replaces the previous result — no risk of salary/totalTax desync.
 */
export interface TaxBracketsStore {
  /** Raw salary entered by the user, retained so re-renders can display it. */
  salary: number;
  /** Tax year selected by the user. */
  year: number;
  /** Total tax owed across all brackets. */
  totalTax: number;
  /** Total tax as a fraction of salary (0–1). */
  effectiveRate: number;
  /** Per-band breakdown used to render the results table. */
  bands: BandBreakdown[];
  /** Human-readable error message; null when no error is present. */
  error: string | null;
  /** Structured error category; drives conditional UI without string matching. */
  errorType: ErrorType;
}
