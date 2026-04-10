/**
 * Controlled tax-year dropdown for the tax calculator form.
 *
 * Options are generated from `VALID_YEARS` in reverse order (newest first) so
 * the most recent year appears at the top of the list. The default selected
 * value is `DEFAULT_YEAR`, keeping this component in sync with the Effector
 * store's initial state without duplicating the constant.
 */
import { DEFAULT_YEAR, VALID_YEARS } from '#/entities/tax-brackets';

/** Years in descending order (newest first) — computed once at module scope to avoid
 * re-creating the reversed array on every render. */
const YEARS_DESCENDING = [...VALID_YEARS].reverse();

/**
 * Receives validation state as props and participates in the parent
 * `<form action={}>` through native FormData — no local state needed.
 */
interface YearSelectProps {
  /** Zod field-level errors from `safeParse().error.flatten().fieldErrors`. */
  error?: string[];
  /** Mirrors the Effector isPending flag — disables the field during API calls. */
  disabled: boolean;
}

/** Chevron-down SVG icon used as the custom dropdown indicator. */
function ChevronDownIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

/**
 * Tax year `<select>` with a custom chevron icon, label, and inline error.
 *
 * `appearance-none` hides the native OS arrow so the custom `ChevronDownIcon`
 * is the only visible indicator — `pointer-events-none` on the icon wrapper
 * keeps it from intercepting clicks on the select element below it.
 */
export function YearSelect({ error, disabled }: YearSelectProps) {
  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor="year"
        className="text-[0.8125rem] font-medium tracking-wide text-text-secondary"
      >
        Tax Year
      </label>
      <div className="relative">
        <select
          id="year"
          name="year"
          data-testid="year-select"
          aria-required="true"
          aria-invalid={!!error}
          aria-describedby={error ? 'year-error' : undefined}
          disabled={disabled}
          defaultValue={DEFAULT_YEAR}
          className="w-full appearance-none bg-bg-input border border-border-input text-text-primary rounded-xl h-13 px-4 pr-10 focus:outline-none focus:ring-2 focus:ring-ring-focus focus:border-transparent transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {YEARS_DESCENDING.map(year => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
        <span
          className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted"
          aria-hidden="true"
        >
          <ChevronDownIcon />
        </span>
      </div>
      {error && (
        <p
          id="year-error"
          data-testid="year-error"
          role="alert"
          className="text-sm text-status-error"
        >
          {error[0]}
        </p>
      )}
    </div>
  );
}
