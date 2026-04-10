require('@next/env').loadEnvConfig(process.cwd());
require('next');

global.fetch = jest.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({}),
  }),
);

Object.defineProperty(window, 'matchMedia', {
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
    addListener: jest.fn(),
    removeListener: jest.fn(),
  })),
  writable: true,
});

global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Silence the custom logger's console.* sinks during the test suite.
// Without this, every logger.info call from samples.ts and effects.ts
// leaks a structured entry into Jest stdout. Individual test files that
// need to assert on the captured output (logger.test.ts) still spy on
// these methods directly — jest.spyOn layers on top of the base mock.
jest.spyOn(console, 'debug').mockImplementation(() => {});
jest.spyOn(console, 'info').mockImplementation(() => {});
jest.spyOn(console, 'warn').mockImplementation(() => {});
jest.spyOn(console, 'error').mockImplementation(() => {});
