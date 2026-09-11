import { defineMeta } from "../metadata.ts";
import type { ShortcutProviderProps } from "./ShortcutProvider.tsx";
export default defineMeta<ShortcutProviderProps>({
  name: "ShortcutProvider", package: "@gemologic/sheen", category: "application", summary: "Owner-scoped chord and sequence dispatcher with usePendingShortcut feedback.",
  props: {
    children: { description: "Owned application content; one provider per document, no nested providers." },
    platform: { description: "Optional mac/other override, read at construction. When omitted, resolve navigator.platform on mount before registering bindings. SSR and initial hydration expose an empty inventory, never provisional wrong-platform bindings." },
    development: { description: "Required collision policy, read at construction: development throws, production warns and uses last registration." },
    activeScopes: { description: "Reactive outer-to-inner base scope IDs; default global. Focused ShortcutScope boundaries append outer-to-inner scopes. Open sheen dialogs override both with the newest active modal scope. Changes cancel pending sequences; non-sheen overlays must still manage their own isolation." },
    characterShortcuts: { description: "Allow character-only single keys and sequences, default true. Wire to a user-facing preference. False retains bindings requiring Ctrl, Meta, Alt, or a non-character key. Changes cancel pending input; the app owns persistence." },
    onError: { description: "Reports synchronous failures and async rejections while their registration is alive. Matched defaults are prevented before execution. Disposed registrations consume late rejections without notifying a new owner. Without a handler, live errors are rethrown in a microtask." },
  },
  tokens: [],
  a11y: { role: "none", keyboard: ["Registered chords"] },
  examples: [{ title: "Keyboard owner", code: '<ShortcutProvider development={true}><p>Workspace</p></ShortcutProvider>' }],
  guidance: { do: ["Use useShortcut inside an owned child component.", "Keep platform and development configuration stable for the provider lifetime."], dont: ["Do not infer backend or modal state from this provider.", "Do not register reserved browser shortcuts or assume disposal cancels application transport."] },
});
