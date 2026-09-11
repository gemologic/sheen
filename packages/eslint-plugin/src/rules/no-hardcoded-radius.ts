import type { Rule } from "eslint";
import { literalRule } from "../literal-rule.js";

const stringRule = literalRule({
  description: "Disallow fixed radius utilities and CSS values outside the Sheen radius roles.",
  pattern: /(?:^|\s)rounded-(?:none|xs|sm|md|lg|xl|2xl|3xl|full)(?:\s|$)|\bborder-radius\s*:(?!\s*var\(--sheen-(?:control|surface|button)-radius\b)\s*[^;}]+/iu,
  message: "Use --sheen-control-radius, --sheen-surface-radius, or a component radius role.",
});

export const noHardcodedRadius: Rule.RuleModule = {
  ...stringRule,
  create(context) {
    return {
      ...stringRule.create(context),
      Property(node) {
        const name = node.key.type === "Identifier" ? node.key.name : node.key.type === "Literal" && typeof node.key.value === "string" ? node.key.value : undefined;
        if (name !== "borderRadius" && name !== "border-radius") return;
        const safe = node.value.type === "Literal" && typeof node.value.value === "string"
          && /var\(--sheen-(?:control|surface|button)-radius\b/u.test(node.value.value);
        if (!safe) context.report({ node, messageId: "forbidden" });
      },
    };
  },
};
