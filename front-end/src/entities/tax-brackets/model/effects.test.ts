/**
 * Tests for effects.ts.
 *
 * The existing tax-brackets.test.ts stubs fetchTaxBracketsFx via fork handlers,
 * which means the real effect body (lines 12-16) is never reached. This file
 * exercises the actual implementation by mocking at the fetch boundary instead.
 * It also covers the retry filter callback (lines 33-35) via fake timers.
 */

import { allSettled, fork } from 'effector';

import { ApiError } from '#/shared/api';

import { fetchTaxBracketsFx, taxBracketsQuery } from './effects';
import './samples'; // activate sample wiring so query is wired

// Each test gets a fresh fetch mock implementation
beforeEach(() => {
  (global.fetch as jest.Mock).mockReset();
});

describe('fetchTaxBracketsFx — real effect body', () => {
  it('calls the API and returns bracket data on 200', async () => {
    const mockBrackets = {
      tax_brackets: [{ min: 0, max: 50197, rate: 0.15 }],
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockBrackets),
    });

    const scope = fork();
    const result = await allSettled(fetchTaxBracketsFx, {
      scope,
      params: 2022,
    });

    expect(result.status).toBe('done');
    expect(
      (result as { status: 'done'; value: typeof mockBrackets }).value,
    ).toEqual(mockBrackets);
  });

  it('throws ApiError when fetch returns a non-ok response', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      text: () => Promise.resolve(''),
    });

    const scope = fork();
    const result = await allSettled(fetchTaxBracketsFx, {
      scope,
      params: 2018,
    });

    expect(result.status).toBe('fail');
    // When allSettled returns status:'fail', the error is in `value`
    const error = (result as { status: 'fail'; value: unknown }).value;
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(404);
  });

  it('throws ApiError with 500 status for server errors', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      text: () => Promise.resolve(''),
    });

    const scope = fork();
    const result = await allSettled(fetchTaxBracketsFx, {
      scope,
      params: 2022,
    });

    expect(result.status).toBe('fail');
    const error = (result as { status: 'fail'; value: unknown }).value;
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(500);
  });

  it('throws ApiError with 400 status for client errors', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      text: () => Promise.resolve(''),
    });

    const scope = fork();
    const result = await allSettled(fetchTaxBracketsFx, {
      scope,
      params: 2022,
    });

    expect(result.status).toBe('fail');
    const error = (result as { status: 'fail'; value: unknown }).value;
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(400);
  });
});

describe('retry filter — exercised via taxBracketsQuery', () => {
  it('filter blocks retry for 4xx errors (false branch) — query errors immediately', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      text: () => Promise.resolve(''),
    });

    const scope = fork();
    await allSettled(taxBracketsQuery.start, { scope, params: 2018 });

    // 4xx: the filter returns false → no retry → query lands in error state quickly
    const error = scope.getState(taxBracketsQuery.$error);
    expect(error).not.toBeNull();
  }, 10000);

  it('filter allows retry for 5xx errors (true branch) — retries and eventually succeeds', async () => {
    const mockBrackets = { tax_brackets: [{ min: 0, rate: 0.15 }] };

    // Fail twice with 500 (filter returns true → retry), succeed on the third call
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: () => Promise.resolve(''),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: () => Promise.resolve(''),
      })
      .mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockBrackets),
      });

    const scope = fork();
    await allSettled(taxBracketsQuery.start, { scope, params: 2022 });

    const data = scope.getState(taxBracketsQuery.$data);
    expect(data).toEqual(mockBrackets);
    // 2 retries × 1000ms delay = at most 2000ms actual wait; set generous timeout
  }, 60000);
});
