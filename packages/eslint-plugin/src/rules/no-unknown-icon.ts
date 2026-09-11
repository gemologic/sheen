import type { Rule } from "eslint";
import { semanticIconNameSet } from "../semantic-icon-names.js";

export const noUnknownIcon: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: { description: "Reject literal Icon names missing from the semantic registry." },
    schema: [],
    messages: { unknown: "{{name}} is not a registered semantic icon name." },
  },
  create(context) {
    return {
      Program(node) {
        const source = context.sourceCode.getText(node);
        for (const match of source.matchAll(/<Icon\b[^>]*\sname\s*=\s*["']([^"']+)["'][^>]*\/?>/gu)) {
          const name = match[1];
          if (name && !semanticIconNameSet.has(name)) context.report({ node, messageId: "unknown", data: { name } });
        }
      },
    };
  },
};
