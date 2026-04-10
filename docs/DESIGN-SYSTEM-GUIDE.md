# Design System Guide

This document is the authoritative reference for the Tax Calculator design system. It covers philosophy, token usage, component patterns, animation, accessibility, and enforcement rules. Every UI change should be validated against this guide before merging.

---

## 1. Design Philosophy

### The Aesthetic Direction: Luxury Dark Plum

The Tax Calculator uses a "luxury refined" dark aesthetic built on deep violet-plum backgrounds, muted lavender text, a mint-green accent, and a violet interactive color. The visual language is deliberate: understated, confident, and premium.

### Why This Direction for a Financial App

Financial software carries an implicit trust contract. Users are sharing sensitive income data and making decisions based on the output. The design system responds to that responsibility with three commitments:

- **Trust through restraint.** Dense, cluttered interfaces feel cheap and unreliable. Generous whitespace and quiet backgrounds signal that the product is not shouting for attention — it is simply working.
- **Sophistication through consistency.** A tightly controlled token system means every surface, border, and text element belongs to the same visual family. Inconsistency reads as carelessness.
- **Clarity through hierarchy.** Tax data is complex. The design system uses size, weight, color, and spacing to create an unambiguous reading order: what matters most is largest, brightest, and topmost.

### Core Design Principles

**Visual hierarchy first.** Every screen should have one primary focus (the calculated result), one secondary focus (the form or breakdown), and supporting detail. Nothing should compete for equal weight.

**Breathing room.** Padding and gap values are intentionally generous. Cramped layouts create anxiety; open layouts create confidence.

**Subtle motion.** Animations exist to orient the user (results appearing, errors arriving) not to impress. All motion is directional, short-duration, and disabled for users who prefer it.

**Data-first typography.** Numeric data uses `font-mono` (Geist Mono) to ensure column alignment and visual separation from prose labels. This is a non-negotiable rule for any table or numeric output.

---

## 2. Color System

### Token Architecture

The system uses a three-layer token architecture:

1. **CSS custom property on `:root`** — the raw hex value, named after its semantic role.
2. **`@theme inline` mapping** — exposes the CSS variable to Tailwind's color engine with the `--color-` prefix.
3. **Tailwind utility** — the class you write in `className`.

You never reference hex values in component code. You never reference `--color-*` variables directly in component code. You always use the Tailwind utility.

### Background Tokens

| CSS Variable | `@theme` Key | Tailwind Utility | Hex Value | Usage |
|---|---|---|---|---|
| `--bg-page` | `--color-bg-page` | `bg-bg-page` | `#1A1226` | Page/body background |
| `--bg-card-form` | `--color-bg-card` | `bg-bg-card` | `#241C32` | Form card surface |
| `--bg-card-results` | `--color-bg-card-results` | `bg-bg-card-results` | `#241C32` | Results card surface |
| `--bg-input` | `--color-bg-input` | `bg-bg-input` | `#31264A` | Input field background |
| `--bg-dropdown` | `--color-bg-dropdown` | `bg-bg-dropdown` | `#2A2139` | Dropdown menu background |
| `--bg-highlight-row` | `--color-bg-highlight` | `bg-bg-highlight` | `#332A48` | Table row highlight |
| `--bg-sub-row` | `--color-bg-sub` | `bg-bg-sub` | `#2D243F` | Alternating table sub-row |
| `--bg-skeleton` | `--color-bg-skeleton` | `bg-bg-skeleton` | `#2D243F` | Skeleton loader background |
| `--bg-error` | `--color-bg-error` | `bg-bg-error` | `#2E1C24` | Error state container background |
| `--bg-row-hover` | `--color-bg-row-hover` | `bg-bg-row-hover` | `#3B3155` | Table row hover state |
| `--bg-total-row` | `--color-bg-total` | `bg-bg-total` | `#3E3258` | Table total/footer row |

### Text Tokens

| CSS Variable | `@theme` Key | Tailwind Utility | Hex Value | Usage |
|---|---|---|---|---|
| `--text-primary` | `--color-text-primary` | `text-text-primary` | `#F5F0FA` | Body text, labels, primary content |
| `--text-secondary` | `--color-text-secondary` | `text-text-secondary` | `#B8AEC8` | Supporting text, descriptions, subtitles |
| `--text-muted` | `--color-text-muted` | `text-text-muted` | `#8A7FA0` | Placeholder text, disabled state text, fine print |
| `--text-accent` | `--color-text-accent` | `text-text-accent` | `#4ECAA0` | Accent values, success states, positive indicators |

### Border Tokens

| CSS Variable | `@theme` Key | Tailwind Utility | Hex Value | Usage |
|---|---|---|---|---|
| `--border-input` | `--color-border-input` | `border-border-input` | `#3E3458` | Input field borders |
| `--border-subtle` | `--color-border-subtle` | `border-border-subtle` | `#3A3050` | Dividers, table row separators |
| `--border-card` | `--color-border-card` | `border-border-card` | `#3D3350` | Card outline borders |

### Interactive Tokens

| CSS Variable | `@theme` Key | Tailwind Utility | Hex Value | Usage |
|---|---|---|---|---|
| `--btn-primary` | `--color-btn-primary` | `bg-btn-primary` | `#7C6AE8` | Primary button default background |
| `--btn-primary-hover` | `--color-btn-primary-hover` | `bg-btn-primary-hover` | `#6B58D6` | Primary button hover background |
| `--btn-primary-active` | `--color-btn-primary-active` | `bg-btn-primary-active` | `#5E4DC4` | Primary button active/pressed background |
| `--btn-disabled` | `--color-btn-disabled` | `bg-btn-disabled` | `#4A3F63` | Disabled button background |
| `--ring-focus` | `--color-ring-focus` | `ring-ring-focus` | `#7C6AE8` | Focus ring color (also set via `*:focus-visible` globally) |

### Status Tokens

| CSS Variable | `@theme` Key | Tailwind Utility | Hex Value | Usage |
|---|---|---|---|---|
| `--status-error` | `--color-status-error` | `text-status-error` | `#E85C5C` | Error text, destructive action text |
| `--status-error-bg` | `--color-status-error-bg` | `bg-status-error-bg` | `#2E1C24` | Error message container (same as `--bg-error`) |
| `--status-success` | `--color-status-success` | `text-status-success` | `#4ECAA0` | Success text (same hue as `--text-accent`) |
| `--status-info` | `--color-status-info` | `text-status-info` | `#60A5FA` | Informational text, tooltips, info badges |

### Pill Tokens (Effective Rate)

| CSS Variable | `@theme` Key | Tailwind Utility | Value | Usage |
|---|---|---|---|---|
| `--pill-bg` | `--color-pill-bg` | `bg-pill-bg` | `rgba(78,202,160,0.1)` | Effective rate pill background (10% mint) |
| `--pill-text` | `--color-pill-text` | `text-pill-text` | `#4ECAA0` | Effective rate pill label text |

### Color Do's and Don'ts

**Do: Use semantic token utilities for all color.**
```tsx
// Correct
<div className="bg-bg-card text-text-primary border border-border-card">
```

**Do: Use opacity modifier syntax against token utilities when you need transparency.**
```tsx
// Correct — 15% opacity of the muted text color for skeleton
<div className="bg-text-muted/15 animate-pulse" />
```

**Do: Pair status colors with their matching backgrounds.**
```tsx
// Correct
<div className="bg-bg-error text-status-error">Something went wrong.</div>
```

**Never: Hardcode hex values in className.**
```tsx
// Wrong
<div className="bg-[#241C32] text-[#F5F0FA]">
```

**Never: Use inline `style` for colors.**
```tsx
// Wrong
<div style={{ backgroundColor: '#241C32' }}>
```

**Never: Use Tailwind's built-in palette colors** (e.g., `bg-violet-900`, `text-gray-200`). These are not part of the system and will drift from the token values.

---

## 3. Typography

### Font Stack

| Role | Family | Variable | Tailwind Class |
|---|---|---|---|
| UI & prose | Geist Sans | `--font-geist-sans` → `--font-sans` | `font-sans` |
| Data & numbers | Geist Mono | `--font-geist-mono` → `--font-mono` | `font-mono` |

`font-sans` is set on `body` globally and applies to all text by default. You only need to apply `font-mono` explicitly to numeric outputs — table cells containing currency or percentages, the primary result value, the effective rate pill.

### Size Scale and Usage

Tailwind's default type scale applies. The following sizes are used in this project:

| Tailwind Class | Size | Usage |
|---|---|---|
| `text-xs` | 12px | Table footnotes, fine print, helper hints |
| `text-sm` | 14px | Form labels, table column headers, secondary metadata |
| `text-base` | 16px | Body text, input values, button labels |
| `text-lg` | 18px | Card subtitles, section intros |
| `text-xl` | 20px | Secondary headings |
| `text-2xl` | 24px | Card headings |
| `text-3xl` | 30px | Primary result value (mobile) |
| `text-4xl` | 36px | Primary result value (desktop) |
| `text-5xl` | 48px | Hero numeric display (large breakpoints only) |

### Font Weight Usage

| Weight | Class | Usage |
|---|---|---|
| 400 | `font-normal` | Body copy, table cell values, descriptions |
| 500 | `font-medium` | Form field labels, secondary headings, button labels |
| 600 | `font-semibold` | Card headings, important labels, accent values |
| 700 | `font-bold` | Primary result heading, page-level titles |

### Typography Rules

- Never use `font-mono` for labels, descriptions, or any prose content.
- Currency values in tables and result displays always use `font-mono`.
- Percentage values (bracket rates, effective rate) always use `font-mono`.
- Do not use weights above 700 — there is no `font-black` usage in this system.
- Line height: use `leading-tight` for headings, default for body, `leading-relaxed` for descriptive paragraphs.

---

## 4. Spacing and Layout

### Responsive Breakpoints

The system is mobile-first. Styles without a breakpoint prefix apply from 0px up.

| Prefix | Min Width | Target Device |
|---|---|---|
| (none) | 0px | Mobile (≥375px is the minimum supported viewport) |
| `md:` | 768px | Tablet and large phone landscape |
| `lg:` | 1024px | Desktop and wide tablet |

Every component must be usable and visually coherent at 375px. Test at 375px, 768px, and 1280px as the three canonical widths.

### Card Padding Scale

Cards use responsive padding to breathe more as space allows:

| Breakpoint | Padding Class | Value |
|---|---|---|
| Mobile | `p-6` | 24px |
| Tablet (`md:`) | `md:p-8` | 32px |
| Desktop (`lg:`) | `lg:p-10` | 40px |

Full pattern: `className="p-6 md:p-8 lg:p-10"`

### Gap System

Spacing between elements follows a semantic scale based on the relationship between the elements:

| Gap Class | Value | Usage |
|---|---|---|
| `gap-1` | 4px | Icon + label inline pairs |
| `gap-2` | 8px | Tightly grouped field elements (label + input + error) |
| `gap-4` | 16px | Related form fields within the same group |
| `gap-5` | 20px | Between distinct sections within a card |
| `gap-6` | 24px | Between top-level form elements |
| `gap-8` | 32px | Between major layout panels (form card ↔ results card) |
| `gap-10` | 40px | Page-level section separation (desktop) |

### Layout Structure

The two-panel layout (form + results) uses a CSS grid:

```tsx
// Mobile: single column stack
// Desktop: side-by-side panels
<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
```

Maximum content width is constrained at the page level (`max-w-6xl` or equivalent) and centered with `mx-auto`. Cards never stretch full-bleed on large displays.

---

## 5. Components

### Card

The base surface for all content sections.

```tsx
<div className="bg-bg-card rounded-[1.25rem] border border-border-card p-6 md:p-8 lg:p-10">
```

| Property | Value | Notes |
|---|---|---|
| Background | `bg-bg-card` | Same token applies to both form and results cards |
| Border radius | `rounded-[1.25rem]` (20px) | Arbitrary value — no standard Tailwind rounded class matches |
| Border | `border border-border-card` | Subtle 1px border to separate from page background |
| Padding | `p-6 md:p-8 lg:p-10` | Always use the full responsive scale |

### Input

Text input for salary and currency values.

```tsx
<input
  className="w-full bg-bg-input border border-border-input rounded-xl h-[3.25rem] px-4
             text-text-primary placeholder:text-text-muted font-sans text-base
             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-card
             transition-colors duration-150"
/>
```

| Property | Value |
|---|---|
| Background | `bg-bg-input` |
| Border | `border border-border-input` |
| Border radius | `rounded-xl` (12px) |
| Height | `h-[3.25rem]` (52px) — slightly above the 48px touch target minimum |
| Text | `text-text-primary` |
| Placeholder | `placeholder:text-text-muted` |
| Focus ring | `ring-2 ring-ring-focus ring-offset-2 ring-offset-bg-card` |

The focus ring offset must use `ring-offset-bg-card` so the offset gap blends into the card background, not the page background.

### Button — Primary

The main call-to-action (Calculate).

```tsx
<button
  className="w-full bg-btn-primary hover:bg-btn-primary-hover active:bg-btn-primary-active
             disabled:bg-btn-disabled disabled:cursor-not-allowed
             text-text-primary font-medium text-base
             rounded-xl h-12
             hover:scale-[1.02] active:scale-[0.98]
             transition-all duration-150
             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring-focus focus-visible:ring-offset-2"
>
```

| Property | Value |
|---|---|
| Default background | `bg-btn-primary` (#7C6AE8) |
| Hover background | `hover:bg-btn-primary-hover` (#6B58D6) |
| Active background | `active:bg-btn-primary-active` (#5E4DC4) |
| Disabled | `disabled:bg-btn-disabled disabled:cursor-not-allowed` |
| Height | `h-12` (48px — minimum touch target) |
| Border radius | `rounded-xl` |
| Scale on hover | `hover:scale-[1.02]` |
| Scale on press | `active:scale-[0.98]` |

The scale micro-interaction provides tactile feedback without moving surrounding layout elements.

### Button — Secondary / Retry

Used for secondary actions like "Try Again" in error states.

```tsx
<button
  className="border border-text-accent text-text-accent bg-transparent
             hover:bg-text-accent/10
             rounded-xl h-12 px-6 font-medium text-base
             transition-all duration-150
             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring-focus focus-visible:ring-offset-2"
>
```

The secondary button never uses a filled background — the mint border and text are sufficient to establish clickability while maintaining visual hierarchy below the primary action.

### Table

The tax bracket breakdown table.

**Structure:**

```tsx
<table className="w-full text-sm font-mono">
  <thead>
    <tr className="text-text-muted border-b border-border-subtle">
      <th className="text-left pb-3 font-medium">Bracket</th>
      <th className="text-right pb-3 font-medium">Rate</th>
      <th className="text-right pb-3 font-medium">Tax</th>
    </tr>
  </thead>
  <tbody>
    {/* Normal rows: bg-bg-sub, highlighted rows: bg-bg-highlight */}
    <tr className="bg-bg-sub hover:bg-bg-row-hover transition-colors duration-100">
      <td className="py-3 pr-4 text-text-secondary">$0 – $55,867</td>
      <td className="py-3 text-right text-text-muted">15%</td>
      <td className="py-3 text-right text-text-primary">$8,380.05</td>
    </tr>
  </tbody>
  <tfoot>
    <tr className="bg-bg-total border-t border-border-subtle">
      <td className="py-4 font-semibold text-text-primary">Total Tax</td>
      <td />
      <td className="py-4 text-right font-bold text-text-primary">$24,500.00</td>
    </tr>
  </tfoot>
</table>
```

| Element | Background | Notes |
|---|---|---|
| Odd/sub rows | `bg-bg-sub` | Default row color |
| Highlight rows | `bg-bg-highlight` | Used for rows containing the user's income bracket |
| Hover | `hover:bg-bg-row-hover` | Applied to all `<tr>` in `<tbody>` |
| Total row | `bg-bg-total` | `<tfoot>` row, heavier background, bolder text |
| Dividers | `border-b border-border-subtle` | Between header and body, body and footer |

All cell text in the table uses `font-mono`. Column headers use `font-medium text-text-muted`.

### Effective Rate Pill

Displays the calculated effective tax rate as a badge.

```tsx
<span className="inline-flex items-center gap-1.5 bg-pill-bg text-pill-text
                 text-xs font-medium font-mono
                 rounded-full px-3 py-1">
  12.4% effective rate
</span>
```

| Property | Value |
|---|---|
| Background | `bg-pill-bg` (10% opacity mint) |
| Text | `text-pill-text` (#4ECAA0 mint) |
| Border radius | `rounded-full` |
| Font | `font-mono font-medium text-xs` |
| Padding | `px-3 py-1` |

Never use a solid background for the pill — the semi-transparent tint maintains the layered depth of the design.

### Skeleton Loader

Used while API results are loading.

```tsx
<div className="animate-pulse space-y-3">
  <div className="h-4 bg-text-muted/15 rounded-md w-3/4" />
  <div className="h-4 bg-text-muted/15 rounded-md w-1/2" />
  <div className="h-4 bg-text-muted/15 rounded-md w-5/6" />
</div>
```

The skeleton uses `bg-text-muted/15` (opacity modifier on the muted text token) rather than the dedicated `--bg-skeleton` token directly, because the opacity modifier integrates with Tailwind's engine. Both approaches are valid; prefer the opacity modifier form for consistency.

`animate-pulse` uses Tailwind's built-in pulse animation which maps to a 2s ease-in-out opacity cycle. The custom `pulse-soft` keyframe (defined in globals.css) provides a gentler 0.5→1.0 opacity range if a softer feel is required.

---

## 6. Animation

### Defined Keyframes

All keyframes are defined in `globals.css` using standard `@keyframes` blocks. In Tailwind 4, the `@utility` directive does not exist — custom animations are applied via arbitrary value syntax: `animate-[name]`.

#### `fade-in-up`

```css
@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

**Purpose:** Results panel entrance. Slides content up from 12px below its final position while fading in.

**Usage:** `className="animate-[fade-in-up_0.3s_ease-out_both]"`

**Applied to:** The results card when calculation data first arrives.

#### `fade-in-down`

```css
@keyframes fade-in-down {
  from { opacity: 0; transform: translateY(-12px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

**Purpose:** Error message entrance. Slides down from above, suggesting the error is dropping in from a notification-like position.

**Usage:** `className="animate-[fade-in-down_0.25s_ease-out_both]"`

**Applied to:** Error state containers.

#### `pulse-soft`

```css
@keyframes pulse-soft {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.5; }
}
```

**Purpose:** Gentle breathing pulse for loading indicators that need softer motion than `animate-pulse`.

**Usage:** `className="animate-[pulse-soft_1.5s_ease-in-out_infinite]"`

### Staggered Row Animation

Table rows animate in with a stagger delay to create a cascading reveal effect. Because the delay is dynamically calculated from the row index, it uses an inline style — this is the one documented exception to the no-inline-styles rule.

```tsx
{brackets.map((bracket, index) => (
  <tr
    key={bracket.id}
    className="animate-[fade-in-up_0.3s_ease-out_both]"
    style={{ animationDelay: `${index * 50}ms` }}
  >
```

The 50ms increment per row is the established project standard. Do not use delays greater than 50ms per step — beyond 6–8 rows the total wait becomes perceptible as lag.

### Animation Principles

- All animations operate on `transform` and `opacity` only — these are GPU-composited properties and do not trigger layout recalculation.
- Duration: entrance animations use 250–350ms. Hover/active state transitions use 100–150ms.
- Easing: `ease-out` for entrances (fast start, soft landing). `ease-in-out` for loops (pulses).
- No animation should serve a purely decorative purpose. Every animated element must be communicating state change: arrival, departure, loading, error.

### Reduced Motion

`globals.css` applies a global reduced motion override:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

This is a hard stop — all animations and transitions collapse to effectively instant. You do not need to add per-component `prefers-reduced-motion` checks. The global rule covers everything.

---

## 7. Accessibility

### Focus Management

The global `*:focus-visible` rule in `globals.css` applies a 2px solid ring using `--ring-focus` (#7C6AE8, the violet primary) with a 2px offset:

```css
*:focus-visible {
  outline: 2px solid var(--ring-focus);
  outline-offset: 2px;
}
```

When adding focus styles to interactive elements via Tailwind, always use `focus-visible:` (not `focus:`) to avoid showing focus rings on mouse click. When you override the outline in Tailwind, you must also specify the ring offset color to match the surface:

```tsx
className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring-focus
           focus-visible:ring-offset-2 focus-visible:ring-offset-bg-card"
```

### Touch Targets

All interactive elements must meet the 48px minimum touch target height:

| Component | Height | Class |
|---|---|---|
| Primary button | 48px | `h-12` |
| Secondary button | 48px | `h-12` |
| Input field | 52px | `h-[3.25rem]` |
| Table row | ≥44px | `py-3` on cells |

Do not reduce button or input heights below these values. If a tighter layout is required, add negative margin rather than reducing height.

### Color Contrast

All text/background pairings used in the system meet WCAG AA (4.5:1 for normal text, 3:1 for large text):

| Text | Background | Approx. Contrast | Standard |
|---|---|---|---|
| `--text-primary` (#F5F0FA) | `--bg-card-form` (#241C32) | ~12:1 | AAA |
| `--text-secondary` (#B8AEC8) | `--bg-card-form` (#241C32) | ~6.5:1 | AA |
| `--text-muted` (#8A7FA0) | `--bg-card-form` (#241C32) | ~4.5:1 | AA |
| `--text-accent` (#4ECAA0) | `--bg-card-form` (#241C32) | ~7:1 | AA |
| `--status-error` (#E85C5C) | `--bg-error` (#2E1C24) | ~5:1 | AA |
| `--pill-text` (#4ECAA0) | `--pill-bg` (rgba mint 10%) | ~7:1 on card | AA |

Do not introduce new text/background color combinations without verifying contrast with a WCAG checker.

### ARIA Patterns

**Results region (live region for screen readers):**
```tsx
<div aria-live="polite" aria-atomic="true">
  {/* Results content renders here after calculation */}
</div>
```

**Error messages:**
```tsx
<div role="alert" aria-live="assertive">
  <p>Something went wrong. Please try again.</p>
</div>
```

**Loading state:**
```tsx
<div role="status" aria-label="Calculating your tax...">
  {/* Skeleton components */}
</div>
```

**Form field associations:**
Every input must have a `<label>` connected via `htmlFor`/`id`. Never rely on placeholder text as the only label — placeholders disappear on input and are not reliably announced by all screen readers.

```tsx
<label htmlFor="salary" className="text-sm font-medium text-text-secondary">
  Annual Salary
</label>
<input id="salary" ... />
```

---

## 8. Usage Rules

### Always Do

- Use Tailwind token utilities (`bg-bg-card`, `text-text-primary`, `border-border-input`) for all color application.
- Use `font-mono` on all numeric and currency values in tables, results, and pills.
- Apply the full responsive padding scale `p-6 md:p-8 lg:p-10` to all cards.
- Use `focus-visible:` variants (not `focus:`) for all interactive focus styles.
- Pair error text with `bg-bg-error` background and `text-status-error` text.
- Test every new component at 375px mobile width before considering it complete.

### Never Do

- Never hardcode hex values in `className`: no `bg-[#241C32]`, no `text-[#4ECAA0]`.
- Never use inline `style` for colors, spacing, or typography.
- Never use CSS modules or `styled-components` — all styling is Tailwind utility classes.
- Never use the `@utility` directive — it does not exist in Tailwind 4.
- Never use Tailwind's default palette colors (`bg-violet-900`, `text-slate-200`, etc.) — they bypass the token system.
- Never reduce button or input height below 48px / `h-12`.
- Never use `font-mono` for prose, labels, or descriptive text.
- Never introduce a new color that is not in the token system without first adding it to `:root` and `@theme inline` in `globals.css`.

### The One Exception: Dynamic Animation Delay

Stagger animation delays calculated from array indices may use inline `style`:

```tsx
style={{ animationDelay: `${index * 50}ms` }}
```

This is the only documented case where an inline style is permitted. It exists because Tailwind cannot generate arbitrary animation delay utilities dynamically at runtime.

---

## Quick Reference

### The Most-Used Combinations

```tsx
// Page background
<body className="bg-bg-page text-text-primary font-sans">

// Card container
<section className="bg-bg-card border border-border-card rounded-[1.25rem] p-6 md:p-8 lg:p-10">

// Form label
<label className="text-sm font-medium text-text-secondary">

// Text input
<input className="bg-bg-input border border-border-input rounded-xl h-[3.25rem] px-4 text-text-primary placeholder:text-text-muted">

// Primary button
<button className="bg-btn-primary hover:bg-btn-primary-hover active:bg-btn-primary-active rounded-xl h-12 font-medium text-text-primary">

// Secondary action button
<button className="border border-text-accent text-text-accent bg-transparent hover:bg-text-accent/10 rounded-xl h-12 font-medium">

// Currency value in table
<td className="font-mono text-text-primary text-right">

// Effective rate pill
<span className="bg-pill-bg text-pill-text font-mono font-medium text-xs rounded-full px-3 py-1">

// Error container
<div role="alert" className="bg-bg-error text-status-error rounded-xl p-4 animate-[fade-in-down_0.25s_ease-out_both]">

// Skeleton row
<div className="h-4 bg-text-muted/15 rounded-md animate-pulse">

// Results entrance animation
<div className="animate-[fade-in-up_0.3s_ease-out_both]">
```
