import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests run against the PRODUCTION build served by an offline
 * harness (tests/e2e/harness) with an empty test-only catalog. Run
 * `pnpm build` first. Set E2E_BASE_URL to point at a real preview deployment
 * instead (the harness is then not started).
 */
const external = process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: external ?? "http://localhost:4173",
    trace: "off",
  },
  webServer: external
    ? undefined
    : {
        command: "node tests/e2e/harness/server.mjs",
        url: "http://localhost:4173/robots.txt",
        reuseExistingServer: false,
      },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
});
