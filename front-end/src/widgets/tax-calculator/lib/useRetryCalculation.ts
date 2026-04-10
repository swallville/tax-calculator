'use client';
import { useCallback } from 'react';

import { selectors } from '#/entities/tax-brackets';

/**
 * Provides a stable retry callback that re-dispatches `calculateRequested`
 * with the most recently stored salary and year.
 *
 * Decouples ErrorState from knowing how to construct the retry payload —
 * the hook reads from the Effector store so the component only needs to
 * call `retry()` without passing any arguments.
 */
export function useRetryCalculation() {
  const calculateRequested = selectors.useCalculateRequested();
  const salary = selectors.useSalary();
  const year = selectors.useYear();

  const retry = useCallback(() => {
    calculateRequested({ salary, year });
  }, [calculateRequested, salary, year]);

  return retry;
}
