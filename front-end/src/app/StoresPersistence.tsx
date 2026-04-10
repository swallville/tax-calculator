// "use client" is required because this component calls useEffect, which
// is a client-only React hook. The server has no localStorage to hydrate.
'use client';
import { useEffect } from 'react';

import type { TaxBracketsStore } from '#/entities/tax-brackets';
import { $taxBrackets } from '#/entities/tax-brackets/model/store';
import { createPersistedStore } from '#/shared/lib/store';

// 2 minutes matches the typical user session for a single calculation review.
// Shorter than a full page session (30 min) because tax results are only
// meaningful in the immediate context — stale data from an hour ago would
// confuse rather than help.
const TWO_MINUTES_MS = 2 * 60 * 1000;

interface StoresPersistenceProps {
  children: React.ReactNode;
}

/**
 * Client-only boundary that wires Effector store persistence to localStorage.
 *
 * Rendered in the server layout so the hydration effect runs once at the top
 * of the component tree before any child reads from `$taxBrackets`.
 *
 * `useEffect` is used (rather than module-level setup) because
 * `createPersistedStore` calls `localStorage`, which does not exist on the
 * server. Deferring to `useEffect` guarantees execution only after hydration
 * on the client, preventing SSR crashes.
 *
 * The `sanitize` function strips the salary field before it ever reaches
 * storage — salary is PII and must not be written to localStorage even
 * transiently, in compliance with the project logging policy.
 */
export function StoresPersistence({ children }: StoresPersistenceProps) {
  useEffect(() => {
    createPersistedStore<TaxBracketsStore>($taxBrackets, 'taxResults', {
      ttlMs: TWO_MINUTES_MS,
      sanitize: state => ({
        ...state,
        salary: 0, // Never persist salary (PII)
      }),
    });
  }, []);

  return <>{children}</>;
}
