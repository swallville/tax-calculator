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
 * Rendered near the root of the server layout so the hydration effect runs
 * before any child reads from `$taxBrackets`.
 *
 * Uses `useEffect` rather than module-level setup because the factory
 * touches `localStorage`, which does not exist during SSR. The factory's
 * sanitize hook strips `salary` before writing — salary is PII.
 */
export function StoresPersistence({ children }: StoresPersistenceProps) {
  useEffect(() => {
    persistTaxBracketsStore();
  }, []);

  return <>{children}</>;
}
