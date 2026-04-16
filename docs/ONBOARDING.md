# Tax Calculator — Developer Onboarding Guide

Welcome to the Tax Calculator frontend. This guide takes you from zero to a working local development environment and explains every architectural decision you will encounter as you work on this codebase. Read it top-to-bottom on your first day, then use it as a reference.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack Deep Dive](#2-tech-stack-deep-dive)
3. [Code Architecture](#3-code-architecture)
4. [Code Standards](#4-code-standards)
5. [Key Patterns](#5-key-patterns)
6. [Development Workflow](#6-development-workflow)
7. [Where Things Live](#7-where-things-live)

---

## 1. Project Overview

### What the App Does

The Tax Calculator is a Canadian federal income tax calculator. A user enters their annual salary and selects a tax year (2019–2022). The app fetches the appropriate tax brackets from the backend API, calculates the total tax owed using marginal rates, and displays a per-bracket breakdown alongside the effective tax rate.

The target audience is any individual who wants to understand how their income is split across federal tax bands — no account, no data storage of salary values, no backend login required.

### Six Key Requirements (from the backend README)

| # | Requirement |
|---|-------------|
| 1 | Fetch tax brackets by year from `GET /tax-calculator/tax-year/{year}` (years 2019–2022 only) |
| 2 | Accept an annual salary as user input |
| 3 | Calculate and display the **total income tax** owed |
| 4 | Display the **tax owed per bracket band** |
| 5 | Display the **effective tax rate** |
| 6 | Handle two known backend failure modes: unsupported year (404) and random server errors (500) |

Scenario validation targets for 2022:

| Salary | Expected Total Tax |
|--------|--------------------|
| $0 | $0 |
| $50,000 | $7,500.00 |
| $100,000 | $17,739.17 |
| $1,234,567 | $385,587.65 |

---

## 2. Tech Stack Deep Dive

### Next.js 16 (App Router)

The project runs Next.js 16.2.3 with the App Router. All routing lives under `src/app/`. Key configuration decisions in `front-end/next.config.ts`:

- **`output: "standalone"`** — produces a self-contained build artifact for Docker deployment. The container runs `node server.js` directly without needing a full `node_modules` installation at runtime.
- **`async rewrites()`** — proxies every request to `/api/tax-calculator/:path*` through to the Flask backend at `http://localhost:5001` (or whatever `API_BASE_URL` resolves to). This means the browser never makes cross-origin requests; all API calls go to the same origin as the Next.js app.
- **Turbopack** — the default dev bundler in Next.js 16, used automatically via `next dev`. No Webpack config exists in this project.
- **Metadata API** — the root layout (`src/app/layout.tsx`) exports a typed `Metadata` object that populates `<title>`, Open Graph, Twitter Card, robots, and icon tags. No manual `<head>` manipulation.
- **Security headers** — Content-Security-Policy, X-Frame-Options, Referrer-Policy, and Permissions-Policy are applied globally via the `headers()` config function.

### React 19

The app targets React 19.2.4. There are no class components anywhere in the codebase.

The critical React 19 primitive this project uses is **`useActionState`**. This replaces the old pattern of managing form submission state with `useState` + `onSubmit`. See [Section 5 — Key Patterns](#5-key-patterns) for the full form pattern.

React Strict Mode is enabled. Every component renders twice in development — this is intentional and surfaces side-effect bugs early.

### Effector + @farfetched

State management uses Effector 23.x with the `effector-react` bindings and `@farfetched/core` for data fetching.

**Core Effector concepts used in this project:**

| Primitive | Purpose | Where |
|-----------|---------|-------|
| `createStore` | Holds reactive state | `model/store.ts` |
| `createEvent` | Triggers state changes | `model/events.ts` |
| `createEffect` | Runs async side effects (fetch) | `model/effects.ts` |
| `sample` | Declarative wiring between events, stores, and effects | `model/samples.ts` |
| `useUnit` | Subscribes a React component to a store or event | `model/selectors.ts` |
| `fork` / `allSettled` | Test isolation — creates a scoped store copy per test | test files |

**@farfetched on top of Effector:**

`createQuery` wraps an Effector effect and adds:
- A Zod **contract** that validates the API response shape at runtime before it touches the store. If validation fails, the query routes to its `finished.failure` path.
- **`cache`** — same-year responses are cached for 5 minutes; submitting the same year twice does not re-fetch.
- **`retry`** — automatically re-issues the request up to 3 times with a 1-second delay when the backend returns a 5xx. 404 responses are not retried.

**Store persistence** — `effector-storage/local` serialises the last calculation result to `localStorage` under the key `taxResults`. The TTL is 2 minutes. The `sanitize` function strips the salary field before writing — salary is PII and must never be persisted.

### Tailwind 4

Tailwind 4 is configured in a CSS-first style. There is no `tailwind.config.ts`. The entire configuration lives in `src/app/globals.css`:

```css
@import "tailwindcss";

:root {
  /* design tokens as CSS custom properties */
}

@theme inline {
  --color-bg-page: var(--bg-page);
  /* ... all token mappings ... */
}
```

The `@theme inline` block is how Tailwind 4 picks up custom tokens and generates utilities from them. Once a token is mapped inside `@theme inline`, you use it as a standard Tailwind class: `bg-bg-page`, `text-text-primary`, `border-border-input`, etc.

There is no `@utility` directive in Tailwind 4 — it does not exist. Custom animations are declared with standard `@keyframes` and referenced as `animate-[name]` in className strings.

### Zod

Zod 3.23.x is used in two places:

1. **API contract** (`model/apiSchema.ts`) — `TaxBracketsResponseSchema` validates what the Flask backend returns. This schema is wrapped with `@farfetched/zod`'s `zodContract()` and attached to the query so validation runs automatically on every response.

2. **Form validation** (`model/apiSchema.ts`) — `TaxFormInputSchema` validates the raw form values (salary must be a finite non-negative number; year must be one of 2019–2022). Validated via `safeParse` inside `useActionState` — no library wrappers for form state.

All types consumed by the rest of the app are derived via `z.infer<typeof Schema>` — no duplicated type definitions.

### Custom structured logger

A 60-line logger at `src/shared/lib/logger/logger.ts` wraps `console.*` with
structured entries and a hard-coded redact list (`['salary', '*.salary']`)
that replaces any salary field with `'[Redacted]'` before emit. Numeric
levels follow Pino's scheme (`debug=20, info=30, warn=40, error=50`) so
Pino-aware log aggregators parse the output unchanged. Level resolves once
at module load — `debug` in development, `info` in production.

**Critical rule: salary values must never appear in log output.** Logged
events: API call start, retry attempts, calculation result (total tax +
effective rate only — never the salary), and all errors with HTTP status.

### Feature Sliced Design

See [Section 3](#3-code-architecture) for the full layer breakdown. FSD is the structural rule that governs where every file lives and what it is allowed to import.

---

## 3. Code Architecture

```
app  →  widgets  →  entities  →  shared
```

Higher layers depend on lower layers; lower layers never depend on higher
ones. `shared` has zero business domain knowledge. The rule is enforced by
ESLint `no-restricted-imports` boundaries and a circular-dependency check.

Full tree layout, per-layer responsibilities, slice structure, and FSD
anti-patterns with code examples live in
[ARCHITECTURE.md](ARCHITECTURE.md) — read that once before your first PR.

### File Naming Conventions

| Pattern | Example |
|---------|---------|
| React components | `PascalCase.tsx` |
| Effector model files | `camelCase.ts` (events.ts, store.ts, effects.ts, samples.ts, selectors.ts) |
| Utility functions | `camelCase.ts` |
| Barrel exports | `index.ts` at each public surface |
| Tests | `*.test.ts` or `*.test.tsx` co-located with the file under test |
| E2E page objects | `kebab-case.page.ts` |

---

## 4. Code Standards

### SOLID Principles

**Single Responsibility** — each file has one job. `events.ts` only declares events. `samples.ts` only wires them together. `calculateTax.ts` only runs the marginal-rate algorithm. If you are adding a second concern to a file, split it.

**Open/Closed** — the `errorMapping.ts` declarative table is the canonical example. To add a new error type, append an entry to `ERROR_MAPPINGS`. The `mapError` function does not change.

**Liskov / Interface Segregation** — components consume only the selector hooks they need (`useTotalTax`, `useBands`, etc.) rather than a monolithic store shape. `useUnit($store.map(s => s.slice))` ensures a component only re-renders when its specific slice changes.

**Dependency Inversion** — components do not import stores or effects directly. They import selectors and event handlers through the entity's public barrel (`#/entities/tax-brackets`). The widget does not know where the event goes or what effect it triggers.

### DRY Rules

- Currency and percentage formatting live exclusively in `#/shared/lib/format`. Do not inline `toLocaleString` or manual `%` arithmetic in a component.
- API types are derived from Zod schemas via `z.infer`. Do not write a TypeScript interface that duplicates a schema.
- Test mock brackets are defined once per test file; if they appear across files they belong in a shared test fixture.

### KISS Rules

- No abstractions are introduced until there are two concrete uses of them.
- The form uses `useActionState` + native `<form action={...}>` without any form library.
- The API client is a plain `fetch` wrapper, not Axios or a request library.
- There is one page. There is no router. Do not reach for a routing library.

### Import Rules

Always use path aliases. Never use relative cross-layer imports.

| Alias | Resolves to |
|-------|-------------|
| `#/app/*` | `src/app/*` |
| `#/shared/*` | `src/shared/*` |
| `#/lib/*` | `src/shared/lib/*` |
| `#/components/*` | `src/shared/ui/*` |
| `#/entities/*` | `src/entities/*` |
| `#/widgets/*` | `src/widgets/*` |

Correct:
```ts
import { calculateTax } from '#/shared/lib/tax';
import { selectors } from '#/entities/tax-brackets';
```

Wrong:
```ts
import { calculateTax } from '../../shared/lib/tax/calculateTax';
```

Circular dependency detection runs as part of the quality gate (`npm run analyse:circular`). Any circular import is a build-blocking error.

### Tailwind Rules

1. Use token-based utilities only. Never write a hardcoded hex value in a `className` string.

   Correct: `className="bg-bg-card text-text-primary border-border-input"`

   Wrong: `className="bg-[#241C32] text-[#F5F0FA]"`

2. Never use `style={{}}` for anything except `animationDelay` (which cannot be expressed as a static Tailwind utility). This single exception exists in `TaxBreakdown.tsx` for staggered band row animations.

3. Never use `@utility` — the directive does not exist in Tailwind 4.

4. The full list of available tokens is in `src/app/globals.css` under `:root` and `@theme inline`. Refer to `docs/DESIGN-SYSTEM-GUIDE.md` for the complete design token reference.

---

## 5. Key Patterns

### Effector Model Pattern

Every entity model follows the same five-file split. Using `tax-brackets` as the reference:

**`events.ts`** — declare all events. Events are typed. They carry payloads, not side effects.

```ts
export const calculateRequested = createEvent<{ salary: number; year: number }>();
export const setBrackets = createEvent<{ totalTax: number; effectiveRate: number; bands: BandBreakdown[] }>();
export const setError = createEvent<{ error: string; errorType: NonNullable<ErrorType> }>();
export const resetResults = createEvent<void>();
```

**`store.ts`** — create the store and register `.on()` handlers. Handlers are pure functions (old state + payload → new state).

```ts
export const $taxBrackets = createStore<TaxBracketsStore>(INITIAL_DATA);
$taxBrackets.on(setBrackets, (state, payload) => ({ ...state, ...payload, error: null }));
```

**`effects.ts`** — create the Effector effect, wrap it in a `@farfetched` query, attach cache and retry.

```ts
export const fetchTaxBracketsFx = createEffect(async (year: number) => {
  return apiClient<TaxBracketsResponse>({ url: `/api/tax-calculator/tax-year/${year}` });
});

export const taxBracketsQuery = createQuery({
  effect: fetchTaxBracketsFx,
  contract: TaxBracketsResponseContract,
});

cache(taxBracketsQuery, { staleAfter: '5m' });
retry(taxBracketsQuery, { times: 3, delay: 1000, filter: ({ error }) => error instanceof ApiError && error.status >= 500 });
```

**`samples.ts`** — wire events to effects and effects back to events using `sample`. No component code touches this file.

```ts
// Event → start query
sample({ clock: calculateRequested, fn: ({ year }) => year, target: taxBracketsQuery.start });

// Query success → compute → update store
sample({
  clock: taxBracketsQuery.finished.success,
  source: $taxBrackets,
  fn: ({ salary }, { result }) => calculateTax(salary, result.tax_brackets),
  target: setBrackets,
});

// Query failure → map error → update store
sample({ clock: taxBracketsQuery.finished.failure, fn: ({ error }) => mapError(error), target: setError });
```

**`selectors.ts`** — export named React hooks. Each hook subscribes to one slice of the store via `.map()`. Components that call `useTotalTax()` will not re-render when `bands` changes.

```ts
export const selectors = {
  useTotalTax: () => useUnit($taxBrackets.map(s => s.totalTax)),
  useIsPending: () => useUnit(taxBracketsQuery.$status.map(s => s === 'pending')),
  useCalculateRequested: () => useUnit(calculateRequested),
};
```

Components import from the entity barrel, not individual model files:

```ts
import { selectors } from '#/entities/tax-brackets';
```

### React 19 Form Pattern

No `useState` for form values. No `onChange` handlers. Use `useActionState`:

```tsx
"use client";
import { useActionState } from "react";
import { TaxFormInputSchema } from "#/entities/tax-brackets";

type FormState = { errors: { salary?: string[]; year?: string[] }; submitted: boolean };

export function TaxForm() {
  const calculateRequested = selectors.useCalculateRequested();

  async function calculateAction(prevState: FormState, formData: FormData): Promise<FormState> {
    const raw = { salary: Number(formData.get("salary")), year: Number(formData.get("year")) };
    const result = TaxFormInputSchema.safeParse(raw);
    if (!result.success) {
      return { errors: result.error.flatten().fieldErrors, submitted: false };
    }
    calculateRequested(result.data);
    return { errors: {}, submitted: true };
  }

  const [state, formAction] = useActionState<FormState, FormData>(calculateAction, { errors: {}, submitted: false });

  return <form action={formAction}>...</form>;
}
```

The form action is passed directly to the native `<form action={...}>` attribute — not to an `onSubmit` handler.

### Error Handling — Declarative Error Mapping

Error behaviour is defined as a data table, not a conditional chain. To add or change an error type, edit the `ERROR_MAPPINGS` array in `src/entities/tax-brackets/model/errorMapping.ts`. The `mapError` function iterates the table and never needs modification.

```ts
const ERROR_MAPPINGS: ErrorMapping[] = [
  { match: e => e instanceof ApiError && e.status === 404, errorType: 'not_found', ... },
  { match: e => e instanceof ApiError && e.status >= 500, errorType: 'server_error', ... },
];
```

`ErrorState.tsx` follows the same pattern — an `ERROR_CONFIG` record keyed by `ErrorType` drives which title to show and whether the retry button appears.

### Testing — Effector: `fork` + `allSettled`

Effector stores are global by default. Tests must use `fork()` to create an isolated scope and `allSettled()` to wait for all effects to complete before asserting.

```ts
import { fork, allSettled } from 'effector';
import { fetchTaxBracketsFx } from './effects';
import { calculateRequested } from './events';
import { $taxBrackets } from './store';
import './samples'; // must import to activate sample wiring

it('calculates tax on success', async () => {
  const scope = fork({
    handlers: [[fetchTaxBracketsFx, () => Promise.resolve(MOCK_BRACKETS)]],
  });

  await allSettled(calculateRequested, { scope, params: { salary: 100000, year: 2022 } });

  const state = scope.getState($taxBrackets);
  expect(state.totalTax).toBeGreaterThan(0);
});
```

Key rules:
- Always `fork()` — never read from the global store in tests.
- `handlers` in `fork()` overrides effects without touching the network.
- `values` in `fork()` pre-seeds specific store state for a test scenario.
- Import `'./samples'` at the top of any model test that exercises the full flow; without it, the sample wiring is never registered.

### Testing — React Components (RTL)

Use the custom render from `#/shared/lib/test`:

```tsx
import { render, screen } from '#/shared/lib/test/test-utils';
```

This wrapper re-exports everything from `@testing-library/react` with a `WithProviders` wrapper applied. As the app gains more providers (e.g. analytics, feature flags), add them once to `test-utils.tsx` rather than every test file.

Mock selectors with `jest.spyOn`:

```ts
jest.spyOn(entitySelectors.selectors, 'useIsPending').mockReturnValue(true);
```

### Testing — Playwright E2E (Page Object Model)

E2E tests live in `front-end/e2e/`. The page object is at `e2e/pages/tax-calculator.page.ts`. It centralises all locators (ARIA-based primary, `data-testid` secondary) and action helpers. Specs import the page object and call its methods; raw `page.locator()` calls belong in the page object, not in spec files.

```ts
// In a spec file:
const taxPage = new TaxCalculatorPage(page);
await taxPage.goto();
await taxPage.fillSalary('100000');
await taxPage.calculate();
await taxPage.expectTotalTax('$17,739.17');
```

Four browser projects run against every spec: `chromium`, `firefox`, `webkit`, and `mobile-chrome` (Pixel 5 viewport). The `webServer` config in `playwright.config.ts` starts the full Docker stack (`docker compose up --wait`) before tests run.

---

## 6. Development Workflow

### Prerequisites

- Node.js 20+ (check with `node --version`)
- npm 10+ (comes with Node 20)
- Docker Desktop (for the backend and E2E tests)
- Git (for cloning the repository)

### Clone the Repository

```bash
git clone https://github.com/swallville/tax-calculator.git
cd tax-calculator
```

### Run Locally (frontend + backend both running)

```bash
# Start the Flask backend (separate terminal)
docker run --init -p 5001:5001 -it ptsdocker16/interview-test-server

# Install frontend dependencies
cd front-end
npm install

# Start the frontend dev server
npm run dev
```

The app is available at `http://localhost:3000`. The `rewrites` config in `next.config.ts` proxies `/api/tax-calculator/*` to `http://localhost:5001`.

### Run with Docker Compose (full stack)

```bash
# Production build — both services
docker compose up

# Development build — with hot reload
docker compose -f docker-compose.yml -f docker-compose.dev.yml up
```

The production compose file builds the Next.js standalone output and runs it with `node server.js`. The dev compose file mounts the source directory as a volume and runs `npm run dev` instead, so file changes hot-reload inside the container.

### Run Unit Tests

```bash
cd front-end

# Standard run (quiet, single worker — safe for CI)
npm test

# Local run with parallel workers
npm run test:local

# With coverage report
npm run test:coverage
```

Jest uses `@swc/jest` as the transformer (significantly faster than `ts-jest`). Tests run in `jsdom` environment. Path aliases are mapped in `jest.config.ts` to match `tsconfig.json`.

### Run E2E Tests

```bash
cd front-end

# All browsers (requires Docker)
npm run test:e2e

# Interactive UI mode (great for debugging)
npm run test:e2e:ui

# Chromium only (faster for quick checks)
npm run test:e2e:chromium
```

The `webServer` config in `playwright.config.ts` automatically starts `docker compose up --wait` before the first test runs. Set `CI=true` to disable server reuse and force a clean start.

### Simplify Pass (run BEFORE the Quality Gate)

Step 2 of the 8-step cycle in `.claude/WORKFLOW.md`. Mandatory after every code change, before writing tests:

```bash
# Dead exports — flags unused barrel re-exports and orphan symbols.
# Framework defaults (jest/next/playwright/prettier configs, app/layout.tsx,
# app/opengraph-image.tsx) always show — those are entry points, never remove.
npx --yes ts-unused-exports tsconfig.json --excludePathsFromReport='e2e;scripts;@types;jest.setup.js'

# Orphan dependencies — flags packages declared in package.json but never
# imported. Ignore the standard config-driven false positives for this repo
# (see WORKFLOW.md for the list).
npm run analyse:deps

# Tailwind class deduplication — find chains repeated across files.
grep -rn 'className="[^"]\{40,\}"' src/
```

When duplication appears, extract a colocated `styles.ts` (named const exports) or hoist a module-level constant within the file. Project rule forbids `@apply` and CSS modules in v4 — TS-string deduplication is the chosen pattern. See `src/widgets/tax-calculator/ui/styles.ts` for the canonical example.

When in doubt, invoke the `simplify` skill on the changed files. Re-run the Quality Gate after — removing exports can break internal imports the dead-code pass missed.

### Quality Gate

Run this sequence after every implementation phase before committing:

```bash
npm run tsc:check        # TypeScript — no type errors
npm run lint             # ESLint — no lint violations, import ordering
npm run analyse:circular # No circular dependencies
npm run test             # All unit tests pass
npm run build            # Next.js production build succeeds
npm audit --audit-level=high  # No high/critical security advisories
```

Or run them all together:

```bash
npm run validate         # format:check + lint:fix + tsc:check + analyse:circular + test:local
```

---

## 7. Where Things Live

| Concept | File Path |
|---------|-----------|
| App entry point (single page) | `src/app/page.tsx` |
| Root layout, fonts, metadata, StoresPersistence | `src/app/layout.tsx` |
| Design tokens, Tailwind config, animations | `src/app/globals.css` |
| Tax form UI (salary input, year select, submit) | `src/widgets/tax-calculator/ui/TaxForm.tsx` |
| Results table (bands, total, effective rate) | `src/widgets/tax-calculator/ui/TaxBreakdown.tsx` |
| Loading skeleton | `src/widgets/tax-calculator/ui/LoadingState.tsx` |
| Error display (retry / not-found modes) | `src/widgets/tax-calculator/ui/ErrorState.tsx` |
| Empty state (pre-calculation prompt) | `src/widgets/tax-calculator/ui/EmptyState.tsx` |
| Widget barrel export | `src/widgets/tax-calculator/index.ts` |
| Effector events (triggers + setters) | `src/entities/tax-brackets/model/events.ts` |
| Effector store and .on() handlers | `src/entities/tax-brackets/model/store.ts` |
| Effector effect, @farfetched query, cache, retry | `src/entities/tax-brackets/model/effects.ts` |
| sample() wiring (event → effect → store) | `src/entities/tax-brackets/model/samples.ts` |
| useUnit selector hooks | `src/entities/tax-brackets/model/selectors.ts` |
| Zod API contract + form validation schema | `src/entities/tax-brackets/model/apiSchema.ts` |
| Declarative error mapping table | `src/entities/tax-brackets/model/errorMapping.ts` |
| Entity store type (TaxBracketsStore) | `src/entities/tax-brackets/types.ts` |
| Entity barrel export | `src/entities/tax-brackets/index.ts` |
| Generic fetch client (ApiError class) | `src/shared/api/client.ts` |
| Marginal-rate tax calculation algorithm | `src/shared/lib/tax/calculateTax.ts` |
| Currency and percentage formatters | `src/shared/lib/format/currency.ts` |
| Custom structured logger (salary redacted) | `src/shared/lib/logger/logger.ts` |
| localStorage persistence helper | `src/shared/lib/store/store.ts` |
| StoresPersistence React provider | `src/shared/lib/store/StoresPersistence.tsx` |
| Custom RTL render with providers | `src/shared/lib/test/test-utils.tsx` |
| Next.js config (rewrites, standalone, headers) | `front-end/next.config.ts` |
| TypeScript config (path aliases, strict) | `front-end/tsconfig.json` |
| Jest config (@swc, moduleNameMapper) | `front-end/jest.config.ts` |
| Playwright config (4 browser projects, webServer) | `front-end/playwright.config.ts` |
| E2E page object (all locators, action helpers) | `front-end/e2e/pages/tax-calculator.page.ts` |
| E2E happy-path spec | `front-end/e2e/happy-path.spec.ts` |
| E2E error handling spec | `front-end/e2e/error-handling.spec.ts` |
| Docker compose (production stack) | `docker-compose.yml` |
| Docker compose override (dev hot-reload) | `docker-compose.dev.yml` |

---

## Further Reading

- **`docs/ARCHITECTURE.md`** — full stack table, FSD diagram, data flow, API integration summary
- **`docs/DESIGN-SYSTEM-GUIDE.md`** — complete color token reference, typography scale, component specs, spacing rules
- **`docs/IMPLEMENTATION-PLAN.md`** — phase-by-phase implementation record with decision rationale
- **`back-end/README.md`** — original assignment brief, API endpoints, known error scenarios, expected calculation results
