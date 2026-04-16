'use client';
import type { ErrorType } from '#/entities/tax-brackets';
import { selectors } from '#/entities/tax-brackets';

import { useRetryCalculation } from '../lib/useRetryCalculation';

/**
 * Exhaustive mapping from every possible `ErrorType` to its display config.
 *
 * Typed as `Record<NonNullable<ErrorType>, ...>` so TypeScript enforces
 * coverage — adding a new error variant without handling it here is a
 * compile error, preventing silent UI omissions.
 */
const ERROR_CONFIG: Record<
  NonNullable<ErrorType>,
  { title: string; showRetry: boolean }
> = {
  server_error: {
    title: 'Calculation Failed',
    showRetry: true,
  },
  not_found: {
    title: 'Year Not Supported',
    showRetry: false,
  },
} as const;

/**
 * Displays the appropriate error message and an optional retry button.
 *
 * Retry logic is delegated to `useRetryCalculation` — this component
 * does not need to know about salary/year values or how to construct
 * the retry payload.
 */
export function ErrorState() {
  const error = selectors.useError();
  const errorType = selectors.useErrorType();
  const retry = useRetryCalculation();

  if (!error || !errorType) return null;

  const config = ERROR_CONFIG[errorType];

  return (
    <div
      data-testid="error-state"
      className="flex flex-col gap-6 py-6 px-4 animate-[fade-in-down_0.35s_ease-out_both]"
    >
      <div className="bg-bg-error border-l-4 border-status-error rounded-xl p-6 flex items-start gap-4">
        <svg
          className="w-6 h-6 text-status-error shrink-0 mt-0.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <div className="flex flex-col gap-1.5 flex-1">
          <p
            data-testid="error-title"
            className="text-base font-semibold text-status-error"
          >
            {config.title}
          </p>
          <p
            data-testid="error-message"
            className="text-sm text-text-secondary"
          >
            {error}
          </p>
        </div>
      </div>

      {config.showRetry && (
        <button
          type="button"
          data-testid="retry-button"
          onClick={retry}
          className="border border-text-accent text-text-accent bg-transparent px-5 h-12 rounded-xl text-sm font-semibold hover:bg-text-accent/10 active:bg-text-accent/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-card transition-all duration-200 w-fit"
        >
          Try Again
        </button>
      )}
    </div>
  );
}
