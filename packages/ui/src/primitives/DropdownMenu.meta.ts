import { defineMeta } from "../metadata.ts";
import type { DropdownMenuProps } from "./DropdownMenu.tsx";
export default defineMeta<DropdownMenuProps>({
  name: "DropdownMenu", package: "@gemologic/sheen", category: "overlays", summary: "A scoped action menu with nested, checkbox, and radio items.",
  props: {
    trigger: { description: "Visible native opening-button content. It must provide a clear accessible name." },
    triggerLabel: { description: "Optional explicit accessible trigger name for icon-only or composite content." },
    items: { description: "Sheen-owned discriminated items with stable, unique sibling IDs. Labeled items may include a lazy decorative icon renderer; checkbox and radio values are app-owned; shortcuts are display-only." },
    open: { description: "App-owned open state." },
    defaultOpen: { description: "Uncontrolled initial state; content mounts when the scoped portal is ready.", default: false },
    onOpenChange: { description: "Open-state requests; controlled owners may reject them." },
    onCloseAutoFocus: { description: "Close-focus lifecycle event. Prevent default only when supplying an alternative focus destination; layouts may use it to defer moving the trigger until restoration." },
    disabled: { description: "Disable the opening button.", default: false },
    placement: { description: "Logical menu placement. Sidebar footers normally use top-end; topbars use bottom-end.", default: "bottom-start" },
    matchTriggerWidth: { description: "Size the root menu to the trigger width, capped by the available viewport width.", default: false },
    class: { description: "Additional root menu content classes." },
  },
  tokens: ["--sheen-color-bg-raised", "--sheen-color-focus-ring", "--sheen-elevation-overlay"],
  a11y: { role: "menu", keyboard: ["Enter", "Space", "ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight", "Home", "End", "Escape"] },
  examples: [{ title: "Workspace actions", code: '<DropdownMenu trigger="Workspace actions" matchTriggerWidth items={[{ kind: "action", id: "refresh", label: "Refresh", icon: () => <span aria-hidden="true">↻</span>, onSelect: () => {} }]} />' }],
  guidance: { do: ["Keep item IDs stable across data refreshes.", "Keep checkbox and radio state in the app."], dont: ["Do not put form fields or arbitrary interactive content in an ARIA menu.", "Do not use action items for URL navigation."] },
});
