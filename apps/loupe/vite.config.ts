import { defineConfig } from "vite";
import { solidStart } from "@solidjs/start/config";
import tailwind from "@tailwindcss/vite";
import { nitro } from "nitro/vite";
import { sheenIcons } from "@gemologic/sheen-icons/vite";
import { sheenRuntime } from "@gemologic/sheen/vite";
import { devRequestCancellation } from "./dev-request-cancellation.ts";
import { pagesRoutes } from "./src/pages-routes.ts";

const pages = process.env.SHEEN_PAGES === "1";

export default defineConfig({
  cacheDir: process.env.SHEEN_VITE_CACHE_DIR ?? "node_modules/.vite",
  resolve: { dedupe: ["solid-js"] },
  optimizeDeps: {
    entries: ["src/**/*.tsx", "!src/entry-server.tsx"],
  },
  plugins: [
    sheenRuntime(),
    sheenIcons({ sets: ["radix", "phosphor"] }),
    solidStart({ devOverlay: false }),
    nitro(),
    devRequestCancellation(),
    tailwind(),
  ],
  server: { strictPort: true },
  ...(pages ? {
    nitro: {
      compatibilityDate: "2026-09-04",
      preset: "static",
      prerender: {
        crawlLinks: false,
        failOnError: true,
        routes: [...pagesRoutes],
      },
    },
  } : {}),
});
