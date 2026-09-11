import { defineConfig } from "vite";
import solid from "vite-plugin-solid";

export default defineConfig({
  plugins: [solid()],
  build: {
    lib: { entry: { index: "src/index.ts", core: "src/core.ts", QueryBuilder: "src/QueryBuilder.tsx" }, formats: ["es"] },
    rolldownOptions: {
      external: [/^solid-js(?:\/|$)/, /^@gemologic\/sheen(?:\/|$)/, /^@tanstack\/solid-virtual(?:\/|$)/],
      output: { preserveModules: true, preserveModulesRoot: "src", entryFileNames: "[name].js" },
    },
  },
});
