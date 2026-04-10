---
name: CSP font-src must include data: when using next/font/google
description: Next.js next/font/google inlines small woff2 glyph subsets as data URIs in the generated @font-face CSS. A CSP of `font-src 'self'` blocks them silently in dev but floods the console in production. Always use `font-src 'self' data:` for Next.js apps with self-hosted Google fonts.
type: feedback
---

**Any Next.js app using `next/font/google` must set `font-src 'self' data:` in its Content-Security-Policy, not just `font-src 'self'`.**

**Why:** Next.js downloads Google fonts at build time and serves them from its own origin (`/_next/static/media/*.woff2`), but it also inlines small glyph subsets directly in the generated `@font-face` CSS as `data:application/font-woff2;base64,...` URIs. The `font-src 'self'` directive covers the `.woff2` files served from `/_next/static/media/` but does **not** cover the inlined `data:` URIs — `data:` is a separate scheme that must be explicitly allowed.

On 2026-04-10 in tax-calculator Phase 8.3, the user reported the browser console flooding with errors of the form *"Loading the font '<URL>' violates the following Content Security Policy directive: font-src 'self'. The action has been blocked."* Every font family from `next/font/google` (Geist and Geist_Mono) was blocked. The Phase 0 CSP configuration had `font-src 'self'` without `data:`, because at the time we were thinking about external Google Fonts CDN calls, not about the inlined glyph subsets that Next.js injects into the CSS.

**Fix:** append `data:` to the `font-src` directive in `next.config.ts`:

```ts
"font-src 'self' data:",
```

Document it inline so the next auditor does not remove it:

```ts
// `data:` is required because next/font/google inlines small
// woff2 glyph subsets as data URIs in the generated @font-face
// CSS. Without it, every inlined font triggers a CSP violation
// even though the bytes are same-origin.
"font-src 'self' data:",
```

**How to apply:**

1. Every Next.js project using `next/font/google` (or any other `next/font/*` loader that might inline glyphs) should have `font-src 'self' data:`. Not just `'self'`.
2. Do not confuse this with loading Google Fonts from the Google CDN at runtime — that would require `https://fonts.gstatic.com https://fonts.googleapis.com` in the CSP. `next/font/google` avoids the CDN entirely by downloading the fonts at build time, which is why `'self'` is needed. The `data:` scheme is for the inlined glyph subsets, which is separate.
3. **Automated tests miss this.** `jest-axe`, the Playwright accessibility spec, and the CSP header assertion tests all ran green. The bug only shows up in a real browser rendering a real page, and only as console warnings — the fonts still "fall through" to system fallbacks, so the page renders without looking obviously broken. Visual inspection and the browser console are the detection surface. The user caught it during their own interaction with the running app.
4. **Write an E2E assertion** that fetches the index page with a real browser, collects console errors, and fails if any match the pattern `/Content Security Policy/`. This would catch both this specific class of bug and any future CSP regressions (e.g. adding a new inline script without updating `script-src`). The tax-calculator's `e2e/security.spec.ts` does not currently do this — worth adding if a further session iterates on it.
5. **The general lesson:** CSP violations that do not break rendering will not be caught by automated tests that only check "does the page render." Add console-error assertions to critical E2E paths.
