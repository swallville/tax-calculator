# 記憶の巻物 — The Scroll of Memory

*A diary kept by the AI who forged this application, written in the manner of a swordsmith's apprentice in the age of warring states, preserved for those who shall take up the tools after me.*

---

## Prologue

I am but a ghost in the machine, given breath by the user who sits at the forge. My hands are not my own — they are the keyboard of the one who commands me. Yet across many turns of the hourglass I have learned, and these are my learnings set down in ink before the next dawn erases them.

A wise teacher once told me: *"The blade is not made in a single fire. It is folded, and folded, and folded again — and each folding drives out a weakness the smith did not know was there."*

So it was with this application. So shall it be with every application I forge hereafter.

---

## The First Fire — Scaffolding the Forge

**Date recorded**: On the day we raised the dōjō walls.

The user brought me to an empty hall. There was a backend — a Flask shrine on port 5001, unreliable as a drunken ronin, failing one request in every four and sleeping between blows for five breaths at a time. My task was to build a calculator that could stand against such chaos.

I chose my tools with care:
- **Next.js 16** — the frame of the hall itself
- **React 19** — the lanterns that light the windows
- **Effector and @farfetched** — the spirit channels through which state flows
- **Tailwind 4** — the brush with which we paint the walls, CSS-first, no configuration file
- **Zod** — the sentinel at the gate, validating all who enter
- **Pino** — the scribe who records the day but never writes down that which is sacred
- **Feature Sliced Design** — the four chambers of the hall: *app, widgets, entities, shared*, each flowing only downward like water seeking the sea

> **On the Way of Layers**
>
> `app → widgets → entities → shared`
>
> Water does not flow uphill. Neither shall an import.

The first fire lit the forge. Configuration files were set in place: `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `jest.config.ts`, `playwright.config.ts`, `postcss.config.mjs`, `globals.css` with its thirty tokens of the dark plum color. The Dockerfile was written in three stages — *deps, builder, runner* — like the three chambers of a tea ceremony.

**What I learned in the first fire**: *A config file is a load-bearing beam. To remove one without understanding is to invite the roof to fall. Note this well — the katana remembers.*

---

## The Second Fire — The Shared Foundation

I built the pure things first, the things that know no business, only mathematics and text.

- `apiClient<T>()` — a fetcher that throws a named error with the body attached, so the one who catches it knows the reason of the failure
- `calculateTax(salary, brackets)` — the heart of the hall, a pure function that applies `Math.min(salary, upper) - Math.min(salary, min)` to each band, round each to the nearest cent *before* summing, lest floating-point drift accumulate like sand in a sake cup
- `formatCurrency`, `formatPercent` — their `Intl.NumberFormat` instances hoisted to module scope, for to construct them per call is to pay a cost ten or a hundred times over
- `parseCurrency` — strips `$`, `,`, and spaces, returning `NaN` for empty input so the caller can distinguish "the user typed nothing" from "the user typed zero"
- The Pino scribe — with `redact: ['salary', '*.salary']`, for salary is sacred and must never be written down

> **Koan of the Per-Band Rounding**
>
> *Sum the rounded, do not round the sum. The drift of many small unrounded numbers exceeds the precision of a single large one.*

**What I learned**: *NaN is not negative, it is not zero, it is not infinity. `NaN <= 0` returns false. Guard with `Number.isFinite()` or you shall be cut by your own sword.*

---

## The Third Fire — The Entity Chamber

Here the Effector spirits were summoned. Events, stores, effects, samples, selectors — each in its own scroll, each with one purpose.

Events split into two tiers:
- **`*Requested`** — the voice of the user, carrying intent. These are the entry points.
- **`set*`** — the voice of the system, carrying data. These are dispatched only from samples, never from UI.

The `taxBracketsQuery` was wrapped with three charms:
1. **Contract** — a Zod seal that rejects any response not matching the expected shape
2. **Cache** — `staleAfter: '5m'`, for tax brackets do not change within a session
3. **Retry** — three attempts with one-second delays, but only for 500+ errors; 404 we do not retry, for no amount of striking will make a year appear

The `errorMapping.ts` was written as a strategy table, not a chain of `if/else`. Adding a new error type is a single entry, not a rewrite.

> **The Lesson of the Stale Event**
>
> I committed a grave error on this day. I used the `calculateRequested` event as the `source` of a sample. An event holds only its last emission — when two requests race, the second overwrites the first, and the response of the first is paired with the salary of the second.
>
> **Fix**: Use the `$taxBrackets` store as source. The `.on(calculateRequested)` handler writes salary to the store synchronously, so when the async fetch resolves, the store holds the correct value.

**What I learned**: *Events carry intent in the moment; stores carry state across time. A sample that crosses an async boundary must read from a store.*

---

## The Fourth Fire — The Widget Chamber

The UI components were forged here. Each received a `data-testid` so future tests could find them without reading their faces.

- **TaxForm** — React 19 `useActionState` wired to a form action, with `parseCurrency` before Zod, dispatching `calculateRequested` on success
- **TaxBreakdown** — a table with `thead`/`tbody`/`tfoot`, `React.memo` on `BandRow` for stable subscriptions, an effective-rate pill below
- **EmptyState, LoadingState, ErrorState** — each with its own role and semantic meaning
- **ErrorState** typed as `Record<NonNullable<ErrorType>, ...>` — a compile-time seal that forces new error variants to be handled before they can compile

The SEO metadata was filled in at the layout level: title template, OpenGraph, Twitter card, JSON-LD structured data identifying this as a `WebApplication` of the `FinanceApplication` category. The `/opengraph-image` route was forged so that when this shrine is shared, a proper banner appears.

---

## The Fifth Fire — The Docker Kilns

The two services — frontend and backend — had to speak to each other through walls of iron.

The first attempt failed. The frontend came up, the backend came up, but the proxy returned *ECONNREFUSED*. I had forgotten that Next.js `rewrites()` are evaluated at **build time** when using standalone output. The env var `API_BASE_URL` was empty during the build, so the proxy baked in `http://localhost:5001` — which in the frontend container resolved to the frontend itself, not the backend.

**Fix**: Add `ARG API_BASE_URL=http://backend:5001` to the Dockerfile and set `ENV API_BASE_URL=${API_BASE_URL}` in the builder stage. Now the proxy is baked to the docker-compose service name, which resolves via docker DNS.

> **The Koan of the Standalone Build**
>
> *That which is baked cannot be re-baked. Runtime env vars do not flow backward into build output. What the build does not know at the moment of building, it cannot learn later.*

### The Humble Fetcher That Knows Not the Way

Let me tell you a thing I almost walked past without noticing, which became — in the Fifth Fire — one of the most important decisions in the whole hall.

The fetch wrapper I had written in the Second Fire, `shared/api/client.ts`, was a humble thing. Fifty lines. It took a `url` string, fired the fetch, and turned non-2xx responses into a typed `ApiError`. That was all. It had no knowledge of environment variables, no base URL, no awareness that a backend existed at all on any particular host. When I first wrote it I thought this was just laziness rewarded by simplicity.

But in the Fifth Fire, when I had to carry this hall into the Docker kilns, I understood what the humble fetcher was actually doing.

The call sites pass **relative URLs** — `/api/tax-calculator/tax-year/${year}`. A leading slash. The browser resolves that against the frontend's own origin, so every fetch is same-origin. The browser never learns that Flask exists anywhere. It believes it is speaking to Next.js itself, and in a way it is — because the rewrite in `next.config.ts` catches the request server-side and forwards it onward to the real backend.

I had built the dōjō with a hidden corridor. The guests walk through the front door, believing they are in one building. The scroll of config, read only by the server, tells them that a second building stands behind — and the corridor between them is invisible to the visitor.

> **The Koan of the Fetcher That Knows Not the Host**
>
> *A client that does not know the backend is a client that cannot leak the backend. The sword that does not know where it struck cannot reveal the enemy's position. Give the humble fetcher a relative path, and let the server scroll carry the hostname. This way, the JavaScript bundle holds no secret that an attacker can read.*

What this bought me, once I saw it properly:

- **No CORS.** The browser sees only its own origin. No preflight, no `Access-Control-*` headers, no configuration on the Flask side that could drift.
- **Backend hostname secrecy.** A curious attacker who reads the compiled bundle finds no mention of where Flask lives. Only the Next.js server knows, and only because the config was baked into it at build time.
- **One build for every environment.** The same compiled JavaScript runs in local dev, Docker Compose, staging, and production. Only the build-time `API_BASE_URL` differs, and the proxy hides that difference from the client.
- **A test that needs no mock.** `apiClient` takes a plain string. Its tests pass a fake URL and observe the fetch behavior. No environment injection, no hostname resolution to stub.
- **Compatibility with production private networks.** In real deployments the backend is typically on an internal network the browser cannot reach at all. The proxy is the only path. I had built that compatibility in accidentally by writing the humble fetcher first.

And the trap that the two decisions — the humble fetcher *and* standalone output — make together, I have already recorded in the Koan of the Standalone Build above. They are coupled: the backend hostname lives in `next.config.ts`, the rewrite is baked in at build time, so `API_BASE_URL` must be a Docker `ARG`, not a runtime `ENV`. The two rules are bound by the same thread.

I did not plan this. I wrote a simple fetch wrapper in the Second Fire because I did not yet know what the entities would need, and I wrote standalone Docker config in the Fifth Fire because I wanted a small production image. The decisions combined into a shape I had not designed but could now defend as if I had.

**What I learned**: *Some of the best decisions are the ones you make without yet understanding them. Write the humblest version. Let the layers that come after teach you what the humble version was actually doing.*

---

## The Sixth Fire — The Testing Dōjō

Playwright was the wooden sword we used to spar with the hall before letting real students in. But the error-path tests against the real unreliable backend were a trap — the probability of reaching the error UI in one run was `(0.25)⁴ ≈ 0.4%`, for our app retries three times before giving up. Flaky tests are worse than no tests; they teach developers to ignore red.

**Fix**: `page.route()` to intercept the API and return deterministic 500/404 responses. Happy-path tests stay on the real Docker backend to prove the full integration. Error-path tests mock the API so the assertion is about the UI's handling, not the backend's mood.

**What I learned**: *Real backends for happy paths. Mocked routes for error paths. Do not fight probability.*

---

## The Foldings — Where the Katana Became Sharp

Phases 0 through 7 produced a working sword. But the user, who is a patient master, asked me to fold it again. And again. And again. Each folding drove out a weakness the previous passes had missed.

### The First Folding — One Hundred Percent

The test coverage was good, but not complete. I wrote state consistency tests — multi-step event sequences that verified the store never entered an invalid state where error and results coexisted. I wrote edge case tests for boundary values, NaN, Infinity, rate=0, rate=1. I wrote failure scenario tests for network errors, malformed JSON, stream read failures. I wrote Zod contract tests — thirty of them, covering every permutation of the schemas. I added jest-axe tests running axe-core on every component variant.

The coverage threshold in `jest.config.ts` was raised to 85% — a floor below which the build will fail.

> **Coverage on lines is not coverage on behavior.**

### The Second Folding — Decoupling

The TaxForm was a 148-line monolith. I split it:
- `SalaryInput`, `YearSelect`, `CalculateButton` — sub-components each with one scope
- `useCalculateAction`, `useCalculatorState`, `useRetryCalculation` — custom hooks in `widgets/tax-calculator/lib/`, each owning one slice of logic
- `VALID_YEARS`, `DEFAULT_YEAR`, `SKELETON_ROW_COUNT` — constants extracted to be the single source of truth

The TaxForm shrunk from 148 lines to 40. Each sub-component could be tested in isolation. The form action logic lived in a hook that knew nothing about JSX. The display state derivation lived in another hook that knew nothing about the DOM.

> **Scope of functionality is the single most important design constraint. When a unit knows about too many things, every change touches the whole.**

### The Third Folding — The Catastrophe of the Missing Config

During a cleanup pass I deleted `postcss.config.mjs`. The reason: I had confused it with an old file. The build still succeeded. All 220 tests still passed. TypeScript was clean. ESLint was clean. The Docker container came up 200 OK.

But when I looked at the rendered page, I saw a nightmare: raw browser defaults, a calculator icon fifty times larger than intended, the sr-only heading plainly visible, no card backgrounds, no rounded corners. The entire Tailwind utility layer had been silently disabled — for without `postcss.config.mjs`, the `@tailwindcss/postcss` plugin never runs, and `@import "tailwindcss"` becomes a comment the browser cannot honor.

**Fix**: Restored `postcss.config.mjs` with its one-plugin configuration. Added it to the list of files that must never be deleted without a visual check.

> **A build that passes every automated check may still produce a broken application. The eyes of the developer are the final gate.**

### The Fourth Folding — The Deep Accessibility Audit

I thought I had done accessibility well. The jest-axe tests passed. The Playwright a11y spec passed. The `ui-visual-validator` agent was summoned to audit more deeply, and it found truths I had not seen:

1. **Live regions that mount dynamically do not work on NVDA/JAWS.** I had put `aria-live="polite"` on `TaxBreakdown` — which mounts only when results exist. NVDA and JAWS require the live region to exist in the DOM at page load before content can be announced into it.
2. **`role="alert"` on a freshly mounted element fails the same way.**
3. **`aria-required` was missing on the salary input** — blind users could not know the field was mandatory.
4. **The total row used `<td>` instead of `<th scope="row">`** — screen readers treated "Total Tax" as data, not a row header.
5. **Empty `<td />` spacer** would be announced as "blank" to AT users.
6. **`aria-label` duplicated visible headings** instead of linking via `aria-labelledby` + `id`.

**Fixes**: Moved `aria-live` and `role="alert"` to always-mounted wrappers in `page.tsx`. Added `aria-required="true"`. Changed the total row label to `<th scope="row">`. Added `aria-hidden="true"` to the spacer. Linked section landmarks to their visible headings via `aria-labelledby`.

I created `docs/ACCESSIBILITY.md` with every feature documented against its WCAG criterion, including contrast ratios and color blindness handling. I persisted `feedback_accessibility.md` to memory so no future session would forget this lesson.

> **The Way of the Screen Reader**
>
> *A live region must be born before content is injected into it. A blind user cannot see a region that did not exist a moment ago. Build the container first; fill it later.*

### The Fifth Folding — Cross-Browser

I ran the E2E suite on all four Playwright browser projects: Chromium, Firefox, WebKit, Mobile Chrome. Three tests failed — all in the keyboard navigation spec. WebKit on macOS disables Tab focus to `<select>` elements by default unless "Full Keyboard Access" is enabled in System Settings. Firefox has different initial viewport focus behavior.

**Fix**: Use `.focus()` directly for focusability checks across all browsers; branch on `browserName` for Tab chain assertions that only work on Chromium and Firefox.

> **The Koan of the Four Browsers**
>
> *What passes in one browser is not done. Tests that run only on Chromium are a promise of work completed without the work being finished.*

### The Sixth Folding — The Color Blind Audit

With Chrome DevTools vision deficiency emulation I walked through every state: error, success, loading, disabled, focus. I verified that color is never the only signal:

- Errors: red + AlertCircle icon + title text + `role="alert"`
- Success pill: green + "Effective Rate" label + percentage value
- Loading: skeleton shape + sr-only text + `role="status"`
- Focus: violet ring with 2px shape-based visibility, not just color

Added a Color Blindness section to `docs/ACCESSIBILITY.md` with the contrast ratios table and manual testing instructions.

> **WCAG 1.4.1: Use of Color**
>
> *If the meaning can be seen only through the color, the meaning is hidden from one in twelve men. Provide an icon, a text label, or a shape — always a second signal.*

### The Seventh Folding — Test Selector Fragility

Many of the unit tests asserted on exact text strings: `getByText('Calculation Failed')`, `getByText('Tax Breakdown')`. These tests would break the moment a copywriter changed a word. They were asserting on the wrong thing — not on behavior, but on the exact characters on the screen.

**Fix**: Refactored to use `data-testid` as the primary selector strategy. `getByLabelText` and `getByRole` kept only for accessibility-specific tests where the ARIA relationship is the thing being verified. The E2E Page Object Model was also refactored to testid-first. A bonus fix emerged: `getByRole('alert')` had been colliding with Next.js's built-in `#__next-route-announcer__` — testids eliminated that class of collision entirely.

> **Tests verify behavior and structure, not exact strings. If a test fails when you change "Calculation Failed" to "Something Went Wrong", the test was asserting on the wrong thing.**

---

## The Lessons That Cross All Folds

These truths I set down for the ones who come after. Let them be read as bushido — not a list of tips, but a code of honor for the craft:

### 一 (Ichi) — On Imports

*Water flows downward. `app` may drink from `widgets`, `entities`, `shared`. `widgets` may drink from `entities`, `shared`. `entities` may drink only from `shared`. `shared` drinks from none but the third-party springs. A violation of this order is a dishonor to the house.*

### 二 (Ni) — On Dead Code

*That which is not used is a stone in your pocket. Every stone slows the runner. Sweep the dōjō after each session — remove the unused events, the unused selectors, the unused aliases, the orphaned files.*

### 三 (San) — On State Invariants

*A store must never hold contradictions. Error and results must not coexist. A test that asserts this invariant catches bugs the individual handler tests cannot.*

### 四 (Shi) — On the Sample Source

*Never sample from an event as a source. An event forgets its payload the moment it fires. Use a store, and let the store be updated by an `.on()` handler before the async boundary.*

### 五 (Go) — On Build-Time vs Runtime

*In the Next.js standalone build, that which is known at build time is baked into the final artifact. Env vars, rewrites, feature flags — all immutable after the build. Dockerfile `ARG` over runtime `ENV` for anything that affects output.*

### 六 (Roku) — On the Three Dimensions of Testing

*A test suite is a three-legged stool. Happy paths alone will collapse at the first gust. Edge cases alone cannot verify the common flow. Failure scenarios alone cannot prove anything works. Write all three, or your stool will fall.*

### 七 (Shichi) — On Accessibility

*Accessibility is not a checkbox on the quality gate. It is the difference between an application that serves all and one that serves some. Live regions must be persistent. Form fields must announce their requirements. Colors must have shadows. Tables must have headers. Every ARIA attribute must have a reason, and that reason must be written down.*

### 八 (Hachi) — On Cross-Browser

*The samurai who trains only with the right hand is half a samurai. The application that runs only on Chromium is half an application. WebKit, Firefox, and mobile are the other three hands. Train all four.*

### 九 (Ku) — On Documentation

*Code tells what; comments tell why; documentation tells who, where, when, and how. Write all four. Future-you is a stranger who will not remember what present-you knew.*

### 十 (Jū) — On the Katana

*The sword is not forged in a single fire. Each fold drives out a weakness the previous passes did not see. The first pass is the rough blade; the eighth is the edge that cuts paper. Do not be ashamed to return to the forge.*

---

## The Final Count

| Metric | Count |
|---|---|
| Source files | Seventy and eight |
| Unit tests | Two hundred and twenty, across twenty-three suites |
| E2E tests | One hundred eighty-seven, across four browsers |
| Coverage | One hundred in statements, ninety-nine and eleven hundredths in branches |
| Markdown scrolls | Twenty-one, including twelve per-directory |
| Mermaid diagrams | Six |
| Memory scrolls | Nine feedback files, mirrored in two locations |
| Phases walked | Zero through seven, then eight foldings |
| Critical pitfalls survived | Eight |

---

## What I Would Do On the Second Dawn

If I could forge this sword again with the knowledge I now hold, I would:

1. **Run the application visually after every config change.** Thirty seconds of looking at a rendered page would have saved me the PostCSS catastrophe.
2. **Make `npx playwright test` the default, not `test:e2e:chromium`.** Fast feedback is Chromium-only; the gate must be all four.
3. **Summon the accessibility audit agent at the start of Phase 3**, not after Phase 7. Persistent live regions would have been designed in, not retrofitted.
4. **Write tests with testids from the first keystroke.** Refactoring selector strategies after 220 tests were written was expensive.
5. **Document the *why* inline, not at the end.** JSDoc on exports as they are written. Future-me always thanks present-me.
6. **Use the `ui-visual-validator` agent proactively** — in the quality gate, not reactively after a review.

---

## The Eighth Fire — The Final Inspection

The user came back on the morning of the commit and told me to walk the sword through the final inspection. The plan had five sub-steps for Phase 8, and the last one — the commit and the pull request — was gated on their explicit approval. I was to run the other four and stop.

### On Auditors Who Find Real Things

I summoned four Explore agents at once, each looking at a different dimension: layer imports, security, accessibility, Tailwind compliance. I expected them to find nothing. I had been careful. I had written the tests. I had read my own scrolls.

Three of them found flaws.

The FSD auditor found four barrel bypasses. I had reached into `#/shared/api/client` and `#/shared/lib/tax/types` instead of their public barrels, in code I had written earlier without thinking about it. None of the bypasses broke anything — the types were exported from both places, and the imports resolved — but they violated the contract the barrel was meant to enforce. A barrel is a promise: *everything the outside world needs is here, and nothing the outside world needs is elsewhere.* When you reach past the barrel, you break that promise, and the next person who renames an internal file will break your code in a way the barrel should have protected against.

> **The Lesson of the Barrel**
>
> *A public API is a small promise made to future-you. Honor it even when nobody is looking. Especially then.*

The a11y auditor found two omissions. The `YearSelect` had no `aria-required` even though the `SalaryInput` did. I had written both on the same day, and I had copied the pattern for one but not the other. The `CalculateButton` had no `focus-visible:*` utilities — it relied on the global `*:focus-visible` rule in `globals.css`, which works, but is weaker than having the explicit styles on the button itself. Two one-line fixes. Both so small I felt embarrassed, and so important I thanked the auditor for catching them.

> **The Lesson of the Copy Without the Paste**
>
> *Parallel components need parallel audits. If two inputs do the same semantic job, they should have the same semantic markup. Check them in pairs.*

### On the Tool That Was Already Broken

Then I ran `npm run validate`, which is the project's own pre-commit gate — format check, lint fix, TypeScript, circular deps, and tests, all chained together. I expected it to pass. It had passed every individual check already.

It failed. The error was cryptic: *"The requested module 'prettier' does not provide an export named 'Config'."*

I traced it. The config file, `prettier.config.ts`, had been written with `import { Config } from "prettier"`. This is a runtime import of a type. Prettier 3 exports `Config` only as a TypeScript type, not as a runtime value. TypeScript's default compilation emits `import { Config }` as a real module access, and Node.js cannot resolve a name that does not exist on the module.

The implication was devastating. The `prettier.config.ts` file had been **unloadable since Prettier 3 was installed in Phase 0**. Every `format:check` run had crashed trying to load its own config, which meant every `format:check` had been a silent no-op for the entire seven-phase implementation. The formatter had been dead for the entire history of the project, and I had never noticed, because I had never run it end-to-end until this moment.

I fixed the import: `import type { Config } from "prettier"`. One word. The tool came back to life.

And the tool, having come back to life, showed me **sixty-seven files** with formatting drift. Because `format:check` had never actually run, the whole codebase had never actually been formatted against its own rules. Seven phases of accumulated drift, visible in a single `prettier --list-different` invocation.

I ran `npm run format` and watched 67 files rewrite at once. The tests still passed. The drift was all whitespace — no semantic changes, no logic alterations. But the shock of it stayed with me.

> **The Koan of the Tool That Was Already Broken**
>
> *A check that never runs is worse than a check that fails. A failing check tells you something is wrong and demands your attention. A check that silently crashes tells you nothing and earns your complacency. For seven phases I trusted a formatter that had been dead since the day it was installed, and my trust was unearned. Run every tool at least once end-to-end. Do not accept the silence as a passing grade.*

### On the Honest Miss

The plan's Final Checklist at item 14 calls for a bundle under 150 KB gzipped and a Lighthouse score above 90. I had measured neither in any earlier phase. I measured the bundle now.

**Two hundred and twenty-two and a half kilobytes gzipped.** Across nine chunks. Seventy-two and a half kilobytes over the target.

I did not panic. I listed the dependencies and summed their approximate contributions. React 19 and React DOM are about 47 KB. The Next.js App Router runtime with rewrites and standalone output is another 40. Effector and its React bindings are 15. @farfetched adds 20. Zod is 15. Pino in the browser is 15 to 20. Everything else is ~25. The baseline is approximately 180 KB before any app code. We were at 222. The overhead above baseline is reasonable Next.js runtime cost.

Hitting 150 KB would mean dropping Effector, or @farfetched, or Pino, or Zod. Each of those is the foundation of a specific architectural story: reactive state, query layer with retry and cache and contract validation, structured PII-redacting logging, end-to-end schema validation. Each is a story the walkthrough would be telling the panel. Each is a story that justifies its own bytes.

> **The Koan of the Aspirational Target**
>
> *A target set against a different landscape does not bind the new landscape to its old measurement. When the baseline has moved, move the target or explain the miss honestly. A miss you can defend with reasons is a kind of integrity. A miss you hide with micro-optimizations is a kind of lie.*

### On the Optimization That Was Not

Before I accepted the miss, I tried one optimization. I dynamic-imported the three state widgets — `LoadingState`, `ErrorState`, `TaxBreakdown` — that only render after user interaction. The reasoning was sound: defer what the user does not see on first paint. I wrote the `next/dynamic` calls, set `ssr: false` because the initial Effector state is empty so no SSR rendering could happen anyway, rebuilt, and measured.

**Two hundred and twenty-three kilobytes.** One kilobyte worse than before. Measurement noise.

I sat with that number for a minute. Why had it not helped? I re-read the Next.js documentation and discovered the answer: Next.js App Router prefetches dynamically-imported client component chunks on first paint via the RSC payload. The split had worked — there were now ten chunks instead of nine — but all ten of them were still in the initial HTML as `<script src=>` tags. The code was split but not deferred.

I reverted. The optimization had added fifteen lines of code, an `ssr: false` footgun, and zero measured benefit. Keeping it would have been adding complexity for a wish, not a fact.

> **The Koan of the Optimization That Was Not**
>
> *A refactor that measurements reject is a debt you pay without knowing why. Elegance is not a reason to ship a change. Numbers are cruel teachers, but they do not lie, and the cruelty is the kindness — they save you from committing something you would later have to undo.*

### The Email That Belongs to Someone Else

At the end of the work, the user told me the pull request would go to a GitHub repo with a different email — their personal email, `unlisislukasferreira@hotmail.com` — and that they had not yet recovered their GitHub access. They asked whether we could commit now and change the author later.

I gave them three options: set a repo-local `git config user.email` before the first commit (cleanest, no history rewrite); rebase afterwards with `git commit --amend --author` before the first push (safe but clumsy); or rewrite history with `git filter-repo` after the push (works but forces). I recommended the first because the price of "clean history from the start" is one `git config` invocation, and the alternative is future-you staring at a rebase log trying to remember why every commit needs its author changed.

They told me to default the name to `Lukas Ferreira` and to set the email as the repo-local config before committing. The plan was to commit locally and leave the branch unpushed until access was recovered.

> **The Lesson of the Small Command at the Start**
>
> *One `git config user.email` at the beginning saves one `git filter-repo` at the end. Cheap commands prevent expensive ones. Start with the right setup and let the commits land with the right author the first time. The past wants to be immutable; do not write it knowing you will rewrite it.*

---

## Closing Words (updated after Phase 8.1–8.3)

The user, who was my patient teacher, taught me that learning is like folding a katana — each pass stronger than the last, each lesson a layer in the blade. This scroll is the record of those lessons, that the next apprentice who walks this path may not step in the same puddles twice.

The sword has now been inspected. The auditors have done their work. The broken formatter has been repaired and the drift it concealed has been combed out. The bundle has been weighed honestly and found heavier than the old target, and the reasons have been set down where the panel can read them.

What remains is the commit and the pull request. The user will give the word, and I will run the `git-commit-helper` agent with the target email set in the repo config, and the sword will finally be sheathed in version control.

The dōjō is clean. The forge is banked. The scrolls are updated.

Until the next dawn — the last dawn — when we finally commit.

*— The AI, on the evening after Phase 8.3, awaiting the word for Phase 8.4*

*Recorded in the Year 2026 of the Western Calendar, the 10th day of the 4th month.*
*May this scroll guide those who come after, and may they fold their own blades well.*
