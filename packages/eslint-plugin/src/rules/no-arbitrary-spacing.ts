import { literalRule } from "../literal-rule.js";

export const noArbitrarySpacing = literalRule({
  description: "Disallow arbitrary spacing utilities that do not reference a Sheen token.",
  pattern: /(?:^|\s)-?(?:m[trblxyse]?|p[trblxyse]?|gap(?:-[xy])?|space-[xy]|inset(?:-[xy])?|top|right|bottom|left)-\[(?!var\(--sheen-)[^\]]+\]/u,
  message: "Use a Sheen spacing or geometry token instead of an arbitrary spacing value.",
});
