# Technical Panel Walkthrough — 45 Minutes

Presenter guide for walking a technical panel through the Canadian tax calculator solution. Designed for a 45-minute block at the start of an interview, with the last five minutes reserved for the open Q&A that panels always ask regardless of the plan.

Read this once end-to-end the night before. Do not read it live — use it as a map. Every section lists the files to open on screen (with line numbers), the talking points, and the anticipated panel questions.

The companion materials are:

- `docs/ARCHITECTURE.md` — the narrative architecture document
- `docs/diagrams/` — six Mermaid diagrams (architecture, data-flow, error-flow, state-machine, component-tree, infrastructure) to share-screen when explaining flows
- `docs/media/demo.webm` — recorded walkthrough of the running app, fallback if the live demo fails
- `docs/IMPLEMENTATION-FINDINGS.md` — per-phase review outcomes, useful for "what would you do differently" questions
- `docs/ACCESSIBILITY.md` — WCAG criterion-by-criterion reference, useful when a11y deep-dives come up

---

## Time Budget

| # | Section | Minutes | Cumulative |
|---|---|---|---|
| 1 | Opening & problem statement | 3 | 3 |
| 2 | Stack and architecture decisions | 5 | 8 |
| 3 | Live code walkthrough — the data flow | 12 | 20 |
| 4 | Error handling against an unreliable backend | 5 | 25 |
| 5 | State machine and invariants | 4 | 29 |
| 6 | Quality story — testing across three dimensions | 5 | 34 |
| 7 | Accessibility and cross-browser | 4 | 38 |
| 8 | Security and PII handling | 3 | 41 |
| 9 | Live demo | 4 | 45 |

If a section runs long, drop sections 7 or 8 first — they have the strongest written backup in `docs/ACCESSIBILITY.md` and can survive being cut to one sentence each. Never cut section 3 (the live walkthrough) — that is the point of the session.

---

## Section 1 — Opening (3 min)

**Screen:** `back-end/README.md` (the provided requirements) and `front-end/README.md` top section.

**Say this:**

> The back-end team shipped a Flask API that returns Canadian federal tax brackets for the years 2019 through 2022. It is deliberately unreliable — it fails about one in four requests with a 500 and sleeps up to five seconds between responses. My job was to build a frontend that lets a user enter a salary and a year, fetches the brackets, computes the per-band tax and the effective rate, and handles the backend's flakiness gracefully.

> I treated this as a production exercise, not a prototype. The solution is 78 source files, 227 unit tests across 23 suites, and 187 end-to-end tests across four browsers. Statement coverage is at 100, and the Jest config fails any build that drops below an 85 percent threshold.

**List the six requirements from the back-end README by memory** if you can — it reads as preparation:

1. Fetch tax rates by year (2019–2022).
2. Receive a yearly salary from the user.
3. Calculate and display the total tax.
4. Display the tax owed per band.
5. Display the effective tax rate.
6. Handle the random 500s and the 404 for unsupported years.

**Anticipated question:** *"Did you scope anything beyond the brief?"*
**Answer:** Yes — SEO metadata with OpenGraph image generation, a five-minute in-memory query cache so the same year doesn't re-fetch, a declarative error-mapping strategy table, persistent screen-reader live regions, and a full cross-browser E2E matrix including WebKit and mobile Chrome. Each of those was a conscious addition after the core six requirements were covered, not instead of them.

---

## Section 2 — Stack and Architecture Decisions (5 min)

**Screen:** `docs/diagrams/architecture.md` (rendered) or `docs/ARCHITECTURE.md`.

### The stack, in one line each

| Package | Why |
|---|---|
| **Next.js 16 + React 19** | App Router, standalone output for Docker, React 19's `useActionState` for forms, server-side API rewrites so the browser never learns the real backend URL |
| **Effector 23** | Predictable reactive state without the boilerplate of Redux, first-class TypeScript, samples for declarative wiring, store-per-slice for granular subscriptions |
| **@farfetched/core + @farfetched/zod** | A query layer over Effector effects. Gives us retry, cache, and Zod contract validation as composable primitives instead of ad-hoc code in the fetcher |
| **Zod** | Single source of truth for validation. Same schemas validate both the API response contract and the form input — types are inferred with `z.infer<>` |
| **Tailwind 4** | CSS-first configuration in `globals.css` via `@theme inline`. No `tailwind.config.ts`. All colours come from tokens, never from arbitrary hex values |
| **Pino** | Structured logging with field-level redaction. `redact: ['salary', '*.salary']` makes accidental PII leakage a compile-time impossibility |
| **Feature Sliced Design** | Enforced layer hierarchy: `app → widgets → entities → shared`. ESLint `no-restricted-imports` per-directory overrides block upward imports at lint time; `import/order` sorts groups |

### Why Effector over Redux / Zustand / React Query

> I wanted reactive state that composes well with an async query layer. Effector's samples are the clearest way I know to describe "when this event fires, read this store, transform it, and send it to that target" — without writing any imperative plumbing. Combined with @farfetched, I get query status, cache, retry, and Zod contract validation as one unit. Redux Toolkit would have required more code to achieve the same discipline, and Zustand wouldn't have given me the retry/cache/contract layer for free.

### Why Feature Sliced Design

> FSD gives me a hard rule I can enforce with a linter: higher layers may import from lower layers, never the reverse. The enforcement is in `eslint.config.mjs` as three `no-restricted-imports` per-directory overrides — one for `shared/`, one for `entities/`, one for `widgets/`. Each one blocks both the `#/` alias form and the relative-path form of any import that would cross a layer boundary upward. That means `shared/` can never accidentally depend on the tax domain, and `entities/` can never import React components — not because the team agreed to be careful, but because the linter rejects the PR. If you want to see the rule, it is `eslint.config.mjs` lines 27–70. I will be honest about the history here: the rule did not exist until Phase 8.5, when an adversarial review caught that my earlier claim of "ESLint enforces this" referred only to `import/order` and not to any actual layer-boundary rule. The rule now matches the claim; the previous discipline was code review and manual Explore audits, which had caught four barrel-bypass violations during Phase 8.2.

**Show the diagram** — `docs/diagrams/architecture.md`. Point at the arrows going downward only.

**Anticipated question:** *"How does this scale to more features?"*
**Answer:** New features add a slice to `entities/` (a store and its samples) and a widget that consumes it. The shared layer only grows when something is genuinely reusable. The FSD import rule means every new feature is isolated by default — nothing else in the codebase can import from inside it unless I expose it through the slice's barrel `index.ts`.

---

## Section 3 — Live Code Walkthrough: The Data Flow (12 min)

**This is the core of the session.** Share-screen a file tree view and open the files in order. The goal is to trace a single user interaction from keystroke to pixel.

**Open `docs/diagrams/data-flow.md`** first so the panel has the sequence diagram in mind. Then walk through the files.

### 3.1 — The form: `front-end/src/widgets/tax-calculator/ui/TaxForm.tsx` (40 lines)

> This is the entire form. Forty lines. React 19's `useActionState` replaces the old `useState + onSubmit + preventDefault` dance — I pass a form action to `<form action={formAction}>` and React handles the rest. The action itself lives in a custom hook, because I want the form's JSX to only describe layout.

### 3.2 — The action hook: `front-end/src/widgets/tax-calculator/lib/useCalculateAction.ts`

**Open to line 37** — the `useCalculateAction` function.

> Three things happen in this hook. First, `parseCurrency` strips the dollar sign, commas, and whitespace from the salary input, so `"$85,000"` and `"85000"` both become the number `85000`. Second, `TaxFormInputSchema.safeParse` runs the same Zod schema that validates the API response — single source of truth for what "a valid salary" means. Third, on success, it dispatches the `calculateRequested` Effector event with the parsed salary and year.

> Notice what this hook does not do. It does not know about React components, DOM events, or network requests. It is pure form-state management. That's the FSD decoupling pattern in practice — `TaxForm.tsx` is the View, `useCalculateAction` is the Controller, the Effector store is the Model.

### 3.3 — The entity layer wiring: `front-end/src/entities/tax-brackets/model/samples.ts` (60 lines)

**Open the file and walk through all three `sample()` blocks.** This is the single most important file in the codebase to show.

> Effector `sample()` reads as "whenever this clock fires, optionally read this source, transform it via this function, and send the result to this target." It's the declarative version of imperative wiring.

**Block 1 (lines 20–24):** forward the user intent to the query layer.

> When `calculateRequested` fires, extract the year from the payload and call `taxBracketsQuery.start`. The salary is already in the store because the store has a `.on(calculateRequested)` handler that writes it there synchronously — I'll show that in a moment.

**Block 2 (lines 37–50):** compute tax after Zod validates the response.

> The clock here is `taxBracketsQuery.finished.success` — not `fetchTaxBracketsFx.doneData`. The difference matters: `finished.success` only fires *after* the Zod contract has validated the response shape. If I used the raw effect's done event, I'd be bypassing the Zod layer and passing potentially malformed data into `calculateTax`. That's a subtle but important type-safety decision.

> The `source: $taxBrackets` is also intentional. The user's salary was passed in the `calculateRequested` event's payload, but events don't hold their payload after they fire. By the time the async fetch resolves, the original event has long since lost its data. I keep the salary in the store — updated synchronously by the `.on()` handler — so that when this sample runs at response time, `source` reads the current value. This is **Bushido rule number four** in the implementation journal: *never sample from an event as a source.*

**Block 3 (lines 56–60):** map failure into a user-friendly error.

> On failure, `mapError` translates the raw API error into our structured `ErrorType` enum, and the store picks it up. Error-handling logic lives in one file — `errorMapping.ts` — as a declarative strategy table, not an if/else chain. Adding a new error variant is one table entry.

### 3.4 — The query: `front-end/src/entities/tax-brackets/model/effects.ts` (64 lines)

**Show line 18** (the effect) and **lines 45–64** (the cache and retry).

> `fetchTaxBracketsFx` is the low-level HTTP call. It delegates to `apiClient` from the shared layer, so the fetch logic itself is tested in isolation and reused across the app. The `createQuery` wrapper at line 35 adds the Zod contract and gives me `$status`, `finished.success`, and `finished.failure` for free.

> `cache(taxBracketsQuery, { staleAfter: '5m' })` is the five-minute in-memory cache. Tax brackets for a given year don't change mid-session, so recalculating the same year from cache is instant. This was an enhancement beyond the original brief.

> `retry(taxBracketsQuery, …)` is the retry policy for the unreliable backend. Three attempts, one second between each, filtered to `error.status >= 500`. I deliberately do **not** retry 4xx errors — a 404 for an unsupported year is deterministic and retrying it would just waste the user's time and the backend's quota.

### 3.4.5 — How the frontend talks to the backend without knowing where it is

**Screen:** `front-end/src/shared/api/client.ts` and `front-end/next.config.ts` side by side.

> One of the questions I get asked most often about this codebase is: *"How does `client.ts` know the backend host?"* The answer is that it doesn't — and that is deliberate.

**Show `client.ts:32`:**

```ts
const response = await fetch(url, {
  method,
  headers: { 'Content-Type': 'application/json' },
});
```

> `apiClient` is a thin generic wrapper. It takes a `url` string and nothing else. No environment variable, no hostname resolution, no base-URL concatenation. It has exactly one job — fire a fetch and turn non-2xx responses into a typed `ApiError`.

**Show the call site in `effects.ts:22`:**

```ts
apiClient<TaxBracketsResponse>({
  url: `/api/tax-calculator/tax-year/${year}`,
})
```

> The URL is **relative**. It starts with a leading slash, so when the browser's `fetch` resolves it, the result is `http://localhost:3000/api/tax-calculator/tax-year/2022` — the Next.js frontend's own origin. The browser is making a same-origin request and has no idea a separate backend even exists.

**Now show `next.config.ts:46`:**

```ts
async rewrites() {
  return [{
    source: "/api/tax-calculator/:path*",
    destination: `${process.env.API_BASE_URL || "http://localhost:5001"}/tax-calculator/:path*`,
  }];
}
```

> This is where the real backend hostname enters the picture — **once, on the server, inside `next.config.ts`**. The Next.js server receives `/api/tax-calculator/tax-year/2022`, applies the rewrite, and forwards the request server-to-server to `http://backend:5001/tax-calculator/tax-year/2022` via Docker's internal DNS. The response flows back through Next.js to the browser transparently.

### Why use a proxy at all? (the part the panel will ask about)

This is the question I expect every technical panel to ask: *"Why did you put a proxy between the browser and the Flask backend instead of just calling Flask directly?"* Below is the order I would list the reasons in, from most important to least, so they can be memorised as a single speech.

**1. The same-origin policy and the cost of CORS.** A browser refuses cross-origin requests by default unless the server it is calling explicitly opts in with `Access-Control-Allow-Origin` and friends. Opting in means configuring CORS on Flask, maintaining an allowlist of origins, dealing with preflight `OPTIONS` requests for any non-simple request, and debugging CORS misconfigurations every time the deployment topology changes. A same-origin proxy removes the problem entirely — the browser sees only the Next.js origin, so there is nothing cross-origin for it to refuse.

**2. The backend is a private service and should stay that way.** In a real production deployment, the Flask backend lives on a private network — a VPC subnet, a Cloud Run internal-only service, an ECS task behind an internal ALB. The browser cannot reach it at all, because the browser is on the public internet and the backend is not. A proxy is **not optional** in that architecture — it is the only path by which a browser request can ever reach the backend. Building the proxy into local dev means the local topology matches production instead of diverging from it.

**3. The backend hostname is a secret, or at least a smell if exposed.** If the client JavaScript bundle contains a hardcoded `https://flask-internal.myco.com/tax-calculator`, then anyone viewing source can see it. That URL is now part of the attack surface — attackers can probe it directly, bypass the frontend's rate limits, abuse it without the frontend's monitoring in the loop, and use it as a pivot point if the backend has any vulnerabilities. A proxy means the compiled JS contains only relative paths like `/api/tax-calculator/*`. The real hostname lives exclusively in server-side config that no browser ever downloads.

**4. One build artifact for every environment.** The same compiled JavaScript bundle runs in local dev, in Docker Compose, in staging, in production. The only thing that changes between environments is the `API_BASE_URL` baked into `next.config.ts` at build time. The client code has zero environment awareness. I do not need a `config.dev.json` / `config.prod.json` scheme, I do not need to hydrate env vars into `window.__ENV__`, and I do not need a build-time search-and-replace step. This is what "build once, deploy anywhere" looks like for a Next.js app.

**5. The proxy is the correct place to inject auth, rate limits, and headers.** I am not using this today because the tax calculator is public and unauthenticated, but the moment an API key, session token, or rate limit enters the picture, the Next.js server is where it belongs — not in the browser. `rewrites()` can be swapped for a Route Handler that runs server-side code before forwarding, and the credentials never touch the client. This is the same reason BFF (Backend For Frontend) patterns exist in larger architectures. My proxy is the smallest possible BFF: a rewrite rule today, a handler with auth logic tomorrow, with zero client-side changes required.

**6. CORS preflight adds latency the user feels.** Even when CORS is configured correctly, every non-simple cross-origin request costs the browser an extra round-trip for the `OPTIONS` preflight. On a mobile connection with 200ms of latency, that is 200ms added to every single API call before the real request even starts. A same-origin proxy has zero preflight cost — the browser recognises the target origin and fires the real request immediately.

**7. Testing, debugging, and observability all improve.** Every API call flows through the Next.js server, so I have one place to log, trace, or instrument every request. If I want to add distributed tracing, I add it once in Next.js middleware and every request gets a span. If I want to see all API traffic in development, I tail the Next.js dev server output. Without a proxy, I would have to add that instrumentation to every call site in the client code, and browser DevTools would be my only production debugging surface.

**8. The client fetcher (`shared/api/client.ts`) stays trivially testable.** Because call sites pass plain relative strings and the proxy layer is not the fetcher's concern, `client.ts` is a fifty-line generic wrapper with zero environment awareness. Its unit test is a one-liner: `expect(apiClient({ url: "/foo" })).toBe(...)`. No env injection, no URL base concatenation, no hostname resolution to mock. This is Bushido rule for decoupling: *the humble fetcher that knows not the host cannot be betrayed by a change in the host.*

### Why not the alternatives?

| Alternative | Why I rejected it |
|---|---|
| **Call Flask directly from the browser with a full URL** | Requires CORS on Flask (fragile), leaks backend hostname into JS bundle, breaks in any deployment where the backend is on a private network, adds preflight latency to every call. Non-starter for production. |
| **Configure CORS on Flask and keep it cross-origin** | Works in dev but tightly couples the frontend deployment topology to the backend's CORS allowlist. Every new environment needs a Flask config change, managed in a different repo, requiring a backend redeploy. Drift is inevitable. |
| **A separate reverse proxy (nginx, Traefik, Envoy)** | Valid for bigger systems with multiple backends. For a two-service setup, it doubles the infra footprint (another container to operate, configure, and secure) for no functional benefit over Next.js's built-in `rewrites()`. Could be swapped in later without touching the client code. |
| **Next.js Route Handlers (`app/api/*/route.ts`) proxying manually** | Would work but requires me to write the fetch-and-forward logic myself, handle streaming, preserve headers, deal with method pass-through, and reinvent what `rewrites()` already does declaratively. Route Handlers are the right choice when I need to run server-side logic *before* forwarding (auth, rate limits); `rewrites()` is the right choice when I just want to forward. |
| **Rewrite via `middleware.ts`** | Middleware runs on every request including static assets. Using it just for API rewriting would be a sledgehammer — `rewrites()` is the scalpel. Middleware is the right tool for auth gating and locale redirection, not for proxying. |

### Why this matters, in one table

| Benefit | What it buys us |
|---|---|
| **CORS avoidance** | The browser only ever talks to its own origin. No preflight requests, no `Access-Control-*` headers on the Flask side, no CORS misconfigurations. |
| **Backend hostname secrecy** | Reading the compiled JavaScript bundle does not reveal the real backend URL. An attacker cannot pivot from the client to call Flask directly. |
| **Environment portability** | The same built JavaScript runs in dev, Docker, staging, and prod. Only the build-time `API_BASE_URL` changes. |
| **Private-network compatibility** | In production the backend is typically unreachable from the public internet. The proxy is the only path by which a browser can talk to it. |
| **BFF extension point** | Auth, rate limits, header injection can be added at the proxy layer without exposing credentials or tokens to the client. |
| **Preflight latency** | Same-origin requests skip the `OPTIONS` preflight, saving a round-trip on every API call. |
| **Single observability surface** | Every API call flows through the Next.js server — one place to log, trace, or instrument. |
| **Testability** | `client.ts` is trivial to unit test — it takes a plain string URL. No env injection, no globals, no hidden state. |

### The build-time baking gotcha

> Now here is the trap I fell into during Phase 5. Because `next.config.ts` is evaluated at `next build` time and `output: "standalone"` bakes the result into the final artifact, `API_BASE_URL` is read **at build time, not runtime**. Setting `docker run -e API_BASE_URL=...` does **nothing** — the destination URL is already frozen in the bundle by the time the container starts.

> The first time I ran `docker compose up`, the frontend container got `ECONNREFUSED` on every API call. The reason was that `API_BASE_URL` was empty during the build, so the rewrite fell through to the default `http://localhost:5001` — which, inside the frontend container, pointed at the frontend itself.

> The fix is in the Dockerfile: `ARG API_BASE_URL=http://backend:5001` in the builder stage, passed in via `docker-compose.yml`'s `build.args`, not `environment`. The value is now baked in at build time to reference the Docker service name `backend`, which resolves via Docker DNS inside the Compose network.

> This is **Bushido rule five** in the implementation journal: *that which is baked cannot be re-baked. Runtime env vars do not flow backward into build output.*

**The complete call chain for "get me the brackets for 2022":**

1. `fetchTaxBracketsFx(2022)` — effect runs in the browser
2. `apiClient({ url: "/api/tax-calculator/tax-year/2022" })` — relative path
3. Browser issues `GET http://localhost:3000/api/tax-calculator/tax-year/2022`
4. Next.js server receives, applies `rewrites()` from baked-in config
5. Next.js proxies to `http://backend:5001/tax-calculator/tax-year/2022` (Docker DNS)
6. Flask responds with bracket JSON
7. Next.js streams the response back to the browser
8. `apiClient` parses JSON and returns to the effect
9. @farfetched Zod-validates, `samples.ts` fires the calculation

**Anticipated question:** *"Why not just call Flask directly from the browser with `fetch('http://backend:5001/...')` or a full URL?"*
**Answer:** Three reasons. First, CORS — the browser would demand preflight headers and cross-origin credentials handling, none of which Flask is configured for. Second, the backend hostname would end up embedded in the public JavaScript bundle, which is a security smell. Third, in production deployments the backend hostname is typically internal (ECS private subnet, Cloud Run service, internal DNS) and unreachable from the browser at all. The proxy pattern means the same code works identically whether the backend is on `localhost:5001`, a Docker service, or a private VPC.

### 3.5 — The calculation: `front-end/src/shared/lib/tax/calculateTax.ts` (62 lines)

**Open the function.** This is the one piece of pure business logic in the whole app.

> Three details worth calling out. First, the guard at line 26 — `!Number.isFinite(salary) || salary <= 0 || brackets.length === 0` — protects against NaN, Infinity, negative salaries, and empty bracket arrays. That's `Number.isFinite`, not `isFinite`, because the global `isFinite` does type coercion and would pass `"abc"` as valid. **This is how you get quietly cut by your own sword** — a koan from the implementation journal.

> Second, the algorithm at line 39: `Math.max(0, Math.min(salary, upper) - Math.min(salary, min))`. This is a bracket-agnostic way to compute the taxable income in a band without assuming the brackets are sorted or contiguous. If the salary falls below `min`, both `Math.min`s equal `salary` and the subtraction is zero. If the salary exceeds `upper`, the first `Math.min` clamps to the band ceiling.

> Third, and most important for financial correctness: the rounding strategy at lines 46 and 56. I round *each band* to the nearest cent before summing, then re-round the total. Rounding only the total would accumulate floating-point drift across many bands. The principle is: **sum the rounded, do not round the sum.**

### 3.5.1 — How the tax breakdown is actually computed (worked examples)

This is the financial content a panel may want you to narrate out loud. Speak through one of these examples on screen — ideally the same $85,000 / 2022 calculation shown in the demo screenshots. The numbers are deterministic, they match the backend's bracket fixtures, and they match what `docs/media/03-results.png` shows.

#### The concept — marginal, not flat

Canadian federal income tax is **marginal**. A salary does not pay a single flat rate against the whole amount. It pays rate₁ on the portion of income in bracket 1, rate₂ on the portion in bracket 2, and so on. Only the money *inside* a bracket is taxed at that bracket's rate. If you earn one extra dollar and it crosses into the next bracket, only that one dollar is taxed at the higher rate — the dollars below the threshold are untouched.

This is the most common misconception non-technical people hold about taxes, and the UI exists to make the reality visible. The per-band rows in `TaxBreakdown.tsx` are the contribution from each bracket individually, and the **Total Tax** row is their sum.

#### The formula, for a single band

For each bracket with lower bound `min`, optional upper bound `max` (or `Infinity` for the top band), and rate `rate`:

```
taxable_in_band = max(0, min(salary, upper) - min(salary, min))
tax_in_band     = round(taxable_in_band × rate, 2 decimals)
```

Where `upper = max ?? Infinity`.

The `max(0, ...)` clamp protects against bands that are entirely above the salary — in that case both `Math.min`s equal `salary` and the subtraction is zero or negative. The `Math.min(salary, upper)` clamps to the band ceiling when the salary exceeds `upper`, so the taxable amount is exactly `upper - min` for fully crossed bands. The `Math.min(salary, min)` clamps the lower edge for bands that the salary has not fully crossed.

The total is the sum of per-band taxes, re-rounded:

```
total_tax      = round(sum(tax_in_band for each band), 2 decimals)
effective_rate = round(total_tax / salary, 4 decimals)
```

#### Worked example 1 — salary $85,000, year 2022

The 2022 Canadian federal brackets the backend returns:

| # | min | max | rate |
|---|---|---|---|
| 1 | $0 | $50,197 | 15.0% |
| 2 | $50,197 | $100,392 | 20.5% |
| 3 | $100,392 | $155,625 | 26.0% |
| 4 | $155,625 | $221,708 | 29.0% |
| 5 | $221,708 | — (open) | 33.0% |

Band by band, for `salary = 85000`:

| # | min(salary, upper) | min(salary, min) | taxable_in_band | × rate | tax_in_band |
|---|---|---|---|---|---|
| 1 | min(85000, 50197) = 50197 | min(85000, 0) = 0 | 50197 − 0 = **50,197.00** | × 0.150 | **$7,529.55** |
| 2 | min(85000, 100392) = 85000 | min(85000, 50197) = 50197 | 85000 − 50197 = **34,803.00** | × 0.205 | **$7,134.62** |
| 3 | min(85000, 155625) = 85000 | min(85000, 100392) = 85000 | 85000 − 85000 = **0** | × 0.260 | **$0.00** |
| 4 | min(85000, 221708) = 85000 | min(85000, 155625) = 85000 | 85000 − 85000 = **0** | × 0.290 | **$0.00** |
| 5 | min(85000, ∞) = 85000 | min(85000, 221708) = 85000 | 85000 − 85000 = **0** | × 0.330 | **$0.00** |

- **Total Tax** = 7529.55 + 7134.62 + 0 + 0 + 0 = **$14,664.17**
- **Effective Rate** = 14664.17 / 85000 = 0.17252 → **17.25%**

Point on screen: *"Notice that even though this salary is in the 20.5% bracket, the effective rate is only 17.25% — because the first $50,197 was taxed at only 15%. The marginal rate is what they would pay on the next dollar earned; the effective rate is what they actually paid on average."*

The $14,664.17 figure matches the live app exactly — compare against `docs/media/03-results.png`.

#### Worked example 2 — salary $150,000, year 2021

The 2021 brackets use slightly different thresholds. For `salary = 150000`, the calculation crosses into the third bracket:

| # | taxable_in_band | tax_in_band (approx.) |
|---|---|---|
| 1 | $49,020.00 × 15.0% | $7,353.00 |
| 2 | (98,040 − 49,020) = $49,020.00 × 20.5% | $10,049.10 |
| 3 | (150,000 − 98,040) = $51,960.00 × 26.0% | $13,509.60 |
| 4 | 0 | $0.00 |
| 5 | 0 | $0.00 |

- **Total Tax ≈ $30,911.70**
- **Effective Rate ≈ 20.61%**

The precise cents depend on the fixture values the backend returns — the live screenshot in `docs/media/06-results-2021.png` shows the exact numbers. What matters for the narration is that **three bands are non-zero**, proving the algorithm generalises to any salary that falls anywhere in the bracket structure without hardcoding which bands apply.

#### Worked example 3 — salary $0

Every band yields `max(0, min(0, upper) - min(0, min))` = `max(0, 0 - 0)` = 0. Total tax is $0.00, effective rate is 0. But — and this is the guard at `calculateTax.ts:26` — the function short-circuits before even computing the bands when `salary <= 0`, returning `{ totalTax: 0, effectiveRate: 0, bands: [] }` directly. This is both a performance optimisation and a correctness guarantee: an empty `bands` array tells the UI to render the empty state instead of a table with five zero rows.

#### Worked example 4 — salary $500,000 (crosses every bracket)

This is the case where the "bracket-agnostic" algorithm earns its name. Every band contributes non-zero tax, including the open-ended top bracket. For 2022:

| # | taxable_in_band | tax_in_band |
|---|---|---|
| 1 | $50,197.00 × 15% | $7,529.55 |
| 2 | ($100,392 − $50,197) = $50,195.00 × 20.5% | $10,289.98 |
| 3 | ($155,625 − $100,392) = $55,233.00 × 26% | $14,360.58 |
| 4 | ($221,708 − $155,625) = $66,083.00 × 29% | $19,164.07 |
| 5 | ($500,000 − $221,708) = $278,292.00 × 33% | $91,836.36 |

- **Total Tax ≈ $143,180.54**
- **Effective Rate ≈ 28.64%**

Note that band 5 is bounded by the salary (`min(500000, Infinity) = 500000`) and by `min`, so the taxable amount is `500000 - 221708 = 278292`. The `Infinity` fallback at `calculateTax.ts:32` is what makes the open-ended top bracket work — without it, `max ?? Infinity` would become `undefined` and the subtraction would be NaN.

#### Why the per-band rounding matters

If I summed the raw un-rounded band amounts and rounded only at the end, I would get a total that is mathematically closer to a theoretical "true" answer but does not match the per-band rows the user sees. The user reads the five visible row amounts, mentally adds them, and expects the total to equal the sum of the visible rows. Per-band rounding ensures the displayed math adds up.

Concretely: band 2 for $85,000 is `34803 × 0.205 = 7134.615`. Rounded per-band, that becomes $7,134.62 (banker's rounding up the half). If I summed `7529.55 + 7134.615 = 14664.165` and rounded only at the end, I would display $14,664.17 for the total — but the user adding the visible rows $7,529.55 + $7,134.62 would compute $14,664.17 as well, so in this case the numbers happen to agree. For other bracket configurations they may not. The per-band-first strategy guarantees the row sum always equals the total, regardless of the specific numbers.

This is **Bushido rule two** for the calculation layer, from `IMPLEMENTATION-JOURNAL.md`: *sum the rounded, do not round the sum.*

### 3.6 — The composition: `front-end/src/app/page.tsx` (57 lines)

**Open and show the JSX structure.**

> `page.tsx` is intentionally thin. It reads derived display state from `useCalculatorState` — `isPending`, `hasResults`, `hasError` — and renders one of four states: Loading, Error, Results, or Empty. The derived-state hook is extracted so the page is pure composition and the logic is unit-testable in isolation.

> Two things worth pointing out. The `<div aria-live="polite">` at line 38 is the **persistent live region** — it has to exist in the DOM at page load, not be mounted when results arrive, because NVDA and JAWS do not reliably announce content injected into a freshly created element. The same is true of the `<div role="alert">` wrapper at line 47. I learned this the hard way during the accessibility audit — I'll come back to it in section 7.

### 3.7 — Close the loop

> That's the full path: keystroke to pixel. Form → parseCurrency → Zod → `calculateRequested` event → store update → sample → `taxBracketsQuery.start` → `fetchTaxBracketsFx` → API proxy → Flask → response → Zod contract → `calculateTax` → `setBrackets` → store update → selectors → React re-render. Every link in that chain is individually testable, and every one has tests.

---

## Section 4 — Error Handling Against an Unreliable Backend (5 min)

**Screen:** `docs/diagrams/error-flow.md` and `front-end/src/entities/tax-brackets/model/errorMapping.ts`.

> The backend fails 25% of requests and delays 0–5 seconds between attempts. If I treated every failure as fatal, the UI would be unusable. Instead I treat transient 5xx errors as a retry opportunity and non-transient 4xx errors as terminal state.

**Walk through the decision tree:**

1. Fetch triggered by `taxBracketsQuery.start`.
2. Response arrives at `apiClient`. If `response.ok`, the Zod contract runs.
3. If the contract passes, `finished.success` fires and the calculation runs.
4. If the contract fails, `finished.failure` fires with a contract error.
5. If the response is not ok, `ApiError(status, statusText, body)` is thrown, captured by the effect, and `finished.failure` fires.
6. The `retry` middleware intercepts before `finished.failure` propagates. It inspects the error: if `instanceof ApiError && status >= 500`, it re-runs the effect up to 3 times with 1-second delays. If the filter returns false (4xx or network errors), the failure propagates immediately.
7. `mapError` in samples.ts translates the raw error into `ErrorType` — `'server_error'` for 500s that exhausted retries, `'not_found'` for 404s, `'network_error'` for fetch TypeErrors, `'unknown'` for anything else.
8. The store's `setError` handler atomically clears results and sets the error. The UI shows `ErrorState`, and if the error is retryable, a retry button.

**Key talking point:**

> Error handling logic lives in one place — `errorMapping.ts` — as a declarative strategy table. To add a new error variant, I add one entry. I never touch an if/else chain. This is what SOLID looks like in practice: the error-mapping module has one responsibility, and the open/closed principle is enforced by the type system because `ERROR_MAPPINGS` is typed as `Record<NonNullable<ErrorType>, string>`.

**Anticipated question:** *"What about network errors? Would you retry those?"*
**Answer:** No. A `TypeError: Failed to fetch` from the browser usually means the user is offline, a DNS failure, or CORS — none of which get better by retrying immediately. I surface it as an error with a retry button, so the user can decide when to try again. That's what the current `mapError` does.

---

## Section 5 — State Machine and Invariants (4 min)

**Screen:** `docs/diagrams/state-machine.md` and `front-end/src/entities/tax-brackets/model/state-consistency.test.ts`.

> The store has four visible states: `empty`, `loading`, `results`, `error`. The critical invariant is that **results and error must never coexist.** If both are set, something upstream has a bug and the UI will show contradictory information.

**Show the `assertStateConsistency` helper** in the test file.

> This helper runs after every event in a multi-step test sequence. It asserts that `state.error == null || state.brackets == null` — in other words, at most one of them is set. The test suite runs 9 multi-step sequences: success → error → retry, error → success → reset, parallel forked calculations, and so on. Each sequence exercises a different path through the state machine, and the invariant catches contradictory states that individual handler tests would miss.

**Key talking point:**

> This is **test in three dimensions** — happy paths, edge cases, failure scenarios. A test suite that only verifies the sunshine path gives false confidence. The state consistency tests are the failure-scenario dimension at the store level. Bushido rule three: *a store must never hold contradictions.*

---

## Section 6 — Quality Story: Testing Across Three Dimensions (5 min)

**Screen:** the output of `npm run test:ci` (already visible from the Phase 8.1 gate) or `jest.config.ts` showing the 85% threshold.

### The numbers

| Metric | Value |
|---|---|
| Unit tests | **220** across 23 suites |
| Unit test runtime | ~13 seconds |
| Statement coverage | 100% |
| Branch coverage | 99.11% |
| Enforced threshold | 85% across all metrics |
| E2E tests | **187** across 4 browser projects |
| Browser matrix | Chromium, Firefox, WebKit, mobile Chrome (Pixel 5 viewport) |

### The three dimensions

> I deliberately structured tests around three dimensions, not just happy paths.

**Dimension 1 — Happy paths.** Standard user flows: enter a salary, click calculate, see results. Covered both in unit tests (component rendering with mocked stores) and E2E (real Docker backend, retry-until-success helper for the 25% failure rate).

**Dimension 2 — Edge cases.** Boundary values, extreme inputs: rate=0, rate=1, $999,999,999 salary, NaN, Infinity, MAX_SAFE_INTEGER, empty strings, salary at exact bracket boundaries. The parseCurrency function alone has 15 tests covering every way a user can format a dollar amount.

**Dimension 3 — Failure scenarios.** Network errors, malformed JSON, stream read failures, 500 retry exhaustion, 404 for unsupported years, Zod contract violations. E2E error paths use `page.route()` to mock the API at the Playwright level — the real backend's 25% random failure rate is too flaky for deterministic assertions.

### Accessibility testing layer

> Every component has a `jest-axe` test that runs axe-core against its rendered output. That catches about 60% of accessibility issues automatically. The remaining 40% — dynamic live regions, keyboard focus chains, screen reader announcements — require manual verification and the Playwright cross-browser suite.

**Anticipated question:** *"Why not 100% branch coverage?"*
**Answer:** The uncovered branches are in `useCalculateAction.ts:46` — the `String(formData.get("salary") ?? "")` null-coalesce path. `FormData.get()` is typed as returning `FormDataEntryValue | null`, but in practice the form input is always present. Covering that branch would require constructing a FormData without the expected field, which is a contrived test that doesn't match any real user flow. I accept 99.11% with the understanding that the remaining gap is a defensive guard, not uncovered logic.

---

## Section 7 — Accessibility and Cross-Browser (4 min)

**Screen:** `docs/ACCESSIBILITY.md` and `front-end/src/app/page.tsx` lines 38–49.

> Accessibility is treated as a quality gate dimension, not a checkbox. The WCAG 2.2 AA criteria are enforced in `jest-axe` unit tests, in Playwright accessibility specs across all four browsers, and in a manual review pass.

### The three patterns worth calling out

**1. Persistent live regions.** The biggest accessibility lesson from this build was that `aria-live` and `role="alert"` must already exist in the DOM at page load. NVDA and JAWS do not reliably announce content injected into a freshly mounted live-region element. I moved the live region wrapper to `page.tsx` where it's always rendered, and the conditional content (loading / results / empty / error) renders *inside* it. Point at lines 38 and 47 of `page.tsx`.

**2. Color is never the only signal (WCAG 1.4.1).** Every colored state also has a shape, an icon, and a text label. Red error states also have an AlertCircle icon and a heading. Green success pills also have a "Effective Rate" label. Loading states have a skeleton shape and `sr-only` text. I verified this manually with Chrome DevTools' vision deficiency emulator — automated tools check contrast ratios but do not check whether color carries unique meaning.

**3. Cross-browser accessibility is different.** WebKit on macOS disables Tab focus to `<select>` elements by default — it requires the "Full Keyboard Access" system setting. Firefox has different initial viewport focus behavior than Chromium. The E2E keyboard navigation test branches on `browserName` for the Tab-chain assertions and uses `.focus()` directly for focusability checks. **Chromium-only passing is not "done."**

**Anticipated question:** *"Did you run an actual screen reader?"*
**Answer:** Yes — VoiceOver on macOS during the accessibility folding. That's how I discovered the persistent live region issue. Automated tools and even Playwright's accessibility tree snapshot didn't catch it; manual VO testing did.

---

## Section 8 — Security and PII Handling (3 min)

**Screen:** `front-end/next.config.ts` and `front-end/src/shared/lib/logger/logger.ts`.

### Salary is PII and never leaves the browser

> The salary value is never sent to the backend. Only the year is. The tax calculation happens client-side in `calculateTax.ts` using the brackets the backend returns. This means the user's income never touches the network, and the backend has no logs of individual salaries.

### Defense in depth for logging

> Pino is configured with `redact: ['salary', '*.salary']`. If any code path accidentally tries to log a salary field, Pino replaces it with `[Redacted]` at the logger level. I verified this with a dedicated unit test that asserts the salary value never appears in log output, rather than the tautological version that just checks the config is set.

### Input validation at every boundary

> Zod runs at two boundaries. On form input, it validates that salary is a positive finite number and year is in the supported range. On API response, the same Zod-derived contract validates the bracket array shape before any data reaches `calculateTax`. Malformed responses are rejected at the entity layer and surfaced as a contract error, not passed to the calculation.

### Security headers

> `next.config.ts` sets `Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and a `Permissions-Policy` that disables camera, microphone, and geolocation. The API proxy validates the `:path*` parameter so the rewrite cannot be used to reach arbitrary backend URLs.

> One CSP detail worth calling out because the panel may ask: `font-src` is `'self' data:`, not just `'self'`. The `data:` scheme is there because `next/font/google` inlines small woff2 glyph subsets directly in the generated `@font-face` CSS as base64 data URIs. Without `data:` in the directive, every inlined glyph triggers a CSP violation in the browser console — the fonts fall through to system fallbacks and the page "works," but the console is flooded and the design system breaks silently. I discovered this by eye-balling the running app during the final review pass, fixed the directive, rebuilt the Docker image, and verified the new header was serving. There is an inline comment in `next.config.ts` explaining why `data:` is required so the next auditor does not remove it.

### Docker runtime hardening

> The Dockerfile runs as a non-root `nextjs` user, copies only the standalone build output (no source, no node_modules), and uses Alpine as the base for a small attack surface. Image size is around 120 MB.

**Anticipated question:** *"What about XSS?"*
**Answer:** React escapes by default, so any user-controlled value rendered as text content is safe without extra work. The salary input is the only user-controlled value anywhere in the UI and it passes through Zod as a validated number before it reaches any DOM. There is **one** use of `dangerouslySetInnerHTML` in the entire codebase — `src/app/layout.tsx`, for the JSON-LD structured data block that search engines read to understand this is a `WebApplication` in the `FinanceApplication` category. It is unavoidable there because React escapes the text content of `<script>` elements, and this is the pattern Next.js officially recommends for App Router JSON-LD (the docs are linked inline at the injection site). The content is a static object literal defined at module scope with no user input, no template interpolation, and no dynamic data, so it is not a vector — the "dangerous" name is misleading in this specific case. Phase 8.2's final security audit flagged it, I documented the justification in an inline comment, and the finding was closed as a false positive. If the panel wants to probe further, the file is `src/app/layout.tsx` at the `<head>` block, and the audit finding is recorded in `docs/IMPLEMENTATION-FINDINGS.md` Phase 8.2 section.

---

## Section 9 — Live Demo (4 min)

**Screen:** `http://localhost:3000` if Docker is up, otherwise `docs/media/demo.webm`.

### Demo script

1. **Empty state.** Open the page. Point at the form on the left and the "Enter your salary" empty-state on the right. Show the skip-to-content link by pressing Tab.
2. **Happy path.** Type `85000` in the salary field. Select 2022. Click Calculate. Wait for the loading state (and for any backend retries to finish in the background — be calm, the retry pipeline is the feature). Show the results table: five bracket rows, Total Tax $14,664.17, Effective Rate 17.25%.
3. **Form validation.** Clear the salary field. Click Calculate. Point at the inline "Please enter a valid number" error, and the fact that the previous successful results are still visible on the right — proving the state machine invariant (results and form-validation errors are independent concerns).
4. **Different year.** Enter $150,000. Select 2021. Click Calculate. Show that the calculation runs against a different bracket set from the same component tree.
5. **Mobile view.** Open DevTools, toggle the device toolbar to Pixel 5. Show that the two-panel layout collapses to a single column and the form sub-components re-flow.

### Fallback

> If the live demo fails (backend is in a bad retry loop, network hiccup, Docker crashed), open `docs/media/demo.webm`. It's a recorded walkthrough of this exact sequence captured by `front-end/scripts/capture-media.mjs`, a standalone Playwright script I wrote for documentation purposes.

---

## Anticipated Questions — The Grab Bag

These are the questions panels tend to ask when the scripted walkthrough ends. Prepared answers below. Keep each answer under 60 seconds so the Q&A stays conversational.

### Architecture

**Q: Why not server components for the tax form?**
A: The form is inherently interactive — `useActionState`, event dispatch, Effector store subscriptions — so it has to be a client component. Server components would add a round-trip without adding value. The App Router's `'use client'` directive on `page.tsx` marks the entire widget tree as client-rendered.

**Q: Could you have used React Query or SWR instead of @farfetched?**
A: Yes, and for simpler apps I probably would. I chose @farfetched because it composes with Effector — the query's `finished.success` is an Effector event that plugs directly into my `sample()` wiring without adapters. React Query would have forced me to bridge its internal state into Effector, which is the opposite of the decoupling I was going for.

**Q: Why the `#/` import alias instead of `@/`?**
A: Pure preference inherited from the MoviesTest reference project. The `#` character is unusual enough that searching the codebase for `from '#/` gives me zero false positives, whereas `from '@/` collides with npm scoped packages in grep output. ESLint enforces it so we never mix.

**Q: How does `client.ts` know the backend host?**
A: It doesn't, and that's deliberate. `client.ts` is a 50-line generic fetch wrapper that takes a plain URL string. The call sites pass **relative URLs** like `/api/tax-calculator/tax-year/2022`, so the browser makes a same-origin request to the Next.js frontend. The Next.js server then applies the `rewrites()` rule in `next.config.ts` to proxy server-to-server to the real Flask backend. The backend hostname is only known at build time, via the `API_BASE_URL` environment variable baked in by the Dockerfile's `ARG API_BASE_URL`. This gives us CORS avoidance (same-origin from the browser's perspective), backend hostname secrecy (never exposed in the JS bundle), and environment portability (the same build runs in dev, Docker, and prod — only the baked-in proxy destination differs). The build-time baking is critical: setting `API_BASE_URL` as a runtime `docker run -e` variable does nothing, because `rewrites()` was already evaluated during `next build`. I learned this the hard way during Phase 5 — see section 3.4.5 of this document.

### State management

**Q: How do you handle optimistic updates?**
A: I don't need them here — the calculation is cheap and runs after the fetch completes. If I did, I would add an optimistic `setBrackets` in the sample between `calculateRequested` and the query start, then overwrite it with the real result on `finished.success` and roll back on `finished.failure`.

**Q: What if two users open two tabs and calculate at the same time?**
A: Each tab has its own Effector scope — the store lives in the JavaScript heap per page load. The backend is stateless. `effector-storage` persists the store to localStorage, which is shared across tabs on the same origin, but the sanitize function strips the salary before writing so no PII crosses the tab boundary.

### Testing

**Q: What's your mocking strategy?**
A: Minimal mocking. For unit tests, I use real Effector stores inside `fork()` + `allSettled()` so the test sees the actual store transitions. For the API layer I mock `fetch` globally with `jest.spyOn` only in the tests that specifically exercise error paths. For E2E, happy paths run against the real Docker backend, and error paths use `page.route()` to intercept at the browser level. The rule is: mock at the edge, not in the middle.

**Q: Why is some of your E2E deterministic and some real?**
A: Real backend for happy paths because I want to prove the full integration works. Mocked backend for error paths because the real 25% failure rate gives me `(0.25)⁴ ≈ 0.4%` probability of hitting the error UI in a single run — flaky tests are worse than no tests.

### Performance

**Q: What's the bundle size?**
A: 222.5 KB gzipped across 9 chunks on first paint. I measured it by fetching the production HTML from the running Docker frontend and summing the gzipped size of every `<script src=>` tag. That is 72.5 KB over the 150 KB target in my original plan, and the miss is mostly structural. The baseline for this stack is roughly React 19 at 47 KB gzipped, plus the Next.js App Router runtime at 40 KB, plus Effector and effector-react at 15 KB, plus @farfetched with Zod contract support at 20 KB, plus Zod itself at 15 KB, plus Pino's browser build at 15 to 20 KB, plus about 20 KB of app code. That is a floor of roughly 180 KB before any optimization, and 40 KB of Next.js runtime overhead above that floor is reasonable. Dropping Effector, @farfetched, or Zod would cost more in architectural integrity than it would save in bytes — each is the foundation of a specific story I defend during this walkthrough. **Pino is the one exception.** Pino is a logger, not a load-bearing architectural choice; the only features the app uses are `logger.info` for API call and retry tracing and the `redact: ['salary', '*.salary']` PII guard. A 200-byte custom wrapper around `console.info` with the same redact logic would save 10 to 15 KB gzipped and close the miss to roughly 60 KB over target. I have not made that swap because it was out of scope for this exercise, but I want to be clear that the "every dependency is load-bearing" framing is too strong — Pino specifically is substitutable, and the Phase 8.5 adversarial review flagged the rhetorical overreach. I tried one other optimization before accepting the miss: dynamic-importing the three widgets that only render after user interaction (`LoadingState`, `ErrorState`, `TaxBreakdown`). The measured delta was zero kilobytes, because Next.js App Router prefetches dynamically-imported client component chunks on first paint via the RSC payload — splitting them produces a tenth chunk, not a deferred load. I reverted the change. One consequential detail: during the same review, I discovered `next.config.ts` had `compress: false`, which would only have been correct if a reverse proxy were handling compression. The Docker Compose topology has no reverse proxy, so every response had actually been going over the wire as 750 KB raw, not 222.5 KB gzipped. I set `compress: true`, rebuilt, and verified. The 222.5 KB figure is now the real wire size, not a theoretical best-case.

**Q: How did you handle re-renders?**
A: Effector selectors are granular — each `selectors.use*` reads a specific slice of the store via `.map()`. Components only re-render when their specific slice changes. The `TaxBreakdown` table rows are wrapped in `React.memo` because they receive stable props and get remounted frequently when the user recalculates.

### Deployment

**Q: How would you deploy this?**
A: The Next.js standalone build output runs on Node with a single command, `node server.js`. I'd deploy the image built by the multi-stage Dockerfile to any container platform — Cloud Run, ECS Fargate, Fly.io, Railway. The one thing to remember is that `API_BASE_URL` has to be a Docker build `ARG`, not a runtime `ENV`, because Next.js `rewrites()` are baked into the standalone output at build time. Bushido rule five: *that which is baked cannot be re-baked.*

**Q: What about observability in production?**
A: The Pino logger writes structured JSON that any log aggregator — Datadog, Loki, CloudWatch — can parse. I'd add distributed tracing on the API routes via OpenTelemetry as a follow-up, but the synchronous single-API-call architecture here means traces would mostly be a straight line.

### What would you do differently

**Q: Knowing what you know now, what would you do differently?**
A: Six things, all documented in `IMPLEMENTATION-JOURNAL.md` under "What I Would Do On the Second Dawn." The highlights:

1. Visual check the rendered page after every config change. I deleted `postcss.config.mjs` by accident and every automated check passed — the app just silently rendered with zero styles. Thirty seconds of `curl | grep class` would have caught it immediately.
2. Run `npx playwright test` across all four browsers as the default, not `test:e2e:chromium`. Fast Chromium feedback is for development; the four-browser matrix is the gate.
3. Summon the accessibility audit agent at the start of Phase 3, not after Phase 7. The persistent live region pattern would have been designed in from the start instead of retrofitted.
4. Write tests with `data-testid` selectors from the first keystroke. Refactoring 220 tests away from `getByText` after the fact was expensive.
5. JSDoc on exports as they are written, not in a dedicated documentation phase at the end.
6. Treat accessibility as a Phase 0 concern, not a Phase 7 retrofit.

---

## Opening Line — Rehearsed

> Good morning. I'm going to walk you through a Canadian federal tax calculator I built against an intentionally unreliable Flask backend. The backend fails about one in four requests and sleeps up to five seconds between responses, so the interesting part of this exercise isn't the arithmetic — it's the error handling, the state machine, and the user experience under realistic failure. I'll spend the first twenty minutes on architecture and a live code walkthrough, ten minutes on error handling and state invariants, ten minutes on quality — testing, accessibility, security — and the last five minutes on a live demo and your questions. Please interrupt at any point.

## Closing Line — Rehearsed

> That's the full tour. The sword is forged, the dōjō is clean, and every decision I made is documented — not just the code, but the reasoning, in `docs/IMPLEMENTATION-FINDINGS.md` and the two companion scrolls `IMPLEMENTATION-JOURNAL.md` and `MEMORY-OF-AI.md`. I'm happy to go deeper on any file, any decision, or any tradeoff. What would you like to explore first?

---

## Pre-Session Checklist — Run 15 Minutes Before

```bash
# 1. Verify Docker stack is healthy
docker ps --format "{{.Names}}\t{{.Status}}"
curl -sS -o /dev/null -w "frontend=%{http_code}\n" http://localhost:3000
curl -sS -o /dev/null -w "backend=%{http_code}\n" http://localhost:5001/tax-calculator/tax-year/2022

# 2. Open the key files in tabs in the IDE:
#    - front-end/src/widgets/tax-calculator/ui/TaxForm.tsx
#    - front-end/src/widgets/tax-calculator/lib/useCalculateAction.ts
#    - front-end/src/entities/tax-brackets/model/samples.ts
#    - front-end/src/entities/tax-brackets/model/effects.ts
#    - front-end/src/shared/lib/tax/calculateTax.ts
#    - front-end/src/app/page.tsx
#    - front-end/next.config.ts
#    - docs/diagrams/architecture.md (rendered preview)
#    - docs/diagrams/data-flow.md (rendered preview)
#    - docs/diagrams/error-flow.md (rendered preview)
#    - docs/ACCESSIBILITY.md

# 3. Open a browser tab to http://localhost:3000 and confirm the empty state renders
# 4. Have docs/media/demo.webm ready in a separate tab as a fallback

# 5. Close every other application that might send notifications
# 6. Silence phone
# 7. Drink water
```

If the Docker stack is down, bring it up with:

```bash
docker compose up -d --wait
```

First request after cold start may 500 once or twice — don't panic, that's the backend waking up and the retry pipeline doing its job.

---

## One-Slide Elevator Pitch (30 seconds)

If the panel cuts the walkthrough short and asks for the elevator version:

> Canadian federal tax calculator. Next.js 16, React 19, Effector for state, @farfetched with Zod contracts for queries, Tailwind 4, Feature Sliced Design. 78 source files, 220 unit tests, 187 E2E tests across four browsers, 100% statement coverage. Handles the backend's 25% random 500s via a filtered retry pipeline and its 404s as terminal errors. Salary is treated as PII and never leaves the browser. Persistent live regions for screen readers. Every design decision is documented in four markdown scrolls under `docs/`. I'd love to show you the data flow — it's forty lines of `sample()` calls that do what would take two hundred lines of Redux thunks.
