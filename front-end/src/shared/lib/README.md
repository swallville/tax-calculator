# shared/lib — Library Modules

Pure utility modules with no framework or domain dependencies (except `store/`,
which takes an Effector `StoreWritable`). Each module is independently testable
and has its own barrel `index.ts`.

Parent: [shared/README.md](../README.md)

## Modules

### `tax/` — Tax Calculation Algorithm

Contains the `calculateTax()` function and the three shared domain types used by
both the algorithm and the `tax-brackets` entity.

**Public API:**

```ts
import { calculateTax } from '#/shared/lib/tax';
import type {
  TaxBracket,
  BandBreakdown,
  TaxCalculationResult,
} from '#/shared/lib/tax';
```

**Types:**

```ts
interface TaxBracket {
  min: number;
  max?: number; // undefined means the bracket has no upper bound
  rate: number; // 0–1 decimal (e.g. 0.15 for 15%)
}

interface BandBreakdown {
  min: number;
  max: number | undefined;
  rate: number;
  tax: number; // tax owed within this bracket, rounded to 2 decimal places
}

interface TaxCalculationResult {
  totalTax: number; // sum of all band taxes, rounded to 2 dp
  effectiveRate: number; // totalTax / salary, rounded to 4 dp
  bands: BandBreakdown[];
}
```

**Algorithm summary:**

`calculateTax(salary, brackets)` iterates every bracket and computes the taxable
amount within that band using `Math.min`/`Math.max` clamping. Each band's tax is
rounded to 2 decimal places before accumulation. A final rounding pass ensures
`totalTax` and `effectiveRate` are stored at consistent precision.

Guard conditions return the zero result
(`{ totalTax: 0, effectiveRate: 0, bands: [] }`) when:

- `salary` is `<= 0`, `NaN`, or `Infinity`
- `brackets` is empty

**Usage:**

```ts
const result = calculateTax(100000, [
  { min: 0, max: 50197, rate: 0.15 },
  { min: 50197, max: 100392, rate: 0.205 },
]);
// result.totalTax    → 17739.17
// result.effectiveRate → 0.1774
// result.bands[0].tax  → 7529.55
// result.bands[1].tax  → 10209.62
```

---

### `format/` — Number Formatting

Cached `Intl.NumberFormat` instances for en-CA locale. Formatters are created
once at module load time and reused on every call to avoid repeated object
allocation.

**Public API:**

```ts
import { formatCurrency, formatPercent } from '#/shared/lib/format';
```

**`formatCurrency(amount: number): string`**

Formats a number as Canadian dollars with exactly 2 decimal places and comma
separators.

```ts
formatCurrency(17739.17); // 'CA$17,739.17' (exact output depends on JS engine locale data)
formatCurrency(0); // 'CA$0.00'
```

**`formatPercent(rate: number): string`**

Formats a decimal rate (0–1) as a percentage string with exactly 2 decimal
places. Used to display both bracket rates and the effective rate.

```ts
formatPercent(0.15); // '15.00%'
formatPercent(0.1774); // '17.74%'
```

---

### `logger/` — Structured Logger

A Pino logger instance configured for browser and Node.js environments. The
logger redacts salary values to prevent accidental PII exposure in log output.

**Public API:**

```ts
import { logger } from '#/shared/lib/logger';
```

**Configuration:**

| Setting                  | Value                                               |
| ------------------------ | --------------------------------------------------- |
| Browser mode             | `asObject: true` (outputs plain objects to console) |
| Level (production)       | `info`                                              |
| Level (development/test) | `debug`                                             |
| Redacted paths           | `salary`, `*.salary`                                |

**Usage:**

```ts
// Safe — tax results contain no PII
logger.info({ totalTax: 17739.17, effectiveRate: 0.1774 }, 'Tax calculated');

// Safe — salary is redacted in output even though it is present in the object
logger.info({ salary: 100000, totalTax: 17739.17 }, 'Calculation debug');

// Error with context
logger.error({ status: 500 }, 'Server error fetching brackets');
```

Never log raw salary amounts. Log only `totalTax` and `effectiveRate` from
calculation results.

---

### `store/` — Effector Store Persistence

Wraps `effector-storage/local` with TTL (time-to-live) expiry and a sanitize
callback for stripping sensitive state before it reaches `localStorage`.

**Public API:**

```ts
import { createPersistedStore } from '#/shared/lib/store';
```

**`createPersistedStore<T>(store, key, options?)`**

Attaches a persistence adapter to an existing Effector `StoreWritable`. No-ops
on the server (`typeof window === 'undefined'`).

```ts
interface PersistOptions<T> {
  sanitize?: (state: T) => T; // strip sensitive fields before serializing
  ttlMs?: number; // milliseconds; expired entries are removed and
  // the store reverts to its default value
}
```

**Usage:**

```ts
import { createStore } from 'effector';
import { createPersistedStore } from '#/shared/lib/store';

const $prefs = createStore({ theme: 'dark', year: 2022 });

createPersistedStore($prefs, 'user-prefs', {
  ttlMs: 24 * 60 * 60 * 1000, // 24 hours
  sanitize: state => ({ ...state }), // deep-clone if needed
});
```

Serialized format in `localStorage`:

```json
{ "data": { "theme": "dark", "year": 2022 }, "ts": 1712345678901 }
```

On deserialization, if `Date.now() - ts > ttlMs` the entry is removed and
`undefined` is returned, causing the store to fall back to its `createStore`
default.

---

### `test/` — Test Utilities

A custom RTL `render` wrapper that pre-wraps components in the application's
provider tree (`WithProviders`). Re-exports everything from
`@testing-library/react` so test files only need a single import.

**Public API:**

```ts
import { render, screen, fireEvent, waitFor } from '#/shared/lib/test';
```

**Usage:**

```tsx
import { render, screen } from '#/shared/lib/test';
import { MyComponent } from './MyComponent';

it('renders without crashing', () => {
  render(<MyComponent />);
  expect(screen.getByRole('button')).toBeInTheDocument();
});
```

The `WithProviders` wrapper is the single place to add future context providers
(e.g., a theme provider or Effector scope provider) without updating every test
file.
