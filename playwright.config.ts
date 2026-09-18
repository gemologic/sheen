import { defineConfig, devices } from "@playwright/test";

const port = process.env.SHEEN_BROWSER_PORT ?? "4173";
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./tests/browser",
  timeout: 30_000,
  workers: process.env.CI ? 2 : 4,
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.002 } },
  use: { baseURL, trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: {
    ...devices["Desktop Chrome"],
    // Match grayscale screenshot baselines regardless of the host's RGB/BGR
    // fontconfig setting. Keep this out of WebKit and performance profiles.
    launchOptions: { args: ["--disable-lcd-text"] },
  } }],
  webServer: {
    command: `pnpm --filter loupe exec vite --host 0.0.0.0 --port ${port} --strictPort`,
    env: { SHEEN_VITE_CACHE_DIR: `node_modules/.vite-browser-${port}` },
    url: baseURL, reuseExistingServer: !process.env.CI, timeout: 60_000,
  },
});
