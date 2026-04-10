import { useUnit } from 'effector-react';

import { taxBracketsQuery } from './effects';
import { calculateRequested, resetResults } from './events';
import { $taxBrackets } from './store';

/**
 * Selector hooks for the `$taxBrackets` store and related units.
 *
 * Each selector uses `$taxBrackets.map(fn)` to derive a focused derived store
 * rather than subscribing components to the full store object. This means a
 * component using `useBands()` only re-renders when `bands` changes — not when
 * `salary`, `year`, or `isPending` changes. Granular subscriptions are
 * critical for avoiding unnecessary re-renders in the results table.
 *
 * Action selectors (`useCalculateRequested`, `useResetResults`) expose bound
 * event dispatchers so components stay decoupled from the Effector model import
 * path — they consume selectors, not raw events.
 */
export const selectors = {
  /** Total tax owed; re-renders only when this value changes. */
  useTotalTax: () => useUnit($taxBrackets.map(s => s.totalTax)),

  /** Effective tax rate (0–1); re-renders only when this value changes. */
  useEffectiveRate: () => useUnit($taxBrackets.map(s => s.effectiveRate)),

  /** Per-band breakdown array; re-renders only on reference change. */
  useBands: () => useUnit($taxBrackets.map(s => s.bands)),

  /** Human-readable error string; null when no error. */
  useError: () => useUnit($taxBrackets.map(s => s.error)),

  /** Structured error category for conditional UI rendering. */
  useErrorType: () => useUnit($taxBrackets.map(s => s.errorType)),

  /** Selected tax year; used to display context alongside results. */
  useYear: () => useUnit($taxBrackets.map(s => s.year)),

  /** Salary at time of last calculation; used to display context. */
  useSalary: () => useUnit($taxBrackets.map(s => s.salary)),

  /**
   * True while the query is in-flight.
   *
   * Derived from `taxBracketsQuery.$status` (not a store field) because
   * pending state is owned by the query, not the domain store. Mapping to a
   * boolean spares components from importing the status union type.
   */
  useIsPending: () =>
    useUnit(taxBracketsQuery.$status.map(s => s === 'pending')),

  /** Bound dispatcher for `calculateRequested` — triggers the full fetch+calculate flow. */
  useCalculateRequested: () => useUnit(calculateRequested),

  /** Bound dispatcher for `resetResults` — clears results without affecting form inputs. */
  useResetResults: () => useUnit(resetResults),
};
