import type { Rule } from "eslint";

export interface LiteralRuleOptions {
  readonly description: string;
  readonly pattern: RegExp;
  readonly message: string;
  readonly allowFile?: (filename: string) => boolean;
}

export function themeDefinitionFile(filename: string): boolean {
  const normalized = filename.replaceAll("\\", "/");
  return normalized.includes("/packages/tokens/") || normalized.includes("/src/themes/") || /\.theme\.[cm]?[jt]sx?$/u.test(normalized);
}

export function literalRule(options: LiteralRuleOptions): Rule.RuleModule {
  return {
    meta: {
      type: "problem",
      docs: { description: options.description },
      schema: [],
      messages: { forbidden: options.message },
    },
    create(context) {
      if (options.allowFile?.(context.filename)) return {};
      const inspect = (node: Rule.Node, value: string): void => {
        if (options.pattern.test(value)) context.report({ node, messageId: "forbidden" });
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
}
