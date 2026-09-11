import { defineConfig } from "vite";
import solid from "vite-plugin-solid";

export default defineConfig({
  plugins: [solid()],
  build: {
    lib: { entry: { index: "src/index.ts", highlight: "src/highlight.ts", DiffViewer: "src/DiffViewer.tsx", LogViewer: "src/LogViewer.tsx", JSONViewer: "src/JSONViewer.tsx" }, formats: ["es"] },
    rolldownOptions: {
      external: [/^solid-js(?:\/|$)/, /^@gemologic\/sheen(?:\/|$)/, /^shiki(?:\/|$)/],
      output: { preserveModules: true, preserveModulesRoot: "src", entryFileNames: "[name].js" },
    },
  },
});
