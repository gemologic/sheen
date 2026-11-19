import eslintComments from "@eslint-community/eslint-plugin-eslint-comments";
import sheen from "eslint-plugin-sheen";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist/**", "node_modules/**"] },
  tseslint.configs.recommended,
  { languageOptions: { parserOptions: { tsconfigRootDir: import.meta.dirname } } },
  sheen.configs.recommended,
  {
    plugins: { "@eslint-community/eslint-comments": eslintComments },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": "error",
      "@eslint-community/eslint-comments/require-description": "error",
    },
  },
);
