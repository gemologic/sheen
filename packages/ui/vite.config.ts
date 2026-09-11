import { defineConfig } from "vite";
import solid from "vite-plugin-solid";

export default defineConfig({
  plugins: [solid()],
  build: {
    lib: {
      entry: {
        index: "src/index.ts",
        core: "src/core.ts",
        forms: "src/forms.ts",
        overlays: "src/overlays.ts",
        navigation: "src/navigation.ts",
        formisch: "src/formisch.ts",
        metadata: "src/metadata.ts",
      },
      formats: ["es"],
    },
    rolldownOptions: {
      external: [/^solid-js(?:\/|$)/, /^@kobalte\//, /^@corvu\/resizable(?:\/|$)/, /^cmdk-solid(?:\/|$)/, /^@formisch\/solid(?:\/|$)/, /^@gemologic\/sheen-tokens(?:\/|$)/, "clsx"],
      output: { preserveModules: true, preserveModulesRoot: "src", entryFileNames: "[name].js" },
    },
  },
});
