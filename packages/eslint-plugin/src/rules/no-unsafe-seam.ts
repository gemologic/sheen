import type { Rule } from "eslint";

export const noUnsafeSeam: Rule.RuleModule = {
  meta: {
    type: "suggestion",
    docs: { description: "Make deliberate upstream escape-hatch usage visible at every typed __unsafe_ seam." },
    schema: [],
    messages: { unsafe: "{{name}} bypasses Sheen's stable abstraction and is part of the explicit migration surface." },
  },
  create(context) {
    return {
      Identifier(node) {
        if (node.name.startsWith("__unsafe_")) context.report({ node, messageId: "unsafe", data: { name: node.name } });
      },
      Literal(node) {
        if (typeof node.value === "string" && node.value.startsWith("__unsafe_")) context.report({ node, messageId: "unsafe", data: { name: node.value } });
      },
    };
  },
};
