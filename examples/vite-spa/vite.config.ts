import { sheenRuntime } from "@gemologic/sheen/vite";
import { createThemeScript } from "@gemologic/sheen/theme-script";
import { sheenIcons } from "@gemologic/sheen-icons/vite";
import { defineConfig } from "vite";
import type { Plugin } from "vite";
import solid from "vite-plugin-solid";

/** Emit the blocking theme bootstrap in <head> so root theme attributes exist before first paint. */
function sheenThemeScript(): Plugin {
  return {
    name: "sheen-theme-script",
    transformIndexHtml: () => [{ tag: "script", children: createThemeScript(), injectTo: "head" }],
  };
}

export default defineConfig({
  plugins: [sheenRuntime(), sheenIcons({ sets: ["radix", "phosphor"] }), solid(), sheenThemeScript()],
  server: { strictPort: true },
});
