const { defineConfig, devices } = require('@playwright/test')

/**
 * The tests drive the real UI against the real API, so both must be running first:
 *   - API  : ../gamma-shop-api  ->  http://localhost:8080  (with MySQL + seed data)
 *   - UI   : ../gamma-shop-ui   ->  npm run dev  ->  http://localhost:5173
 *
 * Override the UI URL with  BASE_URL=http://host:port  if you run it elsewhere.
 */
module.exports = defineConfig({
  testDir: './tests',
  // The end-to-end flow is sequential and shares database state (one order moving
  // through customer -> staff -> admin), so never parallelise.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  timeout: 180_000,
  expect: { timeout: 15_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  outputDir: './test-results',
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:5173',
    headless: true,
    viewport: { width: 1440, height: 900 },
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
})
