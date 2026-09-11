import type { Rule } from "eslint";

export const noDynamicIconName: Rule.RuleModule = {
  meta: {
    type: "suggestion",
    docs: { description: "Keep Icon names literal so the build can inline only the used glyphs." },
    schema: [],
    messages: { dynamic: "Icon name must be a literal; use DynamicIcon explicitly when the complete runtime registry is intended." },
  },
  create(context) {
    return {
      Program(node) {
        if (/<Icon\b[^>]*\sname\s*=\s*\{/u.test(context.sourceCode.getText(node))) context.report({ node, messageId: "dynamic" });
      },
    };
  },
};
