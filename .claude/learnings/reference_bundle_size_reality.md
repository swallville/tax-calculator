---
name: bundle-size-reality-next16-react19-stack
description: Realistic first-load JS baseline for Next.js 16 + React 19 + Effector + @farfetched + Zod + Pino is ~220 KB gzipped. The 150 KB target in the implementation plan is aspirational and predates the stack upgrades — do not try to hit it by removing architectural pieces.
type: reference
---

**The first-load JS bundle for the tax-calculator is 218 KB gzipped, measured on 2026-04-10 at the end of Phase 8.6 against a clean rebuild of the production artifact.**

This is 68 KB over the 150 KB target in `docs/IMPLEMENTATION-PLAN.md` Final Checklist item 14. The miss is structural, not negligence. Phase 8.3 originally measured 222.5 KB; Phase 8.6 removed Pino and landed the final number at 218 KB after the custom logger swap (about 4 KB saved, smaller than the Phase 8.5 review's 10-15 KB estimate). A mid-pass measurement during Phase 8.6 appeared to show ~101 KB of Pino savings (reading of 121 KB), but that turned out to be noise from a partial server response against a stale cache — the clean rebuild showed the real number is 218 KB.

### Baseline breakdown (approximate gzipped contribution)

| Dependency | Approx. gzipped |
|---|---|
| React 19 + React DOM | ~47 KB |
| Next.js 16 App Router runtime (rewrites + standalone) | ~40 KB |
| Effector + effector-react | ~15 KB |
| @farfetched/core + @farfetched/zod | ~20 KB |
| Zod | ~15 KB |
| Pino browser build | ~15–20 KB |
| effector-storage + clsx + misc | ~5 KB |
| App code (widgets, hooks, samples, selectors) | ~20 KB |
| **Baseline before optimization** | **~180 KB** |
| Observed total (Phase 8.6 final) | **218 KB** |
| Next.js runtime overhead above baseline | ~40 KB (reasonable) |

### Why the original 150 KB target does not apply

The target predates React 19 (~47 KB alone) and Next.js 16. Hitting 150 KB with the current stack would require dropping one of:

- **Effector + effector-react (~15 KB)** — the reactive state foundation
- **@farfetched (~20 KB)** — the query layer with retry, cache, and Zod contract validation
- **Zod (~15 KB)** — the end-to-end validation layer (API contracts + form input)
- **Pino (~15–20 KB)** — the PII-redacting structured logger

Each of these is load-bearing for a specific architectural story the solution is built around. Removing any of them costs more in architectural integrity than it saves in bytes.

### Optimization attempted and reverted

Dynamic-imported `LoadingState`, `ErrorState`, `TaxBreakdown` via `next/dynamic` with `ssr: false` — they only render after user interaction, so in theory they should defer to secondary chunks. **Measured delta: 0 KB** (222.5 KB → 223 KB, noise).

The reason: **Next.js App Router prefetches dynamically-imported client component chunks on first paint via the RSC payload.** The split produced a tenth chunk but Next.js still emitted all ten `<script src=>` tags in the initial HTML. Code was split but not deferred. Added 15 lines of complexity and an `ssr: false` footgun for zero benefit. Reverted per KISS.

### When "the gold standard measurement" moves

**Why:** A target set against a different landscape does not bind the new landscape to its old measurement. The 150 KB figure was written against React 18 and Next.js 14 era assumptions. It does not apply unchanged to React 19 + Next.js 16. Re-measuring the baseline is part of honoring the plan, not ignoring it.

**How to apply:**

1. **If the panel asks about bundle size, answer with the measured number (218 KB gzipped as of Phase 8.6) and the baseline decomposition (~180 KB before app code).** Lead with the honest number, not the aspirational target. Defending a miss with reasons is integrity; hiding a miss with micro-optimizations is a lie. Phase 8.3 originally measured 222.5 KB; Pino was replaced with a custom logger in Phase 8.6 saving ~4 KB. Also mention the nonce CSP migration that was attempted and reverted in Phase 8.6 after the measurement showed it forced every route from static prerender to dynamic SSR — the security gain did not justify the cost for this specific threat model.
2. **If a future task is "get the bundle under 150 KB"**, start by challenging the target itself. The architectural cost of the last 72 KB is enormous — dropping a load-bearing dependency. Document the trade and get explicit approval before starting.
3. **Do not attempt bundle optimizations speculatively.** Every optimization must be backed by a measurement showing the delta. `next/dynamic` with `ssr: false` in App Router does not defer loads — it splits chunks that still get prefetched on first paint. Verified empirically in this session.
4. **The high-leverage optimization, if you ever need one, is Pino replacement.** Pino's browser build is larger than its Node build and most of it is features the browser does not need. Replacing Pino with a smaller browser-only logger would save ~10–15 KB. Everything else is core architecture.
5. **Document the miss in the PR body** so reviewers see the number and the reasoning together. Hidden misses become landmines for future engineers who will try to "fix" them without understanding the trade.
