import { defineMeta } from "../metadata.ts";
import type { ShortcutSheetProps } from "./ShortcutSheet.tsx";
import dialog from "./Dialog.meta.ts";
export default defineMeta<ShortcutSheetProps>({
  name: "ShortcutSheet", package: "@gemologic/sheen", category: "application", summary: "Generated modal inventory of registered shortcuts, grouped by their application labels.",
  props: dialog.props,
  tokens: ["--sheen-space-block-sm", "--sheen-space-inline-sm"],
  a11y: { role: "dialog", keyboard: ["Tab", "Shift+Tab", "Escape"] },
  examples: [{ title: "Discoverable keyboard help", code: '<ShortcutProvider platform="other" development={true}><ShortcutSheet title="Keyboard shortcuts" trigger="Keyboard shortcuts" /></ShortcutProvider>' }],
  guidance: { do: ["Mount inside ThemeProvider and ShortcutProvider.", "Provide a visible trigger even when question-mark opening is enabled.", "Let Dialog suspend outer scopes; use a unique shortcutScope for any sheet-specific bindings."], dont: ["Do not assume this inventory implies every scope is active.", "Do not treat displayed shortcuts as the only means of executing an action."] },
});
