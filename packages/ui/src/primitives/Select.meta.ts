import { defineMeta } from "../metadata.ts";
import type { SelectProps } from "./Select.tsx";

export default defineMeta<SelectProps>({
  name: "Select", package: "@gemologic/sheen", category: "forms", summary: "A single choice with a scope-aware listbox and native form participation.",
  props: {
    label: { description: "Required visible label.", control: { kind: "text" } },
    options: { description: "Options keyed by unique nonempty strings, with labels, descriptions, and disabled flags." },
    value: { description: "App-owned value; null explicitly clears selection." },
    defaultValue: { description: "Captured uncontrolled default restored by uncanceled form reset." },
    onValueChange: { description: "Requested value changes; controlled owners may accept or reject." },
    name: { description: "Native form field name; unnamed selects do not submit." },
    form: { description: "Optional external form ID, associated with the trigger and native select." },
    placeholder: { description: "Empty-selection text, defaulting to the localized selectOption message." },
    description: { description: "Supporting instructions associated with the trigger." },
    error: { description: "Associated error text and invalid state, without automatic announcements." },
    disabled: { description: "Prevents interaction and submission.", default: false },
    readOnly: { description: "Allows inspection but rejects selection changes.", default: false },
    required: { description: "Requires a nonempty selection for native form submission.", default: false },
  },
  tokens: ["--sheen-color-border-control", "--sheen-color-bg-raised", "--sheen-color-focus-ring"],
  a11y: { role: "button", keyboard: ["Tab", "Space", "Enter", "Arrow keys", "Home", "End", "Escape", "Typeahead"] },
  examples: [{ title: "Refresh cadence", code: '<Select label="Cadence" name="cadence" options={[{ value: "live", label: "Live" }, { value: "manual", label: "Manual" }]} defaultValue="live" />' }],
  guidance: { do: ["Keep option values stable across refreshes."], dont: ["Do not use Select as an editable autocomplete."] },
});
