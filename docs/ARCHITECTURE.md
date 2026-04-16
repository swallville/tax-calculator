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
| Logging | Custom structured logger (`console.*` wrapper with salary redact) | — |
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
    │   ├── logger/             # Custom 60-line console.* wrapper with salary redact config
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
- **Logging**: Custom 60-line structured logger at `src/shared/lib/logger/logger.ts`. Wraps `console.debug/info/warn/error` and applies a hand-written `redact()` helper with the path list `['salary', '*.salary']` to strip salary values before emit. Preserves Pino-compatible numeric level values (`debug=20, info=30, warn=40, error=50`) so downstream log aggregators that parsed the previous Pino NDJSON output continue to parse the new output with no config change. Replaced the `pino` dependency during the Phase 8.6 deferred-items pass to correct the architectural-honesty claim that every bundle dependency was load-bearing — Pino was the one exception, a logger masquerading as architecture.

---

## Slice Structure

Each entity or widget directory follows a consistent internal structure:

```
<slice-name>/
├── index.ts        # Public barrel — the slice's only API contract.
│                   # External code imports from here, never from sub-paths.
├── model/          # Effector state (entities only):
│   ├── store.ts    # createStore + .on() handlers
│   ├── events.ts   # createEvent definitions
│   ├── effects.ts  # createEffect + createQuery (farfetched)
│   ├── samples.ts  # sample() declarative wiring
│   ├── selectors.ts# useUnit() derived hooks
│   └── apiSchema.ts# Zod schemas + zodContract
├── ui/             # React components (widgets only)
├── lib/            # Custom hooks and pure helpers
└── types.ts        # TypeScript types re-exported by index.ts
```

The `index.ts` barrel is the slice's public contract — it decides what is
external API. Sub-path files are private implementation, subject to change
without notice.

Naming convention in `events.ts`: `*Requested` events carry user intent and
are safe to dispatch from UI. `set*` events carry derived data and must only
be dispatched from `samples.ts`. Selectors never expose `set*` events, which
makes the split a type-level contract.

---

## FSD Anti-Patterns

**Upward imports.** A lower layer importing from a higher layer. Example: if
`shared/lib/tax/types.ts` imported `ErrorType` from
`entities/tax-brackets/types.ts`, the entire layer boundary would break.

```ts
// Wrong — shared importing from entities
import type { ErrorType } from '#/entities/tax-brackets/types';

// Correct — shared owns the type; entities re-exports it
import type { ErrorType } from '#/shared/lib/tax/types';
```

**Cross-widget imports.** Coupling between features. If `widgets/A` needs
data that `widgets/B` also uses, the data belongs in an entity or shared
utility, not in either widget.

**Deep imports past a barrel.** Bypasses the slice's public API. If the
internal file is later renamed or restructured, every caller breaks.

```ts
// Wrong — deep import bypasses the public barrel
import { $taxBrackets } from '#/entities/tax-brackets/model/store';

// Correct — imports through the public barrel
import { selectors, calculateRequested } from '#/entities/tax-brackets';
```

**Business logic in UI components.** Widgets must read state via selectors
and dispatch events via hooks — never compute totals or classify errors
inline. Domain rules live in `shared/lib/` or `entities/`.

**Dispatching `set*` events from UI.** `setBrackets` and `setError` are
internal to the entity model; only `samples.ts` dispatches them. UI
dispatches `calculateRequested`, which is the public entry point.
