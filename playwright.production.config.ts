import { defineConfig, devices } from "@playwright/test";

const port = process.env.SHEEN_PRODUCTION_PORT ?? "4179";
if (!/^\d{2,5}$/u.test(port) || Number(port) > 65535) throw new Error("SHEEN_PRODUCTION_PORT must be a TCP port number");
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  timeout: 30_000,
  workers: 1,
  retries: 0,
  outputDir: "./test-results/production",
  use: { ...devices["Desktop Chrome"], baseURL, trace: "retain-on-failure" },
  projects: [
    { name: "production-http", testDir: "./tests/production" },
    { name: "production-hydration", testDir: "./tests/browser", testMatch: "hydration-refresh.spec.ts" },
  ],
  webServer: {
    command: `pnpm --filter loupe exec vite preview --host 127.0.0.1 --port ${port} --strictPort`,
    // Readiness must not hide an SSR 500 behind a server-start timeout.
    url: `${baseURL}/sheen-report.txt`,
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
