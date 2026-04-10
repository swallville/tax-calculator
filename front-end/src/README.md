# src — Feature Sliced Design Architecture

This directory is organized according to
[Feature Sliced Design (FSD)](https://feature-sliced.design/), a layered
architecture that enforces strict one-directional import rules. Each layer may
only import from layers below it — never from layers above.

## Layer Overview

```
src/
├── app/          # Next.js routing, layout, global CSS, page composition
├── widgets/      # Feature-specific composed UI components
├── entities/     # Business domain models: Effector stores, events, effects
└── shared/       # Reusable utilities, API client, UI primitives, test helpers
```

### app/

Route handlers (`page.tsx`, `layout.tsx`) and global configuration. Composes
widgets into pages. May import from any layer.

### widgets/

Self-contained feature components that wire together UI and domain state. The
`tax-calculator` widget owns `TaxForm`, `TaxBreakdown`, `ErrorState`,
`LoadingState`, and `EmptyState`. May import from `entities` and `shared`.

### entities/

Business domain models. Each entity owns its Effector store, events, effects,
selectors, Zod schemas, and wiring (`samples.ts`). Currently contains one
entity: `tax-brackets`. May import from `shared` only.

### shared/

Framework-agnostic building blocks with no domain knowledge. Sub-divided into
`api/`, `lib/`, and `ui/`. May not import from any other layer.

## Import Rules

| Layer      | May import from                 |
| ---------- | ------------------------------- |
| `app`      | `widgets`, `entities`, `shared` |
| `widgets`  | `entities`, `shared`            |
| `entities` | `shared`                        |
| `shared`   | nothing in `src/`               |

All imports use the `#/` path alias:

```ts
import { selectors } from '#/entities/tax-brackets';
import { formatCurrency } from '#/shared/lib/format';
import { apiClient } from '#/shared/api';
```

The layer direction is enforced by `no-restricted-imports` per-directory
overrides in `eslint.config.mjs`. Each rule blocks both the `#/` alias form and
the relative-path form so no loophole exists:

- `src/shared/**` cannot import from `#/entities/**`, `#/widgets/**`, or
  `#/app/**`.
- `src/entities/**` cannot import from `#/widgets/**` or `#/app/**`.
- `src/widgets/**` cannot import from `#/app/**`.

A violation produces a clear error message naming the offending layer. Import
ordering within each file (external → parent → internal → sibling) is a separate
rule (`import/order`).

## Layer READMEs

- [shared/README.md](./shared/README.md) — API client, utilities, logger, store
  persistence, test helpers
- [entities/README.md](./entities/README.md) — Business domain models and
  Effector state
