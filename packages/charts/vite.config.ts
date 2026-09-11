import { defineConfig } from "vite";
import solid from "vite-plugin-solid";

export default defineConfig({
  plugins: [solid()],
  build: {
    lib: { entry: { index: "src/index.ts", core: "src/core.ts", svg: "src/svg.ts", "charts-svg": "src/charts-svg.ts", table: "src/table.ts", "time-series": "src/time-series.ts", streaming: "src/streaming.ts", loupe: "src/loupe.ts" }, formats: ["es"] },
    rolldownOptions: {
      external: [/^solid-js(?:\/|$)/, /^@gemologic\/sheen(?:\/|$)/, /^uplot(?:\/|$)/, /^d3-(?:scale|shape)(?:\/|$)/],
      output: { preserveModules: true, preserveModulesRoot: "src", entryFileNames: "[name].js" },
    },
  },
});
