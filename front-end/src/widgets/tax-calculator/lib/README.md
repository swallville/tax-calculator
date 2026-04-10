# tax-calculator/lib — Custom Hooks

Business logic hooks extracted from UI components to enforce
single-responsibility and enable isolated testing.

Parent: [../README.md](../README.md)

## Why custom hooks?

Each hook encapsulates one scope of functionality:

| Before (coupled)                                                             | After (decoupled)                                     |
| ---------------------------------------------------------------------------- | ----------------------------------------------------- |
| `TaxForm` knew about `parseCurrency`, `TaxFormInputSchema`, `useActionState` | `useCalculateAction` owns all form action logic       |
| `page.tsx` derived `hasResults`/`hasError` inline                            | `useCalculatorState` owns display state derivation    |
| `ErrorState` read `salary`/`year` just to build retry payload                | `useRetryCalculation` owns retry payload construction |

This means:

- Each hook can be **tested without rendering a component** (via `renderHook`)
- Components become **pure renderers** — they receive data from hooks and render
  JSX
- Adding new behavior (e.g., debounce on salary input) happens in the hook, not
  the component

## Hooks

### `useCalculateAction()`

Returns `{ state, formAction, isPending }` for wiring to a
`<form action={formAction}>`.

Internally:

1. Reads `calculateRequested` event and `isPending` from Effector selectors
2. Defines `calculateAction` that parses currency input → validates via Zod →
   dispatches event
3. Wraps in React 19's `useActionState`

### `useCalculatorState()`

Returns `{ isPending, hasResults, hasError }` — three booleans that drive which
panel to render.

Internally reads `useIsPending()`, `useError()`, `useBands()` from Effector and
derives the boolean flags. The priority order (pending > error > results >
empty) is documented in the hook.

### `useRetryCalculation()`

Returns a stable `retry()` callback (memoized via `useCallback`).

Internally reads `salary` and `year` from the store and dispatches
`calculateRequested({ salary, year })`. The component calling `retry()` doesn't
need to know about salary or year at all.

## Testing

All hooks are tested via `renderHook` from `@testing-library/react`:

```bash
npx jest src/widgets/tax-calculator/lib/
```

- `useCalculateAction.test.tsx` — renders a test form, submits, verifies
  dispatch
- `useCalculatorState.test.ts` — mocks selectors, verifies derived booleans
- `useRetryCalculation.test.ts` — verifies dispatch payload and callback
  stability

## FSD Placement

Per Feature Sliced Design, widget-level hooks live in `widgets/<name>/lib/` —
they may import from `entities/` and `shared/` but never from other widgets or
`app/`.
