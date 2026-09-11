import { defineMeta } from "../metadata.ts";
import type { CheckboxGroupProps } from "./CheckboxGroup.tsx";

export default defineMeta<CheckboxGroupProps>({
  name: "CheckboxGroup", package: "@gemologic/sheen", category: "forms", summary: "A native fieldset of independent choices with shared selection ownership.",
  props: {
    label: { description: "Required visible group legend.", control: { kind: "text" } },
    options: { description: "Options keyed by unique value; replacing objects or reordering retains surviving controls." },
    value: { description: "App-owned selected values; reset does not change them unless the app does." },
    defaultValue: { description: "Captured uncontrolled initial selection restored by uncanceled reset." },
    onValueChange: { description: "Receives a fresh deduplicated selection array on changes." },
    description: { description: "Supporting instructions associated with the fieldset." },
    error: { description: "Group validation message; marks the fieldset invalid without moving focus." },
    readOnly: { description: "Prevents option changes while retaining focus and form values.", default: false },
  },
  tokens: ["--sheen-space-block-sm", "--sheen-color-fg-muted", "--sheen-color-danger-fg"],
  a11y: { role: "group", keyboard: ["Tab", "Shift+Tab", "Space"] },
  examples: [{ title: "Alert channels", code: '<CheckboxGroup label="Alert channels" name="channels" options={[{ value: "email", label: "Email" }, { value: "desktop", label: "Desktop" }]} defaultValue={["email"]} />' }],
  guidance: { do: ["Use unique stable values and short group legends.", "Validate minimum selections in the app and provide a group error."], dont: ["Do not mark every checkbox required to require at least one selection."] },
});
