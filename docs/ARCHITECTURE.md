# Architecture Overview

## Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 16.2.3 |
| UI Library | React | 19.2.4 |
| Language | TypeScript (strict) | 5.x |
| Styling | Tailwind CSS (CSS-first) | 4.2.2 |
| State Management | Effector + effector-react | 23.x |
| Data Fetching | @farfetched/core (query + mutation + retry) | 0.14.x |
| Validation | Zod (API contracts + form validation) | 3.23.x |
| Logging | Pino (browser transport) | 9.x |
| Store Persistence | effector-storage/local | 7.x |
| Unit Testing | Jest + @swc/jest + RTL | 29.x |
| E2E Testing | Playwright (4 browser projects) | 1.49.x |
| Build | Turbopack (Next.js 16 default) | built-in |

---

## Feature Sliced Design (FSD)

```
src/
├── app/                        # Next.js App Router — routing, layout, page composition
│   ├── layout.tsx              # Root layout: fonts, meta, StoresPersistence provider
│   ├── page.tsx                # Home page: TaxForm + TaxBreakdown composition
│   ├── globals.css             # Tailwind 4 config — @import "tailwindcss", @theme inline
│   └── api/
│       └── tax-calculator/     # Next.js proxy route: forwards to Flask backend
│
├── widgets/                    # Feature-specific composed UI (no cross-widget imports)
│   └── tax-calculator/
│       └── ui/
│           ├── TaxForm/        # Salary input, year select, calculate button
│           ├── TaxBreakdown/   # Per-band table, total tax, effective rate
│           ├── EmptyState/     # Pre-calculation placeholder with sr-only h1
│           ├── LoadingState/   # Skeleton loader shown during fetch
│           └── ErrorState/     # Two modes: server_error (retry button) + not_found
│
├── entities/                   # Business domain models
│   └── tax-brackets/
│       ├── types.ts            # Re-exports TaxBracketsStore from shared/lib/tax/types
│       └── model/
│           ├── apiSchema.ts    # Zod schemas, zodContract for API response, form schema
│           ├── events.ts       # Effector events: calculateRequested, setError, setBrackets
│           ├── store.ts        # $taxBrackets store with .on() handlers
│           ├── effects.ts      # createEffect → attach → createQuery (delegates to apiClient)
│           ├── samples.ts      # sample() wiring connecting events, stores, and effects
│           └── selectors.ts    # useUnit() hooks with .map() for granular subscriptions
│
└── shared/                     # Reusable utilities — no imports from upper layers
    ├── api/
    │   └── client.ts           # Generic fetch client, ApiError with captured body
    ├── lib/
    │   ├── tax/
    │   │   ├── types.ts        # TaxBracketsStore, TaxBand, ErrorType — single source of truth
    │   │   └── calculateTax.ts # Pure function: brackets + salary → bands + total + rate
    │   ├── format/
    │   │   ├── currency.ts     # formatCurrency() — Intl.NumberFormat cached at module scope
    │   │   └── percent.ts      # formatPercent() — Intl.NumberFormat cached at module scope
    │   ├── logger/             # Pino browser wrapper with salary redact config
    │   ├── store/              # createPersistedStore + StoresPersistence component
    │   └── test/               # Custom RTL render with Effector Scope provider
    └── ui/                     # Shared primitives: Spinner, Badge
```

---

## Layer Dependency Rules

```
app → widgets → entities → shared
 ↓       ↓          ↓         ↓
 OK      OK         OK        OK (self-contained)
         ↑          ↑
         ✗          ✗  (NEVER import upward)
```

- `shared/` has NO imports from entities, widgets, or app.
- `entities/` imports ONLY from `shared/`.
- `widgets/` imports from `entities/` and `shared/` — never from other widgets.
- `app/` imports from all lower layers.

Enforced at CI by `npm run analyse:circular` and ESLint import-boundary rules using `#/` path aliases.

---

## Data Flow

### Happy Path

```
TaxForm (widget)
  └── useActionState + Zod safeParse(.finite() on salary)
        │  validation error → field error state, no event fired
        │  validation pass →
        ▼
  calculateRequested (Effector event)
        │
        ▼
  sample({ source: $taxBrackets, clock: calculateRequested })
        │
        ▼
  taxBracketsQuery.start (year param)
        │  @farfetched cache hit (TTL 5m) → skip fetch, emit done
        │  cache miss →
        ▼
  fetchTaxBracketsFx (createEffect → attach)
        │
        ▼
  /api/tax-calculator/:year (Next.js proxy route)
        │
        ▼
  Flask backend GET /tax-calculator/tax-year/{year}
        │
        ▼
  zodContract validates response shape at runtime
        │  invalid → query.$failed, setError("not_found")
        │  valid →
        ▼
  sample({ source: validatedResponse, clock: query.$done })
        │
        ▼
  setBrackets (event) → $taxBrackets.on(setBrackets)
        │
        ▼
  calculateTax(salary, brackets) [pure function]
        │
        ▼
  setTaxCalculation (event) → $taxBrackets store updated
        │
        ▼
  selectors: useTotalTax() / useBands() / useEffectiveRate()
  (useUnit with .map() — only affected slice re-renders)
        │
        ▼
  TaxBreakdown (widget) re-renders
```

### Error Flow

```
fetchTaxBracketsFx rejects
        │
        ├── HTTP 500 → @farfetched retry (attempt 1 of 3, logged in onRetry)
        │     └── all 3 attempts fail → query.$failed
        │           └── setError("server_error") → ErrorState (retry button shown)
        │
        └── HTTP 404 → immediate fail (no retry)
              └── query.$failed
                    └── setError("not_found") → ErrorState (no retry button)
```

Error mapping is typed as `Record<NonNullable<ErrorType>, ErrorConfig>` to enforce exhaustiveness when new error variants are added.

---

## State Shape

### `$taxBrackets` store

```typescript
interface TaxBracketsStore {
  status: "idle" | "loading" | "success" | "error";
  salary: number | null;
  year: string | null;
  bands: TaxBand[];        // per-bracket breakdown from calculateTax()
  totalTax: number | null;
  effectiveRate: number | null;
  error: ErrorType | null;
}
```

`TaxBand`, `ErrorType`, and `TaxBracketsStore` are defined in `src/shared/lib/tax/types.ts` and re-exported from `src/entities/tax-brackets/types.ts`. No duplicate type definitions exist at any layer.

---

## Caching Strategy

Two independent cache layers prevent redundant network calls.

| Layer | Mechanism | TTL | Scope | Excludes |
|---|---|---|---|---|
| In-memory | `@farfetched` cache | 5 minutes | Per tax year key | Invalidated on page reload |
| Persistent | `effector-storage/local` | 2 minutes | Last calculation result | Salary (PII never persisted) |

The localStorage persistence covers the calculation result (bands, total, rate) and the year used, so users returning within 2 minutes see their last result without a network call. Salary is never written to storage.

---

## API Integration

- **Frontend proxy**: `app/api/tax-calculator/[...path]/route.ts` → `http://localhost:5001`
- **Backend endpoint**: `GET /tax-calculator/tax-year/{year}`
- **Retry policy**: 3 attempts on HTTP 500, no retry on HTTP 404 or network error
- **Contract validation**: Zod schema applied to every response via `@farfetched` `zodContract`
- **Error capture**: `ApiError` stores the response body so Flask error messages are preserved for logging

In Docker, `API_BASE_URL` is baked at build time via `ARG API_BASE_URL` in the `Dockerfile` because Next.js evaluates `next.config.ts` during `next build`, not at container startup.

---

## Testing Strategy

Tests are layered from fastest to slowest with no layer duplicating the concerns of another.

```
Unit (Jest + fork/allSettled)
  └── Pure functions: calculateTax edge cases, Zod schema contracts
  └── Effector model: store transitions, sample wiring, error mapping
      Uses fork() to create isolated scope per test; allSettled() to flush effects

Component (RTL + custom render)
  └── Widget rendering in all states: idle, loading, success, error
  └── Form interaction: valid submit, invalid submit, field error messages
      Uses custom render() that wraps in Effector Scope provider

E2E (Playwright + Docker Compose)
  └── Happy path: full form submit → results rendered (real Flask backend)
  └── Error paths: server_error, not_found (page.route() mock — deterministic)
  └── Retry behavior: mock returns 500 x2 then 200, asserts retry log + eventual success
      Page Object Model classes own all selectors; tests import POM, not raw locators

BDD (Gherkin feature files)
  └── Scenario Outline tables cover calculation happy path, error paths, form validation
      Serve as living specification alongside Playwright specs
```

All four browser projects (Chromium, Firefox, WebKit, Mobile Chrome) run the E2E suite in CI.

---

## Security Headers

Set via `next.config.ts` `headers()` for all routes:

| Header | Value |
|---|---|
| `Content-Security-Policy` | `default-src 'self'; script-src 'self' 'unsafe-inline'` |
| `X-Frame-Options` | `DENY` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |

---

## Key Patterns

- **React 19 forms**: `useActionState` + Zod `safeParse` with `.finite()` on salary for client-side validation before any Effector event is fired.
- **Effector selectors**: `useUnit($store.map(s => s.slice))` for granular subscriptions — only the component that owns a slice re-renders on change.
- **Store persistence**: `effector-storage/local` persists the last result with a 2-minute TTL; salary is excluded from persistence as PII.
- **Tailwind 4**: CSS-first config via `@theme inline` in `globals.css`; 28 design tokens drive all color, spacing, and typography utilities. No `tailwind.config.ts` exists.
- **Import aliases**: `#/shared/*`, `#/entities/*`, `#/widgets/*` declared in `tsconfig.json` and enforced by ESLint import-boundary rules.
- **Logging**: Pino browser transport with a `redact` configuration that strips salary values from all log output before they reach the browser console or any transport destination.
