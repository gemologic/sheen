import { defineConfig, devices } from "@playwright/test";

/** Smoke coverage for the example applications. Each project starts its own dev server. */
/** Set SHEEN_EXAMPLE to one app name to start only that app's dev server. */
const apps = [
  { name: "ops-console", port: process.env.SHEEN_OPS_PORT ?? "4310" },
  { name: "market-desk", port: process.env.SHEEN_MARKET_PORT ?? "4320" },
  { name: "vite-spa", port: process.env.SHEEN_VITE_SPA_PORT ?? "4330" },
].filter(app => !process.env.SHEEN_EXAMPLE || app.name === process.env.SHEEN_EXAMPLE);

export default defineConfig({
  testDir: ".",
  timeout: 45_000,
  workers: 2,
  outputDir: "../../test-results/examples",
  use: { ...devices["Desktop Chrome"], trace: "retain-on-failure" },
  projects: apps.map(app => ({ name: app.name, testMatch: `${app.name}.spec.ts`, use: { baseURL: `http://127.0.0.1:${app.port}` } })),
  webServer: apps.map(app => ({
    command: `pnpm --filter ${app.name} exec vite --host 127.0.0.1 --port ${app.port} --strictPort`,
    url: `http://127.0.0.1:${app.port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  })),
});
