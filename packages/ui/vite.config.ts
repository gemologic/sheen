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
        vite: "src/vite.ts",
      },
      formats: ["es"],
    },
    rolldownOptions: {
      external: [/^solid-js(?:\/|$)/, /^#sheen-/, /^node:/, /^vite(?:\/|$)/, /^@corvu\/resizable(?:\/|$)/, /^@formisch\/solid(?:\/|$)/, /^@gemologic\/sheen-tokens(?:\/|$)/, "clsx"],
      output: { preserveModules: true, preserveModulesRoot: "src", entryFileNames: "[name].js" },
    },
  },
});
