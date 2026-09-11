import { literalRule } from "../literal-rule.js";

export const noDocumentScroll = literalRule({
  description: "Keep document scrolling out of desktop application shells.",
  pattern: /(?:^|\s)(?:overflow-y-auto|min-h-screen)(?=\s|$)/u,
  message: "Use AppShell for the fixed viewport and ScrollArea for an explicitly constrained scrolling pane.",
});
