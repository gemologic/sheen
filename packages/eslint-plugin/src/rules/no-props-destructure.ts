import type { Rule } from "eslint";

export const noPropsDestructure: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: { description: "Prevent Solid component props from losing reactivity through object destructuring." },
    schema: [],
    messages: { forbidden: "Keep Solid props reactive; read props directly or use splitProps instead of object destructuring." },
  },
  create(context) {
    return {
      FunctionDeclaration(node) {
        if (node.id?.name && /^[A-Z]/u.test(node.id.name) && node.params[0]?.type === "ObjectPattern") {
          context.report({ node: node.params[0], messageId: "forbidden" });
        }
      },
      VariableDeclarator(node) {
        if (node.id.type === "ObjectPattern") {
          const props = node.init?.type === "Identifier" && node.init.name === "props";
          const merged = node.init?.type === "CallExpression" && node.init.callee.type === "Identifier" && node.init.callee.name === "mergeProps";
          if (props || merged) context.report({ node, messageId: "forbidden" });
        }
        if (node.id.type === "Identifier" && /^[A-Z]/u.test(node.id.name)
          && (node.init?.type === "ArrowFunctionExpression" || node.init?.type === "FunctionExpression")
          && node.init.params[0]?.type === "ObjectPattern") context.report({ node: node.init.params[0], messageId: "forbidden" });
      },
    };
  },
};
