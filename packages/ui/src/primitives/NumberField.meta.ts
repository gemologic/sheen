import { defineMeta } from "../metadata.ts";
import type { NumberFieldProps } from "./NumberField.tsx";

export default defineMeta<NumberFieldProps>({
  name: "NumberField", package: "@gemologic/sheen", category: "forms", summary: "A locale-aware spinbutton with numeric app state, step controls, and native form submission.",
  props: {
    id: { description: "Root ID used to derive stable control and message IDs." },
    class: { description: "Additional root class merged with Sheen styles." },
    label: { description: "Required visible label.", control: { kind: "text" } },
    value: { description: "Controlled numeric value; null presents an empty field." },
    defaultValue: { description: "Initial uncontrolled numeric value; null starts empty." },
    onValueChange: { description: "Receives a finite number, or null for an empty/partial value." },
    min: { description: "Finite inclusive lower bound." },
    max: { description: "Finite inclusive upper bound." },
    step: { description: "Positive finite arrow and trigger increment.", default: 1 },
    largeStep: { description: "Positive finite Page Up and Page Down increment; defaults to ten steps." },
    formatOptions: { description: "Intl number options evaluated with the effective scoped locale." },
    name: { description: "Native hidden-input form name." },
    form: { description: "ID of a form outside the component ancestry." },
    description: { description: "Supporting text associated with the spinbutton." },
    error: { description: "Validation text that marks the field invalid." },
    disabled: { description: "Disables input, triggers, focus, and submission.", default: false },
    readOnly: { description: "Prevents edits while retaining focus and submission.", default: false },
    required: { description: "Marks the native field required.", default: false },
    inputRef: { description: "Receives the visible native input." },
  },
  tokens: ["--sheen-color-bg-inset", "--sheen-color-border-control", "--sheen-color-focus-ring", "--sheen-control-h-md"],
  a11y: { role: "spinbutton", keyboard: ["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End"] },
  examples: [{ title: "Localized amount", code: '<NumberField label="Budget" defaultValue={1250.5} min={0} step={0.5} formatOptions={{ style: "currency", currency: "USD" }} name="budget" />' }],
  guidance: { do: ["Keep app state numeric and let the scoped locale format the display."], dont: ["Do not parse the formatted visible input in form submit handlers; use the hidden raw value."] },
});
