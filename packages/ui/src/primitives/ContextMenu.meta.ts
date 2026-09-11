import { defineMeta } from "../metadata.ts";
import type { ContextMenuProps } from "./ContextMenu.tsx";

export default defineMeta<ContextMenuProps>({
  name: "ContextMenu", package: "@gemologic/sheen", category: "overlays", summary: "Adds a scope-aware action menu without suppressing the native menu when no replacement is available.",
  props: {
    as: { description: "Native div, li, or table-row trigger retained in the document.", default: "div" },
    items: { description: "Validated action, checkbox, radio, separator, and submenu definitions shared with DropdownMenu." },
    disabled: { description: "Leaves the platform context menu available and prevents long-press replacement.", default: false },
    onOpenChange: { description: "Receives requested open-state changes." },
    menuClass: { description: "Additional class on the portaled menu surface." },
    children: { description: "Content of the native trigger element." },
  },
  tokens: ["--sheen-color-bg-raised", "--sheen-color-focus-ring", "--sheen-elevation-overlay"],
  a11y: { role: "menu and native trigger semantics", keyboard: ["Shift+F10", "ContextMenu", "ArrowUp", "ArrowDown", "Home", "End", "Enter", "Space", "Escape"] },
  examples: [{ title: "Row actions", code: '<ContextMenu as="div" items={[{ kind: "action", id: "open", label: "Open", onSelect: () => {} }]}>Account A</ContextMenu>' }],
  guidance: {
    do: ["Use the same action source as the visible overflow or selection controls.", "Disable or omit empty replacements so the native browser menu remains available."],
    dont: ["Do not suppress contextmenu without opening an equivalent accessible menu.", "Do not make right-click the only way to reach an action."],
  },
});
