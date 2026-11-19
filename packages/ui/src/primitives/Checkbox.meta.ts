import { defineMeta } from "../metadata.ts";
import type { CheckboxProps } from "./Checkbox.tsx";

export default defineMeta<CheckboxProps>({
  name: "Checkbox", package: "@gemologic/sheen", category: "forms", summary: "A labeled native checkbox with controlled, uncontrolled, and mixed presentation.",
  props: {
    id: { description: "Root container ID, also used to derive stable internal IDs." },
    ref: { description: "Root container reference; use inputRef for the native input." },
    onPointerDown: { description: "Native root pointer-down handler, composed with primitive focus behavior." },
    label: { description: "Visible label. Supply exactly one of label, aria-label, or aria-labelledby.", control: { kind: "text" } },
    "aria-label": { description: "Accessible name on the native input when no visible label fits, such as a table row selector." },
    "aria-labelledby": { description: "ID of existing visible text, such as a row header, that names the native input." },
    description: { description: "Supporting text associated with the native input." },
    error: { description: "Associated validation error; marks the input invalid without moving focus." },
    checked: { description: "App-owned checked value, retained across form reset unless the app changes it.", control: { kind: "boolean" } },
    defaultChecked: { description: "Initial uncontrolled checked value restored on form reset.", default: false },
    indeterminate: { description: "App-owned mixed presentation; clear it explicitly when resolving a partial selection.", default: false },
    onCheckedChange: { description: "Receives requested checked changes, not a DOM event." },
    disabled: { description: "Disables activation, keyboard focus, and form submission.", default: false },
    readOnly: { description: "Prevents changes while retaining focus and submission.", default: false },
    required: { description: "Requires this checkbox to be checked for native form validation.", default: false },
    name: { description: "Native form field name; omitted or empty names are not submitted." },
    form: { description: "ID of an owning form outside the input's ancestry; forwarded to the native input." },
    value: { description: "Submitted value when checked.", default: "on" },
    inputRef: { description: "Receives the native input; ref and remaining DOM props belong to the root container." },
  },
  tokens: ["--sheen-color-border-control", "--sheen-color-accent", "--sheen-color-focus-ring", "--sheen-icon-size-md"],
  a11y: { role: "checkbox", keyboard: ["Tab", "Shift+Tab", "Space"] },
  examples: [
    { title: "Opt in", code: '<Checkbox label="Receive alerts" name="alerts" description="Send alerts for this workspace." />' },
    { title: "Table row selector", code: '<Checkbox aria-label="Select invoice 1042" name="selected" value="1042" />' },
  ],
  guidance: { do: ["Use mixed state for partial selections and update it explicitly.", "Use aria-label or aria-labelledby only where a visible label would repeat nearby text."], dont: ["Do not use a checkbox for an immediate on/off setting that needs switch semantics."] },
});
