// Shared Tailwind class chains for the tax-calculator widget.
//
// Strings are co-located here (not split across components) so a styling
// change to "the form field label" or "the panel card chassis" lives in one
// place instead of being smeared across SalaryInput/YearSelect/TaxForm/etc.
// Project rule: Tailwind v4 className utilities only — no @apply, no CSS
// modules, so the de-duplication happens at the TS-string level.

/** Wrapper around a form field: label + control + inline error. */
export const FIELD_WRAPPER = 'flex flex-col gap-2';

/** Field label above an input/select control. */
export const FIELD_LABEL =
  'text-[0.8125rem] font-medium tracking-wide text-text-secondary';

/** Inline field-level Zod error message rendered below the control. */
export const FIELD_ERROR = 'text-sm text-status-error';

/**
 * Shared chassis for the salary text input and the year select.
 *
 * The two controls only differ in icon-side padding (`pl-10` vs `pr-10`) and
 * `appearance-none` (select-only), so callers append those instead of
 * re-stating every focus/disabled/border rule.
 */
export const FIELD_CONTROL_BASE =
  'w-full bg-bg-input border border-border-input text-text-primary rounded-xl h-13 px-4 focus:outline-none focus:ring-2 focus:ring-ring-focus focus:border-transparent transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed';

/**
 * Vertical-centering wrapper for the in-field icons (dollar prefix, chevron
 * suffix). Callers add `left-4` or `right-4` and the icon's color utility.
 */
export const FIELD_ICON_CENTERED =
  'absolute top-1/2 -translate-y-1/2 pointer-events-none';

/**
 * Card chassis shared by the form panel and the results panel. Layout
 * extras (width, flex behaviour, animations) are appended by the caller
 * because they vary per panel.
 */
export const PANEL_CARD = 'bg-bg-card rounded-[1.25rem] p-6 md:p-8 lg:p-10';

/**
 * Even-/odd-row alternation shared by the results table and the loading
 * skeleton. Keeping the pattern in one place ensures the skeleton's stripes
 * align with the real rows that replace them, preventing layout shimmer.
 */
export const rowStripe = (index: number) =>
  index % 2 === 0 ? 'bg-bg-highlight' : 'bg-bg-sub';
