import { defineMeta } from "../metadata.ts";
import type { RangeSliderProps } from "./Slider.tsx";

export default defineMeta<RangeSliderProps>({
  name: "RangeSlider", package: "@gemologic/sheen", category: "forms", summary: "A two-thumb slider with an ordered tuple contract, minimum separation, and distinct accessible thumb names.",
  props: {
    id: { description: "Root ID used to derive stable control and message IDs." },
    class: { description: "Additional root class merged with Sheen styles." },
    label: { description: "Required visible group label.", control: { kind: "text" } },
    value: { description: "Controlled increasing pair within the configured range." },
    defaultValue: { description: "Initial uncontrolled pair; defaults to min and max." },
    onValueChange: { description: "Receives exactly two ordered values during interaction." },
    onValueChangeEnd: { description: "Receives exactly two ordered values at interaction end." },
    min: { description: "Finite inclusive lower bound.", default: 0 },
    max: { description: "Finite inclusive upper bound.", default: 100 },
    step: { description: "Positive finite increment.", default: 1 },
    minStepsBetweenThumbs: { description: "Nonnegative integer count of required steps between thumbs.", default: 0 },
    formatOptions: { description: "Intl number options evaluated with the effective scoped locale." },
    name: { description: "Shared native form name for the two range inputs." },
    form: { description: "ID of a form outside the component ancestry." },
    description: { description: "Supporting text associated with both thumbs." },
    error: { description: "Validation text that marks the slider invalid." },
    disabled: { description: "Disables pointer, keyboard, and form interaction.", default: false },
    readOnly: { description: "Prevents changes while retaining focus.", default: false },
    required: { description: "Marks both native range inputs required.", default: false },
    orientation: { description: "Horizontal or vertical physical orientation.", default: "horizontal", control: { kind: "select", values: ["horizontal", "vertical"] } },
    inverted: { description: "Reverses the physical direction without changing tuple order.", default: false },
  },
  tokens: ["--sheen-color-bg-inset", "--sheen-color-border-control", "--sheen-color-accent", "--sheen-color-focus-ring"],
  a11y: { role: "slider", keyboard: ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End"] },
  examples: [{ title: "Latency window", code: '<RangeSlider label="Latency window" defaultValue={[20, 80]} min={0} max={100} minStepsBetweenThumbs={5} />' }],
  guidance: { do: ["Give both bounds one clear group label; Sheen supplies distinct minimum and maximum thumb names."], dont: ["Do not use an unordered pair or silently sort invalid app state."] },
});
