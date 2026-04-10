/**
 * Tests for the custom structured logger.
 *
 * Phase 8.5 adversarial review flagged the previous version of this file
 * as structurally tautological — every test verified the logger was
 * callable, none verified that the PII redaction contract actually held.
 * The tests below capture the console sink output and assert on the
 * serialized entry directly, proving the redaction rules apply before
 * anything leaves the logger boundary.
 */

import { logger } from './logger';

describe('logger — interface contract', () => {
  it('exposes the four standard log-level methods as functions', () => {
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.debug).toBe('function');
  });

  it('exposes a level property reflecting the resolved environment', () => {
    // The default test environment (NODE_ENV=test) should resolve to
    // `debug` per the policy: production → info, anything else → debug.
    expect(logger.level).toBe('debug');
  });
});

describe('logger — PII redaction (the behaviour that actually matters)', () => {
  let infoSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    infoSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it('replaces top-level salary field with [Redacted] before emitting', () => {
    logger.info({ salary: 100000, year: 2022 }, 'Accidental salary log');

    expect(infoSpy).toHaveBeenCalledTimes(1);
    const entry = infoSpy.mock.calls[0]?.[0] as Record<string, unknown>;

    expect(entry.salary).toBe('[Redacted]');
    expect(entry.year).toBe(2022);
    expect(entry.msg).toBe('Accidental salary log');

    // Defense in depth: serialize the entire entry and verify the raw
    // numeric value does not appear anywhere in the output. Catches any
    // regression where the value might leak through a different field.
    const serialised = JSON.stringify(entry);
    expect(serialised).not.toContain('100000');
  });

  it('replaces nested *.salary field with [Redacted]', () => {
    logger.warn(
      {
        form: { salary: 85000, year: 2022 },
        origin: 'validation',
      },
      'Nested salary leak',
    );

    expect(warnSpy).toHaveBeenCalledTimes(1);
    const entry = warnSpy.mock.calls[0]?.[0] as {
      form: { salary: string; year: number };
      origin: string;
      msg: string;
    };

    expect(entry.form.salary).toBe('[Redacted]');
    expect(entry.form.year).toBe(2022);
    expect(entry.origin).toBe('validation');
    expect(entry.msg).toBe('Nested salary leak');

    const serialised = JSON.stringify(entry);
    expect(serialised).not.toContain('85000');
  });

  it('leaves non-PII fields intact', () => {
    logger.info(
      { totalTax: 17739.17, effectiveRate: 0.1774 },
      'Tax calculated',
    );

    const entry = infoSpy.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(entry.totalTax).toBe(17739.17);
    expect(entry.effectiveRate).toBe(0.1774);
    expect(entry.msg).toBe('Tax calculated');
  });

  it('supports the message-only signature without a context object', () => {
    logger.info('A plain string message with no context');

    const entry = infoSpy.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(entry.msg).toBe('A plain string message with no context');
    // The numeric level should still be set so log aggregators that
    // parsed the previous Pino output continue to parse this logger's
    // output identically.
    expect(entry.level).toBe(30);
  });

  it('does not mutate the caller input object', () => {
    const input = { salary: 100000, year: 2022 };
    logger.info(input, 'Immutability check');

    // The original object must still have the real salary value — the
    // redaction creates a copy. Verifying this prevents a future
    // refactor from accidentally mutating caller state.
    expect(input.salary).toBe(100000);
  });
});

describe('logger — level filtering', () => {
  let debugSpy: jest.SpyInstance;

  beforeEach(() => {
    debugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    debugSpy.mockRestore();
  });

  it("emits debug-level entries when level is 'debug' (non-production)", () => {
    // The module-level CURRENT_LEVEL is already resolved to 'debug' in
    // the test environment, so a debug call should hit the sink.
    logger.debug({ trace: 'hot-path' }, 'Tracing');

    expect(debugSpy).toHaveBeenCalledTimes(1);
    const entry = debugSpy.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(entry.msg).toBe('Tracing');
    expect(entry.level).toBe(20);
  });
});

describe('logger — production level branch', () => {
  const originalEnv = process.env.NODE_ENV;

  afterAll(() => {
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: originalEnv,
      writable: true,
      configurable: true,
    });
  });

  it("uses 'info' level when NODE_ENV is production", () => {
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: 'production',
      writable: true,
      configurable: true,
    });

    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const prodLogger = require('./logger').logger;
      expect(prodLogger.level).toBe('info');
    });
  });

  it('drops debug entries in production (level filter blocks)', () => {
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: 'production',
      writable: true,
      configurable: true,
    });

    const debugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});

    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const prodLogger = require('./logger').logger;
      prodLogger.debug({ trace: 'hot-path' }, 'Tracing');
    });

    expect(debugSpy).not.toHaveBeenCalled();
    debugSpy.mockRestore();
  });

  it("uses 'debug' level when NODE_ENV is not production", () => {
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: 'test',
      writable: true,
      configurable: true,
    });

    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const devLogger = require('./logger').logger;
      expect(devLogger.level).toBe('debug');
    });
  });
});
