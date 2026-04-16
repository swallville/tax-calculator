import { defineConfig, devices } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';

// Wires Gherkin feature files + step definitions into Playwright's test runner.
// `bddgen test` regenerates `.features-gen/` from `.feature` files and then
// invokes `playwright test`, which matches both the hand-written `.spec.ts`
// files and the generated BDD specs via `testMatch` below.
defineBddConfig({
  features: 'e2e/features/*.feature',
  steps: 'e2e/features/steps/*.ts',
  outputDir: 'e2e/.features-gen',
});

export default defineConfig({
  testDir: './e2e',
  testMatch: ['**/*.spec.ts', '.features-gen/**/*.spec.js'],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'html',
  timeout: 60_000,
  expect: {
    timeout: 15_000,
  },
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: {
    command:
      'docker compose -f ../docker-compose.yml up --wait --wait-timeout 60',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    cwd: '..',
  },
});
