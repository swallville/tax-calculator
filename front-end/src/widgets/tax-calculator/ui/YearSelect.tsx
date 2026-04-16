/**
 * Controlled tax-year dropdown for the tax calculator form.
 *
 * Options are generated from `VALID_YEARS` in reverse order (newest first) so
 * the most recent year appears at the top of the list. The default selected
 * value is `DEFAULT_YEAR`, keeping this component in sync with the Effector
 * store's initial state without duplicating the constant.
 */
import { DEFAULT_YEAR, VALID_YEARS } from '#/entities/tax-brackets';

import {
  FIELD_CONTROL_BASE,
  FIELD_ERROR,
  FIELD_ICON_CENTERED,
  FIELD_LABEL,
  FIELD_WRAPPER,
} from './styles';

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
    <div className={FIELD_WRAPPER}>
      <label htmlFor="year" className={FIELD_LABEL}>
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
          className={`${FIELD_CONTROL_BASE} appearance-none pr-10`}
        >
          {YEARS_DESCENDING.map(year => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
        <span
          className={`${FIELD_ICON_CENTERED} right-4 text-text-muted`}
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
          className={FIELD_ERROR}
        >
          {error[0]}
        </p>
      )}
    </div>
  );
}
