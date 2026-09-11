import { defineMeta } from "@gemologic/sheen/metadata";
import type { TimeFieldProps } from "./TimeField.tsx";

export default defineMeta<TimeFieldProps>({
  name: "TimeField", package: "@gemologic/sheen-date", category: "date and time", summary: "A locale-ordered segmented wall-clock editor with a timezone-free ISO projection.",
  props: {
    label: { description: "Required visible field label." }, value: { description: "App-owned Sheen Time, or null." }, defaultValue: { description: "Initial uncontrolled wall time." }, onValueChange: { description: "Receives complete valid wall times and clearing." }, placeholderValue: { description: "Deterministic values shown behind empty segments." }, minValue: { description: "Minimum wall time." }, maxValue: { description: "Maximum wall time." }, locale: { description: "Explicit BCP 47 locale, defaulting to theme context." }, hourCycle: { description: "Explicit 12- or 24-hour cycle; omission follows the locale.", control: { kind: "select", values: [12, 24] } }, granularity: { description: "Smallest editable unit.", default: "minute", control: { kind: "select", values: ["minute", "second"] } }, name: { description: "Native form name for HH:mm:ss.SSS." }, form: { description: "Optional external form owner." }, description: { description: "Associated instructions." }, error: { description: "Associated app validation error." }, required: { description: "Marks the editor required.", default: false }, disabled: { description: "Disables editing and projection.", default: false }, readOnly: { description: "Retains focus while rejecting edits.", default: false },
  },
  tokens: ["--sheen-color-border-control", "--sheen-color-bg-inset", "--sheen-color-focus-ring"],
  a11y: { role: "group of spinbuttons", keyboard: ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", "numeric keys"] },
  examples: [{ title: "Cutoff time", code: '<TimeField label="Cutoff time" name="cutoff" defaultValue={createTime(16, 30)} />' }],
  guidance: { do: ["Keep a wall-clock Time separate from the zone that gives it an instant."], dont: ["Do not anchor a standalone Time to the browser's current date."] },
});
