import { defineConfig, devices } from "@playwright/test";

const port = process.env.SHEEN_PAGES_PORT ?? "4178";
if (!/^\d{2,5}$/u.test(port)) throw new Error("SHEEN_PAGES_PORT must be a TCP port number");

export default defineConfig({
  testDir: "./tests/pages",
  timeout: 30_000,
  workers: 1,
  use: {
    ...devices["Desktop Chrome"],
    baseURL: `http://127.0.0.1:${port}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `SHEEN_PAGES=1 VITE_SHEEN_PUBLIC_SITE=1 pnpm --filter loupe exec vite preview --host 127.0.0.1 --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
