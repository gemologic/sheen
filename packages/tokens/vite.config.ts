import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: { entry: ["src/index.ts", "src/catalog.ts"], formats: ["es"] },
    rolldownOptions: { output: { preserveModules: true, entryFileNames: "[name].js" } },
  },
});
