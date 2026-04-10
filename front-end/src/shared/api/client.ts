import { ApiClientProps } from './types';

/**
 * Structured error for non-2xx HTTP responses.
 *
 * Carries the raw response body alongside the status code so callers can
 * surface server-provided error messages in the UI without re-fetching.
 */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly statusText: string,
    public readonly body: string = '',
  ) {
    super(`API Error: ${status} ${statusText}`);
    this.name = 'ApiError';
  }
}

/**
 * Thin fetch wrapper that enforces JSON request/response conventions and
 * converts non-2xx responses into typed `ApiError` instances.
 *
 * @template T - Expected shape of the successful response payload.
 * @param options - URL and optional HTTP method.
 * @returns Parsed JSON body cast to `T`.
 * @throws {ApiError} When the server returns a non-2xx status.
 */
const apiClient = async <T>(options: ApiClientProps): Promise<T> => {
  const { url, method = 'GET' } = options;

  const response = await fetch(url, {
    method,
    // Declaring Content-Type upfront lets servers reject malformed requests
    // early and ensures consistent parsing regardless of fetch polyfill behaviour.
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    // Read the body before throwing so the error carries the server's
    // diagnostic message. The `.catch` swallows network-level read failures
    // (e.g. empty body on 204-like errors) rather than masking the original
    // HTTP failure with a secondary exception.
    const body = await response.text().catch(() => '');
    throw new ApiError(response.status, response.statusText, body);
  }

  return response.json() as Promise<T>;
};

export { apiClient };
