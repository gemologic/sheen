import { defineMeta } from "../metadata.ts";
import type { SearchInputProps } from "./SearchInput.tsx";

export default defineMeta<SearchInputProps>({
  name: "SearchInput", package: "@gemologic/sheen", category: "forms", summary: "Labeled search input with a localized clear action.",
  props: {
    label: { description: "Required visible label.", control: { kind: "text" } },
    description: { description: "Associated search instructions.", control: { kind: "text" } },
    error: { description: "App-owned validation message.", control: { kind: "text" } },
    value: { description: "Controlled query. When supplied, the parent must accept changes through onValueChange. An active IME draft remains locally visible until composition ends.", control: { kind: "text" } },
    defaultValue: { description: "Initial uncontrolled query and native form-reset target, ignored when value is supplied.", control: { kind: "text" } },
    onValueChange: { description: "Receives input and clear edits synchronously, including composition input, and changed uncontrolled values after an uncanceled form reset. No fetching or debounce is performed." },
    clearLabel: { description: "Override the localized clear-search action label.", control: { kind: "text" } },
    shortcut: { description: "Optional typed shortcut registration that focuses the input when a ShortcutProvider is present." },
  },
  tokens: ["--sheen-color-bg-inset", "--sheen-color-border-control", "--sheen-control-h-md"],
  a11y: { role: "searchbox plus a native clear button", keyboard: ["Native text editing", "Tab to clear action", "Enter or Space clears and restores input focus"] },
  examples: [{ title: "Search orders", code: '<SearchInput label="Search orders" defaultValue="BTC" />' }],
  guidance: { do: ["Own requests, debounce, composition-aware search scheduling, and stale-result handling in the app.", "Keep existing results visible during query refresh. Use native onInput for detailed input/composition events."], dont: ["Do not treat this as an autocomplete or results popup.", "Do not switch between controlled and uncontrolled ownership during the control's lifetime."] },
});
