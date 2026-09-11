import { defineMeta } from "../metadata.ts";
import type { ShortcutPendingProps } from "./ShortcutPending.tsx";
export default defineMeta<ShortcutPendingProps>({
  name: "ShortcutPending", package: "@gemologic/sheen", category: "application", summary: "Persistent single-line live status for pending shortcut sequences.",
  props: { label: { description: "Accessible status name, defaulting to the scoped pendingShortcut message." } },
  tokens: ["--sheen-control-h-sm", "--sheen-color-fg-muted", "--sheen-text-ui-size"],
  a11y: { role: "status", keyboard: [] },
  examples: [{ title: "Sequence feedback", code: '<ShortcutProvider platform="other" development={true}><ShortcutPending /></ShortcutProvider>' }],
  guidance: { do: ["Mount one instance in a persistent status or toolbar slot inside both providers.", "Keep its inline size constrained by the surrounding layout."], dont: ["Do not conditionally mount the live region only after a prefix.", "Do not rely on one-second feedback as the only way to discover actions; retain the shortcut sheet."] },
});
