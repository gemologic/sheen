import { literalRule, themeDefinitionFile } from "../literal-rule.js";

export const noTier1InComponent = literalRule({
  description: "Disallow raw tier-one palette and geometry tokens outside theme definitions.",
  pattern: /--sheen-(?:gray|jade|amber|cyan|rose|violet|size|radius|font-size|shadow)-(?:\d+|full)\b/u,
  message: "Reference a semantic tier-two Sheen token instead of a tier-one primitive.",
  allowFile: themeDefinitionFile,
});
