import type { Config } from 'jest';
import nextJest from 'next/jest';

const createJestConfig = nextJest({ dir: './' });

const config: Config = {
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '^#/app/(.*)': '<rootDir>/src/app/$1',
    '^#/shared/(.*)': '<rootDir>/src/shared/$1',
    '^#/lib/(.*)': '<rootDir>/src/shared/lib/$1',
    '^#/widgets/(.*)': '<rootDir>/src/widgets/$1',
    '^#/entities/(.*)': '<rootDir>/src/entities/$1',
    '^react($|/.+)': '<rootDir>/node_modules/react$1',
  },
  setupFiles: ['<rootDir>/jest.setup.js'],
  setupFilesAfterEnv: ['@testing-library/jest-dom'],
  testMatch: ['**/*.(test|spec).(ts|tsx)'],
  testPathIgnorePatterns: ['<rootDir>/e2e/', '<rootDir>/node_modules/'],
  testTimeout: 30_000,
  transform: {
    '^.+\\.(t|j)sx?$': [
      '@swc/jest',
      {
        jsc: {
          transform: {
            react: {
              runtime: 'automatic',
            },
          },
        },
      },
    ],
  },
  clearMocks: true,
  coverageProvider: 'v8',
  coverageThreshold: {
    global: {
      statements: 85,
      branches: 85,
      functions: 85,
      lines: 85,
    },
  },
};

export default createJestConfig(config);
