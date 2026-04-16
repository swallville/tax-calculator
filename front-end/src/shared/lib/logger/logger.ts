/**
 * Application-wide structured logger.
 *
 * Log level: `debug` in development, `info` in production (suppresses
 * debug traces to reduce volume and avoid leaking context fields).
 *
 * PII redaction: fields matching `salary` (top-level) or `*.salary`
 * (one-level-nested) are replaced with `'[Redacted]'` before emit, so no
 * downstream transport can leak the raw value. The `*.salary` path mirrors
 * a Pino redact spec for forward compatibility.
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
