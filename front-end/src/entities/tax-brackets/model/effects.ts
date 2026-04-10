import { cache, createQuery, retry } from '@farfetched/core';
import { createEffect } from 'effector';

import { ApiError, apiClient } from '#/shared/api';
import { logger } from '#/shared/lib/logger';

import { TaxBracketsResponseContract } from './apiSchema';
import type { TaxBracketsResponse } from './apiSchema';

/**
 * Low-level Effector effect that performs the HTTP request.
 *
 * Kept separate from `taxBracketsQuery` so it can be referenced by `retry()`
 * and tested in isolation without the Farfetched query wrapper.
 * The logger call here captures request intent; response validation logging
 * is handled by the Zod contract inside the query.
 */
export const fetchTaxBracketsFx = createEffect(
  async (year: number): Promise<TaxBracketsResponse> => {
    logger.info({ year }, 'Fetching tax brackets');
    return apiClient<TaxBracketsResponse>({
      url: `/api/tax-calculator/tax-year/${year}`,
    });
  },
);

/**
 * Farfetched query wrapping the fetch effect with contract validation.
 *
 * Using `createQuery` rather than a bare effect gives us:
 * - Automatic `$status` tracking ('initial' | 'pending' | 'done' | 'fail')
 * - `finished.success` / `finished.failure` events for reactive wiring
 * - Zod contract enforcement before data reaches application logic
 */
export const taxBracketsQuery = createQuery({
  effect: fetchTaxBracketsFx,
  contract: TaxBracketsResponseContract,
  name: 'taxBracketsQuery',
});

// 5-minute stale-while-revalidate cache keyed by the `year` parameter.
// Tax brackets for a given year are static — they never change mid-session —
// so the TTL is generous. This eliminates redundant API calls when the user
// recalculates the same year multiple times.
cache(taxBracketsQuery, { staleAfter: '5m' });

retry(taxBracketsQuery, {
  times: 3,
  // 1 second between attempts gives transient 5xx errors time to resolve
  // without making the UI feel frozen.
  delay: 1000,
  filter: ({ error }) => {
    // Only retry server errors (5xx) — client errors (4xx) are deterministic
    // and retrying them would waste quota and delay the user seeing the error.
    if (error instanceof ApiError && error.status >= 500) {
      // Log only on actual retry (inside the filter predicate returning true)
      // to avoid noisy entries for 4xx failures that pass through the filter
      // returning false without triggering a retry.
      logger.info({ status: error.status }, 'Retrying after server error');
      return true;
    }
    return false;
  },
});
