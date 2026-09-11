import type { Rule } from "eslint";
import { literalRule } from "../literal-rule.js";

const stringRule = literalRule({
  description: "Require logical layout utilities and properties so components support RTL.",
  pattern: /(?:^|\s)(?:m[lr]|p[lr]|left|right|inset-[lr]|border-[lr]|rounded-[lr](?:[trb])?|text-(?:left|right))-[^\s]+|\b(?:margin|padding|border)-(?:left|right)(?:-[a-z]+)?\s*:|\b(?:left|right)\s*:/iu,
  message: "Use logical inline-start/inline-end layout instead of a physical left/right property.",
});

export const noPhysicalProperties: Rule.RuleModule = {
  ...stringRule,
  create(context) {
    return {
      ...stringRule.create(context),
      Property(node) {
        const name = node.key.type === "Identifier" ? node.key.name : node.key.type === "Literal" && typeof node.key.value === "string" ? node.key.value : undefined;
        if (!name) return;
        const physical = /^(?:(?:margin|padding|border|inset)(?:Left|Right)(?:Width|Color|Style|Radius)?|(?:borderTop|borderBottom)(?:Left|Right)Radius|left|right)$/u.test(name)
          || ((name === "textAlign" || name === "float") && node.value.type === "Literal" && (node.value.value === "left" || node.value.value === "right"));
        if (physical) context.report({ node, messageId: "forbidden" });
      },
    };
  },
};
