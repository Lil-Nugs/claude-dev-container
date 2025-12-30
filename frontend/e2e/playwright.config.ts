import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for E2E tests.
 * Targets critical paths: project selection, bead listing, work execution, review, push/PR flows.
 *
 * Test directories:
 * - ./flows: Standard E2E tests (mocked backend, run in CI)
 * - ./integration: Real backend integration tests (skipped in CI)
 *
 * Usage:
 * - For local development: Start the dev server first with `npm run dev`, then run `npm run test:e2e`
 * - For CI: The webServer config will automatically start the dev server
 * - For real backend tests: Also start the backend, then run `npx playwright test e2e/integration/`
 */
export default defineConfig({
  testDir: ".",
  testMatch: ["flows/**/*.spec.ts", "integration/**/*.spec.ts"],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [["html"], ["github"], ["line"]] : "list",
  timeout: 60000,

  use: {
    baseURL: process.env.BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: process.env.CI
    ? [
        {
          name: "chromium",
          use: { ...devices["Desktop Chrome"] },
        },
      ]
    : [
        {
          name: "chromium",
          use: { ...devices["Desktop Chrome"] },
        },
        {
          name: "mobile-chrome",
          use: { ...devices["Pixel 5"] },
        },
      ],

  // WebServer configuration - only enabled in CI or when explicitly requested
  ...(process.env.CI || process.env.PLAYWRIGHT_WEBSERVER
    ? {
        webServer: {
          command: "npm run dev",
          url: "http://localhost:3000",
          reuseExistingServer: !process.env.CI,
          timeout: 120000,
        },
      }
    : {}),
});
