import { defineConfig } from "vite";
import solid from "vite-plugin-solid";

export default defineConfig({
  plugins: [solid()],
  build: {
    lib: { entry: { index: "src/index.ts", core: "src/core.ts", "native-entry": "src/native-entry.ts" }, formats: ["es"] },
    rolldownOptions: {
      external: [/^solid-js(?:\/|$)/, /^@gemologic\/sheen(?:\/|$)/, /^@ark-ui\/solid(?:\/|$)/, /^@internationalized\/date(?:\/|$)/],
      output: { preserveModules: true, preserveModulesRoot: "src", entryFileNames: "[name].js" },
    },
  },
});
