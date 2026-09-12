import tseslint from "typescript-eslint";
import eslintComments from "@eslint-community/eslint-plugin-eslint-comments";

export default tseslint.config(
  { ignores: ["**/dist/**", "**/node_modules/**", "packages/ui/vendor/**", "**/.output/**", "apps/loupe/src/generated/**", "test-results/**", "playwright-report/**"] },
  tseslint.configs.recommended,
  {
    plugins: { "@eslint-community/eslint-comments": eslintComments },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": "error",
      "@eslint-community/eslint-comments/require-description": "error",
    },
  },
);
