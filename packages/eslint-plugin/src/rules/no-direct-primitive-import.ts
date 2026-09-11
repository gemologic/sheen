import type { Rule } from "eslint";

function implementationBoundary(filename: string, source: string): boolean {
  const normalized = filename.replaceAll("\\", "/");
  if (/^@kobalte\/|^@corvu\/|^corvu(?:\/|$)/u.test(source)) return normalized.includes("/packages/ui/");
  if (/^@tanstack\/(?:solid-table|solid-virtual)(?:\/|$)/u.test(source)) return normalized.includes("/packages/table/");
  if (/^@tanstack\/(?:solid-router|router-core)(?:\/|$)/u.test(source)) return normalized.includes("/packages/patterns/");
  if (/^@tanstack\//u.test(source)) return normalized.includes("/packages/table/") || normalized.includes("/packages/patterns/");
  if (/^(?:uplot|d3-(?:scale|shape))(?:\/|$)/u.test(source)) return normalized.includes("/packages/charts/");
  return true;
}

function directPrimitive(source: string): boolean {
  return /^@kobalte\/|^@corvu\/|^corvu(?:\/|$)|^@tanstack\/|^(?:uplot|d3-(?:scale|shape))(?:\/|$)/u.test(source);
}

export const noDirectPrimitiveImport: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: { description: "Keep headless, table, router, and chart engines behind their public Sheen wrappers." },
    schema: [],
    messages: { forbidden: "Import {{source}} only inside its owning Sheen wrapper package; applications use public Sheen entries." },
  },
  create(context) {
    const inspect = (node: Rule.Node, source: unknown): void => {
      if (typeof source === "string" && directPrimitive(source) && !implementationBoundary(context.filename, source)) {
        context.report({ node, messageId: "forbidden", data: { source } });
      }
    };
    return {
      ImportDeclaration(node) {
        inspect(node, node.source.value);
      },
      ImportExpression(node) {
        if (node.source.type === "Literal") inspect(node, node.source.value);
      },
      CallExpression(node) {
        if (node.callee.type !== "Identifier" || node.callee.name !== "require") return;
        const source = node.arguments[0];
        if (source?.type === "Literal") inspect(node, source.value);
      },
    };
  },
};
