// "use client" is required because this component calls useEffect, which
// is a client-only React hook. The server has no localStorage to hydrate.
'use client';
import { useEffect } from 'react';

import { persistTaxBracketsStore } from '#/entities/tax-brackets';

interface StoresPersistenceProps {
  children: React.ReactNode;
}

/**
 * Client-only boundary that wires Effector store persistence to localStorage.
 *
 * Rendered in the server layout so the hydration effect runs once at the top
 * of the component tree before any child reads from `$taxBrackets`.
 *
 * `useEffect` is used (rather than module-level setup) because the
 * persistence factory calls `localStorage`, which does not exist on the
 * server. Deferring to `useEffect` guarantees execution only after hydration
 * on the client, preventing SSR crashes.
 *
 * The sanitize function (defined inside `persistTaxBracketsStore`) strips the
 * salary field before it ever reaches storage — salary is PII and must not
 * be written to localStorage even transiently, in compliance with the
 * project logging policy.
 *
 * Phase 8.5 architecture review flagged the previous version of this file
 * for reaching into `#/entities/tax-brackets/model/store` directly. The
 * persistence factory is now encapsulated behind the entity's public barrel,
 * so this component consumes a single named function and knows nothing about
 * the store shape, the TTL, the storage key, or the sanitize rule.
 */
export function StoresPersistence({ children }: StoresPersistenceProps) {
  useEffect(() => {
    persistTaxBracketsStore();
  }, []);

  return <>{children}</>;
}
