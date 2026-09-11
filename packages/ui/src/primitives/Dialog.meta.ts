import { defineMeta } from "../metadata.ts";
import type { DialogProps } from "./Dialog.tsx";

export default defineMeta<DialogProps>({
  name: "Dialog", package: "@gemologic/sheen", category: "overlays", summary: "Opens a scoped modal with a focus trap and focus restoration.",
  props: {
    title: { description: "Accessible dialog title.", control: { kind: "text" } },
    contentId: { description: "Optional stable content element ID for an external aria-controls relationship. Must be unique in the document." },
    trigger: { description: "Visible label for the opening button.", control: { kind: "text" } },
    description: { description: "Optional explanatory text associated with the dialog.", control: { kind: "text" } },
    open: { description: "Controlled open state; rejected close requests retain the modal." },
    defaultOpen: { description: "Uncontrolled initial open state; portal content mounts when the theme target is ready.", default: false },
    onOpenChange: { description: "Requests a change in open state without mutating controlled ownership." },
    dismissible: { description: "Allows Escape, outside press, and the close action; false disables all three.", default: true },
    closeLabel: { description: "Visible and accessible close-action label; defaults to the scoped close message." },
    initialFocus: { description: "Resolves an enabled focus target inside the mounted dialog." },
    returnFocus: { description: "Optional surviving focus target after closing, useful for triggerless dialogs." },
    shortcutScope: { description: "Unique modal shortcut scope ID, defaulting to an internal stable ID. Within ShortcutProvider, opening suspends outer scopes automatically. Register modal actions under this ID; do not reuse an application/global scope." },
    class: { description: "Additional classes on modal content." },
    footer: { description: "App-owned footer actions beside the built-in close action." },
  },
  tokens: ["--sheen-color-bg-raised", "--sheen-color-bg-overlay", "--sheen-elevation-modal"],
  a11y: { role: "dialog", keyboard: ["Tab", "Shift+Tab", "Escape"] },
  examples: [{ title: "Scoped modal", code: '<Dialog title="Workspace settings" trigger="Open settings"><Input label="Name" /></Dialog>' }],
  guidance: { do: ["Mount inside the theme scope whose colors the overlay should inherit."], dont: ["Do not portal overlays to document.body."] },
});
