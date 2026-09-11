import type { Rule } from "eslint";

function tokenBridge(filename: string): boolean {
  return filename.replaceAll("\\", "/").includes("/packages/charts/src/theme-tokens.");
}

export const noComputedStyle: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: { description: "Keep computed-style token reads inside the shared chart token bridge." },
    schema: [],
    messages: { forbidden: "Read computed theme values through useThemeTokens; direct getComputedStyle calls are not allowed here." },
  },
  create(context) {
    if (tokenBridge(context.filename)) return {};
    return {
      CallExpression(node) {
        const direct = node.callee.type === "Identifier" && node.callee.name === "getComputedStyle";
        const member = node.callee.type === "MemberExpression" && !node.callee.computed
          && node.callee.property.type === "Identifier" && node.callee.property.name === "getComputedStyle";
        if (direct || member) context.report({ node, messageId: "forbidden" });
      },
    };
  },
};
