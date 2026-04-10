---
name: cross-browser-testing
description: E2E tests must run on all 4 browsers — behaviors differ significantly between Chromium, Firefox, WebKit, and mobile
type: feedback
originSessionId: 7dc31e60-f462-47e0-9826-e42a987c6fc0
---
**E2E tests that pass on Chromium may fail on WebKit/Firefox/Mobile. Always run all 4 browsers.**

## Known Browser Differences Encountered

### WebKit (Safari)
- **Tab navigation to/from `<select>` is disabled by default** on macOS unless "Full Keyboard Access" is enabled in System Settings. In headless WebKit via Playwright, this produces inconsistent Tab behavior.
- **Solution**: Don't rely on Tab chains in E2E tests for WebKit. Use `.focus()` directly to verify focusability, and test Tab order only on Chromium/Firefox.

### Firefox
- **Initial page focus differs** — Firefox may not auto-focus the viewport on `goto()`, so the first `Tab` press might do nothing.
- **Solution**: Explicitly call `.focus()` on the first element before pressing Tab.

### Mobile Chrome (Pixel 5 viewport)
- **Touch targets verified** via viewport emulation — confirms 48px minimum is actually 48px at 2x DPR.
- **Hover states** don't apply — tests that wait for hover transitions will hang.

### Chromium
- Most permissive — things that work here may fail elsewhere.
- Use as the fast feedback loop during development (`npm run test:e2e:chromium`), but always verify all 4 before shipping.

## E2E Tests MUST Cover Accessibility

Accessibility is not a unit-test-only concern. E2E tests must verify:
- Landmarks: `<main>`, `<h1>`, skip-to-content link
- Form labels: `getByLabelText` links
- ARIA attributes: `aria-live`, `aria-atomic`, `aria-required`, `aria-invalid`, `aria-describedby`
- Keyboard navigation: focus management, tab order (where browser supports it)
- Live regions: dynamic content announcements
- Semantic HTML: table structure (thead/tbody/tfoot/th scope)

## Lessons

1. **Always test all 4 browser projects before declaring done** — Chromium-only passing is not "done"
2. **Browser-specific behavior needs branching** — `browserName === "chromium" || "firefox"` guards for Tab tests
3. **Prefer direct focus() over Tab chains** in cross-browser tests unless Tab ORDER is specifically what's being tested
4. **Mobile viewport matters** — touch targets and hover-free interactions differ from desktop

**Why:** The user explicitly asked to verify all browsers. During this session, keyboard nav test passed on Chromium but failed on WebKit/Firefox/Mobile due to select-focus behavior differences.

**How to apply:** `npx playwright test` (all 4 browsers) is the default quality gate, not `test:e2e:chromium`. Document any browser-specific skips with a comment explaining why.
