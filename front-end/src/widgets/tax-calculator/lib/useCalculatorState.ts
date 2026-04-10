'use client';
import { selectors } from '#/entities/tax-brackets';

/**
 * Derives the calculator's display state from Effector selectors.
 *
 * Encapsulates the priority logic that determines which panel to show:
 * - `isPending` → LoadingState
 * - `hasError` → ErrorState
 * - `hasResults` → TaxBreakdown
 * - else → EmptyState
 *
 * Extracting this into a hook keeps page.tsx free of derived-state logic
 * and makes the priority order testable in isolation.
 */
export function useCalculatorState() {
  const isPending = selectors.useIsPending();
  const error = selectors.useError();
  const bands = selectors.useBands();

  const hasResults = bands.length > 0;
  const hasError = !!error;

  return { isPending, hasResults, hasError };
}
