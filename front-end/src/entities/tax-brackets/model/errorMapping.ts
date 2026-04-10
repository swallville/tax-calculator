import { ApiError } from '#/shared/api';
import { logger } from '#/shared/lib/logger';

import type { ErrorType } from '../types';

type NonNullErrorType = NonNullable<ErrorType>;

/**
 * Declarative descriptor for a single error case.
 *
 * Each mapping owns its own match predicate, user-facing message, structured
 * error category, log level, and log message. Adding a new error type means
 * appending one object to `ERROR_MAPPINGS` — no switch statement to extend.
 */
interface ErrorMapping {
  /** Returns true when this mapping applies to the given error. */
  match: (error: unknown) => boolean;
  /** User-facing message shown in the UI — no raw error details. */
  message: string;
  /** Structured category written to the store for conditional UI rendering. */
  errorType: NonNullErrorType;
  /** Pino log level — use 'warn' for expected client errors, 'error' for server faults. */
  logLevel: 'warn' | 'error';
  /** Short log message for log aggregation queries. */
  logMessage: string;
}

/**
 * Ordered list of error mappings evaluated top-to-bottom.
 *
 * More specific conditions (404) come before broader ones (>=500) so they
 * match first. The fallback `DEFAULT_ERROR` handles anything not covered here.
 *
 * To add a new error type:
 *   1. Add a literal to `ErrorType` in `../types.ts`
 *   2. Append an `ErrorMapping` object here with the appropriate `match` predicate
 *   3. No other files need changes — `mapError` picks it up automatically
 */
const ERROR_MAPPINGS: ErrorMapping[] = [
  {
    // 404 means the requested year is not supported by the API — a user input
    // error, not an infrastructure fault, so we warn rather than error.
    match: error => error instanceof ApiError && error.status === 404,
    message:
      'Unsupported tax year. Please select a year between 2019 and 2022.',
    errorType: 'not_found',
    logLevel: 'warn',
    logMessage: 'Unsupported tax year',
  },
  {
    // 5xx indicates an infrastructure fault. Logged at 'error' to trigger
    // alerting rules in the observability stack.
    match: error => error instanceof ApiError && error.status >= 500,
    message: 'Something went wrong. Please try again.',
    errorType: 'server_error',
    logLevel: 'error',
    logMessage: 'Server error fetching brackets',
  },
];

/**
 * Fallback applied when no entry in `ERROR_MAPPINGS` matches.
 *
 * Covers unexpected error types (network timeout, thrown strings, etc.).
 * Treated as a server_error because we cannot determine the cause.
 */
const DEFAULT_ERROR: Omit<ErrorMapping, 'match'> = {
  message: 'An unexpected error occurred.',
  errorType: 'server_error',
  logLevel: 'error',
  logMessage: 'Unexpected error',
};

/**
 * Translates a raw error into a structured `{ error, errorType }` payload
 * suitable for the `setError` event.
 *
 * Performs the matching, logging, and message resolution in one call so
 * callers (samples.ts) remain a single line with no conditional logic.
 *
 * @param error - The raw error from `taxBracketsQuery.finished.failure`.
 * @returns Structured error payload ready to dispatch to `setError`.
 */
export function mapError(error: unknown): {
  error: string;
  errorType: NonNullErrorType;
} {
  const mapping = ERROR_MAPPINGS.find(m => m.match(error)) ?? DEFAULT_ERROR;

  // Include HTTP status when available; fall back to stringified error for
  // non-ApiError types so the log entry is always actionable.
  const logContext =
    error instanceof ApiError
      ? { status: error.status }
      : { error: String(error) };

  logger[mapping.logLevel](logContext, mapping.logMessage);

  return {
    error: mapping.message,
    errorType: mapping.errorType,
  };
}
