# entities/tax-brackets — Tax Brackets Entity

The `tax-brackets` entity owns the entire lifecycle of a tax calculation: from
receiving a user's salary and year through fetching bracket data from the API,
running the calculation algorithm, and exposing the results to widgets via typed
selectors.

Parent: [entities/README.md](../README.md)

## Directory Structure

```
tax-brackets/
├── index.ts              # Public API barrel
├── types.ts              # TaxBracketsStore, ErrorType (re-exports shared types)
└── model/
    ├── index.ts          # Internal barrel (re-exports all model files)
    ├── store.ts          # $taxBrackets store and .on() handlers
    ├── events.ts         # calculateRequested, setBrackets, setError, resetResults
    ├── effects.ts        # fetchTaxBracketsFx, taxBracketsQuery (cache + retry)
    ├── samples.ts        # Reactive wiring: event → query → calculateTax → store
    ├── selectors.ts      # useUnit hooks consumed by widgets
    ├── apiSchema.ts      # Zod schemas: TaxBracketsResponseContract, TaxFormInputSchema
    ├── errorMapping.ts   # Declarative error-to-user-message mapping
    ├── tax-brackets.test.ts  # Store and sample wiring tests (fork/allSettled)
    ├── effects.test.ts   # Real effect body and retry filter tests
    └── selectors.test.tsx    # Selector function body coverage tests
```

---

## Store

### `$taxBrackets: StoreWritable<TaxBracketsStore>`

The single source of truth for the calculation state.

```ts
interface TaxBracketsStore {
  salary: number; // last submitted salary (0 before first submission)
  year: number; // last submitted tax year (2022 by default)
  totalTax: number; // calculated total tax owed
  effectiveRate: number; // totalTax / salary as a decimal
  bands: BandBreakdown[]; // per-bracket breakdown; empty until a successful calculation
  error: string | null; // user-facing error message, null on success
  errorType: ErrorType; // 'server_error' | 'not_found' | null
}
```

**Initial state (`INITIAL_DATA`):**

```ts
{
  salary: 0, year: 2022, totalTax: 0, effectiveRate: 0,
  bands: [], error: null, errorType: null
}
```

---

## Events

Declared in `model/events.ts`. Use `selectors.useCalculateRequested()` and
`selectors.useResetResults()` from components instead of importing events
directly.

| Event                | Payload                                                | Effect on store                                          |
| -------------------- | ------------------------------------------------------ | -------------------------------------------------------- |
| `calculateRequested` | `{ salary: number; year: number }`                     | Sets `salary`, `year`; clears `error` / `errorType`      |
| `setBrackets`        | `{ totalTax, effectiveRate, bands }`                   | Updates results; clears error fields                     |
| `setError`           | `{ error: string; errorType: NonNullable<ErrorType> }` | Sets error fields; zeroes results                        |
| `resetResults`       | `void`                                                 | Zeroes results and errors; preserves `salary` and `year` |

---

## Effects

### `fetchTaxBracketsFx`

A raw Effector effect that calls `apiClient` and returns the bracket data.
Throws `ApiError` on non-ok responses.

```ts
fetchTaxBracketsFx: Effect<number, TaxBracketsResponse, Error>;
// params: year (e.g. 2022)
// done:   { tax_brackets: TaxBracket[] }
// fail:   ApiError | Error
```

### `taxBracketsQuery`

A `@farfetched` query wrapping `fetchTaxBracketsFx`. Adds Zod contract
validation (see `TaxBracketsResponseContract`), in-memory caching, and retry
logic.

| Configuration   | Value                                   |
| --------------- | --------------------------------------- |
| Contract        | `TaxBracketsResponseContract` (Zod)     |
| Cache duration  | 5 minutes (`staleAfter: '5m'`)          |
| Retry attempts  | 3                                       |
| Retry delay     | 1000 ms                                 |
| Retry condition | Only on `ApiError` with `status >= 500` |

The retry filter explicitly blocks retries for 4xx errors (client errors such as
an unsupported year), which fail immediately.

---

## Samples (Reactive Wiring)

`model/samples.ts` connects events, the query, the calculation algorithm, and
the store using Effector's `sample`. Nothing in this file creates new state — it
only wires existing pieces together.

```
calculateRequested
  │
  ├─ [store.on]──→ $taxBrackets.salary & year updated synchronously
  │
  └─ [sample]──→ taxBracketsQuery.start (params: year)
                      │
          ┌───────────┴───────────┐
          │                       │
   finished.success         finished.failure
          │                       │
   [sample, source:           [sample]
   $taxBrackets]                  │
          │                   mapError(error)
   calculateTax(                  │
     salary,              setError({ error, errorType })
     result.tax_brackets          │
   )                        $taxBrackets.error &
          │                  errorType updated
   setBrackets(result)
          │
   $taxBrackets.totalTax,
   effectiveRate, bands updated
```

Key design decision: the `finished.success` sample reads `salary` from
`$taxBrackets` (not from the event payload) because `calculateRequested`'s
`.on()` handler updates the store synchronously before the async fetch
completes. This eliminates the need to pass salary through the query and ensures
the calculation always uses the value that was in the store when the query
settled.

---

## Selectors

`model/selectors.ts` exposes all reactive reads and bound events as a single
`selectors` object. Every selector is a React hook backed by `useUnit`.

```ts
import { selectors } from '#/entities/tax-brackets';
```

| Selector                  | Return type         | Used by                                  |
| ------------------------- | ------------------- | ---------------------------------------- |
| `useTotalTax()`           | `number`            | `TaxBreakdown`                           |
| `useEffectiveRate()`      | `number`            | `TaxBreakdown`                           |
| `useBands()`              | `BandBreakdown[]`   | `TaxBreakdown`                           |
| `useError()`              | `string \| null`    | `ErrorState`                             |
| `useErrorType()`          | `ErrorType`         | `ErrorState`                             |
| `useYear()`               | `number`            | `ErrorState` (retry)                     |
| `useSalary()`             | `number`            | `ErrorState` (retry)                     |
| `useIsPending()`          | `boolean`           | `TaxForm` (disables inputs during fetch) |
| `useCalculateRequested()` | `(payload) => void` | `TaxForm`, `ErrorState`                  |
| `useResetResults()`       | `() => void`        | Available; not yet wired to a UI trigger |

Each selector maps a slice of `$taxBrackets` via `.map()` so components only
re-render when their specific slice changes.

---

## Error Mapping

`model/errorMapping.ts` uses a declarative `ERROR_MAPPINGS` array to translate
thrown errors into user-facing messages and `ErrorType` values. The
`mapError(error)` function iterates the array and returns the first match, or
falls back to `DEFAULT_ERROR`.

**Current mappings:**

| Condition                        | `errorType`      | User message                                                        | Log level |
| -------------------------------- | ---------------- | ------------------------------------------------------------------- | --------- |
| `ApiError` with `status === 404` | `'not_found'`    | "Unsupported tax year. Please select a year between 2019 and 2022." | `warn`    |
| `ApiError` with `status >= 500`  | `'server_error'` | "Something went wrong. Please try again."                           | `error`   |
| Any other error                  | `'server_error'` | "An unexpected error occurred."                                     | `error`   |

**To add a new error type:**

1. Add the string literal to the `ErrorType` union in `types.ts`.
2. Add an entry to `ERROR_MAPPINGS` in `errorMapping.ts` with a `match`
   predicate, user message, `errorType`, `logLevel`, and `logMessage`.
3. Add the new `errorType` key to `ERROR_CONFIG` in `ErrorState.tsx`.

No changes to `mapError()` itself are required.

---

## Zod Schemas

Declared in `model/apiSchema.ts`.

### `TaxBracketsResponseSchema`

Validates the Flask API response before it reaches `calculateTax`. Used by
`taxBracketsQuery` as the `@farfetched` contract.

```ts
z.object({
  tax_brackets: z.array(
    z.object({
      min: z.number(),
      max: z.number().optional(),
      rate: z.number().min(0).max(1),
    }),
  ),
});
```

If the API returns a response that does not match this schema,
`taxBracketsQuery.finished.failure` fires and the error is routed through
`mapError`.

### `TaxFormInputSchema`

Validates raw form data before `calculateRequested` is dispatched. Used by
`TaxForm` via React 19's `useActionState`.

```ts
z.object({
  salary: z.number().finite().min(0),
  year: z.number().refine(y => [2019, 2020, 2021, 2022].includes(y)),
});
```

Validation errors surface as field-level messages next to the inputs;
`calculateRequested` is never called with invalid data.

---

## Testing

Tests are split across three files using the `fork` / `allSettled` pattern from
Effector's test utilities. Each test gets an isolated scope so store state never
leaks between tests.

### Pattern: forking the store and settling an event

```ts
import { fork, allSettled } from 'effector';
import { $taxBrackets, INITIAL_DATA } from './store';
import { fetchTaxBracketsFx } from './effects';
import { calculateRequested } from './events';
import './samples'; // must be imported to activate sample wiring

it('calculates tax on success', async () => {
  const scope = fork({
    handlers: [
      [
        fetchTaxBracketsFx,
        () =>
          Promise.resolve({
            tax_brackets: [{ min: 0, max: 50197, rate: 0.15 }],
          }),
      ],
    ],
  });

  await allSettled(calculateRequested, {
    scope,
    params: { salary: 50000, year: 2022 },
  });

  const state = scope.getState($taxBrackets);
  expect(state.totalTax).toBeGreaterThan(0);
  expect(state.error).toBeNull();
});
```

### Pattern: pre-seeding store state

```ts
const scope = fork({
  values: [
    [
      $taxBrackets,
      {
        ...INITIAL_DATA,
        error: 'old error',
        errorType: 'server_error' as const,
      },
    ],
  ],
});
```

### Pattern: asserting mid-flight store state

Use a stalling effect handler and flush microtasks with
`await Promise.resolve()` to inspect the store after `calculateRequested`'s
`.on()` handler fires but before the async fetch completes (see
`tax-brackets.test.ts` — "updates salary and year and clears error before
fetch").

### Adding a new test

1. Pick the appropriate test file based on what you are testing:
   - Store `.on()` handlers or sample wiring → `tax-brackets.test.ts`
   - Real effect body or retry filter → `effects.test.ts`
   - Selector function bodies → `selectors.test.tsx`
2. Import `'./samples'` at the top if the test involves the full
   `calculateRequested` flow.
3. Create a fresh `scope = fork(...)` inside the test — never share scope
   between tests.
4. Use `handlers` to replace `fetchTaxBracketsFx` with a mock; use `values` to
   seed specific store state.
5. `await allSettled(event, { scope, params })` before asserting.
