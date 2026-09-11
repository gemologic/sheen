import { defineConfig, devices } from "@playwright/test";

const port = process.env.SHEEN_BROWSER_PORT ?? "4173";
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./tests/browser",
  timeout: 30_000,
  workers: process.env.CI ? 2 : 4,
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.002 } },
  use: { baseURL, trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: { command: `pnpm --filter loupe exec vite --host 0.0.0.0 --port ${port} --strictPort`, url: baseURL, reuseExistingServer: !process.env.CI, timeout: 60_000 },
});
