# App Layer

The `app/` directory is the Next.js routing layer and the topmost level of the
Feature Sliced Design hierarchy. It is responsible for route definition, global
layout, metadata, store persistence wiring, and asset generation. It imports
from `#/widgets/*` and `#/entities/*` but is never imported by lower layers.

```
src/app/
  layout.tsx              <- Root layout: metadata, fonts, JSON-LD, StoresPersistence
  page.tsx                <- Home route: widget composition and conditional rendering
  StoresPersistence.tsx   <- Effector store hydration/persistence wrapper
  opengraph-image.tsx     <- Auto-generated OG image (Next.js route)
  globals.css             <- Tailwind 4 CSS-first config, design tokens, keyframes
  page.test.tsx           <- Integration tests for the home route
```

---

## `layout.tsx`

The root layout wraps every route in the application. It runs on the server.

### Metadata

`metadata` is exported as a `Metadata` object (Next.js typed constant). Key
fields:

| Field                  | Value                                                                                                      |
| ---------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------- |
| `title.default`        | `"Tax Calculator — Canadian Federal Income Tax"`                                                           |
| `title.template`       | `"%s                                                                                                       | Tax Calculator"` |
| `description`          | Free Canadian federal income tax calculator copy                                                           |
| `keywords`             | `["tax calculator", "Canadian income tax", "federal tax brackets", "effective tax rate", "tax year 2022"]` |
| `robots`               | `index: true`, `follow: true`, full Googlebot directives                                                   |
| `openGraph.locale`     | `"en_CA"`                                                                                                  |
| `twitter.card`         | `"summary_large_image"`                                                                                    |
| `other["theme-color"]` | `"#1A1226"` (matches `--bg-page` token)                                                                    |

### JSON-LD Structured Data

A `<Script id="json-ld" type="application/ld+json">` tag is injected into
`<head>` with a `schema.org/WebApplication` object:

```json
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "Tax Calculator",
  "applicationCategory": "FinanceApplication",
  "operatingSystem": "Any",
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "CAD" }
}
```

### Fonts

Two variable fonts are loaded via `next/font/google`:

| Variable            | Font               |
| ------------------- | ------------------ |
| `--font-geist-sans` | Geist (sans-serif) |
| `--font-geist-mono` | Geist Mono         |

Both CSS variables are injected onto `<html>` and consumed by the
`@theme inline` block in `globals.css` as `--font-sans` and `--font-mono`.

### `StoresPersistence` Wrapper

`<body>` renders `<StoresPersistence>{children}</StoresPersistence>`. This
client component must be an ancestor of every page so that the Effector store
persistence effect fires before any widget attempts to read hydrated state.

---

## `page.tsx`

The home route (`/`). A `"use client"` component that composes the five
`tax-calculator` widgets into the page shell.

### Conditional Rendering

The results panel renders exactly one of the four states at a time:

```tsx
{
  isPending && <LoadingState />;
}
{
  !isPending && hasError && <ErrorState />;
}
{
  !isPending && !hasError && hasResults && <TaxBreakdown />;
}
{
  !isPending && !hasError && !hasResults && <EmptyState />;
}
```

Priority order (highest to lowest): `LoadingState` > `ErrorState` >
`TaxBreakdown` > `EmptyState`.

State is read from Effector selectors:

| Selector                   | Drives                                        |
| -------------------------- | --------------------------------------------- |
| `selectors.useIsPending()` | `isPending`                                   |
| `selectors.useError()`     | `hasError`                                    |
| `selectors.useBands()`     | `hasResults` (truthy when `bands.length > 0`) |

The model's sample wiring (`#/entities/tax-brackets/model/samples`) is imported
as a side-effect at module scope to register Effector event listeners before any
interaction occurs.

### Skip-to-Content Link

A `<a href="#main-content">` link is rendered as the first child of the
fragment. It is visually hidden via `sr-only` by default and becomes visible
only on `:focus-visible`, using `focus-visible:not-sr-only` and absolute
positioning. This satisfies WCAG 2.1 Success Criterion 2.4.1 (Bypass Blocks).

### Visually Hidden Heading

`<h1 className="sr-only">Canadian Federal Tax Calculator</h1>` provides a
document-level heading for screen reader navigation without displacing the
visual design, which uses the `<h2>` inside `TaxForm` as the first visible
heading.

### Layout

```
<main id="main-content" data-testid="main-content">
  <h1 class="sr-only">...</h1>
  <div>              <- flex column (mobile) / flex row (lg breakpoint)
    <TaxForm />      <- lg:w-[440px] lg:shrink-0
    <div data-testid="results-panel"
         aria-live="polite"
         aria-atomic="true">  <- PERSISTENT live region for NVDA/JAWS
      {isPending && <LoadingState />}
      <div role="alert" aria-label="Calculation error">  <- persistent alert wrapper
        {!isPending && hasError && <ErrorState />}
      </div>
      {!isPending && !hasError && hasResults && <TaxBreakdown />}
      {!isPending && !hasError && !hasResults && <EmptyState />}
    </div>
  </div>
</main>
```

**Why two persistent wrappers?** NVDA and JAWS do not reliably announce content
on elements that didn't exist at page load. Both `aria-live` and `role="alert"`
must be on containers that mount at page load — dynamic content is then injected
inside them. This is the single most important accessibility pattern in the app
layer.

### `data-testid` Attributes

| Attribute       | Element                 |
| --------------- | ----------------------- |
| `skip-link`     | Skip-to-content `<a>`   |
| `main-content`  | `<main>`                |
| `results-panel` | Results wrapper `<div>` |

---

## `StoresPersistence.tsx`

A `"use client"` component that wires Effector store persistence on mount via
`useEffect`.

### Behaviour

```ts
createPersistedStore<TaxBracketsStore>($taxBrackets, 'taxResults', {
  ttlMs: 2 * 60 * 1000, // 2-minute TTL
  sanitize: state => ({
    ...state,
    salary: 0, // salary is PII — never written to storage
  }),
});
```

- **Storage key**: `"taxResults"` (localStorage via `effector-storage`)
- **TTL**: 2 minutes. Stale persisted results are discarded on hydration.
- **PII sanitization**: `salary` is zeroed out before writing. Calculation
  results (bands, total tax, effective rate) are persisted but the income figure
  that produced them is not.

`createPersistedStore` is a utility from `#/shared/lib/store`.

**Props**:

| Prop       | Type              | Description             |
| ---------- | ----------------- | ----------------------- |
| `children` | `React.ReactNode` | Route content to render |

---

## `opengraph-image.tsx`

A Next.js
[opengraph-image route convention](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/opengraph-image)
that auto-generates the Open Graph and Twitter card image at build time.

### Exports

| Export        | Value                                            |
| ------------- | ------------------------------------------------ |
| `runtime`     | `"nodejs"`                                       |
| `alt`         | `"Tax Calculator — Canadian Federal Income Tax"` |
| `size`        | `{ width: 1200, height: 630 }`                   |
| `contentType` | `"image/png"`                                    |

### Visual Design

The generated image renders on a `#1A1226` (page background) canvas:

- A `64×64` rounded square badge with `#7C6AE8` (primary button colour)
  background containing a `$` character
- `"Tax Calculator"` in 48px bold `#F5F0FA` (primary text colour)
- `"Canadian Federal Income Tax • 2019-2022"` in 24px `#B8AEC8` (secondary text
  colour)

Inline `style` props are required here because `next/og`'s `ImageResponse` does
not support Tailwind class names.

---

## `globals.css`

The Tailwind 4 CSS-first configuration file. Imported once in `layout.tsx`.

### Structure

```
@import "tailwindcss";    <- activates Tailwind v4 engine

:root { ... }             <- raw CSS custom properties (28 tokens)

@theme inline { ... }     <- maps :root tokens to Tailwind color/font utilities

@keyframes fade-in-up     <- used by TaxBreakdown entry animation
@keyframes fade-in-down   <- used by ErrorState entry animation
@keyframes pulse-soft     <- reserved for custom pulse variants

@media (prefers-reduced-motion: reduce) { ... }

body { ... }
*:focus-visible { ... }
```

### Design Tokens

All tokens are defined once in `:root` as CSS custom properties and surfaced as
Tailwind utilities through `@theme inline`. There is no `tailwind.config.ts` —
the `@theme inline` block is the single source of truth.

**Background tokens** (`--bg-*` → `bg-bg-*`):

| Token                                  | Hex       | Used by                 |
| -------------------------------------- | --------- | ----------------------- |
| `--bg-page`                            | `#1A1226` | Page background         |
| `--bg-card-form` / `--bg-card-results` | `#241C32` | Widget cards            |
| `--bg-input`                           | `#31264A` | Input and select fields |
| `--bg-dropdown`                        | `#2A2139` | Dropdown overlay        |
| `--bg-highlight-row`                   | `#332A48` | Even band rows          |
| `--bg-sub-row`                         | `#2D243F` | Odd band rows           |
| `--bg-total-row`                       | `#3E3258` | Total row               |
| `--bg-skeleton`                        | `#2D243F` | Loading skeleton base   |
| `--bg-error`                           | `#2E1C24` | Error card background   |
| `--bg-row-hover`                       | `#3B3155` | Band row hover          |

**Text tokens** (`--text-*` → `text-text-*`):

| Token              | Hex       | Usage                            |
| ------------------ | --------- | -------------------------------- |
| `--text-primary`   | `#F5F0FA` | Headings, values                 |
| `--text-secondary` | `#B8AEC8` | Labels, body copy                |
| `--text-muted`     | `#8A7FA0` | Placeholders, helper text        |
| `--text-accent`    | `#4ECAA0` | Rate values, interactive accents |

**Interactive tokens**:

| Token                  | Hex       | Usage                             |
| ---------------------- | --------- | --------------------------------- |
| `--btn-primary`        | `#7C6AE8` | Submit button                     |
| `--btn-primary-hover`  | `#6B58D6` | Button hover                      |
| `--btn-primary-active` | `#5E4DC4` | Button active                     |
| `--ring-focus`         | `#7C6AE8` | Focus outline (`*:focus-visible`) |

**Status tokens**:

| Token              | Hex       | Usage                     |
| ------------------ | --------- | ------------------------- |
| `--status-error`   | `#E85C5C` | Error icon, title, border |
| `--status-success` | `#4ECAA0` | Success indicator         |
| `--status-info`    | `#60A5FA` | Info indicator            |

**Pill tokens**:

| Token         | Value                  | Usage                          |
| ------------- | ---------------------- | ------------------------------ |
| `--pill-bg`   | `rgba(78,202,160,0.1)` | Effective rate pill background |
| `--pill-text` | `#4ECAA0`              | Effective rate pill text       |

### Keyframes

| Name           | Direction               | Used by                                                     |
| -------------- | ----------------------- | ----------------------------------------------------------- |
| `fade-in-up`   | `translateY(12px)` → 0  | `TaxBreakdown` (`animate-[fade-in-up_0.4s_ease-out_both]`)  |
| `fade-in-down` | `translateY(-12px)` → 0 | `ErrorState` (`animate-[fade-in-down_0.35s_ease-out_both]`) |
| `pulse-soft`   | opacity 1 → 0.5 → 1     | Reserved; not currently used                                |

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

All entry animations and `animate-pulse` skeletons are effectively disabled for
users who have enabled the OS-level "reduce motion" preference.

### Focus Styles

```css
*:focus-visible {
  outline: 2px solid var(--ring-focus);
  outline-offset: 2px;
}
```

A global focus ring is applied to every focusable element using the
`--ring-focus` token (`#7C6AE8`). Individual components that need a different
ring style (e.g., `focus:ring-2 focus:ring-ring-focus`) augment this via
Tailwind utilities.

---

## See Also

- [src/README.md](../README.md) — FSD layer overview
- [Tax Calculator Widget](../widgets/tax-calculator/README.md) — component API
  for the five UI components composed in `page.tsx`
- `#/entities/tax-brackets` — Effector store, events, and selectors consumed by
  `page.tsx` and `StoresPersistence.tsx`
