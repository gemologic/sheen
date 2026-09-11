import { defineMeta } from "../metadata.ts";
import type { SliderProps } from "./Slider.tsx";

export default defineMeta<SliderProps>({
  name: "Slider", package: "@gemologic/sheen", category: "forms", summary: "A single-value accessible slider with scoped locale formatting and native range input semantics.",
  props: {
    id: { description: "Root ID used to derive stable control and message IDs." },
    class: { description: "Additional root class merged with Sheen styles." },
    label: { description: "Required visible label.", control: { kind: "text" } },
    value: { description: "Controlled finite value within the configured range." },
    defaultValue: { description: "Initial uncontrolled value; defaults to min." },
    onValueChange: { description: "Receives each accepted pointer or keyboard value." },
    onValueChangeEnd: { description: "Receives the accepted value at interaction end." },
    min: { description: "Finite inclusive lower bound.", default: 0 },
    max: { description: "Finite inclusive upper bound.", default: 100 },
    step: { description: "Positive finite increment.", default: 1 },
    formatOptions: { description: "Intl number options evaluated with the effective scoped locale." },
    name: { description: "Native range-input form name." },
    form: { description: "ID of a form outside the component ancestry." },
    description: { description: "Supporting text associated with the thumb." },
    error: { description: "Validation text that marks the slider invalid." },
    disabled: { description: "Disables pointer, keyboard, and form interaction.", default: false },
    readOnly: { description: "Prevents changes while retaining focus.", default: false },
    required: { description: "Marks the native range input required.", default: false },
    orientation: { description: "Horizontal or vertical physical orientation.", default: "horizontal", control: { kind: "select", values: ["horizontal", "vertical"] } },
    inverted: { description: "Reverses the physical direction without changing numeric order.", default: false },
  },
  tokens: ["--sheen-color-bg-inset", "--sheen-color-border-control", "--sheen-color-accent", "--sheen-color-focus-ring"],
  a11y: { role: "slider", keyboard: ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End"] },
  examples: [{ title: "Percent threshold", code: '<Slider label="Alert threshold" defaultValue={0.75} formatOptions={{ style: "percent", maximumFractionDigits: 0 }} min={0} max={1} step={0.05} />' }],
  guidance: { do: ["Use a NumberField when exact entry matters more than spatial adjustment."], dont: ["Do not use a slider for an unbounded or highly precise value."] },
});
