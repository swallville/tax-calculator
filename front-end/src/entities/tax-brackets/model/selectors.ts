import { useUnit } from 'effector-react';

import { taxBracketsQuery } from './effects';
import { calculateRequested, resetResults } from './events';
import { $taxBrackets } from './store';

/**
 * Selector hooks for the `$taxBrackets` store.
 *
 * Each selector reads from a **module-scoped derived store** so `.map()` runs
 * exactly once per selector, not once per render — hoisting avoids the
 * derived-store leak where repeated `.map()` calls add subscriber nodes to
 * the Effector graph on every render without releasing them.
 *
 * Granular subscriptions mean a component using `useBands()` re-renders only
 * when `bands` changes, not when `salary`/`year`/`isPending` change.
 *
 * Action selectors expose bound event dispatchers so components consume
 * selectors, not raw events.
 */

// Module-scoped derived stores — created once at import time, subscribers
// bound once per selector rather than once per render.
const $totalTax = $taxBrackets.map(s => s.totalTax);
const $effectiveRate = $taxBrackets.map(s => s.effectiveRate);
const $bands = $taxBrackets.map(s => s.bands);
const $error = $taxBrackets.map(s => s.error);
const $errorType = $taxBrackets.map(s => s.errorType);
const $year = $taxBrackets.map(s => s.year);
const $salary = $taxBrackets.map(s => s.salary);
// Pending state is owned by the query's `$status`, not the domain store —
// mapping to a boolean spares components from importing the status union.
const $isPending = taxBracketsQuery.$status.map(s => s === 'pending');

export const selectors = {
  /** Total tax owed; re-renders only when this value changes. */
  useTotalTax: () => useUnit($totalTax),

  /** Effective tax rate (0-1); re-renders only when this value changes. */
  useEffectiveRate: () => useUnit($effectiveRate),

  /** Per-band breakdown array; re-renders only on reference change. */
  useBands: () => useUnit($bands),

  /** Human-readable error string; null when no error. */
  useError: () => useUnit($error),

  /** Structured error category for conditional UI rendering. */
  useErrorType: () => useUnit($errorType),

  /** Selected tax year; used to display context alongside results. */
  useYear: () => useUnit($year),

  /** Salary at time of last calculation; used to display context. */
  useSalary: () => useUnit($salary),

  /** True while the query is in-flight. */
  useIsPending: () => useUnit($isPending),

  /** Bound dispatcher for `calculateRequested` — triggers the full fetch+calculate flow. */
  useCalculateRequested: () => useUnit(calculateRequested),

  /** Bound dispatcher for `resetResults` — clears results without affecting form inputs. */
  useResetResults: () => useUnit(resetResults),
};
