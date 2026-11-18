import tseslint from "typescript-eslint";
import eslintComments from "@eslint-community/eslint-plugin-eslint-comments";

export default tseslint.config(
  { ignores: ["**/dist/**", "**/node_modules/**", "packages/ui/vendor/**", "**/.output/**", "apps/loupe/src/generated/**", "test-results/**", "playwright-report/**"] },
  tseslint.configs.recommended,
  { languageOptions: { parserOptions: { tsconfigRootDir: import.meta.dirname } } },
  {
    plugins: { "@eslint-community/eslint-comments": eslintComments },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": "error",
      "@eslint-community/eslint-comments/require-description": "error",
    },
  },
  {
    // Component chrome draws icons with Glyph or @gemologic/sheen-icons, never with typographic characters.
    files: ["packages/*/src/**/*.tsx"],
    ignores: ["**/*.demo.tsx", "**/*.test.tsx"],
    rules: {
      "no-restricted-syntax": ["error", ...["JSXText", "JSXExpressionContainer Literal", "ReturnStatement > Literal"].map(node => ({
        selector: `${node}[value=/[▦‹›«»●○◉−×✕✓✔↑↓↗↘▲▼▶◀]/u]`,
        message: "Draw chrome icons with <Glyph> or @gemologic/sheen-icons instead of typographic characters.",
      }))],
    },
  },
);
