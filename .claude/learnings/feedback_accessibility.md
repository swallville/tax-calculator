---
name: accessibility-requirements
description: Accessibility is a first-class quality dimension — screen reader support, persistent live regions, WCAG compliance required
type: feedback
originSessionId: 7dc31e60-f462-47e0-9826-e42a987c6fc0
---
**Accessibility is not optional — it must be checked after every code change.**

## Critical Screen Reader Patterns

1. **Persistent live regions**: `aria-live="polite"` and `role="alert"` containers must pre-exist in the DOM at page load. NVDA and JAWS do NOT reliably announce content injected into freshly mounted live region elements. Place the live region wrapper in page.tsx (always mounted), render dynamic content inside it.

2. **aria-labelledby over aria-label**: When a visible heading exists, link it to the section via `aria-labelledby` + `id` rather than duplicating the text in `aria-label`. This keeps the AT announcement in sync with the visual heading.

3. **aria-required on inputs**: Screen readers announce "required" — without it, blind users discover the requirement only after a failed submission.

4. **Table semantics**: Use `<th scope="row">` for row headers (like "Total Tax"), not `<td>`. Hide empty spacer cells with `aria-hidden="true"`.

5. **Decorative SVGs**: Both the `<svg>` element AND its wrapper `<span>` should have `aria-hidden="true"` — belt-and-suspenders for older AT.

## Quality Gate Must Include

Every quality check must run the ui-visual-validator agent for accessibility audit. Check:
- Document structure (h1, heading hierarchy, skip link, main landmark)
- Form labels (htmlFor/id, aria-invalid, aria-describedby, aria-required)
- Live regions (persistent in DOM, aria-atomic)
- Alerts (persistent wrapper, role="alert")
- Focus management (focus-visible, touch targets ≥48px)
- Decorative content (aria-hidden on all SVGs)
- Reduced motion (prefers-reduced-motion media query)

## Documentation

All a11y features must be documented in `docs/ACCESSIBILITY.md` with:
- The WCAG criterion being satisfied
- The exact implementation location (file:line)
- WHY the feature is necessary (what fails for the user without it)

**Why:** The user explicitly requires screen reader support for blind users. Automated tests (jest-axe, Playwright) catch ~60% of a11y issues — the remaining 40% require manual AT testing and correct ARIA patterns that only code review catches.

**How to apply:** Use the ui-visual-validator agent after every phase. Check persistent live regions whenever conditional rendering changes. Document every ARIA attribute's purpose.

## Color Blindness (WCAG 1.4.1)

**Color must never be the only signal.** For every colored state, also provide:
- An icon (red alert → AlertCircle SVG)
- A text label (error → "Calculation Failed" title)
- An ARIA attribute (`role="alert"`, `aria-invalid="true"`)

Test manually via Chrome DevTools → Rendering → Emulate vision deficiencies (deuteranopia, protanopia, tritanopia). Automated tools check contrast ratios but NOT whether color carries unique meaning.

## Cross-Browser Testing is Part of A11y

Accessibility behavior differs across browsers:
- **WebKit**: `<select>` tab navigation disabled by default (macOS "Full Keyboard Access" setting)
- **Firefox**: viewport auto-focus differs from Chromium
- **Mobile**: hover states don't apply, touch target sizes verified at 2x DPR

Quality gate must run `npx playwright test` (ALL 4 browsers), not just Chromium.
