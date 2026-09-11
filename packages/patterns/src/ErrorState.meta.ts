import { defineMeta } from "@gemologic/sheen/metadata";
import type { ErrorStateProps } from "./ErrorState.tsx";
export default defineMeta<ErrorStateProps>({
  name: "ErrorState", package: "@gemologic/sheen-patterns", category: "application", summary: "A regional error presentation with app-owned retry and safe rejection feedback.",
  props: {
    kind: { description: "Not-found, server, or permission-denied presentation; defaults to server." },
    title: { description: "Nonempty visible region name; defaults to the scoped message for the error kind." },
    headingLevel: { description: "Semantic heading level, default 2; visual heading size stays compact." },
    description: { description: "App-localized safe explanation. Do not pass secrets or raw transport errors." },
    onRetry: { description: "Optional app-owned retry callback. Concurrent attempts are suppressed; rejection shows a scoped generic message. Success does not remove the region." },
  },
  tokens: ["--sheen-color-border", "--sheen-color-fg-muted", "--sheen-space-block-sm"],
  a11y: { role: "region, status", keyboard: ["Tab", "Shift+Tab", "Enter", "Space"] },
  examples: [{ title: "Permission boundary", code: '<ErrorState kind="permission-denied" description="Ask your workspace administrator for access." />' }],
  guidance: { do: ["Keep authorized existing content mounted beside a refresh error.", "Let the app own retry requests and region dismissal."], dont: ["Do not retain unauthorized content after a permission change.", "Do not expose raw exception messages.", "Do not offer retry when the app has no meaningful retry action."] },
});
