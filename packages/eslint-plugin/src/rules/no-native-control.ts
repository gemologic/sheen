import type { Rule } from "eslint";

const nativeControls = new Set(["button", "dialog", "input", "select", "textarea"]);

function wrapperFile(filename: string): boolean {
  const normalized = filename.replaceAll("\\", "/");
  return ["/packages/ui/", "/packages/table/", "/packages/patterns/"].some(segment => normalized.includes(segment));
}

export const noNativeControl: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: { description: "Require Sheen control wrappers outside their implementation packages." },
    schema: [],
    messages: { forbidden: "Use the corresponding public Sheen control instead of a bare <{{name}}> element." },
  },
  create(context) {
    if (wrapperFile(context.filename)) return {};
    return {
      Program(node) {
        const tokens = context.sourceCode.getTokens(node);
        for (let index = 0; index < tokens.length - 1; index += 1) {
          const token = tokens[index];
          const name = tokens[index + 1];
          if (token?.value === "<" && name && nativeControls.has(name.value)) {
            context.report({ node, loc: name.loc, messageId: "forbidden", data: { name: name.value } });
          }
        }
      },
    };
  },
};
