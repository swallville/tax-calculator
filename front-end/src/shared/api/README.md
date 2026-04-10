# shared/api — API Client

Generic HTTP client used by all entity effects to communicate with the backend.
The only consumer today is `fetchTaxBracketsFx` in the `tax-brackets` entity.

Parent: [shared/README.md](../README.md)

## Public API

```ts
import { apiClient, ApiError } from '#/shared/api';
import type { ApiClientProps } from '#/shared/api';
```

### `apiClient<T>(options: ApiClientProps): Promise<T>`

A thin wrapper around the native `fetch` API. Always sends
`Content-Type: application/json`.

```ts
interface ApiClientProps {
  url: string;
  method?: string; // defaults to 'GET'
}
```

Returns the response deserialized as `T` on a 2xx status. Throws `ApiError` on
any non-ok response.

**Example — successful request:**

```ts
import { apiClient } from '#/shared/api';
import type { TaxBracketsResponse } from '#/entities/tax-brackets';

const data = await apiClient<TaxBracketsResponse>({
  url: '/api/tax-calculator/tax-year/2022',
});
// data.tax_brackets: [{ min: 0, max: 50197, rate: 0.15 }, ...]
```

**Example — error handling:**

```ts
import { apiClient, ApiError } from '#/shared/api';

try {
  const data = await apiClient({ url: '/api/tax-calculator/tax-year/2018' });
} catch (err) {
  if (err instanceof ApiError) {
    console.error(err.status); // 404
    console.error(err.statusText); // 'Not Found'
    console.error(err.body); // raw response text, may be empty
  }
}
```

### `ApiError`

Thrown when the server returns a non-ok HTTP status (`response.ok === false`).

```ts
class ApiError extends Error {
  readonly status: number;
  readonly statusText: string;
  readonly body: string; // raw response text, defaults to ''
}
```

`ApiError` is used by the `tax-brackets` entity's error mapping to distinguish
404 (unsupported year) from 5xx (server errors that trigger retries).

## Proxy Configuration

### Why do we need a proxy?

The Flask backend runs on a different port (5001) than the Next.js frontend
(3000). Without a proxy, browser requests from the frontend to the backend would
be **cross-origin** (CORS), requiring:

- CORS headers on every Flask response
- Preflight `OPTIONS` requests doubling latency
- Cookie/credential handling complexity

The Next.js rewrite proxy eliminates all of this by making the backend appear to
be on the same origin. The browser sends requests to `/api/tax-calculator/*` on
port 3000, and Next.js transparently forwards them to Flask on port 5001
server-side. No CORS, no preflight, no client-side URL configuration.

In Docker, `API_BASE_URL=http://backend:5001` uses Docker's internal DNS so the
proxy resolves to the backend container — no exposed ports needed between
services.

### How it works

`apiClient` calls relative URLs. The Next.js rewrite rule in `next.config.ts`
proxies all `/api/tax-calculator/*` requests to the Flask backend:

```
Browser                   Next.js                       Flask
  |                         |                              |
  | GET /api/tax-calculator  |                              |
  |  /tax-year/2022          |                              |
  |------------------------>|                              |
  |                         | GET /tax-calculator          |
  |                         |  /tax-year/2022              |
  |                         |----------------------------->|
  |                         |         { tax_brackets: [] } |
  |                         |<-----------------------------|
  |      { tax_brackets: [] }|                              |
  |<------------------------|                              |
```

The backend host is controlled by the `API_BASE_URL` environment variable
(defaults to `http://localhost:5001` in development). This means `apiClient`
never needs an absolute URL — the proxy is entirely transparent to it.

## Testing

Tests mock `global.fetch` directly and assert on `ApiError` properties:

```ts
(global.fetch as jest.Mock).mockResolvedValueOnce({
  ok: false,
  status: 404,
  statusText: 'Not Found',
  text: () => Promise.resolve('{"error": "year not found"}'),
});

await expect(
  apiClient({ url: '/api/tax-calculator/tax-year/9999' }),
).rejects.toThrow(ApiError);
```

See `client.test.ts` for the full test suite covering happy path, non-ok
responses, and default method behavior.
