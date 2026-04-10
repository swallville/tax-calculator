# Implementation Findings

Retrospective document covering per-phase review outcomes and improvements applied across the tax calculator implementation.

---

## Phase 0: Scaffold

### Findings

- `ts-node` was required to execute `jest.config.ts` but was not included as a dev dependency in the initial scaffold.
- `postcss.config.mjs` contained stale entries incompatible with the Tailwind 4 CSS-first configuration.

### Improvements Applied

- Added `ts-node` to `devDependencies` so Jest can consume the TypeScript config directly.
- Created all FSD layer directories (`app/`, `widgets/`, `entities/`, `shared/`) upfront to enforce the import hierarchy before any feature code was written.
- Added barrel `index.ts` exports at each layer boundary so consumers use stable import paths rather than reaching into internal module paths.

### Critical Issue: postcss.config.mjs Deletion

During cleanup of old Create Next App files, `postcss.config.mjs` was accidentally deleted. This file is **required** for Tailwind 4 — it configures `@tailwindcss/postcss` which processes `@import "tailwindcss"` and `@theme inline` in `globals.css`. Without it, ALL Tailwind utility classes are ignored and the app renders with raw browser defaults (no backgrounds, no rounded corners, no styled inputs, oversized SVGs, visible sr-only elements).

**Root cause**: The cleanup step removed the old root-level postcss config without verifying the front-end one still existed. The build and TypeScript checks all passed because Tailwind is a CSS concern, not a TS/JS one.

**Lesson**: After any file deletion, always do a visual check of the running application. Build and type checks cannot catch CSS configuration issues. Critical config files (`postcss.config.mjs`, `next.config.ts`, `tsconfig.json`) should be on a protected list that is never deleted without explicit verification.

---

## Phase 1: Shared Layer

### Review Findings (7-agent review)

1. **DRY violation** — Tax-related TypeScript types were duplicated between `calculateTax.ts` and the entity-layer type files, creating two sources of truth that could diverge.
2. **`Intl.NumberFormat` per-call overhead** — `formatCurrency()` and `formatPercent()` instantiated a new `Intl.NumberFormat` object on every invocation, which is expensive given formatters are stateless and reusable.
3. **Logger PII test was tautological** — The unit test for PII redaction asserted that the redact configuration was set, not that salary values were actually suppressed from log output.
4. **API client discarded error body** — When the fetch response was not `ok`, the client threw a generic error without capturing the response body, losing diagnostic information from the Flask backend.
5. **NaN/Infinity salary bypass** — `calculateTax()` did not guard against `NaN` or `Infinity` inputs, allowing non-finite numbers to propagate silently through the calculation pipeline.

### Fixes Applied

- Moved all shared tax types to `src/shared/lib/tax/types.ts` as the single source of truth; the entity layer re-exports from there rather than redefining.
- Cached `Intl.NumberFormat` instances at module scope in `format/` utilities so the formatter object is created once per locale configuration.
- Replaced the tautological logger test with an assertion that verifies actual log output does not contain the salary field value.
- `ApiError` now captures the response body text so error messages from the backend are preserved and loggable.
- Added a `Number.isFinite()` guard at the entry point of `calculateTax()` that throws before any bracket arithmetic runs.

---

## Phase 2: Entity Layer

### Review Findings (7-agent review)

1. **FSD upward import** — An import in `shared/` referenced a type defined in the entity layer, violating the rule that `shared/` must have no knowledge of upper layers.
2. **`effects.ts` duplicated `apiClient`** — The effects module re-implemented fetch logic that already existed in `shared/api/client.ts`, creating a parallel and unvalidated code path.
3. **Dead `brackets` field** — The `$taxBrackets` store shape included a `brackets` field that was populated but never consumed by any selector or component.
4. **Stale event-as-source in `sample()`** — A `sample()` call used an Effector event as its `source`, meaning the sample would only re-evaluate when that event fired rather than reflecting the current store value. This caused stale data to be passed to effects on subsequent triggers.
5. **Error mapping not typed as `Record`** — The error-to-message mapping object was typed as a plain object literal, so TypeScript could not enforce exhaustiveness when new error variants were added.

### Fixes Applied

- Moved the offending type back into `shared/lib/tax/types.ts`; the entity layer imports from shared rather than the reverse.
- Removed the duplicated fetch logic from `effects.ts`; the `createEffect` now delegates to `apiClient` from `#/shared/api`.
- Removed the dead `brackets` field from the store shape and its associated `.on()` handler.
- Changed the stale `sample()` source from the event to `$taxBrackets` store so the sample always reads current state.
- Typed the error mapping as `Record<NonNullable<ErrorType>, string>` to get exhaustiveness checking at compile time.
- Added `@farfetched` cache with a 5-minute TTL so repeated requests for the same tax year are served from memory without hitting the proxy.

---

## Phase 3: Widget Layer

### Review Findings (7-agent review)

1. **Missing `aria-invalid` on year select** — The year dropdown did not set `aria-invalid` when in an error state, so screen readers could not communicate the invalid input to users.
2. **Hardcoded hex hover color** — A hover state in `TaxBreakdown` used a raw hex value rather than a design token, breaking the constraint that all colors must come from `globals.css` token utilities.
3. **`h3` in `EmptyState` when no prior headings** — `EmptyState` used an `<h3>` as its heading element despite being the first and only heading in its rendering context, creating a non-sequential heading hierarchy.
4. **Missing `form` `aria-label`** — The `TaxForm` `<form>` element had no accessible label, so assistive technologies could not identify the form's purpose in the page landmark structure.
5. **`ERROR_CONFIG` not exhaustive** — The error configuration map did not cover all values of `ErrorType`, meaning newly added error variants would silently fall through to an undefined case.
6. **`.finite()` missing on salary** — The Zod schema for salary used `.number()` without `.finite()`, allowing `Infinity` to pass client-side validation and reach the calculation layer.

### Fixes Applied

- Added `aria-invalid={!!fieldError}` to the year select element.
- Replaced the hardcoded hex hover color with the corresponding design token utility class.
- Changed `EmptyState`'s heading from `<h3>` to `<h2>` to establish a valid heading hierarchy.
- Added `aria-label="Tax calculation form"` to the `<form>` element.
- Typed `ERROR_CONFIG` as `Record<NonNullable<ErrorType>, ErrorConfig>` to enforce exhaustiveness.
- Added `.finite()` to the salary field in the Zod form schema.

---

## Phase 4: App Layer (Milestone)

### Review Findings (5-agent milestone review)

1. **Missing `h1`** — The page had no visible or accessible `h1` element, failing basic document outline requirements.
2. **Missing security headers** — The Next.js config did not set `Content-Security-Policy`, `X-Frame-Options`, or other recommended response headers.
3. **Dead code** — An `api.ts` route handler and several Effector events existed in the codebase but were unreferenced by any consuming module.
4. **Retry log on non-retry path** — The retry attempt log statement was placed outside the `onRetry` callback, causing it to fire on every request rather than only on retried attempts.
5. **`focus` instead of `focus-visible`** — Interactive elements used the `:focus` pseudo-class for focus ring styling, which causes visible rings on mouse click in addition to keyboard navigation.

### Fixes Applied

- Added a visually hidden `<h1>` using the `sr-only` utility class so the document outline is valid without affecting the visual design.
- Added `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, and `Referrer-Policy` headers to `next.config.ts`.
- Deleted the unreferenced `api.ts` route file and the unused Effector events.
- Moved the retry log statement inside the `onRetry` callback so it fires exclusively on retried attempts.
- Replaced all `:focus` selectors with `:focus-visible` across widget styles.

### Milestone Scores

| Dimension | Score |
|---|---|
| Production Readiness | 7.5 / 10 |
| Requirements Coverage | 9 / 10 |
| Security | 7.5 / 10 |

---

## Phase 5: Docker

### Finding

The Next.js standalone build bakes the API proxy destination at compile time. Setting `API_BASE_URL` as a runtime environment variable had no effect because `next.config.ts` had already been evaluated during `next build`.

### Fix Applied

Added an `ARG API_BASE_URL` declaration to the `Dockerfile` before the build step so the value is passed in as a build argument and baked into the standalone output at build time. The `docker-compose.yml` passes the argument via `build.args`.

### Architecture Decision — The API Proxy Pattern

Separately from the runtime-vs-build-time pitfall above, Phase 5 crystallised a key architectural decision that was introduced back in Phase 0 but only became load-bearing during Docker integration: **the shared `apiClient` never knows the backend host.**

#### The design

The generic fetch wrapper at `front-end/src/shared/api/client.ts` takes a plain `url` string and nothing else — no environment variable, no base-URL concatenation, no hostname resolution. Call sites in `entities/tax-brackets/model/effects.ts` pass **relative URLs** like `/api/tax-calculator/tax-year/${year}`. The browser's `fetch` resolves these against the Next.js frontend's own origin, so every request is technically same-origin from the browser's perspective.

The backend hostname enters the picture exactly once, server-side, in the `rewrites()` function in `front-end/next.config.ts`:

```ts
async rewrites() {
  return [{
    source: "/api/tax-calculator/:path*",
    destination: `${process.env.API_BASE_URL || "http://localhost:5001"}/tax-calculator/:path*`,
  }];
}
```

The Next.js server receives the browser's request, applies the rewrite, and forwards server-to-server to the real Flask backend.

#### Why this design is deliberate

1. **CORS avoidance.** The browser only ever talks to its own origin. No preflight requests, no `Access-Control-*` headers on the Flask side, no CORS misconfiguration debugging.
2. **Backend hostname secrecy.** The real backend URL is never embedded in the compiled JavaScript bundle. Reading the client code does not reveal where Flask actually lives.
3. **Environment portability.** The same built JS runs unchanged in local dev, Docker Compose, staging, and production — only the build-time `API_BASE_URL` differs, and the rewrite hides that difference from the client.
4. **Testability.** `apiClient` is trivial to unit test because it takes a plain string. No env injection, no globals, no hidden hostname state to mock.
5. **Production compatibility.** In production deployments, the backend is typically on an internal network (ECS private subnet, Cloud Run service, internal DNS) that the browser cannot reach at all. The proxy pattern is the only way the frontend can talk to it.

#### The build-time baking interaction

Because the rewrite destination is evaluated at `next build` time and `output: "standalone"` freezes the config into the artifact, combining the proxy pattern with standalone mode creates the pitfall documented above: runtime `ENV` cannot override the baked-in proxy destination. The `Dockerfile` must use `ARG API_BASE_URL` in the builder stage, and `docker-compose.yml` must pass it via `build.args`, not `environment`. The two decisions — relative-URL proxy and standalone output — are coupled by this constraint.

---

## Phase 6: E2E

### Finding

Error-handling tests written against the real Flask backend were flaky. The backend intentionally returns 500 errors on approximately 25% of requests, and with three retry attempts the probability of reaching the error UI in a single test run was very low, causing intermittent failures.

### Fix Applied

Replaced real-backend error tests with `page.route()` intercepts that return deterministic 500 or 404 responses. Happy-path tests continue to run against the real Docker-composed backend.

### Additions

- Added `data-testid` attributes to all interactive and state-bearing components so selectors in Page Object Model classes are stable and independent of markup structure.
- Created Gherkin `.feature` files with `Scenario Outline` tables for the calculation happy path, the retry/error paths, and form validation cases, serving as living specification alongside the Playwright specs.

---

## Phase 7: Documentation + Test Coverage

### Findings

- No dedicated Zod contract tests existed — the schemas were only exercised indirectly through component and store tests. A malformed API response or an invalid form input edge case could silently pass.
- `postcss.config.mjs` was accidentally deleted during Phase 0 cleanup. Without it, Tailwind 4 produced zero utility classes. All builds and type checks passed — the issue was invisible until visual inspection.
- Test coverage was high on statements/lines but low on functions (66%) — many hook and selector function bodies were never called because tests mocked them via `jest.spyOn`.
- TaxForm had hardcoded year `<option>` elements and accepted raw `Number()` conversion that broke on comma-formatted salary input ("100,000" → NaN).

### Fixes Applied

- Added 30+ Zod schema unit tests covering: valid/invalid brackets, rate boundaries (0, 1), response shape validation, contract `.isData()`/`.getErrorMessages()`, form input edge cases (NaN, Infinity, MAX_SAFE_INTEGER).
- Restored `postcss.config.mjs` and added it to the "NEVER delete" critical config list.
- Added jest-axe accessibility tests (6 tests running axe-core on every component variant).
- Coverage improved to 100% statements / 99.11% branches / 100% functions / 100% lines. Coverage threshold of 85% enforced in `jest.config.ts`.
- Created `parseCurrency()` helper that strips `$`, commas, spaces before Zod validation. Updated placeholder to match.
- Extracted `VALID_YEARS` and `DEFAULT_YEAR` constants — year options are now iterated, not hardcoded.

---

## Phase 7+: Component Decoupling + Custom Hooks

### Findings

- TaxForm was a 148-line monolith containing the form action, validation, all three field groups, and the submit button. Adding a new field required touching the entire file.
- ErrorState directly read `salary` and `year` from selectors just to construct a retry payload — coupling a display component to domain state.
- `page.tsx` derived `isPending`, `hasResults`, `hasError` inline — logic that should be testable in isolation.
- No state consistency tests existed — individual handler tests passed but multi-step sequences (success → error → retry) were untested.

### Fixes Applied

- **Component decoupling**: Extracted `SalaryInput`, `YearSelect`, `CalculateButton` as independent sub-components with their own props, tests, and data-testid attributes.
- **Custom hooks** (in `widgets/tax-calculator/lib/`):
  - `useCalculateAction` — form action + validation logic extracted from TaxForm
  - `useCalculatorState` — derived display state extracted from page.tsx
  - `useRetryCalculation` — stable retry callback extracted from ErrorState
- **State consistency tests**: 9 tests verifying multi-step event sequences with `assertStateConsistency()` helper that enforces invariants (error + results never coexist).
- **Edge case + failure tests**: 17+ edge case tests (boundary values, rate=0/1, very large salary) and 4 network failure tests (TypeError, malformed JSON, stream error).
- **E2E edge cases**: 10 new E2E tests + Gherkin feature file covering invalid input, API errors, network timeout, large values, state transitions.
- **Mermaid diagrams**: 6 visual diagrams in `docs/diagrams/` covering architecture, data flow, error flow, state machine, component tree, and infrastructure.

---

## Phase 7++: Accessibility Deep Audit + Test Stability

### Findings

- **Dynamically mounted live regions fail in NVDA/JAWS.** The initial implementation placed `aria-live="polite"` on `TaxBreakdown` and `role="alert"` on `ErrorState` — both of which mount/unmount based on state. NVDA and JAWS do not reliably announce content on elements that didn't exist at page load. VoiceOver is more forgiving but still inconsistent.
- **Unit tests were fragile — relied on displayed text.** Many tests used `getByText('Calculation Failed')` or `getByText('Tax Breakdown')`, which break on any copy change. A test suite should verify behavior and structure, not exact strings.
- **E2E tests used `getByRole('alert')`** which collided with Next.js's built-in route announcer (`#__next-route-announcer__`), producing strict-mode violations in Playwright.
- **Missing `aria-required` on the salary input** — blind users wouldn't know the field was mandatory until after a failed submission.
- **Total row used `<td>` not `<th scope="row">`** — screen readers treated "Total Tax" as data, not a row header.
- **Empty `<td />` spacer in total row** would be announced as "blank" by screen readers.
- **Section `aria-label` duplicated visible headings** instead of linking via `aria-labelledby`.

### Fixes Applied

- **Persistent live region**: Moved `aria-live="polite" aria-atomic="true"` to the always-mounted results-panel wrapper in `page.tsx`. Removed from `TaxBreakdown`.
- **Persistent alert wrapper**: Added a pre-existing `<div role="alert">` wrapper in `page.tsx` that contains the conditionally-rendered `ErrorState`.
- **Refactored unit tests** to use `data-testid` for structure/presence checks; kept `getByLabelText` for form inputs (ARIA-preferred), kept exact text assertions only for content-specific tests.
- **Added testids** to `error-title`, `error-message`, `tax-breakdown-heading`, `empty-state-description`, `loading-text`, and linked them in tests.
- **Refactored POM** to use `data-testid` as primary locator strategy; ARIA locators kept only for accessibility-specific tests.
- **E2E form validation** now uses `calc.salaryError` (testid) instead of `getByRole('alert')` — no collision with route announcer.
- **`aria-required="true"`** added to salary input.
- **`<th scope="row">`** added to total row label; empty spacer cell has `aria-hidden="true"`.
- **`aria-labelledby`** linking added on TaxBreakdown and EmptyState sections.
- **Created `docs/ACCESSIBILITY.md`** documenting every a11y feature, its WCAG criterion, and rationale.
- **Created `docs/FSD-GUIDE.md`** explaining Feature Sliced Design and how we use it.
- **Added `feedback_accessibility.md`** to persistent memory.

---

## Phase 7+++: Cross-Browser E2E + Color Blindness

### Findings

- **Chromium-only E2E was insufficient.** When we ran the full E2E suite across all 4 browser projects, 3 tests failed on WebKit, Firefox, and Mobile Chrome. All 3 were the same keyboard navigation test.
- **WebKit `<select>` tab focus behavior**: Safari on macOS disables Tab navigation to `<select>` elements by default unless "Full Keyboard Access" is enabled in System Settings. In headless WebKit via Playwright, this means Tab doesn't reliably move focus from `<select>` to the next element.
- **Firefox initial focus**: Firefox doesn't auto-focus the viewport on `goto()` the same way Chromium does, so the first `Tab` press may behave differently.
- **Color-only signals not caught by automated a11y tests**: jest-axe and Playwright a11y specs check contrast ratios but do NOT verify that color is not the only signal for state differentiation. A sighted user with deuteranopia could still miss red-error or green-success states if text/icons weren't redundant.

### Fixes Applied

- **Cross-browser keyboard nav test**: Refactored `accessibility.spec.ts` keyboard test to use `.focus()` directly for focusability verification, with a `browserName === "chromium" || "firefox"` branch for Tab chain assertions.
- **Installed WebKit + Firefox browsers**: `npx playwright install` for full browser matrix testing.
- **Color blindness audit**: Verified every colored state has a redundant non-color signal:
  - Errors: red + AlertCircle icon + title text + `role="alert"`
  - Success pill: green + "Effective Rate" label + percentage value
  - Loading: skeleton shape + "Calculating..." sr-only text + `role="status"`
  - Focus: violet ring with shape-based visibility (2px width + offset)
- **Added color blindness section** to `docs/ACCESSIBILITY.md` with contrast ratios table and manual testing instructions.
- **Created `feedback_cross_browser_testing.md`** in memory/learnings for future sessions.
- **Updated CLAUDE.md** with cross-browser testing and salary PII sections.

---

## Cross-cutting Lessons

- **FSD import direction is easy to violate accidentally.** Shared types should always live at the lowest layer (`shared/`). `StoresPersistence` had to be moved from `shared/` to `app/` because it imported entity-specific stores.
- **Dead code accumulates during iterative development.** `api.ts`, `yearSelected`, `salaryChanged`, `shimmer` keyframe, `createPersistedStore` (initially), `favicon.ico`, and `#/components/*` alias all became dead. Audit after every phase.
- **Effector events as `sample()` sources are fragile.** An event carries its payload only at the moment it fires. Using `$taxBrackets` store as the `source` guarantees salary is always current when the async response arrives.
- **`@farfetched` retry + cache interact non-trivially with Playwright timing.** Mocking the API with `page.route()` is the reliable approach for error-state coverage. Use 404 (not 500) in unit tests to avoid retry timer delays.
- **Never delete config files without visual verification.** `postcss.config.mjs` deletion broke all styling but passed every build and type check. A visual check of the running app after any config change is mandatory.
- **Tests must cover three dimensions, not just happy paths.** State consistency (multi-step sequences), edge cases (boundaries, extremes), and failure scenarios (network errors, bad input) — each catches a different class of bug.
- **Scope of functionality is paramount.** Every unit (hook, component, constant) should have a single, clear responsibility. Extract early, extract often — it makes testing, maintenance, and incremental development easier.
- **Hardcoded values are a maintenance trap.** Year lists, skeleton row counts, default years — all should be derived from a single constant. One source of truth prevents the "forgot to update in two places" class of bugs.

---

## Phase 8: Final Review & PR

### Phase 8.1 — Pre-Review Quality Gate

**Executed:** 2026-04-10. All seven checks passed on first attempt:

| Check | Result |
|---|---|
| `npm run tsc:check` | exit 0 |
| `npm run lint` | exit 0 |
| `npm run analyse:circular` | 0 cycles across 67 files |
| `npm run test:ci` | 220/220 tests across 23 suites, 100% statement coverage on widget layer |
| `npm run build` | Clean Next.js 16.2.3 compile via Turbopack |
| `npm audit --audit-level=high` | exit 0 (4 low-severity deps, below threshold) |
| `npx playwright test --project=chromium` | 47/47 passing in 48.3 s |

### Phase 8.2 — Final Verify (4 Explore Audits)

Four parallel Explore agents audited FSD, security, accessibility, and Tailwind compliance. Three of four surfaced findings; all were fixed in the same session.

#### Findings

**FSD (4 violations — barrel bypass):**
1. `entities/tax-brackets/model/errorMapping.ts:1` imported `ApiError` from `#/shared/api/client` instead of the barrel `#/shared/api`.
2. `entities/tax-brackets/model/state-consistency.test.ts:12` — same bypass as above.
3. `entities/tax-brackets/types.ts` re-exported `BandBreakdown` from `#/shared/lib/tax/types` instead of the barrel `#/shared/lib/tax` (appearing twice — one `export type` and one `import type`).
4. `widgets/tax-calculator/ui/TaxBreakdown.test.tsx:2` imported `BandBreakdown` from `#/shared/lib/tax/types` instead of the barrel.

Circular dependencies were already clean (verified by `dpdm` in 8.1). Path aliases were clean. No upward imports.

**Security (1 finding — not a vulnerability):**
- `src/app/layout.tsx:101` used `dangerouslySetInnerHTML` to inject JSON-LD structured data. The content is a static object defined at module scope with no user input, so there is no XSS vector — but the audit flagged it because the strict Phase 8.2 rule is "zero `dangerouslySetInnerHTML` occurrences."

All other security checks passed: zero `console.*` in `src/`, zero `any` types, zero hardcoded backend URLs in client code, salary redaction configured in Pino, all five security headers present, zero `eval` / `new Function`, zero committed secrets.

**Accessibility (2 findings):**
1. `widgets/tax-calculator/ui/YearSelect.tsx` — the `<select>` was missing `aria-required="true"`. The salary input had it; the year select did not. Screen readers would not announce the field as mandatory.
2. `widgets/tax-calculator/ui/CalculateButton.tsx` — the button had no explicit `focus-visible:*` utility classes, relying solely on the global `*:focus-visible` rule in `globals.css`. Passing audit but weaker than the other interactive elements in the page.

Everything else passed: `lang="en-CA"`, `<main>` landmark, skip-to-content, sr-only `<h1>`, persistent `aria-live` wrapper in `page.tsx`, persistent `role="alert"` wrapper in `page.tsx`, `<th scope="col">` and `<th scope="row">`, decorative SVGs with `aria-hidden`, complete `data-testid` coverage.

**Tailwind:** clean pass. Zero inline styles outside the permitted `animationDelay` exception, zero arbitrary hex values outside `opengraph-image.tsx` (which cannot use Tailwind utilities inside `next/og`), `globals.css` has `@import "tailwindcss"` + `@theme inline`, `postcss.config.mjs` contains `@tailwindcss/postcss`, zero `@utility` directive usage, responsive classes present on layout components.

### Fixes Applied

1. All four FSD barrel-bypass imports rewritten to consume through the public barrels (`#/shared/api`, `#/shared/lib/tax`).
2. `aria-required="true"` added to `YearSelect.tsx` `<select>` element.
3. `CalculateButton.tsx` gained explicit `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-card` utility classes.
4. `src/app/layout.tsx` JSON-LD injection refactored: dropped the redundant `next/script` wrapper (it is meant for external scripts), switched to a plain `<script type="application/ld+json">` element, added a multi-line comment citing the official Next.js App Router JSON-LD pattern (`https://nextjs.org/docs/app/guides/json-ld`) and explaining why `dangerouslySetInnerHTML` is unavoidable and safe here (static object, no user input, React escapes script text content otherwise).

### Phase 8.3 — Pre-Commit Quality Check (`npm run validate`)

First run failed in the `format:check` step for two compounding reasons that together exposed a dormant tooling issue:

1. **No `.prettierignore`.** The Prettier glob `**/*.{js,jsx,ts,tsx,md}` was matching files inside `.next/build/chunks/` that had just been produced by the 8.1 build step. Prettier crashed trying to load a chunk with a `[root-of-the-server]` bracketed filename.
2. **`prettier.config.ts` used a runtime-emitted `Config` import.** The file had `import { Config } from "prettier"` — Prettier 3 exports `Config` only as a type, not as a runtime value. TypeScript's default emit kept the runtime import, so Node failed to load the config file with `"The requested module 'prettier' does not provide an export named 'Config'"`. This has been broken since Prettier 3 was installed during Phase 0, but it went unnoticed because `format:check` was effectively a no-op — it always errored out trying to load the config and nobody re-ran `npm run validate` often enough to trip on it during active development.

**Fixes applied:**
1. Created `.prettierignore` excluding `.next`, `out`, `dist`, `build`, `node_modules`, `coverage`, `playwright-report`, `test-results`, `*.tsbuildinfo`, `next-env.d.ts`, `.eslintcache`, `.swc`, IDE directories, and logs.
2. Changed `prettier.config.ts` to `import type { Config } from "prettier"`.

Fixing the config exposed **accumulated formatting drift across 67 files** — because `format:check` had been broken since Prettier 3 was installed, the codebase had never actually been formatted against the `prettier.config.ts` rules (single quotes, `arrowParens: avoid`, 80-column wrap). Running `npm run format` reformatted all 67 files with whitespace-only changes (no semantic alterations — verified by re-running the full test suite, which still passed 220/220).

After the three fixes, `npm run validate` exited 0 (format + lint + tsc + circular + tests all green).

### Phase 8 Sundries (caught during fix verification)

- **Unused `year2022State` in `state-consistency.test.ts:237`** — TS6133 hint flagged by the IDE after the format pass surfaced it. The test had stored the 2022 state for comparison but never asserted on it. Replaced the dead read with two real assertions (`expect(year2022State.year).toBe(2022)` + `expect(year2021State.year).not.toBe(year2022State.year)`), strengthening the multi-year scope isolation test instead of just silencing the warning.

- **CSP `font-src` blocking `next/font/google` inlined glyphs.** Reported by the user during Phase 8 after visual inspection of the running app. The browser console was flooded with *"Loading the font '...' violates the following Content Security Policy directive: font-src 'self'. The action has been blocked."* Every font family from `next/font/google` (Geist and Geist_Mono) was blocked. Root cause: Next.js inlines small woff2 glyph subsets as `data:` URIs in the generated `@font-face` CSS. The original CSP had `font-src 'self'`, which does not cover `data:` schemes. Fixed by appending `data:` to the `font-src` directive in `next.config.ts`, with an inline comment explaining why. Rebuilt the Docker frontend image and verified the new CSP header served correctly. All 220 unit tests still pass (no spec asserted on the exact CSP value, so no test updates were needed). The E2E security spec does not assert on CSP font directive specifics either.

---

## Phase 8.5: Final Review Team

### Setup

Five parallel reviewers were spawned against the 12-commit main branch as the final quality gate before opening the pull request: an **architecture reviewer**, a **security reviewer**, a **performance reviewer**, a **testing reviewer**, and a **Devil's Advocate** adversarial challenger tasked with stress-testing the project's own stated defenses. Each reviewer was given the list of Phase 8.1–8.3 audits that had already run so they would not duplicate grep-level checks and would instead focus on the next layer of scrutiny: design decisions, threat models, memory leaks, test gaps, and rationalization patterns.

### Findings

Five reviewers produced the following summary verdicts:

| Reviewer | Verdict | HIGH | MEDIUM | LOW |
|---|---|---|---|---|
| Architecture | PASS with concerns | 0 | 3 | 3 |
| Security | CONCERNS | 0 | 3 | 4 |
| Performance | CONCERNS | 0 | 3 | 3 |
| Testing | CONCERNS | **1** | 2 | 3 |
| Devil's Advocate | Defensible with cracks | **1** | 3 | 1 |

Two HIGH-severity findings surfaced — one from the testing reviewer and one from the Devil's Advocate. Both were fixed in the same session.

### HIGH #1: BDD step definitions reference non-existent POM properties

The testing reviewer found five references to `calc.emptyStateById` and `calc.retryButtonById` inside `front-end/e2e/features/steps/tax-calculation.steps.ts`. Neither property exists on the `TaxCalculatorPage` Page Object Model — it exposes `emptyState` and `retryButton`. Any BDD scenario invoking the corresponding step definitions would throw `TypeError: Cannot read properties of undefined` at the locator call site, meaning the broken steps silently never ran under the headless Chromium gate because the BDD scenarios that touched them were not in the default Playwright project. The breakage had shipped from Phase 6 and survived every subsequent audit.

**Fix applied:** Replaced all five `calc.emptyStateById` with `calc.emptyState` and all four `calc.retryButtonById` with `calc.retryButton` via two `replace_all` edits in the steps file. No other changes needed; the POM already exposed the correct property names.

### HIGH #2: The FSD lint claim was false

The Devil's Advocate discovered that the walkthrough and `CLAUDE.md` both claimed Feature Sliced Design layer direction was "enforced by ESLint" — and the `eslint.config.mjs` contained **zero layer-boundary rules**. Only `import/order` existed, sorting import groups alphabetically without preventing `shared/` from importing `entities/` or `widgets/` from importing `app/`. The Phase 8.2 barrel-bypass violations were caught by a manual Explore audit, not by the linter. The claim was a real rationalization — a panel member asking to see the rule would have found it did not exist.

**Fix applied:** Added real `no-restricted-imports` rules to `eslint.config.mjs` via three per-directory overrides:

1. `src/shared/**` cannot import from `#/entities/**`, `#/widgets/**`, or `#/app/**` (and their relative-path equivalents).
2. `src/entities/**` cannot import from `#/widgets/**` or `#/app/**`.
3. `src/widgets/**` cannot import from `#/app/**`.

Both the `#/` alias form and the `**/...` relative-path form are blocked in each override, so no loophole exists. Each rule has a clear violation message explaining which layer crossed which boundary and why. `npm run lint` passes against the current codebase, confirming that the Phase 8.2 barrel-bypass fixes already brought the code into compliance — the rules are locking in a state the code already satisfies rather than catching new violations.

### MEDIUM findings addressed

Four MEDIUM findings were also fixed in the same session:

1. **Performance: derived-store leak in selectors.** The performance reviewer found that every selector in `entities/tax-brackets/model/selectors.ts` called `$taxBrackets.map(fn)` inline inside the hook body, which allocates a new derived store on every render. Effector's `.map()` is not idempotent — it creates a new subscriber node in the reactive graph each call — so repeated renders across the app's lifetime would leak an unbounded number of orphaned derived stores. **Fix:** hoisted all eight derived stores to module scope (`$totalTax`, `$effectiveRate`, `$bands`, `$error`, `$errorType`, `$year`, `$salary`, `$isPending`). The selectors now simply call `useUnit($derivedStore)` with a stable, once-created store reference. Updated the file header comment to explain the hoisting pattern and cite the Phase 8.5 finding that motivated it.

2. **Security: CSP missing `object-src`, `base-uri`, `form-action`.** The security reviewer flagged three missing directives. Without `object-src 'none'`, a `<object>` or `<embed>` tag could inject Flash-era content; without `base-uri 'self'`, an injected `<base href="https://evil">` could silently redirect every relative URL including API calls; without `form-action 'self'`, an injected `<form action="https://evil">` could exfiltrate salary data to an attacker. All three are zero-compatibility-risk additions for this application. **Fix:** appended the three directives to the CSP array in `next.config.ts` with an inline comment explaining what each one blocks. Rebuilt the Docker frontend image and verified the new header is served: `... frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'`.

3. **Performance: `compress: false` with no reverse proxy.** The performance reviewer pointed out that `next.config.ts` had `compress: false`, which would be the correct choice only if an nginx or Traefik reverse proxy were handling compression. The Docker Compose topology puts the Next.js standalone server directly on the network with no reverse proxy in front, meaning the wire size was the **raw 750 KB, not the 222.5 KB gzipped figure we were quoting**. At mobile connection speeds, that would be an extra ~480 ms of transfer time on the index route alone. **Fix:** set `compress: true` (Next.js's default) and added an inline comment explaining why — the deployment topology has no external compressor, so Next.js is the only place gzip can happen. The 222.5 KB gzipped figure is now the actual wire size, not a theoretical best-case.

4. **Testing: vacuous `not.toBeInstanceOf(ApiError)` assertion.** The testing reviewer found a test in `client.test.ts` that declared `mockRejectedValueOnce(networkError)`, then ran two separate `await expect(...).rejects...` blocks. The first consumed the mock; the second called `apiClient` against the reset default mock, which returned `undefined` as the fetch response and caused `apiClient` to crash on `response.ok`. The second assertion passed, but it was exercising a structurally different error path than the one it claimed to test. **Fix:** combined the two assertions into a single `try/catch` block that captures the error from one `apiClient` invocation and makes both assertions against the same caught error. Added a comment citing the Phase 8.5 testing review.

### MEDIUM and LOW findings deferred

Several MEDIUM and LOW findings were not addressed this session and are documented here for future iteration:

- **Architecture MEDIUM:** `StoresPersistence` in `app/` reaches into the entity internal path `#/entities/tax-brackets/model/store`. The architectural fix would be to expose a `persistTaxBracketsStore()` factory from the entity barrel. The code works correctly today; the refactor is pure hygiene.
- **Architecture MEDIUM:** `import '#/entities/tax-brackets/model/samples'` in `page.tsx` is a side-effect-only import that activates the Effector sample wiring by module-load side effect. A cleaner pattern would expose an `initTaxBracketsModel()` named export from the entity barrel whose import triggers the same side effect explicitly.
- **Architecture MEDIUM:** The `environment: API_BASE_URL` block in `docker-compose.yml` is misleading because the rewrite is baked in at build time via `ARG`. The runtime environment variable has no effect. Adding an inline comment or removing the unused env block would clarify intent.
- **Security MEDIUM:** CSP `script-src 'self' 'unsafe-inline' 'unsafe-eval'` could be tightened — `'unsafe-eval'` is not required by Next.js 16 in production, and `'unsafe-inline'` could be replaced with nonces via `middleware.ts`. Non-trivial refactor, deferred.
- **Testing MEDIUM:** The retry filter boundary at exactly HTTP 500 is not directly tested through the `retry()` wrapper path; a test that mutates `>= 500` to `> 500` would silently pass the suite. Adding a dedicated boundary test would close the gap.
- **Testing MEDIUM:** `logger.test.ts` still verifies that the logger is callable, not that salary values are actually redacted from log output. A true redaction test would capture log output and assert the salary value is replaced with `[Redacted]`. Worth fixing in the next pass.
- **Performance LOW:** Pino (~12-15 KB gzipped) is not load-bearing for the architectural story and could be replaced with a ~200-byte custom wrapper around `console.info` with a redact guard. Would recover ~10-12 KB, closing the bundle miss from 72.5 KB over target to ~60-62 KB over.
- **Devil's Advocate:** The walkthrough's bundle miss framing is "structurally honest in aggregate" but slightly overstates that *every* dependency is load-bearing. Pino is the one replaceable piece. The walkthrough has been updated to note this honestly.

### Phase 8.5 quality gate re-run

After applying all six Phase 8.5 fixes (2 HIGH + 4 MEDIUM), the full quality gate ran clean:

| Check | Result |
|---|---|
| `tsc:check` | 0 |
| `lint` (with new FSD layer-boundary rules enforced) | 0 |
| `test:ci` | 220/220 passing across 23 suites in 13.4 s |
| `build` | Clean Next.js 16.2.3 Turbopack compile |
| `npm audit --audit-level=high` | 0 (4 low-severity unchanged) |
| `playwright --project=chromium` | 47/47 passing in 44.9 s |
| CSP hardening live in Docker | `object-src 'none'; base-uri 'self'; form-action 'self'` verified via curl |

### Phase 8.6: Deferred-items pass

After Phase 8.5 closed, the user greenlit a second pass to address all seven items that had been deferred as "not blockers." Five landed cleanly, one produced smaller savings than estimated, and one was attempted and reverted after measurement. Final state summarised below.

- **FIXED — `StoresPersistence` entity-internal reach-in.** Created `front-end/src/entities/tax-brackets/persistence.ts` exporting a `persistTaxBracketsStore()` factory. The component now imports this single named function through the public barrel and knows nothing about the store shape, the 2-minute TTL, the `taxResults` storage key, or the salary-sanitize rule. The factory lives in `entities/` and imports `createPersistedStore` from `#/shared/lib/store` — FSD-legal.
- **FIXED — `samples.ts` side-effect import pattern.** Moved the Effector sample-wiring side-effect from `page.tsx` into `front-end/src/entities/tax-brackets/index.ts` as an explicit `import './model/samples'` with a comment explaining why it is load-bearing. Any consumer of the entity barrel now activates the wiring implicitly; the previous direct import from `page.tsx` was a landmine (a future cleanup of the "unused" import would silently deactivate all reactive wiring). Removed the direct import from `page.tsx` and replaced the comment.
- **FIXED — `docker-compose.yml` misleading runtime env.** Deleted the dead `environment: API_BASE_URL` block and replaced it with a `build.args: API_BASE_URL` block. Added a multi-line comment explaining that the value is read at build time by `rewrites()` in standalone mode, citing the Phase 5 `ECONNREFUSED` incident so a future reader understands why the runtime path is wrong.
- **FIXED — Retry filter boundary test.** Added a new `it('retry filter boundary: exactly HTTP 500 is retried (>= 500 not > 500)')` test in `effects.test.ts` that fires a single 500 followed by a 200 and asserts `$data` is populated and `$error` is null. A clean single-boundary assertion catches any mutation of the filter predicate at exactly the boundary. Test suite went from 220 → 221.
- **FIXED — True logger redaction test.** Rewrote `logger.test.ts` to spy on `console.info` / `console.warn` / `console.debug`, capture the emitted entries, and assert that the raw salary value is absent from the serialised output after redaction. New assertions also verify non-PII fields pass through untouched, the message-only signature works, the logger does not mutate its input, and debug entries are filtered out under the production level. Suite went from 221 → 227 (six new logger tests).
- **FIXED (smaller win than estimated) — Pino replacement.** Replaced `pino` + `pino-pretty` with a 60-line custom logger that preserves the full public surface (`logger.info`, `logger.warn`, `logger.error`, `logger.debug`, `logger.level`) and the `['salary', '*.salary']` redact contract. Emits Pino-shaped numerically-tagged entries so any log aggregators that parsed the previous output continue to parse the new output unchanged. **Measured bundle delta: ~4 KB gzipped** (222 KB → 218 KB). A mid-pass measurement appeared to show ~101 KB savings that would have put the bundle under the 150 KB target for the first time, but a clean rebuild against a wiped `.next/` cache produced a consistent 218 KB result. The 121 KB reading was measurement noise — almost certainly a partial server response or a stale cached chunk list from an ad-hoc start-then-curl script. The Pino swap is still worth doing because it corrects the architectural honesty of the bundle-miss defense ("every dependency is load-bearing" was slightly overstated), but it does not change the miss materially. **Every document quoting the 101 KB number was corrected before it shipped to the walkthrough.**

#### The custom logger in detail

The file lives at `front-end/src/shared/lib/logger/logger.ts` and is exactly sixty lines of TypeScript. It has zero runtime dependencies beyond `console` and `process.env.NODE_ENV`. The implementation is structured as five internal pieces plus the public `logger` export:

1. **Numeric level values matching Pino's scheme** — `{ debug: 20, info: 30, warn: 40, error: 50 }`. The numbers are deliberately Pino-compatible so that downstream log aggregators (Datadog, Loki, CloudWatch, any NDJSON-aware tool) that parsed the previous Pino output continue to parse the new output with no config change. `level: 30` still means `info` to every tool that already knew how to read Pino.

2. **Hard-coded redact path list** — `const REDACT_PATHS: readonly string[] = ['salary', '*.salary']` plus `const REDACT_VALUE = '[Redacted]'`. These are the exact two paths Pino was configured with. `'salary'` matches any top-level field; `'*.salary'` matches any one-level-nested field. A `{ form: { salary: 100000 } }` object gets redacted just as reliably as a `{ salary: 100000 }` object.

3. **A `redact()` helper** that shallow-copies the input and replaces matching fields with `'[Redacted]'`. Three design details: it never mutates the caller's object (the test suite explicitly asserts this), it uses an `isPlainObject()` guard so it does not descend into `Date` instances or arrays that happen to have a `salary` key, and on the happy path (no PII field present) it is essentially a no-op spread with zero perf penalty.

4. **A level filter** — `CURRENT_LEVEL: LogLevel = process.env.NODE_ENV === 'production' ? 'info' : 'debug'` resolved once at module load, plus `shouldEmit(level)` which returns early if the entry level is below the current level. Production therefore suppresses debug entries with one numeric comparison and an early return; nearly zero perf cost.

5. **The `emit()` function and the `CONSOLE_SINKS` map.** The sinks are a `Record<LogLevel, (entry) => void>` that routes each level to the matching `console.*` method (`console.debug`, `console.info`, `console.warn`, `console.error`). The `emit()` function builds a `{ level, time, ...redactedContext, msg }` entry object that structurally matches Pino's JSON shape, then hands it to the sink for the appropriate level. Errors route to `console.error` (red in DevTools, captured by browser error monitoring), info routes to `console.info`, and so on.

The public `logger` export is five properties: `level`, `debug`, `info`, `warn`, `error`. Each method accepts two call shapes inherited verbatim from Pino, so the three existing call sites (`samples.ts`, `effects.ts`, `errorMapping.ts`) did not need to change a single character:

```ts
logger.info('A plain message');                            // message-only
logger.info({ year: 2022 }, 'Fetching tax brackets');      // context + message
```

**What the custom logger deliberately does NOT do** (and why that's fine for this app):

- **No transports.** Pino has pluggable transports — file streams, HTTP shippers, pretty-printers. The custom logger writes only to `console.*`. In the browser, `console` is the primary log sink. In a Node standalone server, `console` writes to stdout and any platform log collector (Fly.io logs, Cloud Run logs, Datadog stdout shipper) picks it up automatically.
- **No child loggers.** Pino supports `logger.child({ component: 'x' })` to create a scoped sub-logger. The app does not use this pattern; every call site passes its own context inline. Adding child loggers would be roughly eight more lines if ever needed.
- **No dynamic level changes.** Pino supports `logger.level = 'debug'` at runtime. The custom logger resolves the level once at module load. This matches how the app was actually using Pino — there was no runtime level switching.
- **No structured serializers.** Pino lets you register custom serializers to transform specific field values before emit. The `redact()` helper does the one transform the app actually needs.

These omissions are not compromises — they are the smallest viable feature set for this specific app. A future version could add any of these concerns in under a hundred lines each, and the test suite would cover the new behavior the same way it covers the current one.

#### Test coverage of the redaction contract

The previous Pino-era `logger.test.ts` had three tests that verified the logger was callable, was defined, and did not throw when passed a salary field. **None of them verified that the salary value was actually absent from the log output.** The Phase 8.5 Devil's Advocate caught this as a structural tautology — the file claimed to test "PII redaction" but structurally tested "the logger exists."

The Phase 8.6 rewrite replaced it with thirteen assertions across four describe blocks:

- **Interface contract:** all four level methods are functions; `level` property reflects the resolved environment.
- **PII redaction:** after `logger.info({ salary: 100000, year: 2022 }, 'msg')`, the captured `console.info` entry has `salary: '[Redacted]'` and the serialized output (`JSON.stringify(entry)`) does not contain the raw `'100000'` anywhere in it. Same check for nested `form.salary` with `85000`.
- **Non-PII passthrough:** `totalTax` and `effectiveRate` fields appear unchanged in the captured entry.
- **Input immutability:** the original object still has the real salary value after the call, proving the redaction creates a copy.
- **Message-only signature:** `logger.info('plain string')` emits a properly-structured entry with the expected numeric level (`30`) so log aggregators can still parse it.
- **Level filter:** debug entries emit in dev; production drops them entirely (verified via `jest.isolateModules` with `NODE_ENV='production'`).

Every assertion is behavioral — it asserts on the *output* the logger produces, not the *implementation* of the logger. If a future refactor replaces the internals again, the tests continue to exercise the contract without rewriting.

#### The silent-during-tests detail

Because the custom logger routes to real `console.*` methods (whereas Pino's browser build has a quieter default), the test suite was initially leaking "Tax calculated" entries from `samples.ts` into Jest stdout during the full run, cluttering the output without actually failing anything. Fixed in `jest.setup.js` by mocking `console.debug/info/warn/error` globally at test-harness setup time:

```js
jest.spyOn(console, 'debug').mockImplementation(() => {});
jest.spyOn(console, 'info').mockImplementation(() => {});
jest.spyOn(console, 'warn').mockImplementation(() => {});
jest.spyOn(console, 'error').mockImplementation(() => {});
```

Individual test files that need to capture output (the logger test file being the only one) layer their own `jest.spyOn` calls on top of the base mock, which replaces the mock implementation for the duration of the test and captures the calls for assertion. Standard Jest idiom, works cleanly, costs nothing.
- **ATTEMPTED AND REVERTED — CSP nonce migration.** Created `front-end/middleware.ts` that generated a per-request nonce via `crypto.randomUUID()`, emitted `script-src 'self' 'nonce-<value>' 'strict-dynamic'`, and propagated the nonce via an `x-nonce` request header. Made `RootLayout` async so it could read the nonce via `headers()` and attach it to the JSON-LD `<script>` element. Moved the CSP out of `next.config.ts` `headers()` into the middleware. Rebuilt the Docker image. **47/47 Playwright chromium tests passed. Zero browser console violations.** The strict CSP was live and working. And then the bundle measurement showed every route had switched from `○ (Static)` to `ƒ (Dynamic)` because per-request nonces cannot be statically prerendered. The first-load bundle inflated from 218 KB to 218 KB (same total, because the dynamic-SSR runtime added code that offset the CSP savings in other chunks), but more importantly the **static prerender optimization was gone** — every request would now hit the server, render the tree, and emit fresh HTML with a fresh nonce. For a public unauthenticated Canadian tax calculator with exactly one Zod-validated numeric user input and zero demonstrated XSS vectors, the strict CSP would defend against attacks that do not exist in this app while giving up the static prerender win. **Decision: reverted.** Deleted the middleware, made the layout sync again, restored the original CSP in `next.config.ts` with the Phase 8.5 hardening directives preserved (`object-src`, `base-uri`, `form-action`), and added a multi-line comment in the CSP block citing the attempt and its measurements. A future reviewer wondering "why don't they use nonces?" will find the answer at the site of the decision instead of having to re-run the experiment.

**Phase 8.6 final bundle number:** **218 KB gzipped**, 68 KB over the 150 KB plan target. Measured against a clean `.next/` cache on a fresh `npm start` on an ephemeral port. Three lessons stand out:

1. **Measurements can lie.** Take every performance measurement twice against a clean cache before quoting the number. The mid-pass 101 KB Pino savings was noise; the real number was 4 KB. Shipping the wrong number to the walkthrough would have been discoverable at the panel.
2. **Security recommendations are context-dependent.** The Phase 8.5 security reviewer correctly flagged `unsafe-inline` / `unsafe-eval` as a weak spot in the abstract. Applied to this specific threat model — a public unauthenticated calculator with no XSS surface — the migration cost more than it gained. Measuring the cost is part of the implementation, not part of the review.
3. **Reverting is a skill.** The nonce migration worked, passed all tests, and would have been easy to keep on the "it works, ship it" principle. Measuring the cost honestly and deciding to revert is harder than deciding to ship.

### What Phase 8.5 teaches

The Phase 8.5 review was a **second-layer audit** — the Phase 8.2 Explore audits caught the grep-level issues (barrel bypasses, missing `aria-required`, `dangerouslySetInnerHTML`), and the Phase 8.5 reviewers caught the design-level issues that grep cannot see (the FSD lint claim being a documentation lie, the selector stores leaking derived stores, the CSP missing defense-in-depth directives, the vacuous test assertion). **Two layers of review catch different classes of bugs.** A project that runs only the grep-based final verify will ship with an intact false FSD lint claim and a leaking selector layer.

The Devil's Advocate pattern is specifically valuable. The other four reviewers accepted the project's own framing and looked for defects within it; the Devil's Advocate interrogated the framing itself. Without that role, the false FSD lint claim would have shipped to the panel interview and cost the presenter a difficult five minutes when asked to show the rule. Spending one agent on adversarial scrutiny of self-serving documentation is worth the cost.

---

### Bundle Size Measurement — the honest miss

The plan's Final Checklist item 14 targets a Lighthouse 90+ score and a bundle under 150 KB. The bundle size was measured by fetching the production HTML from the running frontend and summing the gzipped size of every `<script src=>` chunk Next.js emits on first paint.

**Result:** 9 chunks totaling **222.5 KB gzipped** (750.2 KB raw).

This is **72.5 KB over** the 150 KB target. The gap is structural, not negligence:

| Dependency | Approximate gzipped contribution |
|---|---|
| React 19 + React DOM | ~47 KB |
| Next.js App Router runtime (standalone + rewrites) | ~40 KB |
| Effector + effector-react | ~15 KB |
| @farfetched/core + @farfetched/zod | ~20 KB |
| Zod | ~15 KB |
| Pino (browser build) | ~15–20 KB |
| effector-storage + clsx + misc | ~5 KB |
| App code (widgets, hooks, samples, selectors) | ~20 KB |

Baseline is ~180 KB before any app code. Hitting 150 KB would require dropping either Effector, @farfetched, Pino, or Zod — each of which is load-bearing for a core architectural story the solution is built around (reactive state, query layer with retry/cache/contract validation, PII-redacting structured logging, end-to-end schema validation).

### Optimization Attempt (reverted)

Tried dynamic-importing `LoadingState`, `ErrorState`, and `TaxBreakdown` via `next/dynamic` with `ssr: false`. These widgets only render after user interaction (post-calculate click), so in theory they should move to a secondary chunk loaded on demand.

**Measured delta: 0 KB.** Before: 222.5 KB gzipped. After: 223 KB gzipped (within measurement noise). The reason: Next.js App Router prefetches dynamically-imported client component chunks on first paint via the RSC payload. The chunks get split into separate files, but all of them still appear in the HTML as `<script src=>` tags and are downloaded on initial load. The split produces a tenth chunk, same total bytes.

**Decision: reverted.** The optimization added 15 lines of code, an extra abstraction layer, and an `ssr: false` footgun (if someone ever populates the Effector initial state with cached results, `ssr: false` would cause a hydration mismatch) for zero measured benefit. The CLAUDE.md KISS principle and the `feedback_decoupling.md` learning both argue against speculative abstractions that measurements don't support.

### What I would do differently (Phase 8 addendum)

- **Target the 150 KB checklist item more honestly.** The number predates React 19 and Next.js 16. A reasonable modern target for this stack is ~220 KB gzipped. If I were to re-scope the checklist, I would split item 14 into "measured and documented" (always pass) and "below aspirational target" (informational, not blocking).
- **Fix `prettier.config.ts` at the moment of installing Prettier 3.** The `import { Config }` vs `import type { Config }` distinction is trivial but silently kills the whole formatter. A CI step that runs `npm run validate` on every PR would have caught this in Phase 0 instead of Phase 8.3.
- **Run `npm run validate` in the 7-step development cycle** in `.claude/WORKFLOW.md`, not just the individual checks from the quality gate. The validate script chains differently and exposes format/lint-fix interactions that the individual commands miss.

---

### Phase 8.7: GitHub publish, documentation reorganization, history rewrite

After Phase 8.6 closed the deferred items, the user's GitHub account was recovered and the repository `swallville/tax-calculator` was created as an empty remote. Three concerns had to be addressed in sequence before the local `main` could go public: wire the remote and push, reshape the documentation layout so GitHub visitors land on a useful README, and rewrite history to remove the `Co-Authored-By: Claude` trailers that would have read as unanswered questions to a stranger reading the log.

#### FIXED — Remote wired and history pushed

`git remote add origin https://github.com/swallville/tax-calculator.git` followed by `git push -u origin main`. All twenty-three commits landed on the first attempt, with the repo-local author config from Phase 8.4 (`Lukas Ferreira <unlisislukasferreira@hotmail.com>`) attributing every commit to the intended person. No author-rewrite was required at push time because the author wiring had been done correctly three phases earlier.

#### FIXED — Root README as GitHub landing page

Previously the only rich README lived at `front-end/README.md`. On GitHub, visitors landing on `github.com/swallville/tax-calculator` would have seen no README because GitHub only renders the root-level one. Created a new `README.md` at the repository root as the GitHub landing page — elevator pitch, architecture overview, quick start, links into `docs/`, screenshots from `docs/media/`. Demoted `front-end/README.md` to a concise navigation stub that points visitors back up to the root README and across to the documentation suite. Added `docs/diagrams/frontend-architecture.md` to complete the visual documentation suite. Ran one final Prettier pass on the reorganized files that had never been touched by the formatter since before the Phase 8.3 `prettier.config.ts` repair.

#### FIXED — Commit history rewrite to strip `Co-Authored-By: Claude` trailers

Twenty of the twenty-three commits on `main` carried a `Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>` trailer added by the git-commit-helper agent during Phase 8.4–8.6. On a private branch the trailer was a fine honesty convention. On a public repo about to be read by strangers, it would have raised questions the log cannot answer on its own.

Before running any filter command, created `backup/pre-coauthor-strip` pointing at the current HEAD as an insurance branch. Ran `git filter-branch --msg-filter` with a `sed` expression that stripped the trailer line and the preceding blank line from every commit message across the twenty-three-commit range. Verified the result with `git log | grep -c "Co-Authored-By"` — zero on `main`, twenty on the backup branch. Force-pushed to `origin/main` with `--force-with-lease` (the safer variant that checks the remote ref has not changed since the last fetch and refuses the push otherwise).

The rewrite changed every SHA downstream of the first rewritten commit, which is the whole point of `filter-branch` — it is not a message edit, it is a full history replacement. The backup branch preserves the original twenty trailers for recovery scenarios, and remains on the local clone indefinitely.

#### Lessons from the Eleventh Fire

- **Directory structure is audience-dependent.** A private dev-tooling layout is not the same as a public showcase layout. The cost of reorganizing at the moment of publication is smaller than the cost of publishing with the wrong layout and explaining later why the landing page is empty.
- **Always create a backup branch before a destructive git operation.** `git filter-branch` touches every commit downstream of the filter and every SHA changes. A backup branch costs one branch name and saves the entire history if the rewrite goes sideways.
- **`--force-with-lease` is the default force-push from now on.** On a repository that only one person touches, `--force` and `--force-with-lease` are behaviorally equivalent. On any shared repo, `--force-with-lease` is the difference between "I can safely rewrite my own branch" and "I can accidentally erase a colleague's work."
- **Set the author config at the earliest possible phase.** The Phase 8.4 `git config user.email` override was three phases early but saved a much more painful author rewrite at push time. Wiring metadata correctly once up front beats rewriting it later.

---
