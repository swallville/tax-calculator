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
    <div className="flex flex-col gap-2">
      <label
        htmlFor="salary"
        className="text-[0.8125rem] font-medium tracking-wide text-text-secondary"
      >
        Annual Income
      </label>
      <div className="relative">
        <span
          className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none"
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
          className="w-full bg-bg-input border border-border-input text-text-primary rounded-xl h-13 px-4 pl-10 placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-ring-focus focus:border-transparent transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
        />
      </div>
      {error && (
        <p
          id="salary-error"
          data-testid="salary-error"
          role="alert"
          className="text-sm text-status-error"
        >
          {error[0]}
        </p>
      )}
    </div>
  );
}
