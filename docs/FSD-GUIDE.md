# Feature Sliced Design Guide

This document explains what Feature Sliced Design is, how it shapes the structure of this project, and the rules every contributor must follow when adding or modifying code.

---

## 1. What is Feature Sliced Design?

Feature Sliced Design (FSD) is a modular architecture methodology for frontend applications. Rather than grouping code by technical role (models, controllers, views — the MVC pattern), FSD groups code by business concern and enforces a strict one-directional import hierarchy between layers.

The central constraint is simple: **higher layers depend on lower layers; lower layers never depend on higher ones.** This single rule eliminates circular dependencies, makes each layer independently testable, and means you can understand any slice of the codebase without reading the whole thing.

Official documentation: https://feature-sliced.design

---

## 2. The Layers in This Project

This project uses four FSD layers. The hierarchy from top to bottom is:

```
app  →  widgets  →  entities  →  shared
```

Imports travel only in the direction of the arrow. A widget may import from entities or shared. An entity may import from shared. Shared imports from nothing in `src/`.

---

### app/

**Purpose**: Application shell — Next.js routing, root layout, global CSS, page composition, and SEO metadata. The `app` layer assembles the page from widgets but contains no business logic of its own.

**Can import from**: widgets, entities, shared (any lower layer).

**Files in this project**:

| File | Role |
|------|------|
| `layout.tsx` | Root layout: Geist fonts, `<Metadata>`, `StoresPersistence` hydration wrapper |
| `page.tsx` | Home page: composes `TaxForm` and `TaxBreakdown` side by side |
| `StoresPersistence.tsx` | Client component that restores Effector stores from `localStorage` on mount |
| `opengraph-image.tsx` | Edge-rendered OG image for social sharing |
| `globals.css` | Tailwind 4 CSS-first config: `@import "tailwindcss"`, `@theme inline`, all design tokens |
| `api/tax-calculator/` | Next.js API route that proxies requests to the Flask backend |

The `app` layer is the only place where Next.js App Router conventions (`layout.tsx`, `page.tsx`, route segments) are allowed. Widget files never contain routing logic.

---

### widgets/

**Purpose**: Self-contained, feature-specific UI blocks that wire together domain state and shared components into a coherent user-facing experience. Widgets have no knowledge of routing or page structure — they receive no props from `app` other than what they read from stores via selectors.

**Can import from**: entities, shared. Never from other widgets.

**Files in this project** — `widgets/tax-calculator/`:

```
tax-calculator/
├── index.ts                      # Public barrel: TaxForm, TaxBreakdown, EmptyState,
│                                 #   LoadingState, ErrorState
├── ui/
│   ├── TaxForm.tsx               # Salary input + year select + calculate button
│   ├── SalaryInput.tsx           # Controlled input with currency mask
│   ├── YearSelect.tsx            # Dropdown for tax year selection
│   ├── CalculateButton.tsx       # Submit button with loading state
│   ├── TaxBreakdown.tsx          # Per-band results table, total, effective rate
│   ├── EmptyState.tsx            # Pre-calculation placeholder
│   ├── LoadingState.tsx          # Skeleton loader shown during fetch
│   └── ErrorState.tsx            # Two modes: server_error (retry) + not_found
└── lib/
    ├── useCalculateAction.ts     # useActionState wrapper that dispatches calculateRequested
    ├── useCalculatorState.ts     # Reads multiple selectors and composes UI state enum
    └── useRetryCalculation.ts    # Clears error and re-fires calculateRequested
```

Components in `ui/` consume Effector state exclusively through `#/entities/tax-brackets` selectors — they never import raw stores or effects directly. The three hooks in `lib/` encapsulate the only stateful logic in the widget layer, keeping component files declarative.

---

### entities/

**Purpose**: Business domain models. An entity owns the complete lifecycle of a business concept — its Effector store, the events that mutate it, the effects that fetch data for it, the `sample()` wiring that connects them, the Zod schemas that validate incoming data, and the selectors that expose derived state to the widget layer.

**Can import from**: shared only. Never from widgets or app.

**Files in this project** — `entities/tax-brackets/`:

```
tax-brackets/
├── index.ts         # Public barrel: types, TaxFormInputSchema, VALID_YEARS,
│                    #   DEFAULT_YEAR, selectors, calculateRequested
├── types.ts         # Re-exports TaxBracketsStore from shared/lib/tax/types —
│                    #   single source of truth for the store shape
└── model/
    ├── apiSchema.ts     # Zod schemas for API response + form input; zodContract
    │                    #   for @farfetched; VALID_YEARS, DEFAULT_YEAR constants
    ├── events.ts        # Effector events:
    │                    #   calculateRequested (user intent, entry point)
    │                    #   setBrackets (derived result, internal only)
    │                    #   setError (structured failure, internal only)
    │                    #   resetResults (clears output, preserves form inputs)
    ├── store.ts         # $taxBrackets store with .on() handlers for all events
    ├── effects.ts       # fetchTaxBracketsFx (createEffect + attach) wrapped in
    │                    #   taxBracketsQuery (createQuery with zodContract + retry)
    ├── samples.ts       # sample() wiring:
    │                    #   calculateRequested → taxBracketsQuery.start
    │                    #   taxBracketsQuery.finished.success → calculateTax → setBrackets
    │                    #   taxBracketsQuery.finished.failure → mapError → setError
    ├── selectors.ts     # Granular useUnit() hooks derived via $taxBrackets.map()
    │                    #   so components only re-render when their slice changes
    └── errorMapping.ts  # Declarative table: maps ApiError codes → ErrorType categories
```

The naming convention used in `events.ts` makes intent explicit: `*Requested` events carry user intent and are safe to dispatch from UI. `set*` events carry derived data and must only be dispatched from `samples.ts`. This split keeps UI components responsible for signalling intent, not for deciding what data to write.

---

### shared/

**Purpose**: Framework-agnostic, reusable building blocks with zero business knowledge. Shared utilities must be usable in any context — they must not know about tax brackets, salary, or any other domain concept.

**Can import from**: nothing in `src/`. Only third-party libraries.

**Files in this project**:

```
shared/
├── api/
│   ├── client.ts     # Generic fetch wrapper; ApiError class captures status + body;
│   │                 #   maps HTTP errors to typed error categories
│   └── index.ts      # Public barrel: apiClient, ApiError
├── lib/
│   ├── tax/
│   │   ├── calculateTax.ts  # Pure function: (salary, brackets) → { totalTax,
│   │   │                    #   effectiveRate, bands }. No side effects, no imports
│   │   │                    #   from upper layers.
│   │   ├── types.ts         # TaxBracketsStore, TaxBracket, BandBreakdown,
│   │   │                    #   TaxCalculationResult, ErrorType — single source of truth
│   │   └── index.ts
│   ├── format/
│   │   ├── currency.ts      # formatCurrency: cached Intl.NumberFormat for CAD
│   │   ├── parseCurrency.ts # parseCurrency: strips $ and commas → number
│   │   └── index.ts
│   ├── logger/
│   │   ├── logger.ts        # Custom structured logger with salary redact path
│   │   └── index.ts
│   ├── store/
│   │   └── createPersistedStore.ts  # effector-storage/local wrapper with TTL + sanitize
│   └── test/
│       └── index.ts         # RTL render wrapper pre-configured with Effector Scope
```

`shared/lib/tax/types.ts` is the single source of truth for the domain type shapes. Even though `entities/tax-brackets/types.ts` re-exports from it, the canonical definitions live in `shared` because `calculateTax.ts` (also in `shared`) must reference them without an upward import.

---

## 3. The Import Rule

```
app  →  widgets  →  entities  →  shared
```

Expanded to show all valid paths:

| Layer | May import from |
|-------|----------------|
| `app` | `widgets`, `entities`, `shared` |
| `widgets` | `entities`, `shared` |
| `entities` | `shared` |
| `shared` | nothing in `src/` (third-party libraries only) |

All imports between layers use the `#/` path alias:

```ts
// In a widget component — reading domain state via the entity's public barrel
import { selectors } from '#/entities/tax-brackets';

// In a widget hook — dispatching a domain event
import { calculateRequested } from '#/entities/tax-brackets';

// In the entities layer — calling shared utilities
import { calculateTax } from '#/shared/lib/tax';
import { logger } from '#/shared/lib/logger';
import { apiClient } from '#/shared/api';
```

ESLint enforces the import rule via `eslint-plugin-import` boundary rules configured in the project. A violation (e.g., `shared` importing from `entities`) is a lint error, not a warning.

Deep imports that reach past a slice's barrel export are also banned:

```ts
// Wrong — bypasses the entity's public API contract
import { $taxBrackets } from '#/entities/tax-brackets/model/store';

// Correct — imports through the public barrel
import { selectors } from '#/entities/tax-brackets';
```

---

## 4. Why This Project Uses FSD

**Independent evolution.** Changes to widget components (layout, design, accessibility) do not require touching entity models. Changes to the Effector store shape propagate only as far as the selectors; widget components are shielded by the selector abstraction.

**Clear ownership.** Each module has a single responsibility and a defined boundary. `calculateTax.ts` owns the bracket algorithm. `samples.ts` owns the reactive wiring. `TaxBreakdown.tsx` owns the results table rendering. No file does two things.

**Testability.** Lower layers (`shared`, `entities`) are fully testable in isolation. `calculateTax` takes two arguments and returns a value — no mocking needed. Effector models are tested with `fork()` and `allSettled()` in scoped environments with no DOM dependency. Widget components are tested with RTL against a forked scope, never against live stores.

**Scalability.** Adding a new feature means adding a new slice at the appropriate layer. It does not mean editing existing files across multiple directories. A new entity (e.g., `entities/provinces/`) is self-contained.

**Onboarding.** A new contributor can read `entities/tax-brackets/model/` and understand the complete data lifecycle for tax bracket state — fetch, validate, calculate, store, expose — without reading a single widget or app file.

---

## 5. Slice Structure

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

The `index.ts` barrel is the slice's contract. It decides what is public. Internal files (`store.ts`, `effects.ts`, component internals) are private implementation details — they are subject to change without notice to callers.

---

## 6. Anti-Patterns to Avoid

**Upward imports.** A lower layer importing from a higher layer is the most fundamental violation. Example: if `shared/lib/tax/types.ts` imported `ErrorType` from `entities/tax-brackets/types.ts` rather than defining it locally, the entire layer boundary would break. The fix is always to move the shared definition downward.

```ts
// Wrong — shared importing from entities
import type { ErrorType } from '#/entities/tax-brackets/types';

// Correct — shared defines its own types; entities re-exports them
import type { ErrorType } from '#/shared/lib/tax/types';
```

**Cross-widget imports.** One widget importing from another widget creates coupling between features. If `widgets/A` needs data that `widgets/B` also uses, that data belongs in an entity or shared utility — not in either widget.

```ts
// Wrong — widget importing from another widget
import { useSomeHook } from '#/widgets/other-feature';

// Correct — extract the shared logic to entities or shared
import { selectors } from '#/entities/some-entity';
```

**Deep imports past a barrel.** Importing directly from an internal module file bypasses the slice's public API. If the internal file is later renamed or restructured, every caller breaks.

```ts
// Wrong — deep import bypassing the public barrel
import { $taxBrackets } from '#/entities/tax-brackets/model/store';
import { fetchTaxBracketsFx } from '#/entities/tax-brackets/model/effects';

// Correct — import through the public barrel
import { selectors, calculateRequested } from '#/entities/tax-brackets';
```

**Business logic in UI components.** Widget components should read state via selectors and dispatch events via hooks. They must not contain bracket calculations, error classification, or any other domain rule.

```ts
// Wrong — domain logic inside a component
function TaxBreakdown({ salary, brackets }) {
  const totalTax = brackets.reduce((sum, b) => sum + Math.min(...), 0);
  // ...
}

// Correct — domain logic lives in shared/lib/tax/calculateTax.ts;
// component reads the pre-computed result from the store via a selector
function TaxBreakdown() {
  const totalTax = selectors.useTotalTax();
  // ...
}
```

**Dispatching `set*` events from UI.** Events named `setBrackets` and `setError` are internal to the entity model. Only `samples.ts` dispatches them. UI dispatches `calculateRequested` — the public entry point. The selectors barrel does not export `setBrackets` or `setError` precisely to enforce this.

---

## 7. Reference

- `docs/ARCHITECTURE.md` — Full stack overview, data flow narrative, technology table
- `docs/diagrams/architecture.md` — Mermaid layer hierarchy diagram and import rules diagram
- `src/README.md` — Directory listing with per-layer explanations and import rule table
