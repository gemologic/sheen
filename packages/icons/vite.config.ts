import { defineConfig } from "vite";
import solid from "vite-plugin-solid";

export default defineConfig({
  plugins: [solid()],
  build: {
    lib: { entry: { index: "src/index.ts", runtime: "src/runtime.tsx", vite: "src/vite.ts" }, formats: ["es"] },
    rolldownOptions: {
      external: [/^solid-js(?:\/|$)/, /^vite(?:\/|$)/],
      output: { preserveModules: true, preserveModulesRoot: "src", entryFileNames: "[name].js" },
    },
  },
});
