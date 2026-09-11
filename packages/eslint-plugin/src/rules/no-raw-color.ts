import { literalRule, themeDefinitionFile } from "../literal-rule.js";

export const noRawColor = literalRule({
  description: "Disallow raw color literals and palette utility classes outside theme definitions.",
  pattern: /(?:#[\da-f]{3,8}\b|\b(?:rgb|hsl|oklch|oklab|lab|lch|color)\(|(?:^|\s)(?:bg|text|border|fill|stroke)-(?:red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone)-\d{2,3}(?:\s|$))/iu,
  message: "Use a semantic --sheen-color-* token; raw colors belong only in validated theme definitions.",
  allowFile: themeDefinitionFile,
});
