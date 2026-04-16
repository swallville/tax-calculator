import { apiClient, ApiError } from './client';

describe('apiClient', () => {
  beforeEach(() => {
    (global.fetch as jest.Mock).mockReset();
  });

  it('returns parsed JSON on success', async () => {
    const mockData = { tax_brackets: [{ min: 0, max: 50197, rate: 0.15 }] };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    const result = await apiClient({
      url: '/api/tax-calculator/tax-year/2022',
    });
    expect(result).toEqual(mockData);
  });

  it('throws ApiError on non-ok response', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      text: () => Promise.resolve('server error body'),
    });

    await expect(
      apiClient({ url: '/api/tax-calculator/tax-year/2022' }),
    ).rejects.toThrow(ApiError);
  });

  it('includes status and body in ApiError', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      text: () => Promise.resolve('{"error": "year not found"}'),
    });

    try {
      await apiClient({ url: '/api/tax-calculator/tax-year/9999' });
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).status).toBe(404);
      expect((error as ApiError).body).toBe('{"error": "year not found"}');
    }
  });

  it('uses GET method by default', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    });

    await apiClient({ url: '/test' });
    expect(global.fetch).toHaveBeenCalledWith('/test', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
  });

  describe('network failure scenarios', () => {
    it('propagates a raw network error without wrapping it in ApiError', async () => {
      const networkError = new TypeError('Failed to fetch');
      (global.fetch as jest.Mock).mockRejectedValueOnce(networkError);

      // Both assertions must run against the SAME rejected promise.
      // Two separate `await expect` blocks would each consume a
      // `mockRejectedValueOnce`, so the second assertion would hit the reset
      // default mock and throw a structurally-different error.
      let thrown: unknown;
      try {
        await apiClient({ url: '/api/tax-calculator/tax-year/2022' });
      } catch (err) {
        thrown = err;
      }
      expect(thrown).toBeInstanceOf(TypeError);
      expect(thrown).not.toBeInstanceOf(ApiError);
    });

    it('propagates the original error instance on network failure, not a new one', async () => {
      const networkError = new TypeError('Failed to fetch');
      (global.fetch as jest.Mock).mockRejectedValueOnce(networkError);

      let thrown: unknown;
      try {
        await apiClient({ url: '/api/tax-calculator/tax-year/2022' });
      } catch (err) {
        thrown = err;
      }

      expect(thrown).toBe(networkError);
    });

    it('throws when response.json() returns rejected promise (malformed JSON on success path)', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.reject(new SyntaxError('Unexpected token < in JSON')),
      });

      await expect(
        apiClient({ url: '/api/tax-calculator/tax-year/2022' }),
      ).rejects.toThrow(SyntaxError);
    });

    it('sets ApiError.body to empty string when response.text() rejects on error path', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        text: () => Promise.reject(new Error('stream error')),
      });

      let thrown: unknown;
      try {
        await apiClient({ url: '/api/tax-calculator/tax-year/2022' });
      } catch (err) {
        thrown = err;
      }

      expect(thrown).toBeInstanceOf(ApiError);
      expect((thrown as ApiError).body).toBe('');
    });
  });
});
