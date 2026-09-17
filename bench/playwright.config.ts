import { defineConfig, devices } from "@playwright/test";

const port = process.env.SHEEN_BENCHMARK_PORT ?? "4173";
if (!/^\d{2,5}$/u.test(port) || Number(port) > 65535) throw new Error("SHEEN_BENCHMARK_PORT must be a TCP port number");
const profile = process.env.SHEEN_TABLE_PROFILE === "true";
const admin = process.env.SHEEN_ADMIN_BENCHMARK === "true";
const date = process.env.SHEEN_DATE_BENCHMARK === "true";
const chart = process.env.SHEEN_CHART_BENCHMARK === "true";
const composer = process.env.SHEEN_COMPOSER_BENCHMARK === "true";

export default defineConfig({
  testDir: ".",
  testMatch: composer ? "composer.bench.spec.ts" : chart ? "chart.bench.spec.ts" : date ? "date.bench.spec.ts" : admin ? "admin-app.bench.spec.ts" : profile ? "table.profile.spec.ts" : "table.bench.spec.ts",
  timeout: 300_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "line",
  outputDir: "../test-results/bench-playwright",
  use: { ...devices["Desktop Chrome"], baseURL: `http://127.0.0.1:${port}`, trace: "off", video: "off", screenshot: "off" },
  webServer: {
    command: `pnpm --filter loupe exec vite preview --host 127.0.0.1 --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: process.env.SHEEN_BENCHMARK_REUSE_SERVER === "true",
    timeout: 60_000,
  },
});
