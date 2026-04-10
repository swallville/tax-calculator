# Widgets Layer

The `widgets/` layer sits at the second-highest level of the Feature Sliced
Design hierarchy. Widgets are **composed UI components** that are
feature-specific: they wire together entities, shared utilities, and domain
logic to produce a complete piece of the user interface.

## Position in the FSD Stack

```
src/app/        <- imports from widgets (and below)
src/widgets/    <- THIS LAYER
src/entities/   <- imported by widgets
src/shared/     <- imported by widgets
```

## Import Rules

Widgets **may import** from:

- `#/entities/*` — Effector stores, events, selectors, and domain types
- `#/shared/*` — Utility functions, UI primitives, API client helpers, and
  format utilities

Widgets **must not import** from:

- `#/app/*` — The app layer is above widgets in the hierarchy
- Other widgets — Cross-widget imports create coupling that violates FSD
  boundaries

## Available Widgets

| Widget           | Path                          | Description                                          |
| ---------------- | ----------------------------- | ---------------------------------------------------- |
| `tax-calculator` | `src/widgets/tax-calculator/` | Full tax calculator UI: input form + results display |

Each widget exports its public surface through its own `index.ts`. The widget
layer's barrel at `src/widgets/tax-calculator/index.ts` re-exports all five UI
components.

## Usage

```tsx
import {
  TaxForm,
  TaxBreakdown,
  EmptyState,
  LoadingState,
  ErrorState,
} from '#/widgets/tax-calculator';
```

## See Also

- [Tax Calculator Widget](./tax-calculator/README.md) — component API, props,
  states, and accessibility
- [Project README](../../README.md) — full architecture overview
