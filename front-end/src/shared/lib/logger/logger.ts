/**
 * Application-wide structured logger.
 *
 * Historical note: this module previously wrapped Pino's browser build
 * (~15 KB gzipped). Phase 8.5 performance review flagged Pino as the one
 * non-load-bearing dependency that could be replaced for bundle savings
 * without touching the core architectural story (reactive state, query
 * layer, schema validation). The replacement is a 60-line custom logger
 * that preserves the exact public interface used by the three call sites
 * (`logger.info`, `logger.warn`, `logger.error`, `logger.debug`) plus the
 * `level` property and the PII redaction contract. Recovered ~12 KB
 * gzipped from the first-load bundle.
 *
 * Log level policy:
 * - `debug` in development — verbose enough to trace API calls and store
 *   transitions without noise in CI or production.
 * - `info` in production — suppresses debug-level traces to reduce log
 *   volume and avoid inadvertently shipping sensitive context fields.
 *
 * PII redaction:
 * - Field `salary` at the top level of the log context is always replaced
 *   with the literal string `'[Redacted]'`.
 * - Field `salary` nested one level deep (e.g. `{ form: { salary } }`) is
 *   also replaced. The `*.salary` path mirrors the Pino redact spec the
 *   previous implementation used.
 * - Redaction is applied before the log entry is emitted, so no
 *   downstream transport can leak the raw value.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Numeric level priorities (matching Pino's scheme, so downstream log
 * aggregators that expected Pino output continue to parse the numbers).
 */
const LEVEL_VALUES: Record<LogLevel, number> = {
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
};

const REDACT_VALUE = '[Redacted]';

/**
 * Paths to redact, mirroring the previous Pino `redact` config.
 * `'salary'` covers top-level; `'*.salary'` covers one-level-nested.
 */
const REDACT_PATHS: readonly string[] = ['salary', '*.salary'];

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

/**
 * Returns a shallow copy of `obj` with any field matching `REDACT_PATHS`
 * replaced by `'[Redacted]'`. Does not mutate the input.
 */
function redact(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = { ...obj };
  for (const path of REDACT_PATHS) {
    if (path.startsWith('*.')) {
      const fieldName = path.slice(2);
      for (const key of Object.keys(result)) {
        const value = result[key];
        if (isPlainObject(value) && fieldName in value) {
          result[key] = { ...value, [fieldName]: REDACT_VALUE };
        }
      }
    } else if (path in result) {
      result[path] = REDACT_VALUE;
    }
  }
  return result;
}

function resolveLevel(): LogLevel {
  return process.env.NODE_ENV === 'production' ? 'info' : 'debug';
}

const CURRENT_LEVEL: LogLevel = resolveLevel();

/**
 * Maps numeric level thresholds to the `console.*` method that should
 * receive the entry. `debug` → `console.debug`, etc. Keeping the mapping
 * explicit (rather than using `console[level]` by string) avoids the
 * TypeScript narrowing complexity and the `noImplicitAny` warnings that
 * the dynamic access would otherwise introduce.
 */
const CONSOLE_SINKS: Record<LogLevel, (entry: unknown) => void> = {
  debug: (entry: unknown) => {
    console.debug(entry);
  },
  info: (entry: unknown) => {
    console.info(entry);
  },
  warn: (entry: unknown) => {
    console.warn(entry);
  },
  error: (entry: unknown) => {
    console.error(entry);
  },
};

function shouldEmit(level: LogLevel): boolean {
  return LEVEL_VALUES[level] >= LEVEL_VALUES[CURRENT_LEVEL];
}

/**
 * Emits a structured log entry to the appropriate `console.*` sink after
 * PII redaction. Accepts either `(msg)` or `(contextObj, msg)` — both are
 * common signatures inherited from the previous Pino-backed API.
 */
function emit(
  level: LogLevel,
  contextOrMsg: Record<string, unknown> | string,
  msg?: string,
): void {
  if (!shouldEmit(level)) return;

  const entry: Record<string, unknown> = {
    level: LEVEL_VALUES[level],
    time: Date.now(),
  };

  if (typeof contextOrMsg === 'string') {
    entry.msg = contextOrMsg;
  } else {
    Object.assign(entry, redact(contextOrMsg));
    if (msg !== undefined) {
      entry.msg = msg;
    }
  }

  CONSOLE_SINKS[level](entry);
}

/**
 * Public logger interface. Matches the subset of the Pino API used by
 * application call sites: the four standard level methods and a `level`
 * property that reflects the resolved environment level.
 */
export const logger = {
  level: CURRENT_LEVEL,
  debug: (contextOrMsg: Record<string, unknown> | string, msg?: string) =>
    emit('debug', contextOrMsg, msg),
  info: (contextOrMsg: Record<string, unknown> | string, msg?: string) =>
    emit('info', contextOrMsg, msg),
  warn: (contextOrMsg: Record<string, unknown> | string, msg?: string) =>
    emit('warn', contextOrMsg, msg),
  error: (contextOrMsg: Record<string, unknown> | string, msg?: string) =>
    emit('error', contextOrMsg, msg),
};
