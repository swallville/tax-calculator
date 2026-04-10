/**
 * State consistency tests for the $taxBrackets Effector store.
 *
 * These tests verify that the store remains in a valid, consistent state
 * after multi-step sequences of events — not just individual handler
 * mutations. They catch bugs where one event's side-effect leaves the
 * store in a contradictory state (e.g., results + error both present,
 * or stale salary after a year change).
 */
import { fork, allSettled } from 'effector';

import { ApiError } from '#/shared/api';

import { fetchTaxBracketsFx } from './effects';
import {
  calculateRequested,
  setBrackets,
  setError,
  resetResults,
} from './events';
import { $taxBrackets, INITIAL_DATA } from './store';
import './samples';

const MOCK_BRACKETS = {
  tax_brackets: [
    { min: 0, max: 50197, rate: 0.15 },
    { min: 50197, max: 100392, rate: 0.205 },
    { min: 100392, max: 155625, rate: 0.26 },
    { min: 155625, max: 221708, rate: 0.29 },
    { min: 221708, rate: 0.33 },
  ],
};

/**
 * Helper: asserts the store is in a valid state — results and errors
 * should never coexist.
 */
function assertStateConsistency(state: typeof INITIAL_DATA) {
  // If there's an error, results should be cleared
  if (state.error !== null) {
    expect(state.totalTax).toBe(0);
    expect(state.effectiveRate).toBe(0);
    expect(state.bands).toEqual([]);
    expect(state.errorType).not.toBeNull();
  }

  // If there are results, there should be no error
  if (state.bands.length > 0) {
    expect(state.error).toBeNull();
    expect(state.errorType).toBeNull();
    expect(state.totalTax).toBeGreaterThan(0);
  }

  // effectiveRate should match totalTax relationship
  if (state.totalTax > 0 && state.salary > 0) {
    expect(state.effectiveRate).toBeGreaterThan(0);
    expect(state.effectiveRate).toBeLessThanOrEqual(1);
  }
}

describe('state consistency', () => {
  describe('success → error transition', () => {
    it('clears all results when error follows success', async () => {
      const scope = fork({
        handlers: [[fetchTaxBracketsFx, () => Promise.resolve(MOCK_BRACKETS)]],
      });

      // Step 1: successful calculation
      await allSettled(calculateRequested, {
        scope,
        params: { salary: 100000, year: 2022 },
      });

      let state = scope.getState($taxBrackets);
      expect(state.totalTax).toBeGreaterThan(0);
      expect(state.error).toBeNull();
      assertStateConsistency(state);

      // Step 2: error replaces results
      await allSettled(setError, {
        scope,
        params: { error: 'Server failed', errorType: 'server_error' },
      });

      state = scope.getState($taxBrackets);
      expect(state.error).toBe('Server failed');
      expect(state.totalTax).toBe(0);
      expect(state.bands).toEqual([]);
      assertStateConsistency(state);
    });
  });

  describe('error → success transition', () => {
    it('clears error when successful results arrive', async () => {
      const scope = fork({
        values: [
          [
            $taxBrackets,
            {
              ...INITIAL_DATA,
              salary: 100000,
              year: 2022,
              error: 'Previous error',
              errorType: 'server_error' as const,
            },
          ],
        ],
      });

      await allSettled(setBrackets, {
        scope,
        params: {
          totalTax: 17739.17,
          effectiveRate: 0.1774,
          bands: [{ min: 0, max: 50197, rate: 0.15, tax: 7529.55 }],
        },
      });

      const state = scope.getState($taxBrackets);
      expect(state.error).toBeNull();
      expect(state.errorType).toBeNull();
      expect(state.totalTax).toBe(17739.17);
      assertStateConsistency(state);
    });
  });

  describe('calculateRequested clears stale error before fetch', () => {
    it('removes previous error immediately on new request', async () => {
      let resolveFetch!: (v: typeof MOCK_BRACKETS) => void;
      const fetchPromise = new Promise<typeof MOCK_BRACKETS>(
        resolve => (resolveFetch = resolve),
      );

      const scope = fork({
        values: [
          [
            $taxBrackets,
            {
              ...INITIAL_DATA,
              error: 'Stale error',
              errorType: 'not_found' as const,
            },
          ],
        ],
        handlers: [[fetchTaxBracketsFx, () => fetchPromise]],
      });

      // Start the request (don't await)
      const settled = allSettled(calculateRequested, {
        scope,
        params: { salary: 75000, year: 2021 },
      });

      await Promise.resolve(); // flush synchronous store update

      // Mid-flight: error should be cleared, salary/year should be updated
      const midState = scope.getState($taxBrackets);
      expect(midState.error).toBeNull();
      expect(midState.errorType).toBeNull();
      expect(midState.salary).toBe(75000);
      expect(midState.year).toBe(2021);

      resolveFetch(MOCK_BRACKETS);
      await settled;

      assertStateConsistency(scope.getState($taxBrackets));
    });
  });

  describe('resetResults preserves input state', () => {
    it('keeps salary and year after reset', async () => {
      const scope = fork({
        handlers: [[fetchTaxBracketsFx, () => Promise.resolve(MOCK_BRACKETS)]],
      });

      await allSettled(calculateRequested, {
        scope,
        params: { salary: 120000, year: 2021 },
      });

      // Verify results exist
      let state = scope.getState($taxBrackets);
      expect(state.totalTax).toBeGreaterThan(0);

      // Reset
      await allSettled(resetResults, { scope });

      state = scope.getState($taxBrackets);
      expect(state.salary).toBe(120000);
      expect(state.year).toBe(2021);
      expect(state.totalTax).toBe(0);
      expect(state.bands).toEqual([]);
      expect(state.error).toBeNull();
      assertStateConsistency(state);
    });
  });

  describe('sequential calculations update correctly', () => {
    it('second calculation replaces first result entirely', async () => {
      const scope = fork({
        handlers: [[fetchTaxBracketsFx, () => Promise.resolve(MOCK_BRACKETS)]],
      });

      // First calculation
      await allSettled(calculateRequested, {
        scope,
        params: { salary: 50000, year: 2022 },
      });

      const firstState = scope.getState($taxBrackets);
      const firstTotalTax = firstState.totalTax;
      expect(firstTotalTax).toBeGreaterThan(0);

      // Second calculation with different salary
      await allSettled(calculateRequested, {
        scope,
        params: { salary: 100000, year: 2022 },
      });

      const secondState = scope.getState($taxBrackets);
      expect(secondState.salary).toBe(100000);
      expect(secondState.totalTax).not.toBe(firstTotalTax);
      expect(secondState.totalTax).toBeGreaterThan(firstTotalTax);
      assertStateConsistency(secondState);
    });

    it('changing year updates results for new brackets', async () => {
      const scope = fork({
        handlers: [[fetchTaxBracketsFx, () => Promise.resolve(MOCK_BRACKETS)]],
      });

      await allSettled(calculateRequested, {
        scope,
        params: { salary: 100000, year: 2022 },
      });

      const year2022State = scope.getState($taxBrackets);
      expect(year2022State.year).toBe(2022);
      assertStateConsistency(year2022State);

      await allSettled(calculateRequested, {
        scope,
        params: { salary: 100000, year: 2021 },
      });

      const year2021State = scope.getState($taxBrackets);
      expect(year2021State.year).toBe(2021);
      expect(year2021State.salary).toBe(100000);
      expect(year2021State.year).not.toBe(year2022State.year);
      assertStateConsistency(year2021State);
    });
  });

  describe('error type preservation', () => {
    it('404 error preserves not_found type through full flow', async () => {
      const scope = fork({
        handlers: [
          [
            fetchTaxBracketsFx,
            () => Promise.reject(new ApiError(404, 'Not Found')),
          ],
        ],
      });

      await allSettled(calculateRequested, {
        scope,
        params: { salary: 100000, year: 2018 },
      });

      const state = scope.getState($taxBrackets);
      expect(state.errorType).toBe('not_found');
      expect(state.salary).toBe(100000);
      expect(state.year).toBe(2018);
      assertStateConsistency(state);
    });
  });

  describe('scope isolation', () => {
    it('parallel forks do not interfere with each other', async () => {
      const scope1 = fork({
        handlers: [[fetchTaxBracketsFx, () => Promise.resolve(MOCK_BRACKETS)]],
      });

      // Use 404 (not 500) because 500 triggers retry with real timers
      const scope2 = fork({
        handlers: [
          [
            fetchTaxBracketsFx,
            () => Promise.reject(new ApiError(404, 'Not Found')),
          ],
        ],
      });

      await allSettled(calculateRequested, {
        scope: scope1,
        params: { salary: 50000, year: 2022 },
      });

      await allSettled(calculateRequested, {
        scope: scope2,
        params: { salary: 100000, year: 2018 },
      });

      // Allow microtask queue to flush so sample wiring completes
      await new Promise(r => setTimeout(r, 50));

      const state1 = scope1.getState($taxBrackets);
      const state2 = scope2.getState($taxBrackets);

      // Scope 1 has results, scope 2 has error — no cross-contamination
      expect(state1.totalTax).toBeGreaterThan(0);
      expect(state1.error).toBeNull();
      assertStateConsistency(state1);

      expect(state2.error).not.toBeNull();
      expect(state2.totalTax).toBe(0);
      assertStateConsistency(state2);
    });
  });

  describe('full lifecycle', () => {
    it('initial → calculate → success → reset → calculate → error → retry success', async () => {
      let callCount = 0;

      const scope = fork({
        handlers: [
          [
            fetchTaxBracketsFx,
            () => {
              callCount++;
              // First call succeeds, second fails (404 — no retry), third succeeds
              if (callCount === 2) {
                return Promise.reject(new ApiError(404, 'Not Found'));
              }
              return Promise.resolve(MOCK_BRACKETS);
            },
          ],
        ],
      });

      // Step 1: initial state
      let state = scope.getState($taxBrackets);
      expect(state).toEqual(INITIAL_DATA);

      // Step 2: first successful calculation
      await allSettled(calculateRequested, {
        scope,
        params: { salary: 100000, year: 2022 },
      });
      state = scope.getState($taxBrackets);
      expect(state.totalTax).toBeGreaterThan(0);
      expect(state.error).toBeNull();
      assertStateConsistency(state);

      // Step 3: reset
      await allSettled(resetResults, { scope });
      state = scope.getState($taxBrackets);
      expect(state.totalTax).toBe(0);
      expect(state.salary).toBe(100000);
      assertStateConsistency(state);

      // Step 4: simulate error arriving (tests state transition, not query timing)
      await allSettled(setError, {
        scope,
        params: { error: 'Unsupported tax year', errorType: 'not_found' },
      });
      state = scope.getState($taxBrackets);
      expect(state.errorType).toBe('not_found');
      expect(state.salary).toBe(100000); // preserved from step 3 reset
      assertStateConsistency(state);

      // Step 5: retry with valid year succeeds
      await allSettled(calculateRequested, {
        scope,
        params: { salary: 80000, year: 2021 },
      });
      state = scope.getState($taxBrackets);
      expect(state.totalTax).toBeGreaterThan(0);
      expect(state.error).toBeNull();
      expect(state.salary).toBe(80000);
      expect(state.year).toBe(2021);
      assertStateConsistency(state);
    });
  });
});
