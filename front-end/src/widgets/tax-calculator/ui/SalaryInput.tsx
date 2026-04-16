import {
  FIELD_CONTROL_BASE,
  FIELD_ERROR,
  FIELD_ICON_CENTERED,
  FIELD_LABEL,
  FIELD_WRAPPER,
} from './styles';

/**
 * Controlled salary field for the tax calculator form.
 *
 * Renders the "Annual Income" label, a dollar-sign prefix icon, the text
 * input itself, and an inline validation error message. The component is
 * intentionally presentation-only: it receives validation state as props and
 * emits raw FormData through the parent `<form action={}>` — no local state,
 * no event handlers.
 */
interface SalaryInputProps {
  /** Zod field-level errors from `safeParse().error.flatten().fieldErrors`. */
  error?: string[];
  /** Mirrors the Effector isPending flag — disables the field during API calls. */
  disabled: boolean;
}

/** Dollar-sign SVG icon displayed as a non-interactive prefix inside the input. */
function DollarIcon() {
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
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

/**
 * Annual salary text input with prefix icon, label, and inline error display.
 *
 * `inputMode="decimal"` opens a numeric keyboard on mobile without restricting
 * the input to numbers only — preserving support for formatted strings like
 * "100,000" that `parseCurrency` handles before Zod validation runs.
 */
export function SalaryInput({ error, disabled }: SalaryInputProps) {
  return (
    <div className={FIELD_WRAPPER}>
      <label htmlFor="salary" className={FIELD_LABEL}>
        Annual Income
      </label>
      <div className="relative">
        <span
          className={`${FIELD_ICON_CENTERED} left-4 text-text-secondary`}
          aria-hidden="true"
        >
          <DollarIcon />
        </span>
        <input
          id="salary"
          name="salary"
          data-testid="salary-input"
          type="text"
          inputMode="decimal"
          placeholder="e.g. 100,000"
          aria-required="true"
          aria-invalid={!!error}
          aria-describedby={error ? 'salary-error' : undefined}
          disabled={disabled}
          className={`${FIELD_CONTROL_BASE} pl-10 placeholder:text-text-muted`}
        />
      </div>
      {error && (
        <p
          id="salary-error"
          data-testid="salary-error"
          role="alert"
          className={FIELD_ERROR}
        >
          {error[0]}
        </p>
      )}
    </div>
  );
}
