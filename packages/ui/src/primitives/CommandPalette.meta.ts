import { defineMeta } from "../metadata.ts";
import type { CommandPaletteProps } from "./CommandPalette.tsx";

export default defineMeta<CommandPaletteProps>({
  name: "CommandPalette", package: "@gemologic/sheen", category: "overlays", summary: "Searches static, remote and registered shortcut commands with retained refresh results and app-owned recents.",
  props: {
    sources: { description: "Static and abortable remote command sources with stable IDs. Each command may add render functions for a decorative leading icon and trailing content, such as a Kbd hint or Badge, which becomes the option's description; its label remains the accessible name." },
    open: { description: "Controlled open state." },
    defaultOpen: { description: "Initial uncontrolled open state.", default: false },
    onOpenChange: { description: "Receives open-state requests." },
    recents: { description: "Server-known recent IDs plus app-owned persistence." },
    shortcutScope: { description: "Scope where mod+k opens the mounted palette.", default: "global" },
    onSourceError: { description: "Reports a failed remote source without clearing accepted results." },
    onCommandError: { description: "Reports a selected command failure." },
    class: { description: "Additional class on the command root." },
  },
  tokens: ["--sheen-color-bg-raised", "--sheen-color-border", "--sheen-color-bg-selected", "--sheen-elevation-overlay"],
  a11y: { role: "dialog containing a combobox and listbox", keyboard: ["mod+k", "ArrowUp", "ArrowDown", "Enter", "Escape"] },
  examples: [{
    title: "Application commands",
    imports: 'import type { CommandPaletteSource } from "@gemologic/sheen";',
    setup: 'const sources: readonly CommandPaletteSource[] = [{ kind: "static", id: "app", commands: [{ id: "settings", label: "Open settings", group: "Navigation", run: () => {} }] }];',
    code: "<ShortcutProvider development><CommandPalette sources={sources} /></ShortcutProvider>",
  }, {
    title: "Icons and trailing hints",
    imports: 'import type { CommandPaletteSource } from "@gemologic/sheen";',
    setup: 'const sources: readonly CommandPaletteSource[] = [{ kind: "static", id: "app", commands: [{ id: "new-project", label: "Create project", group: "Actions", icon: () => <Glyph name="plus" />, trailing: () => <Badge>New</Badge>, run: () => {} }, { id: "search", label: "Search records", group: "Navigation", icon: () => <Glyph name="search" />, trailing: () => <Kbd>/</Kbd>, run: () => {} }] }];',
    code: "<ShortcutProvider development><CommandPalette sources={sources} /></ShortcutProvider>",
  }],
  guidance: { do: ["Provide stable command IDs and server-known initial remote results.", "Keep trailing text short and supplementary to the label."], dont: ["Do not read recents on mount or blank accepted results during remote search."] },
});
