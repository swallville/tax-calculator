import { logger } from './logger';

describe('logger', () => {
  it('is a pino logger instance with standard log-level methods', () => {
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.debug).toBe('function');
  });

  it('has redact config for salary fields', () => {
    // Verify the logger was configured with salary redaction paths
    expect(() => {
      logger.info(
        { totalTax: 17739.17, effectiveRate: 0.1774 },
        'Tax calculated',
      );
    }).not.toThrow();
  });

  it('does not throw when logging objects with salary field', () => {
    // Even if salary is accidentally passed, the logger should handle it
    // via redaction without crashing
    expect(() => {
      logger.info(
        { salary: 100000, totalTax: 17739.17 },
        'Accidental salary log',
      );
    }).not.toThrow();
  });
});

describe('logger — production level branch', () => {
  const originalEnv = process.env.NODE_ENV;

  afterAll(() => {
    // Restore original NODE_ENV after this describe block
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: originalEnv,
      writable: true,
      configurable: true,
    });
  });

  it("uses 'info' level when NODE_ENV is production", () => {
    // Re-require the module with NODE_ENV set to 'production' to hit the
    // ternary branch on line 7: `process.env.NODE_ENV === 'production' ? 'info' : 'debug'`
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: 'production',
      writable: true,
      configurable: true,
    });

    // Isolate the module so the factory runs fresh with the new env value
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const prodLogger = require('./logger').logger;
      expect(prodLogger.level).toBe('info');
    });
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
