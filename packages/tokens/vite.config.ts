import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: { entry: "src/index.ts", formats: ["es"] },
    rolldownOptions: { output: { preserveModules: true, entryFileNames: "[name].js" } },
  },
});
