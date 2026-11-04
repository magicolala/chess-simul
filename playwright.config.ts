import { defineConfig, devices } from '@playwright/test';

/**
 * Default CI mode is public smoke. The historic full E2E suite requires
 * a dedicated Supabase staging backend and must be explicitly requested
 * with PLAYWRIGHT_SUITE=full. No tests are deleted or silently marked passing.
 */
const suite = process.env.PLAYWRIGHT_SUITE ?? 'smoke';
if (!['smoke', 'staging', 'full'].includes(suite)) {
  throw new Error(`Unknown PLAYWRIGHT_SUITE: ${suite}`);
}
const fullSuite = suite === 'full';
const stagingSuite = suite === 'staging';
const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

export default defineConfig({
  testDir: './e2e',
  testMatch: fullSuite
    ? '**/*.spec.ts'
    : stagingSuite ? '**/*.staging.spec.ts' : '**/*.smoke.spec.ts',
  timeout: fullSuite ? 60_000 : stagingSuite ? 45_000 : 25_000,
  globalTimeout: fullSuite ? 45 * 60_000 : stagingSuite ? 12 * 60_000 : 8 * 60_000,
  expect: {
    timeout: 5_000,
    toHaveScreenshot: {
      maxDiffPixels: 100,
      threshold: 0.2,
      animations: 'disabled'
    }
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI && fullSuite ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  outputDir: 'test-results',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 15_000
  },
  projects: fullSuite
    ? [
        { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
        { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
        { name: 'webkit', use: { ...devices['Desktop Safari'] } },
        { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
        { name: 'Mobile Safari', use: { ...devices['iPhone 12'] } }
      ]
    : [
        { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
        { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } }
      ],
  // Running against a deployed staging URL does not need a local dev server.
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: 'npm run dev',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000
      }
});
