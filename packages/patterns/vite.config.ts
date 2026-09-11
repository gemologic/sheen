import { defineConfig } from "vite";
import solid from "vite-plugin-solid";
export default defineConfig({
  plugins: [solid()],
  build: {
    lib: { entry: { index: "src/index.ts", auth: "src/auth.ts", admin: "src/admin.ts", "admin-config": "src/admin-config.ts", "solid-router": "src/solid-router.ts", "tanstack-router": "src/tanstack-router.ts" }, formats: ["es"] },
    rolldownOptions: {
      external: [/^solid-js(?:\/|$)/, /^@solidjs\/meta(?:\/|$)/, /^@solidjs\/router(?:\/|$)/, /^@tanstack\/solid-router(?:\/|$)/, /^@gemologic\/sheen(?:\/|$)/],
      output: { preserveModules: true, preserveModulesRoot: "src", entryFileNames: "[name].js" },
    },
  },
});
