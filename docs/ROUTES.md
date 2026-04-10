# Routes

This document covers all routes in the application: Next.js frontend routes, the API proxy rewrite layer, and the Flask backend API it proxies to.

---

## Frontend Routes

| Route | File | Description |
|---|---|---|
| `/` | `src/app/page.tsx` | Main calculator page — the only user-facing route |
| `/opengraph-image` | `src/app/opengraph-image.tsx` | Auto-generated OG image (1200x630 PNG, Node.js runtime) |
| `/_not-found` | Next.js built-in | 404 page rendered for unmatched routes |

### / — Main Calculator Page

`src/app/page.tsx` is a client component that composes the four widget states based on Effector store selectors. The layout is a horizontal split: `TaxForm` on the left, results panel on the right.

The results panel renders exactly one widget at a time based on store state:

```
Page renders:
  ├── TaxForm          (always visible — left column)
  └── results panel    (right column, mutually exclusive states)
        ├── LoadingState     when isPending === true
        ├── ErrorState       when !isPending && hasError
        ├── TaxBreakdown     when !isPending && !hasError && bands.length > 0
        └── EmptyState       when !isPending && !hasError && bands.length === 0
```

State is read from two selectors:

| Selector | Source | Condition |
|---|---|---|
| `selectors.useIsPending()` | `taxBracketsQuery.$status` | `status === 'pending'` |
| `selectors.useError()` | `$taxBrackets.error` | non-null string |
| `selectors.useBands()` | `$taxBrackets.bands` | array length > 0 |

### /opengraph-image

**Why this route exists:** When someone shares the app URL on social media (LinkedIn, Twitter/X, Slack, Discord), the platform fetches the `og:image` URL to display a visual preview card. Without a dedicated OG image, shared links show a generic blank preview or just the page title — which looks unprofessional and reduces click-through.

**How it works:** Next.js App Router has a file-based metadata convention. Placing a file named `opengraph-image.tsx` next to `layout.tsx` causes Next.js to automatically:

1. Generate a 1200x630 PNG at build time using the `ImageResponse` API from `next/og`
2. Register the `/opengraph-image` route to serve that PNG
3. Inject the `og:image` meta tag into the page's `<head>` pointing to this route

The image renders the dark plum background (`#1A1226`), the app name, and the supported tax year range — matching the design system so the social card looks branded.

**Runtime cost:** Zero. The route is statically generated at build time (visible as `○ /opengraph-image` in the build output). No server-side rendering occurs per request.

---

## API Proxy

The frontend does not call the Flask backend directly. All API requests go through a Next.js rewrite rule defined in `next.config.ts`:

```
/api/tax-calculator/:path*  →  ${API_BASE_URL}/tax-calculator/:path*
```

`API_BASE_URL` defaults to `http://localhost:5001` in development and is set to `http://backend:5001` (Docker service DNS) in the production Compose stack.

### Why a proxy

- Avoids CORS issues — browser requests stay on the same origin
- Keeps the backend address out of client-side code
- Allows environment-specific backend URLs without rebuilding the frontend

### Proxy request path

```
Browser
  → GET /api/tax-calculator/tax-year/2022
  → Next.js rewrite (next.config.ts)
  → GET http://backend:5001/tax-calculator/tax-year/2022
  → Flask backend
```

---

## Backend API

The Flask backend exposes one endpoint consumed by this frontend.

### GET /tax-calculator/tax-year/{year}

Fetches the federal tax brackets for a given tax year.

**Path parameter**

| Parameter | Type | Valid values |
|---|---|---|
| `year` | integer | `2019`, `2020`, `2021`, `2022` |

**Success — 200 OK**

```json
{
  "tax_brackets": [
    { "min": 0, "max": 49020, "rate": 0.15 },
    { "min": 49020, "max": 98040, "rate": 0.205 },
    { "min": 98040, "max": 151978, "rate": 0.26 },
    { "min": 151978, "max": 216511, "rate": 0.29 },
    { "min": 216511, "rate": 0.33 }
  ]
}
```

Each bracket object:

| Field | Type | Description |
|---|---|---|
| `min` | number | Lower bound of the bracket (inclusive), in CAD |
| `max` | number (optional) | Upper bound of the bracket (exclusive), in CAD. Absent on the top bracket. |
| `rate` | number | Marginal tax rate as a decimal (0–1) |

The response is validated by the Zod contract `TaxBracketsResponseContract` in `src/entities/tax-brackets/model/apiSchema.ts` before the data reaches the store.

**Error — 404 Not Found**

Returned when `year` is not in the supported range.

```json
{ "errors": "Tax rate not found." }
```

The frontend maps this to `errorType: 'not_found'` and displays: "Unsupported tax year. Please select a year between 2019 and 2022."

**Error — 500 Internal Server Error**

Returned on unexpected backend failures.

The frontend maps any 5xx status to `errorType: 'server_error'` and displays: "Something went wrong. Please try again."

**Retry behaviour**

`@farfetched` `retry()` is configured on `taxBracketsQuery` in `src/entities/tax-brackets/model/effects.ts`:

- 3 attempts maximum
- 1000 ms delay between attempts
- Retries only on `ApiError` with `status >= 500`
- 404 and other client errors are not retried

**Cache behaviour**

Responses are cached per `year` argument for 5 minutes using `@farfetched` `cache()`. Repeated calculations for the same year within the window do not trigger a network request.

---

## Data Flow

The full path from user interaction to rendered output:

```
TaxForm (widget)
  │  user submits salary + year
  │
  ▼
calculateRequested event (entities/tax-brackets/model/events.ts)
  │  payload: { salary: number, year: number }
  │  store updated synchronously: salary and year written to $taxBrackets
  │
  ▼
sample() in samples.ts
  │  clock: calculateRequested
  │  fn: extract year
  │  target: taxBracketsQuery.start
  │
  ▼
taxBracketsQuery (@farfetched, entities/tax-brackets/model/effects.ts)
  │  wraps fetchTaxBracketsFx (Effector effect)
  │  cache: 5-minute per-year cache checked first
  │  retry: up to 3 times on 5xx errors
  │
  ▼
fetchTaxBracketsFx
  │  GET /api/tax-calculator/tax-year/{year}
  │  → Next.js proxy rewrite
  │  → Flask backend
  │
  ▼
Zod contract validation (TaxBracketsResponseContract)
  │  validates shape of API response before emitting finished.success
  │  invalid responses treated as failures
  │
  ├── taxBracketsQuery.finished.success
  │     sample() reads salary from $taxBrackets (source)
  │     calls calculateTax(salary, tax_brackets)
  │     dispatches setBrackets event → $taxBrackets updated
  │
  └── taxBracketsQuery.finished.failure
        mapError() converts ApiError to { error, errorType }
        dispatches setError event → $taxBrackets updated
  │
  ▼
$taxBrackets store (entities/tax-brackets/model/store.ts)
  │  single source of truth: salary, year, totalTax, effectiveRate, bands, error, errorType
  │
  ▼
selectors (entities/tax-brackets/model/selectors.ts)
  │  useUnit() hooks over store maps — each selector subscribes to a slice only
  │  selectors.useIsPending() reads taxBracketsQuery.$status separately
  │
  ▼
page.tsx
  │  reads isPending, error, bands
  │  renders the appropriate widget (LoadingState / ErrorState / TaxBreakdown / EmptyState)
  │
  ▼
TaxBreakdown (widget)
     reads totalTax, effectiveRate, bands, year via selectors
     renders per-bracket table and summary row
```

### Event reference

| Event | Payload | Trigger |
|---|---|---|
| `calculateRequested` | `{ salary: number, year: number }` | TaxForm submission |
| `setBrackets` | `{ totalTax, effectiveRate, bands }` | taxBracketsQuery.finished.success |
| `setError` | `{ error: string, errorType: ErrorType }` | taxBracketsQuery.finished.failure |
| `resetResults` | `void` | Explicit reset (e.g., form cleared) |

### Store shape

```typescript
interface TaxBracketsStore {
  salary: number;        // last submitted salary
  year: number;          // last submitted tax year (default: 2022)
  totalTax: number;      // calculated total tax
  effectiveRate: number; // totalTax / salary (0–1)
  bands: BandBreakdown[]; // per-bracket breakdown
  error: string | null;  // user-facing error message
  errorType: 'server_error' | 'not_found' | null;
}
```

### Error type mapping

| HTTP status | errorType | User message |
|---|---|---|
| 404 | `not_found` | Unsupported tax year. Please select a year between 2019 and 2022. |
| 5xx | `server_error` | Something went wrong. Please try again. |
| Other / network | `server_error` | An unexpected error occurred. |
