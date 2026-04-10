import { fork, allSettled } from 'effector';

import { fetchTaxBracketsFx } from './effects';
import {
  calculateRequested,
  setBrackets,
  setError,
  resetResults,
} from './events';
import { $taxBrackets, INITIAL_DATA } from './store';
import './samples'; // Import to activate sample wiring

const MOCK_BRACKETS = {
  tax_brackets: [
    { min: 0, max: 50197, rate: 0.15 },
    { min: 50197, max: 100392, rate: 0.205 },
    { min: 100392, max: 155625, rate: 0.26 },
    { min: 155625, max: 221708, rate: 0.29 },
    { min: 221708, rate: 0.33 },
  ],
};

describe('tax-brackets store', () => {
  describe('initial state', () => {
    it('starts with INITIAL_DATA', () => {
      const scope = fork();
      expect(scope.getState($taxBrackets)).toEqual(INITIAL_DATA);
    });
  });

  describe('setBrackets', () => {
    it('updates results and clears error', async () => {
      const scope = fork({
        values: [
          [
            $taxBrackets,
            {
              ...INITIAL_DATA,
              error: 'old error',
              errorType: 'server_error' as const,
            },
          ],
        ],
      });

      await allSettled(setBrackets, {
        scope,
        params: { totalTax: 7500, effectiveRate: 0.15, bands: [] },
      });

      const state = scope.getState($taxBrackets);
      expect(state.totalTax).toBe(7500);
      expect(state.effectiveRate).toBe(0.15);
      expect(state.error).toBeNull();
      expect(state.errorType).toBeNull();
    });
  });

  describe('setError', () => {
    it('sets error and clears results', async () => {
      const scope = fork({
        values: [
          [
            $taxBrackets,
            {
              ...INITIAL_DATA,
              totalTax: 7500,
              bands: [{ min: 0, max: 50197, rate: 0.15, tax: 7500 }],
            },
          ],
        ],
      });

      await allSettled(setError, {
        scope,
        params: { error: 'Server error', errorType: 'server_error' as const },
      });

      const state = scope.getState($taxBrackets);
      expect(state.error).toBe('Server error');
      expect(state.errorType).toBe('server_error');
      expect(state.totalTax).toBe(0);
      expect(state.bands).toEqual([]);
    });
  });

  describe('resetResults', () => {
    it('clears results and errors but keeps salary and year', async () => {
      const scope = fork({
        values: [
          [
            $taxBrackets,
            {
              ...INITIAL_DATA,
              salary: 100000,
              year: 2021,
              totalTax: 17739,
              error: 'some error',
              errorType: 'server_error' as const,
            },
          ],
        ],
      });

      await allSettled(resetResults, { scope });

      const state = scope.getState($taxBrackets);
      expect(state.salary).toBe(100000);
      expect(state.year).toBe(2021);
      expect(state.totalTax).toBe(0);
      expect(state.error).toBeNull();
      expect(state.errorType).toBeNull();
    });
  });

  describe('calculateRequested', () => {
    it('updates salary and year and clears error before fetch', async () => {
      // Provide a handler that stalls so we can observe the intermediate state
      // after the store update triggered by calculateRequested's .on() handler,
      // before the async fetch completes.
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
              error: 'old',
              errorType: 'server_error' as const,
            },
          ],
        ],
        handlers: [[fetchTaxBracketsFx, () => fetchPromise]],
      });

      // Start without awaiting so we can inspect mid-flight state
      const settled = allSettled(calculateRequested, {
        scope,
        params: { salary: 100000, year: 2022 },
      });

      // Flush microtasks so the synchronous store update is applied
      await Promise.resolve();

      const midState = scope.getState($taxBrackets);
      expect(midState.salary).toBe(100000);
      expect(midState.year).toBe(2022);
      expect(midState.error).toBeNull();

      // Let the effect complete so allSettled can resolve
      resolveFetch(MOCK_BRACKETS);
      await settled;
    });
  });

  describe('success flow (sample wiring)', () => {
    it('fetches brackets and calculates tax on calculateRequested', async () => {
      const scope = fork({
        handlers: [[fetchTaxBracketsFx, () => Promise.resolve(MOCK_BRACKETS)]],
      });

      await allSettled(calculateRequested, {
        scope,
        params: { salary: 100000, year: 2022 },
      });

      const state = scope.getState($taxBrackets);
      expect(state.totalTax).toBeGreaterThan(0);
      expect(state.effectiveRate).toBeGreaterThan(0);
      expect(state.bands.length).toBeGreaterThan(0);
      expect(state.error).toBeNull();
    });
  });

  describe('404 error flow', () => {
    it('sets not_found error on 404', async () => {
      const { ApiError } = await import('#/shared/api/client');

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
      expect(state.error).toContain('Unsupported');
    });
  });

  describe('500 error flow', () => {
    it('maps server error via setError directly', async () => {
      const { ApiError } = await import('#/shared/api/client');
      const { mapError } = await import('./errorMapping');

      const result = mapError(new ApiError(500, 'Internal Server Error'));
      expect(result.errorType).toBe('server_error');
      expect(result.error).toContain('try again');

      // Verify store handles the mapped error correctly
      const scope = fork();
      await allSettled(setError, { scope, params: result });

      const state = scope.getState($taxBrackets);
      expect(state.errorType).toBe('server_error');
      expect(state.error).toContain('try again');
      expect(state.totalTax).toBe(0);
      expect(state.bands).toEqual([]);
    });
  });

  describe('error mapping', () => {
    it('maps 404 to not_found', async () => {
      const { ApiError } = await import('#/shared/api/client');
      const { mapError } = await import('./errorMapping');

      const result = mapError(new ApiError(404, 'Not Found'));
      expect(result.errorType).toBe('not_found');
      expect(result.error).toContain('Unsupported');
    });

    it('maps 500+ to server_error', async () => {
      const { ApiError } = await import('#/shared/api/client');
      const { mapError } = await import('./errorMapping');

      const result = mapError(new ApiError(502, 'Bad Gateway'));
      expect(result.errorType).toBe('server_error');
      expect(result.error).toContain('try again');
    });

    it('maps unknown errors to server_error', async () => {
      const { mapError } = await import('./errorMapping');

      const result = mapError(new Error('network timeout'));
      expect(result.errorType).toBe('server_error');
      expect(result.error).toContain('unexpected');
    });
  });
});
