import { defineConfig } from "vitest/config";
import solid from "vite-plugin-solid";

export default defineConfig({
  plugins: [solid({ ssr: true, hot: false })],
  test: {
    include: ["packages/**/*.test.ts", "packages/**/*.test.tsx", "tools/**/*.test.ts", "bench/**/*.test.ts"], environment: "node",
    server: { deps: {
      // Kobalte's Solid export contains JSX and must pass through the real SSR transform.
      inline: ["@kobalte/core"],
      external: [/\/node_modules\/solid-js(?:\/|$)/],
    } },
  },
});
