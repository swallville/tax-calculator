import { createPersistedStore } from '#/shared/lib/store';

import { $taxBrackets } from './model/store';
import type { TaxBracketsStore } from './types';

/**
 * 2 minutes matches the typical user session for a single calculation review.
 * Shorter than a full page session (30 min) because tax results are only
 * meaningful in the immediate context — stale data from an hour ago would
 * confuse rather than help.
 */
const TWO_MINUTES_MS = 2 * 60 * 1000;

/**
 * Key used to persist the tax-brackets store to localStorage. Kept as a
 * module-scope constant so the test-util and the production caller cannot
 * drift apart.
 */
const STORAGE_KEY = 'taxResults';

/**
 * Activates localStorage persistence for the `$taxBrackets` store with a
 * 2-minute TTL and PII sanitization (salary stripped before write).
 *
 * Must be called from a client-side effect boundary — `createPersistedStore`
 * reads `localStorage`, which does not exist on the server. The app's
 * `StoresPersistence` component wraps this call in a `useEffect` for that
 * reason.
 *
 * Encapsulates tax-brackets-specific persistence state (store reference,
 * TTL, sanitize rule) behind the entity's public barrel so consumers never
 * reach into `#/entities/tax-brackets/model/store` directly.
 */
export function persistTaxBracketsStore() {
  return createPersistedStore<TaxBracketsStore>($taxBrackets, STORAGE_KEY, {
    ttlMs: TWO_MINUTES_MS,
    sanitize: state => ({
      ...state,
      salary: 0, // Never persist salary (PII)
    }),
  });
}
