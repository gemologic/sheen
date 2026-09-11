import { defineConfig } from "vite";
import { solidStart } from "@solidjs/start/config";
import tailwind from "@tailwindcss/vite";
import { nitro } from "nitro/vite";
import { sheenIcons } from "@gemologic/sheen-icons/vite";
import { pagesRoutes } from "./src/pages-routes.ts";

const pages = process.env.SHEEN_PAGES === "1";

export default defineConfig({
  resolve: { dedupe: ["solid-js"] },
  optimizeDeps: {
    entries: ["src/**/*.tsx", "!src/entry-server.tsx"],
  },
  plugins: [
    sheenIcons({ sets: ["radix", "phosphor"] }),
    solidStart({ devOverlay: false }),
    nitro(),
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
