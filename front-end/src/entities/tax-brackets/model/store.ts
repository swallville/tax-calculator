import { createStore } from 'effector';

import type { TaxBracketsStore } from '../types';

import { DEFAULT_YEAR } from './apiSchema';
import {
  calculateRequested,
  resetResults,
  setBrackets,
  setError,
} from './events';

/**
 * Canonical zero-state for the tax brackets store.
 *
 * Exported so tests can reset the store via `fork({ values: [[store, INITIAL_DATA]] })`
 * without reimplementing the default shape.
 */
export const INITIAL_DATA: TaxBracketsStore = {
  salary: 0,
  year: DEFAULT_YEAR,
  totalTax: 0,
  effectiveRate: 0,
  bands: [],
  error: null,
  errorType: null,
};

/**
 * Single source of truth for all tax bracket state.
 *
 * Named `$taxBrackets` following Effector's `$` prefix convention for stores.
 * Consumed via `selectors.ts` to keep component subscriptions granular.
 */
export const $taxBrackets = createStore<TaxBracketsStore>(INITIAL_DATA, {
  name: 'taxBrackets',
});

// Successful fetch: write results and clear any prior error atomically.
// Clearing error here (not in a separate handler) prevents a render cycle
// where results and a stale error are briefly visible at the same time.
$taxBrackets.on(setBrackets, (state, { totalTax, effectiveRate, bands }) => ({
  ...state,
  totalTax,
  effectiveRate,
  bands,
  error: null,
  errorType: null,
}));

// Failed fetch: preserve salary/year so the user can retry without re-entering
// them, but zero out results to avoid showing stale successful data alongside
// a new error message.
$taxBrackets.on(setError, (state, { error, errorType }) => ({
  ...state,
  error,
  errorType,
  totalTax: 0,
  effectiveRate: 0,
  bands: [],
}));

// Manual reset: clear results and errors but keep salary/year so the form
// fields stay populated — mirrors the UX of clearing a search result.
$taxBrackets.on(resetResults, state => ({
  ...state,
  totalTax: 0,
  effectiveRate: 0,
  bands: [],
  error: null,
  errorType: null,
}));

// Optimistic intent capture: store salary and year synchronously at request
// time. This is read by the success sample() in samples.ts — because the
// fetch is async, we cannot rely on the event payload still being in scope
// when the response arrives. Storing it here makes it reliably available.
$taxBrackets.on(calculateRequested, (state, { salary, year }) => ({
  ...state,
  salary,
  year,
  // Clear previous error so UI reflects "pending" state immediately.
  error: null,
  errorType: null,
}));
