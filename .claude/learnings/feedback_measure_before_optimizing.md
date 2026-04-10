---
name: measure-before-optimizing-dynamic-imports-trap
description: Optimization changes must be backed by a measurement showing the delta. Speculative refactors that "should" improve performance often do not, and keeping them adds complexity without benefit. Next.js App Router dynamic imports in particular do NOT defer loads.
type: feedback
---

**Every optimization must be backed by a measurement showing the delta. If the numbers do not move, revert the change.**

**Why:** On 2026-04-10 in Phase 8.3, I attempted to reduce the first-load JS bundle by dynamic-importing the three conditional state widgets (`LoadingState`, `ErrorState`, `TaxBreakdown`) via `next/dynamic` with `ssr: false`. The reasoning was sound: these widgets only render after user interaction, so in theory they should defer to secondary chunks loaded on demand. I measured before (222.5 KB gzipped), applied the change, rebuilt, measured again (223 KB gzipped — within measurement noise), and discovered the optimization had achieved nothing.

The reason, learned the hard way: **Next.js App Router prefetches dynamically-imported client component chunks on first paint via the RSC payload.** The code is split into separate files, but all of the split files still appear in the HTML as `<script src=>` tags and get downloaded on initial load. `next/dynamic` in App Router is a **code-splitting primitive, not a load-deferral primitive**. This is different from Pages Router, where dynamic imports did defer loads.

I reverted the change. Keeping it would have added:
- 15 lines of complexity
- An extra abstraction layer between the page component and its widgets
- A silent `ssr: false` footgun that would cause a hydration mismatch if someone ever populated the Effector initial state with cached results
- Harder-to-read JSX in `page.tsx`

For zero measured benefit.

**How to apply:**

1. **Measure before every performance optimization.** Take the baseline number with the same measurement method you will use to verify the change. Write the baseline down so you have something to compare against.
2. **If the delta is under 5% or within measurement noise, revert the change.** A change that does not move the needle is not an optimization — it is a refactor that pays its complexity cost without providing the benefit that justified the cost. Revert and move on.
3. **Do not trust theoretical performance improvements.** `next/dynamic` "should" defer loads. `useMemo` "should" prevent re-renders. `React.lazy` "should" code-split. Each of these assumptions is context-dependent, and the only way to know if the theory applies to your specific situation is to measure.
4. **Specifically for Next.js App Router:** `next/dynamic` does not defer loads on first paint. If you need actual deferral, the code must be gated behind a user interaction that the server cannot see (e.g., a modal, a tab switch, a route that the user navigates to after mount). Anything rendered conditionally in the same route's page component on first load will be prefetched.
5. **The KISS principle and the decoupling principle both argue against speculative abstractions.** An abstraction earns its place by providing a measurable benefit. A speculative one is a debt future-you will pay without knowing why.
6. **Keep the measurement numbers in the PR body, the findings, and the walkthrough.** Honest numbers that a reviewer can compare against are better than hidden numbers that only the author knows.

**The generalized lesson:** optimization is a discipline of measurements, not of reasoning. The smart-looking refactor that measurements reject is a debt, not a deposit. Elegance is not a reason to ship a change.
