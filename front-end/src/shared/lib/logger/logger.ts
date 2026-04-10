import pino from 'pino';

/**
 * Application-wide structured logger backed by Pino.
 *
 * Configured once at module load and re-used across all layers to avoid
 * creating multiple logger instances with divergent settings.
 *
 * Log level policy:
 * - `debug` in development — verbose enough to trace API calls and store
 *   transitions without noise in CI or production.
 * - `info` in production — suppresses debug-level traces to reduce log volume
 *   and avoid inadvertently shipping sensitive context fields.
 */
export const logger = pino({
  // `asObject: true` serialises log entries as plain JS objects in the browser
  // console rather than the default NDJSON string format, which makes them
  // human-readable in DevTools without a log viewer.
  browser: {
    asObject: true,
  },
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  // Salary values are PII — redact them at the logger level so no log
  // statement anywhere in the codebase can accidentally leak raw amounts.
  // `'*.salary'` covers nested objects (e.g. `{ formData: { salary: ... } }`).
  redact: ['salary', '*.salary'],
});
