# Tax Calculator Widget

The `tax-calculator` widget is the primary feature unit of the application. It
is composed of five UI components that collectively render the full user
experience: a salary/year input form and four mutually exclusive results panels.

All components are `"use client"` unless otherwise noted. They read from and
write to the Effector store exclusively through `#/entities/tax-brackets`
selectors — no local state for domain data.

```
src/widgets/tax-calculator/
  index.ts              <- public barrel export
  lib/                  <- custom hooks (business logic decoupled from UI)
    useCalculateAction.ts   Form action: parseCurrency → Zod → dispatch
    useCalculatorState.ts   Derived display state: isPending/hasResults/hasError
    useRetryCalculation.ts  Stable retry callback from stored salary+year
    index.ts
  ui/                   <- UI components (rendering only)
    TaxForm.tsx           Composition: SalaryInput + YearSelect + CalculateButton
    SalaryInput.tsx       Salary field with $ prefix, label, error display
    YearSelect.tsx        Year dropdown from VALID_YEARS constant
    CalculateButton.tsx   Submit button with pending state
    TaxBreakdown.tsx      Results table with memoized band rows
    EmptyState.tsx        Pre-calculation placeholder
    LoadingState.tsx      Skeleton loader
    ErrorState.tsx        Error display with optional retry
    index.ts
```

## Public API

```ts
// UI components
import {
  TaxForm,
  TaxBreakdown,
  EmptyState,
  LoadingState,
  ErrorState,
  SalaryInput,
  YearSelect,
  CalculateButton,
} from '#/widgets/tax-calculator';

// Hooks
import {
  useCalculateAction,
  useCalculatorState,
  useRetryCalculation,
} from '#/widgets/tax-calculator/lib';
```

## Custom Hooks

| Hook                  | Responsibility                                                                         | Used By      |
| --------------------- | -------------------------------------------------------------------------------------- | ------------ |
| `useCalculateAction`  | Form action: parses currency input, validates via Zod, dispatches `calculateRequested` | `TaxForm`    |
| `useCalculatorState`  | Derives `isPending`, `hasResults`, `hasError` from entity selectors                    | `page.tsx`   |
| `useRetryCalculation` | Returns a stable callback that retries with stored salary/year                         | `ErrorState` |

### Why hooks?

Each hook encapsulates a single scope of functionality:

- **TaxForm** no longer knows about `parseCurrency`, `TaxFormInputSchema`, or
  `useActionState` internals
- **page.tsx** no longer derives boolean flags from raw selectors
- **ErrorState** no longer reads `salary`/`year` just to construct a retry
  payload

This makes each unit independently testable and incrementally evolvable.

## Sub-Components

| Component         | Props                                   | Responsibility                                                  |
| ----------------- | --------------------------------------- | --------------------------------------------------------------- |
| `SalaryInput`     | `error?: string[]`, `disabled: boolean` | Salary label + $ icon + input + error display                   |
| `YearSelect`      | `error?: string[]`, `disabled: boolean` | Year label + chevron icon + select (from `VALID_YEARS`) + error |
| `CalculateButton` | `isPending: boolean`                    | Submit button with "Calculate" / "Calculating..." text          |

All five components take **no props**. They derive all state from Effector
selectors.

---

## TaxForm

**File**: `ui/TaxForm.tsx`

The primary input surface. Uses React 19 `useActionState` to process form
submissions without manual `onChange` state. Validation runs through Zod
`safeParse` before dispatching to the Effector event.

### Form Data Flow

```
FormData (salary, year)
  -> Number() coercion
  -> TaxFormInputSchema.safeParse()
  -> on success: calculateRequested({ salary, year })
  -> on failure: field-level errors rendered inline
```

`TaxFormInputSchema` is a Zod schema exported from `#/entities/tax-brackets`. It
validates that `salary` is a positive finite number and `year` is one of
`2019 | 2020 | 2021 | 2022`.

### Salary Input

- `type="text"` with `inputMode="decimal"` — allows decimal entry on mobile
  numeric keyboards while avoiding browser formatting conflicts with
  `type="number"`
- Dollar sign icon (`aria-hidden="true"`) is absolutely positioned at `left-4`,
  with `pl-10` padding on the input to reserve space
- Placeholder text: `"e.g. 100,000"`
- Disabled when `isPending` is `true` (query in flight)
- `aria-invalid` is set to `true` when `state.errors.salary` is populated
- `aria-describedby="salary-error"` links the input to its error paragraph when
  an error is present

### Year Dropdown

- `<select>` with four `<option>` values: `2022` (default), `2021`, `2020`,
  `2019`
- `defaultValue="2022"` — pre-selects the most recent supported tax year
- Custom chevron SVG (`aria-hidden="true"`) is absolutely positioned at
  `right-4`; `appearance-none` removes the native dropdown arrow
- Same disabled/`aria-invalid`/`aria-describedby` pattern as the salary input

### Submit Button

- `aria-busy={isPending}` communicates loading state to assistive technology
- Label switches from `"Calculate"` to `"Calculating..."` while pending
- Scale micro-interactions: `hover:scale-[1.02]`, `active:scale-[0.98]`

### `data-testid` Attributes

| Attribute          | Element                          |
| ------------------ | -------------------------------- |
| `tax-form`         | Outer `<section>`                |
| `salary-input`     | Salary `<input>`                 |
| `salary-error`     | Salary error `<p>` (conditional) |
| `year-select`      | Year `<select>`                  |
| `year-error`       | Year error `<p>` (conditional)   |
| `calculate-button` | Submit `<button>`                |

### Design Tokens Used

| Token                   | Usage                     |
| ----------------------- | ------------------------- |
| `bg-bg-card`            | Card background           |
| `bg-bg-input`           | Input/select background   |
| `border-border-input`   | Input/select border       |
| `text-text-primary`     | Heading and input text    |
| `text-text-secondary`   | Label text and $ icon     |
| `text-text-muted`       | Placeholder text          |
| `text-status-error`     | Inline validation errors  |
| `bg-btn-primary`        | Submit button fill        |
| `bg-btn-primary-hover`  | Submit button hover fill  |
| `bg-btn-primary-active` | Submit button active fill |
| `ring-ring-focus`       | Focus ring on inputs      |

---

## TaxBreakdown

**File**: `ui/TaxBreakdown.tsx`

Renders the per-bracket tax breakdown table and the effective rate summary.
Returns `null` when `bands` is empty (i.e., before a calculation has completed).

### Internal Components

**`BandRow`** is a `React.memo`-wrapped row component that takes
`BandBreakdown & { index: number }` as props. Memoisation prevents row
re-renders when unrelated store state changes. Rows use `index % 2` for
alternating background colours (`bg-bg-highlight` / `bg-bg-sub`) and an
`animationDelay` of `index * 50ms` for the stagger entry animation.

### Table Structure

```
<table data-testid="tax-table">
  <thead>
    <tr>  Bracket Range | Rate | Tax  </tr>
  </thead>
  <tbody>
    {bands.map((band, i) => <BandRow key={band.min} {...band} index={i} />)}
  </tbody>
  <tfoot>
    <tr data-testid="total-row">  Total Tax | (empty) | formatted total  </tr>
  </tfoot>
</table>
```

Column headers use `scope="col"` for correct screen-reader association.

### Effective Rate Pill

Below the table, the effective rate is displayed as a `<span>` pill styled with
`bg-pill-bg` and `text-pill-text` (a `rgba(78, 202, 160, 0.1)` background with a
`#4ECAA0` teal foreground). `formatPercent()` from `#/shared/lib/format`
converts the raw decimal to a percentage string.

### Accessibility

- Outer `<section>` uses `aria-labelledby="tax-breakdown-heading"` linked to the
  visible `<h2>` so landmark navigation announces the visible heading
- **Live region is on the persistent wrapper in `page.tsx`**, NOT on this
  section. NVDA and JAWS do not reliably announce content on dynamically mounted
  elements, so the `aria-live="polite"` and `aria-atomic="true"` attributes live
  on the always-mounted `results-panel` div in the app layer.
- `<th scope="col">` on all column headers, `<th scope="row">` on the "Total
  Tax" row header, `aria-hidden="true"` on the empty spacer `<td>`
- `aria-label` on the total value cell gives screen readers the full "Total Tax:
  $17,739.17" announcement

### `data-testid` Attributes

| Attribute          | Element                             |
| ------------------ | ----------------------------------- |
| `tax-breakdown`    | Outer `<section>`                   |
| `tax-table`        | `<table>`                           |
| `band-row-{index}` | Each `<BandRow>` `<tr>` (0-indexed) |
| `total-row`        | Totals `<tr>` in `<tfoot>`          |
| `effective-rate`   | Effective rate container `<div>`    |

### Design Tokens Used

| Token                           | Usage                                         |
| ------------------------------- | --------------------------------------------- |
| `bg-bg-card`                    | Card background                               |
| `bg-bg-highlight`               | Even-index band rows                          |
| `bg-bg-sub`                     | Odd-index band rows                           |
| `bg-bg-row-hover`               | Row hover state                               |
| `bg-bg-total`                   | Total row background                          |
| `border-border-subtle`          | Header bottom border and total row top border |
| `text-text-primary`             | Headings and total row values                 |
| `text-text-secondary`           | Band range and tax amount cells               |
| `text-text-muted`               | Column header labels                          |
| `text-text-accent`              | Rate column values                            |
| `bg-pill-bg` / `text-pill-text` | Effective rate pill                           |

---

## EmptyState

**File**: `ui/EmptyState.tsx`

Shown before any calculation has been submitted. Renders a decorative document
SVG icon and instructional copy.

**Props**: none

**Accessibility**: The root `<div>` has `role="status"` and
`aria-label="No calculation yet"`. The SVG icon is `aria-hidden="true"`.

**`data-testid`**: `empty-state`

**Design tokens**: `text-text-muted` (icon colour at 40% opacity),
`text-text-primary` (heading), `text-text-muted` (body copy).

---

## LoadingState

**File**: `ui/LoadingState.tsx`

A skeleton loader displayed while the tax brackets query is in flight. Mimics
the structure of `TaxBreakdown` (heading bar, five band rows, total row) using
`animate-pulse` rectangles, so the layout shift on result arrival is minimal.

**Props**: none

**Accessibility**: `role="status"` and `aria-label="Loading tax calculation"` on
the root `<div>`. A visually hidden `<span class="sr-only">` provides the text
`"Calculating your taxes..."` for screen readers.

**Skeleton structure**:

```
heading bar (40% width)
5x band row skeletons (alternating bg-bg-highlight / bg-bg-sub)
  each row: 45% wide cell | 20% wide cell | 25% wide cell (right-aligned)
total row skeleton (bg-bg-total, 30% + 25% cells)
```

**`data-testid`**: `loading-state`

**Animation**: Tailwind `animate-pulse` (maps to the built-in `pulse` keyframe).
The `@media (prefers-reduced-motion: reduce)` rule in `globals.css` cuts
animation duration to `0.01ms`, effectively disabling the pulse for users who
prefer reduced motion.

---

## ErrorState

**File**: `ui/ErrorState.tsx`

Renders when `$taxBrackets.error` and `$taxBrackets.errorType` are both
non-null. Returns `null` otherwise.

### Error Modes

Behaviour is driven by a static `ERROR_CONFIG` lookup table typed as
`Record<NonNullable<ErrorType>, { title: string; showRetry: boolean }>`:

| `errorType`    | `title`              | Retry button |
| -------------- | -------------------- | ------------ |
| `server_error` | "Calculation Failed" | Yes          |
| `not_found`    | "Year Not Supported" | No           |

The `not_found` case occurs when the backend returns a 404, indicating no
bracket data exists for the requested year. No retry is offered because
resubmitting the same year would yield the same result.

### Retry Button

When `config.showRetry` is `true`, a "Try Again" button is rendered. Clicking it
dispatches `calculateRequested({ salary, year })` using the current values from
the store, replaying the last attempted calculation without requiring the user
to re-enter their data.

**`data-testid`**: `retry-button`

### Accessibility

The root `<div>` has `role="alert"`, which causes screen readers to announce the
error immediately when it appears. The error icon SVG is `aria-hidden="true"`.

### `data-testid` Attributes

| Attribute      | Element                        |
| -------------- | ------------------------------ |
| `error-state`  | Root `<div>`                   |
| `retry-button` | Retry `<button>` (conditional) |

### Design Tokens Used

| Token                 | Usage                            |
| --------------------- | -------------------------------- |
| `bg-bg-error`         | Error card background            |
| `border-status-error` | Left accent border on error card |
| `text-status-error`   | Error icon and title text        |
| `text-text-secondary` | Error message body               |
| `text-text-accent`    | Retry button border and text     |
| `ring-ring-focus`     | Retry button focus ring          |

---

## See Also

- [Widgets Layer](../README.md) — FSD layer overview and import rules
- `#/entities/tax-brackets` — Effector store, events, and Zod schemas consumed
  by these components
- `#/shared/lib/format` — `formatCurrency` and `formatPercent` used by
  `TaxBreakdown`
