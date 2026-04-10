# shared — Shared Layer

The `shared` layer contains framework-agnostic, domain-free building blocks that
every other layer may import. It has no knowledge of tax brackets, Effector
models, or application routing.

**Import rule:** `shared` must never import from `entities`, `widgets`, or
`app`.

## Directory Structure

```
shared/
├── api/          # Generic fetch wrapper and ApiError class
└── lib/
    ├── format/   # Intl.NumberFormat wrappers for currency and percent
    ├── logger/   # Pino structured logger with salary redaction
    ├── store/    # Effector store persistence with TTL
    ├── tax/      # calculateTax() algorithm and shared domain types
    └── test/     # RTL render wrapper with application providers
```

## Sub-module READMEs

- [api/README.md](./api/README.md) — `apiClient<T>()`, `ApiError`, proxy
  configuration
- [lib/README.md](./lib/README.md) — Overview of all `lib/` modules with usage
  examples

## Public API

Each sub-directory exposes its public surface through an `index.ts` barrel file.
Import from the barrel, not from internal files:

```ts
import { apiClient, ApiError } from '#/shared/api';
import { calculateTax } from '#/shared/lib/tax';
import { formatCurrency, formatPercent } from '#/shared/lib/format';
import { logger } from '#/shared/lib/logger';
import { createPersistedStore } from '#/shared/lib/store';
import { render } from '#/shared/lib/test';
```
