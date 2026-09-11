import type { Rule } from "eslint";

const iconTagPattern = /<(?:Icon|[A-Z][A-Za-z0-9]*Icon)\b[^>]*\/?>/gu;
const iconOnlyButtonPattern = /<Button\b[^>]*>\s*<(?:Icon|[A-Z][A-Za-z0-9]*Icon)\b[^>]*\/>\s*<\/Button>/gu;
const tooltipPattern = /<Tooltip\b[^>]*>[\s\S]*?<\/Tooltip>/gu;

function hasAttribute(tag: string, name: string): boolean {
  return new RegExp(`\\s${name}(?:\\s*=|\\s|/?>)`, "u").test(tag);
}

function emptyLabel(tag: string): boolean {
  return /\slabel\s*=\s*(?:["']\s*["']|\{\s*["']\s*["']\s*\})/u.test(tag);
}

function meaningful(tag: string): boolean {
  return /\sdecorative\s*=\s*\{\s*false\s*\}/u.test(tag);
}

function insideTooltip(index: number, source: string): boolean {
  for (const match of source.matchAll(tooltipPattern)) {
    if (match.index <= index && index < match.index + match[0].length) return true;
  }
  return false;
}

export const requireIconLabel: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: { description: "Require meaningful icons and icon-only actions to have visible tooltip-backed labels." },
    schema: [],
    messages: {
      icon: "A meaningful icon requires a nonempty label.",
      button: "Use IconButton with a nonempty label, or wrap the icon-only Button in Tooltip.",
    },
  },
  create(context) {
    return {
      Program(node) {
        const source = context.sourceCode.getText(node);
        for (const match of source.matchAll(iconTagPattern)) {
          const tag = match[0];
          if (meaningful(tag) && (!hasAttribute(tag, "label") || emptyLabel(tag))) context.report({ node, messageId: "icon" });
        }
        for (const match of source.matchAll(/<IconButton\b[^>]*>/gu)) {
          if (!hasAttribute(match[0], "label") || emptyLabel(match[0])) context.report({ node, messageId: "button" });
        }
        for (const match of source.matchAll(iconOnlyButtonPattern)) {
          if (!insideTooltip(match.index, source)) context.report({ node, messageId: "button" });
        }
      },
    };
  },
};
