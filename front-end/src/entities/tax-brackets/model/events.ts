import { createEvent } from 'effector';

import type { BandBreakdown, ErrorType } from '../types';

// Naming convention:
//   - *Requested events carry user intent and trigger async side-effects via
//     sample() in samples.ts. They are the entry points for user actions.
//   - set* events carry derived data and update store state directly via .on()
//     in store.ts. They should only be dispatched from samples, never from UI.
//
// This split keeps UI components responsible for intent, not for deciding what
// data to write — that logic lives in samples and effects.

/**
 * Fired when the user submits the tax form.
 *
 * The payload captures the validated inputs so downstream samples can start
 * the API query and seed the store's salary/year without a second event.
 */
export const calculateRequested = createEvent<{
  salary: number;
  year: number;
}>('calculateRequested');

/**
 * Carries the calculation result back into the store after a successful fetch.
 *
 * Dispatched exclusively from `samples.ts` after Zod validation and tax
 * calculation have both succeeded — never dispatched directly from UI.
 */
export const setBrackets = createEvent<{
  totalTax: number;
  effectiveRate: number;
  bands: BandBreakdown[];
}>('setBrackets');

/**
 * Carries a structured error into the store when the query fails.
 *
 * `NonNullable<ErrorType>` enforces that callers always supply a category —
 * the store's `null` default is only valid before any request is made.
 */
export const setError = createEvent<{
  error: string;
  errorType: NonNullable<ErrorType>;
}>('setError');

/**
 * Resets all calculation outputs to their initial empty state.
 *
 * Intentionally preserves `salary` and `year` so the form fields remain
 * populated after a reset — only results and errors are cleared.
 */
export const resetResults = createEvent<void>('resetResults');
