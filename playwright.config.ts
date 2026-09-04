import { defineConfig } from '@playwright/test';

const database = process.env.REPORTING_TEST_DATABASE_URL;
if (
  !database ||
  !['localhost', '127.0.0.1'].includes(new URL(database).hostname) ||
  new URL(database).pathname !== '/reporting_tests'
)
  throw new Error(
    'Browser tests require an isolated local reporting_tests database.'
  );

export default defineConfig({
  testDir: './tests/browser',
  workers: 1,
  timeout: 120000,
  expect: { timeout: 15000 },
  use: {
    baseURL: 'http://127.0.0.1:3317',
    headless: true,
    launchOptions: { executablePath: process.env.REPORTING_TEST_BROWSER },
  },
  webServer: {
    command: 'npm run dev -- --hostname 127.0.0.1 --port 3317',
    url: 'http://127.0.0.1:3317/login',
    reuseExistingServer: false,
    timeout: 120000,
    env: {
      DATABASE_URL: database,
      JWT_SECRET: 'isolated-browser-test-secret-at-least-32-characters',
      NEXT_TELEMETRY_DISABLED: '1',
    },
  },
});
