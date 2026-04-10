# Canadian Income Tax Calculator -- Design System & Component Specification

## Tech Stack Context
- **Next.js 16.2.3** + **React 19** + **Tailwind CSS 4** (using `@theme inline` in globals.css)
- **Geist** font family already loaded (sans + mono variants)
- Dark-first premium aesthetic inspired by the Dribbble "Pay Calculator" reference

---

## 1. Color Tokens (CSS Custom Properties)

All colors defined as CSS custom properties in `globals.css` inside `:root`, with the Tailwind 4 `@theme inline` block mapping them to utility classes.

```css
:root {
  /* ── Page & Surface Backgrounds ── */
  --bg-page:            #1A1226;   /* Deep plum — full page backdrop */
  --bg-card-form:       #241C32;   /* Form panel card */
  --bg-card-results:    #241C32;   /* Results panel card (same surface) */
  --bg-input:           #31264A;   /* Input fields & dropdowns */
  --bg-highlight-row:   #332A48;   /* Highlighted table row (odd rows) */
  --bg-sub-row:         #2D243F;   /* Subtle alternation (even rows) */
  --bg-total-row:       #3E3258;   /* Summary/total row — slightly brighter */
  --bg-skeleton:        #2D243F;   /* Skeleton loader bars */

  /* ── Text ── */
  --text-primary:       #F5F0FA;   /* Headings, bold values, input text */
  --text-secondary:     #B8AEC8;   /* Body copy, labels */
  --text-muted:         #8A7FA0;   /* Table headers, placeholders, captions */
  --text-accent:        #4ECAA0;   /* Accent text (effective rate, links) */

  /* ── Borders ── */
  --border-subtle:      #3A3050;   /* Card dividers, table rules */
  --border-input:       #3E3458;   /* Input border default */
  --border-input-focus: #7C6AE8;   /* Input border on focus */

  /* ── Button: Primary (Calculate) ── */
  --btn-primary-bg:     #7C6AE8;   /* Soft violet */
  --btn-primary-hover:  #6B58D6;   /* Darker violet on hover */
  --btn-primary-active: #5E4DC4;   /* Pressed */
  --btn-primary-text:   #FFFFFF;

  /* ── Button: Secondary (Retry / Reset) ── */
  --btn-secondary-bg:   transparent;
  --btn-secondary-border: #4ECAA0;
  --btn-secondary-text: #4ECAA0;
  --btn-secondary-hover-bg: rgba(78, 202, 160, 0.10);

  /* ── State Colors ── */
  --color-error:        #E85C5C;   /* Error text & border accent */
  --color-error-bg:     #2E1C24;   /* Error banner background */
  --color-success:      #4ECAA0;
  --color-warning:      #E8B44E;

  /* ── Focus Ring ── */
  --ring-focus:         #7C6AE8;   /* Matches primary button for consistency */
}
```

**Tailwind 4 `@theme inline` mapping** (added to globals.css):

```css
@theme inline {
  --color-bg-page:          var(--bg-page);
  --color-bg-card:          var(--bg-card-form);
  --color-bg-input:         var(--bg-input);
  --color-bg-highlight:     var(--bg-highlight-row);
  --color-bg-sub:           var(--bg-sub-row);
  --color-bg-total:         var(--bg-total-row);
  --color-bg-skeleton:      var(--bg-skeleton);
  --color-bg-error:         var(--color-error-bg);
  --color-text-primary:     var(--text-primary);
  --color-text-secondary:   var(--text-secondary);
  --color-text-muted:       var(--text-muted);
  --color-text-accent:      var(--text-accent);
  --color-border-subtle:    var(--border-subtle);
  --color-border-input:     var(--border-input);
  --color-border-focus:     var(--border-input-focus);
  --color-btn-primary:      var(--btn-primary-bg);
  --color-btn-primary-hover:var(--btn-primary-hover);
  --color-btn-primary-active:var(--btn-primary-active);
  --color-error:            var(--color-error);
  --color-success:          var(--color-success);
  --color-warning:          var(--color-warning);
  --color-ring-focus:       var(--ring-focus);
}
```

---

## 2. Typography Scale

Font stacks use the already-loaded **Geist Sans** (`var(--font-geist-sans)`) for UI and **Geist Mono** (`var(--font-geist-mono)`) for numeric/tabular data. No additional font downloads required.

| Role | Font Family | Size (px / rem) | Weight | Line Height | Letter Spacing | Color Token | Tailwind Classes |
|---|---|---|---|---|---|---|---|
| **page-title** | Geist Sans | 28px / 1.75rem | 700 | 1.2 | -0.02em | `--text-primary` | `text-[1.75rem] font-bold leading-tight tracking-tight text-text-primary` |
| **section-heading** | Geist Sans | 20px / 1.25rem | 600 | 1.3 | -0.01em | `--text-primary` | `text-xl font-semibold leading-snug text-text-primary` |
| **input-label** | Geist Sans | 13px / 0.8125rem | 500 | 1.4 | 0.02em | `--text-secondary` | `text-[0.8125rem] font-medium leading-snug tracking-wide text-text-secondary` |
| **input-text** | Geist Sans | 16px / 1rem | 400 | 1.5 | 0 | `--text-primary` | `text-base font-normal text-text-primary` |
| **input-placeholder** | Geist Sans | 16px / 1rem | 400 | 1.5 | 0 | `--text-muted` | `text-base text-text-muted` |
| **table-header** | Geist Sans | 12px / 0.75rem | 600 | 1.4 | 0.06em | `--text-muted` | `text-xs font-semibold uppercase tracking-widest text-text-muted` |
| **table-cell** | Geist Mono | 14px / 0.875rem | 400 | 1.5 | 0 | `--text-secondary` | `font-mono text-sm font-normal text-text-secondary` |
| **table-cell-bold** | Geist Mono | 14px / 0.875rem | 600 | 1.5 | 0 | `--text-primary` | `font-mono text-sm font-semibold text-text-primary` |
| **summary-label** | Geist Sans | 15px / 0.9375rem | 500 | 1.4 | 0 | `--text-secondary` | `text-[0.9375rem] font-medium text-text-secondary` |
| **summary-value** | Geist Mono | 22px / 1.375rem | 700 | 1.2 | -0.01em | `--text-primary` | `font-mono text-[1.375rem] font-bold leading-tight text-text-primary` |
| **button-text** | Geist Sans | 15px / 0.9375rem | 600 | 1 | 0.01em | `--btn-primary-text` | `text-[0.9375rem] font-semibold tracking-slight` |
| **error-title** | Geist Sans | 16px / 1rem | 600 | 1.4 | 0 | `--color-error` | `text-base font-semibold text-error` |
| **error-body** | Geist Sans | 14px / 0.875rem | 400 | 1.5 | 0 | `--text-secondary` | `text-sm font-normal text-text-secondary` |
| **rate-badge** | Geist Mono | 13px / 0.8125rem | 600 | 1 | 0 | `--text-accent` | `font-mono text-[0.8125rem] font-semibold text-text-accent` |

---

## 3. Spacing & Layout Constants

| Token | Value | Tailwind |
|---|---|---|
| Card border-radius | 20px | `rounded-[1.25rem]` |
| Card padding (desktop) | 40px | `p-10` |
| Card padding (tablet) | 32px | `p-8` |
| Card padding (mobile) | 24px | `p-6` |
| Section gap (between form fields) | 24px | `gap-6` |
| Label-to-input gap | 8px | `gap-2` |
| Input height | 52px | `h-[3.25rem]` |
| Table row height | 52px | `h-[3.25rem]` |
| Table cell padding horizontal | 16px | `px-4` |
| Table cell padding vertical | 14px | `py-3.5` |
| Panel gap (between form & results) | 24px | `gap-6` |
| Page max-width | 1120px | `max-w-[70rem]` |
| Page horizontal padding | 24px | `px-6` |
| Responsive breakpoint - mobile | <768px | default |
| Responsive breakpoint - tablet | 768-1023px | `md:` |
| Responsive breakpoint - desktop | >=1024px | `lg:` |
| Inner section gap (between heading and table) | 20px | `gap-5` |
| Button height | 48px | `h-12` |
| Button border-radius | 12px | `rounded-xl` |

---

## 4. Component Specifications

### A. TaxForm Widget

**Overall Card**
- Background: `bg-bg-card` (#241C32)
- Border radius: `rounded-[1.25rem]`
- Padding: `p-10` (desktop), `p-8` (tablet), `p-6` (mobile)
- Min-width: none specified (flex-based), but takes `lg:w-[440px] lg:shrink-0`
- No box-shadow; depth achieved by contrast against `--bg-page`

**Page Title** (inside card, top)
- Text: "Tax Calculator"
- Classes: `text-[1.75rem] font-bold leading-tight tracking-tight text-text-primary mb-8`

**Salary Input**
- Container: `flex flex-col gap-2`
- Label: `text-[0.8125rem] font-medium tracking-wide text-text-secondary`
- Input element:
  - Height: `h-[3.25rem]`
  - Background: `bg-bg-input`
  - Border: `border border-border-input`
  - Border radius: `rounded-xl` (12px)
  - Text: `text-base font-normal text-text-primary`
  - Placeholder: `placeholder:text-text-muted`
  - Padding: `px-4` (with "$" prefix rendered as an inset left icon, input gets `pl-9`)
  - Focus state: `focus:outline-none focus:ring-2 focus:ring-ring-focus focus:border-transparent`
  - Transition: `transition-all duration-200`

**Year Dropdown**
- Same dimensions and styling as salary input
- Chevron icon: `text-text-muted` positioned `absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none`
- Uses `appearance-none` with custom chevron SVG
- Same focus ring as salary input

**Calculate Button**
- Background: `bg-btn-primary` (#7C6AE8)
- Text: `text-[0.9375rem] font-semibold text-white`
- Padding: `px-6`
- Height: `h-12`
- Border radius: `rounded-xl`
- Full width: `w-full`
- Hover: `hover:bg-btn-primary-hover hover:scale-[1.02]`
- Active: `active:bg-btn-primary-active active:scale-[0.98]`
- Disabled: `disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100`
- Loading state: button text replaced with a 20px spinner (animated ring) + "Calculating..." text
- Transition: `transition-all duration-200 ease-out`
- Margin top: `mt-2`

**Form Layout**
- Direction: `flex flex-col`
- Gap between field groups: `gap-6`
- Gap between label and input: `gap-2`

### B. TaxBreakdown Widget (Results Panel)

**Container Card**
- Background: `bg-bg-card` (#241C32)
- Border radius: `rounded-[1.25rem]`
- Padding: `p-10` (desktop), `p-8` (tablet), `p-6` (mobile)
- Flex: `flex-1 min-w-0` (takes remaining space)
- Inner layout: `flex flex-col gap-5`

**"Tax Breakdown" Heading**
- Classes: `text-xl font-semibold leading-snug text-text-primary`

**Table Structure**
- Full width: `w-full`
- Border collapse: use `border-separate border-spacing-0` to allow rounded row backgrounds

**Table Header Row**
- Background: none (transparent)
- Bottom border: `border-b border-border-subtle`
- Cell padding: `px-4 py-3`
- Text: `text-xs font-semibold uppercase tracking-widest text-text-muted`
- Alignment: first column `text-left`, remaining three columns `text-right`

**Column Definitions** (4 columns):
1. **Bracket Range** (e.g., "$0 - $50,197") -- `text-left`, `w-[38%]`
2. **Rate** (e.g., "15%") -- `text-right`, `w-[15%]`
3. **Taxable in Band** (e.g., "$50,197") -- `text-right`, `w-[24%]`
4. **Tax for Band** (e.g., "$7,529.55") -- `text-right`, `w-[23%]`

**Data Rows**
- Padding: `px-4 py-3.5`
- Odd rows: `bg-bg-highlight` (#332A48) with `first:rounded-l-lg last:rounded-r-lg` on cells
- Even rows: `bg-bg-sub` (#2D243F) with same rounding
- Text: Bracket Range uses `font-mono text-sm text-text-secondary`. Rate uses `rate-badge` style (`font-mono text-[0.8125rem] font-semibold text-text-accent`). Taxable & Tax columns use `font-mono text-sm text-text-secondary`.
- Hover (optional): `hover:bg-[#3B3155]` with `transition-colors duration-150`

**Summary / Total Row**
- Separated from data rows by: `border-t-2 border-border-subtle` (applied via a spacer `<tr>` or border on the row)
- Background: `bg-bg-total` (#3E3258)
- Cell rounding: `first:rounded-l-lg last:rounded-r-lg`
- Label cell ("Total Tax"): `font-mono text-sm font-semibold text-text-primary text-left`
- Value cell: spans remaining columns, `font-mono text-sm font-bold text-text-primary text-right`

**Effective Tax Rate Display**
- Rendered as a separate row below the total row, OR as an inline element below the table
- Preferred: a standalone row beneath the total with no special background
- Label: "Effective Rate" -- `text-sm font-medium text-text-secondary`
- Value: displayed as a badge-like element: `inline-flex items-center px-3 py-1 rounded-full bg-text-accent/10 text-text-accent font-mono text-[0.8125rem] font-semibold`
- This gives a subtle teal pill containing e.g. "17.74%"

### C. LoadingState

**Approach**: Skeleton loader (not spinner) replacing the results panel content.

- **Location**: Replaces the inside of the TaxBreakdown card (card shell stays visible)
- **Skeleton rows**: 5 rows mimicking the table (matching expected bracket count) + 1 total row
- **Each skeleton row**:
  - Full width container: `h-[3.25rem] rounded-lg bg-bg-skeleton`
  - Alternating: odd rows `bg-bg-highlight`, even rows `bg-bg-sub`
  - Contains 4 skeleton bars inside, matching column widths:
    - Bar 1: `w-[60%] h-3 rounded-full bg-text-muted/15`
    - Bar 2: `w-[30%] h-3 rounded-full bg-text-muted/15`
    - Bar 3: `w-[50%] h-3 rounded-full bg-text-muted/15`
    - Bar 4: `w-[40%] h-3 rounded-full bg-text-muted/15`
- **Animation**: `animate-pulse` (Tailwind built-in, CSS `animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite`)
- **Heading skeleton**: One bar `w-[40%] h-5 rounded-full bg-text-muted/15 mb-5`
- **Total skeleton**: one wider bar `w-full h-[3.25rem] rounded-lg bg-bg-total animate-pulse`

### D. ErrorState

**Location**: Replaces TaxBreakdown card content (card shell stays).

**Error Banner**
- Background: `bg-bg-error` (#2E1C24)
- Border: `border-l-4 border-error` (left-accent stripe, #E85C5C)
- Border radius: `rounded-xl` (right side rounded, left has accent)
- Padding: `p-6`
- Layout: `flex items-start gap-4`

**Icon**
- A 24px `AlertCircle` icon (from lucide-react or inline SVG)
- Color: `text-error`
- Flex shrink: `shrink-0`

**Text Container** (`flex flex-col gap-1.5`)
- **Error title**: "Calculation Failed" -- `text-base font-semibold text-error`
- **Error body**: "We couldn't reach the tax service. Please try again." -- `text-sm font-normal text-text-secondary`

**Retry Button**
- Positioned below the banner: `mt-6`
- Style: outlined/secondary button
  - `border border-text-accent text-text-accent bg-transparent`
  - `px-5 h-10 rounded-xl`
  - `text-sm font-semibold`
  - `hover:bg-text-accent/10`
  - `active:bg-text-accent/15`
  - `focus:outline-none focus:ring-2 focus:ring-ring-focus`
  - `transition-all duration-200`

**Entrance Animation**
- Error banner fades in + slides down: see Animations section

### E. EmptyState (Before First Calculation)

**Location**: Replaces TaxBreakdown card content (card shell stays).

**Layout**: `flex flex-col items-center justify-center text-center py-16 px-8`

**Icon / Illustration**
- A 64px semi-transparent calculator icon (inline SVG or lucide `Calculator`)
- Color: `text-text-muted/40`
- Margin bottom: `mb-6`

**Message Heading**
- Text: "Enter your salary"
- Classes: `text-lg font-semibold text-text-primary mb-2`

**Message Body**
- Text: "Input your annual income and select a tax year to see your Canadian federal tax breakdown."
- Classes: `text-sm text-text-muted max-w-[280px] leading-relaxed`

**Optional subtle visual**
- Three faint horizontal lines below the text mimicking table rows:
- `w-full max-w-[260px] flex flex-col gap-3 mt-8 opacity-20`
  - Each line: `h-2.5 rounded-full bg-text-muted/20` with varying widths (100%, 80%, 60%)

---

## 5. Responsive Behavior

### Desktop (lg: >= 1024px)
- **Page layout**: `flex flex-row gap-6 items-start` within a centered container `max-w-[70rem] mx-auto px-6 py-12`
- **Form panel**: `lg:w-[440px] lg:shrink-0` (fixed width, ~39%)
- **Results panel**: `lg:flex-1 lg:min-w-0` (fills remaining ~61%)
- Panels sit **side-by-side**, top-aligned
- Full card padding `p-10`

### Tablet (md: 768px - 1023px)
- **Page layout**: `flex flex-col gap-6` within `max-w-[600px] mx-auto px-6 py-10`
- Both cards: **full width, stacked vertically**
- Card padding reduces to `md:p-8`
- Table font sizes remain the same
- Button remains full width

### Mobile (< 768px)
- **Page layout**: `flex flex-col gap-4` within `px-4 py-6`
- Card padding: `p-6`
- Page title: `text-2xl` (drop from 1.75rem to 1.5rem)
- Table: horizontally scrollable via `overflow-x-auto` wrapper
- Table minimum width: `min-w-[480px]` to prevent column crush
- Inputs maintain `h-[3.25rem]` for touch targets
- Button maintains `h-12` for touch targets

### Breakpoint Summary (Tailwind classes on the page container)

```
<main className="
  flex flex-col gap-4 px-4 py-6
  md:max-w-[600px] md:mx-auto md:px-6 md:py-10 md:gap-6
  lg:flex-row lg:max-w-[70rem] lg:items-start lg:py-12
">
```

---

## 6. Interaction States

### Salary Input

| State | Tailwind Classes |
|---|---|
| Default | `bg-bg-input border border-border-input text-text-primary rounded-xl h-[3.25rem] px-4 pl-9` |
| Hover | `hover:border-[#4A3F68]` |
| Focus | `focus:outline-none focus:ring-2 focus:ring-ring-focus focus:border-transparent` |
| Disabled | `disabled:opacity-40 disabled:cursor-not-allowed` |

### Year Dropdown

| State | Tailwind Classes |
|---|---|
| Default | `appearance-none bg-bg-input border border-border-input text-text-primary rounded-xl h-[3.25rem] px-4 pr-10` |
| Hover | `hover:border-[#4A3F68]` |
| Focus | `focus:outline-none focus:ring-2 focus:ring-ring-focus focus:border-transparent` |
| Disabled | `disabled:opacity-40 disabled:cursor-not-allowed` |

### Calculate Button

| State | Tailwind Classes |
|---|---|
| Default | `bg-btn-primary text-white rounded-xl h-12 w-full font-semibold text-[0.9375rem]` |
| Hover | `hover:bg-btn-primary-hover hover:scale-[1.02] hover:shadow-lg hover:shadow-btn-primary/20` |
| Focus | `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-card` |
| Active | `active:bg-btn-primary-active active:scale-[0.98]` |
| Disabled / Loading | `disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none` |

### Retry Button

| State | Tailwind Classes |
|---|---|
| Default | `border border-text-accent text-text-accent bg-transparent rounded-xl h-10 px-5 text-sm font-semibold` |
| Hover | `hover:bg-text-accent/10` |
| Focus | `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring-focus` |
| Active | `active:bg-text-accent/15` |

### Table Rows (hover effect)

| State | Tailwind Classes |
|---|---|
| Default odd | `bg-bg-highlight` |
| Default even | `bg-bg-sub` |
| Hover | `hover:bg-[#3B3155] transition-colors duration-150` |

---

## 7. Animations & Transitions

### 7a. Results Appearing (fade-in + slide-up)

Custom keyframes in `globals.css`:

```css
@keyframes fade-in-up {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

Tailwind utility (defined via `@theme inline` or `@utility`):

```css
@utility animate-fade-in-up {
  animation: fade-in-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
```

Applied to the results container: `animate-fade-in-up`

Individual rows can be staggered using inline `animation-delay`:
- Row 1: `0ms`, Row 2: `50ms`, Row 3: `100ms`, Row 4: `150ms`, Row 5: `200ms`
- Apply via `style={{ animationDelay: '${index * 50}ms' }}` with initial `opacity-0`

### 7b. Loading Skeleton Pulse

Uses Tailwind built-in: `animate-pulse`
- CSS: `animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite`
- Applied to each skeleton bar element

### 7c. Button Hover / Press

All on the button element:
```
transition-all duration-200 ease-out
```
This covers `background-color`, `transform` (scale), and `box-shadow` in one declaration.

### 7d. Error Appearing

Custom keyframes:

```css
@keyframes fade-in-down {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

Utility:

```css
@utility animate-fade-in-down {
  animation: fade-in-down 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
```

### 7e. Page Load Entrance

The two cards fade in with a stagger:
- Form card: `animate-fade-in-up` with `animation-delay: 0ms`
- Results card: `animate-fade-in-up` with `animation-delay: 150ms`

Both start with `opacity-0` and the animation fills forward to `opacity-1`.

### 7f. Input Focus Ring

```
transition-all duration-200
```
Covers `border-color`, `box-shadow` (ring), smooth 200ms transition on focus/blur.

### 7g. Reduced Motion

All animations respect the user's accessibility preference:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 8. Full globals.css Implementation

Below is the complete replacement for `front-end/app/globals.css` that implements this design system:

```css
@import "tailwindcss";

:root {
  /* Backgrounds */
  --bg-page:            #1A1226;
  --bg-card-form:       #241C32;
  --bg-card-results:    #241C32;
  --bg-input:           #31264A;
  --bg-highlight-row:   #332A48;
  --bg-sub-row:         #2D243F;
  --bg-total-row:       #3E3258;
  --bg-skeleton:        #2D243F;

  /* Text */
  --text-primary:       #F5F0FA;
  --text-secondary:     #B8AEC8;
  --text-muted:         #8A7FA0;
  --text-accent:        #4ECAA0;

  /* Borders */
  --border-subtle:      #3A3050;
  --border-input:       #3E3458;
  --border-input-focus: #7C6AE8;

  /* Buttons */
  --btn-primary-bg:     #7C6AE8;
  --btn-primary-hover:  #6B58D6;
  --btn-primary-active: #5E4DC4;
  --btn-primary-text:   #FFFFFF;

  /* States */
  --color-error:        #E85C5C;
  --color-error-bg:     #2E1C24;
  --color-success:      #4ECAA0;
  --color-warning:      #E8B44E;

  /* Focus */
  --ring-focus:         #7C6AE8;
}

@theme inline {
  --color-bg-page:           var(--bg-page);
  --color-bg-card:           var(--bg-card-form);
  --color-bg-input:          var(--bg-input);
  --color-bg-highlight:      var(--bg-highlight-row);
  --color-bg-sub:            var(--bg-sub-row);
  --color-bg-total:          var(--bg-total-row);
  --color-bg-skeleton:       var(--bg-skeleton);
  --color-bg-error:          var(--color-error-bg);
  --color-text-primary:      var(--text-primary);
  --color-text-secondary:    var(--text-secondary);
  --color-text-muted:        var(--text-muted);
  --color-text-accent:       var(--text-accent);
  --color-border-subtle:     var(--border-subtle);
  --color-border-input:      var(--border-input);
  --color-border-focus:      var(--border-input-focus);
  --color-btn-primary:       var(--btn-primary-bg);
  --color-btn-primary-hover: var(--btn-primary-hover);
  --color-btn-primary-active:var(--btn-primary-active);
  --color-error:             var(--color-error);
  --color-success:           var(--color-success);
  --color-warning:           var(--color-warning);
  --color-ring-focus:        var(--ring-focus);
  --font-sans:               var(--font-geist-sans);
  --font-mono:               var(--font-geist-mono);
}

body {
  background: var(--bg-page);
  color: var(--text-primary);
  font-family: var(--font-geist-sans), system-ui, sans-serif;
}

/* Custom Animations */
@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes fade-in-down {
  from { opacity: 0; transform: translateY(-8px); }
  to   { opacity: 1; transform: translateY(0); }
}

@utility animate-fade-in-up {
  animation: fade-in-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
}

@utility animate-fade-in-down {
  animation: fade-in-down 0.35s cubic-bezier(0.16, 1, 0.3, 1) both;
}

/* Accessibility: Reduced Motion */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 9. Component Tree & File Structure

```
front-end/app/
  globals.css              -- Design tokens + animations (as above)
  layout.tsx               -- Root layout (Geist fonts, html/body)
  page.tsx                 -- Page shell: flex container, mounts TaxForm + TaxResults

front-end/components/
  TaxForm.tsx              -- Left panel: title, salary input, year dropdown, calculate button
  TaxResults.tsx           -- Right panel: switches between EmptyState/LoadingState/ErrorState/TaxBreakdown
  TaxBreakdown.tsx         -- Table of bracket rows + total + effective rate
  EmptyState.tsx           -- Pre-calculation placeholder
  LoadingState.tsx         -- Skeleton loader
  ErrorState.tsx           -- Error banner + retry button
```

---

## 10. Page-Level Layout Skeleton (Tailwind classes)

```tsx
<main className="
  flex flex-col gap-4 px-4 py-6 min-h-screen
  md:max-w-[600px] md:mx-auto md:px-6 md:py-10 md:gap-6
  lg:flex-row lg:max-w-[70rem] lg:items-start lg:py-12 lg:gap-6
">
  {/* Form Panel */}
  <section className="
    bg-bg-card rounded-[1.25rem] p-6
    md:p-8 lg:p-10 lg:w-[440px] lg:shrink-0
  ">
    {/* TaxForm content */}
  </section>

  {/* Results Panel */}
  <section className="
    bg-bg-card rounded-[1.25rem] p-6 flex-1 min-w-0
    md:p-8 lg:p-10
  ">
    {/* TaxResults content (Empty / Loading / Error / Breakdown) */}
  </section>
</main>
```

This specification provides every color value, font metric, spacing constant, interaction state, animation keyframe, and responsive breakpoint needed to implement the Canadian Income Tax Calculator UI pixel-perfectly from code alone.
