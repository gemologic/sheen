import { defineMeta } from "../metadata.ts";
import type { ShortcutScopeProps } from "./ShortcutScope.tsx";
export default defineMeta<ShortcutScopeProps>({
  name: "ShortcutScope", package: "@gemologic/sheen", category: "application", summary: "DOM-bound view or pane scope activated by keyboard focus in its descendants.",
  props: { scope: { description: "Required unique non-global ID matching useShortcut registrations. Changes release the old scope and cancel pending input." } },
  tokens: [],
  a11y: { role: "none by default", keyboard: ["Descendant keyboard events activate the innermost scope"] },
  examples: [{ title: "Inspector pane", code: '<ShortcutProvider development={true}><ShortcutScope scope="inspector"><Button>Inspect</Button></ShortcutScope></ShortcutProvider>' }],
  guidance: { do: ["Use distinct IDs for simultaneously mounted panes/views.", "Place controls inside the native scope boundary; it adds no tab stop or layout styling."], dont: ["Do not assume portalled children retain DOM focus ancestry.", "Do not use global as a scoped ID; open dialogs suspend focus scopes."] },
});
