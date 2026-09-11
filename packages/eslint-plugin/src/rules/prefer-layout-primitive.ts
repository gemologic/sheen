import type { Rule } from "eslint";

function implementationFile(filename: string): boolean {
  return filename.replaceAll("\\", "/").includes("/packages/ui/src/layout/");
}

function preferredPrimitive(value: string): "Grid" | "Row" | "Stack" | undefined {
  const classes = new Set(value.split(/\s+/u));
  const hasGap = [...classes].some(name => /^gap-(?!x-|y-)/u.test(name));
  if (classes.has("grid") && hasGap) return "Grid";
  if (classes.has("flex") && classes.has("flex-col") && hasGap) return "Stack";
  if (classes.has("flex") && hasGap) return "Row";
  return undefined;
}

export const preferLayoutPrimitive: Rule.RuleModule = {
  meta: {
    type: "suggestion",
    docs: { description: "Prefer Sheen layout primitives over repeated flex/grid gap recipes." },
    schema: [],
    messages: { preferred: "Prefer <{{name}}> so density, direction, and spacing stay token-owned." },
  },
  create(context) {
    if (implementationFile(context.filename)) return {};
    const inspect = (node: Rule.Node, value: string): void => {
      const name = preferredPrimitive(value);
      if (name) context.report({ node, messageId: "preferred", data: { name } });
    };
    return {
      Literal(node) {
        if (typeof node.value === "string") inspect(node, node.value);
      },
      TemplateElement(node) {
        inspect(node, node.value.raw);
      },
    };
  },
};
