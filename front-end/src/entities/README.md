# entities — Entity Layer

The `entities` layer contains business domain models. Each entity owns its
complete state machine: Effector stores, events, effects, sample wiring,
selectors, Zod schemas, and TypeScript types.

**Import rule:** entities may import from `shared` only. They must never import
from `widgets` or `app`.

## What is an Entity?

In Feature Sliced Design an entity represents a core business concept —
something the application thinks about independently of any particular screen or
feature. An entity encapsulates all state and behavior related to that concept.

## Current Entities

```
entities/
└── tax-brackets/   # Tax bracket data, calculation results, and query lifecycle
```

## Entities and Effector

Each entity's `model/` directory contains Effector primitives organized by
concern:

| File              | Contains                                                          |
| ----------------- | ----------------------------------------------------------------- |
| `store.ts`        | `createStore`, `.on()` handlers                                   |
| `events.ts`       | `createEvent` declarations                                        |
| `effects.ts`      | `createEffect`, `createQuery`, `cache`, `retry`                   |
| `samples.ts`      | `sample` wiring — the reactive glue between events/effects/stores |
| `selectors.ts`    | `useUnit` hooks consumed by widgets                               |
| `apiSchema.ts`    | Zod schemas for API response validation and form input            |
| `errorMapping.ts` | Declarative error-to-message mapping                              |

## Public Surface

Entities expose a minimal public API through their root `index.ts`:

```ts
// Types
export type {
  TaxBracket,
  BandBreakdown,
  TaxCalculationResult,
  ErrorType,
  TaxBracketsStore,
};

// Zod schema (used by TaxForm for client-side validation)
export { TaxFormInputSchema };

// Selectors (used by all widgets)
export { selectors };

// Event (used by TaxForm to trigger the calculation flow)
export { calculateRequested };
```

Internal model files (`store.ts`, `effects.ts`, `samples.ts`, etc.) are not part
of the public API and must not be imported directly by widgets.

## Entity READMEs

- [tax-brackets/README.md](./tax-brackets/README.md) — Complete reference for
  the tax-brackets entity
