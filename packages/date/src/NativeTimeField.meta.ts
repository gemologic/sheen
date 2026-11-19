import { defineMeta } from "@gemologic/sheen/metadata";
import type { NativeTimeFieldProps } from "./native.tsx";

export default defineMeta<NativeTimeFieldProps>({
  name: "NativeTimeField", package: "@gemologic/sheen-date", category: "date and time", summary: "A lightweight Sheen-styled native time input with a wall-clock Time value and an ISO form projection.",
  props: {
    label: { description: "Required visible field label." }, value: { description: "App-owned Sheen Time, or null." }, defaultValue: { description: "Initial uncontrolled value, restored on form reset." },
    onValueChange: { description: "Receives complete valid times and explicit clearing; partial native input is never published." },
    minValue: { description: "Minimum valid time, applied as the native min." }, maxValue: { description: "Maximum valid time, applied as the native max." },
    granularity: { description: "Smallest native segment; second sets step=1.", default: "minute", control: { kind: "select", values: ["minute", "second"] } },
    name: { description: "Form field name for the HH:mm:ss.SSS projection." }, form: { description: "Optional external form owner." }, description: { description: "Associated supporting text." },
    error: { description: "Associated app validation error; marks the input invalid." }, required: { description: "Native required validation.", default: false },
    disabled: { description: "Disables editing and form projection.", default: false }, readOnly: { description: "Retains focus and the submitted value while rejecting edits.", default: false },
  },
  tokens: ["--sheen-color-border-control", "--sheen-color-bg-inset", "--sheen-color-danger-border", "--sheen-color-focus-ring"],
  a11y: { role: "native time input", keyboard: ["Tab", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "numeric keys"] },
  examples: [{ title: "Daily cutoff", code: '<NativeTimeField label="Daily cutoff" name="cutoff" defaultValue={createTime(17, 30)} />' }],
  guidance: { do: ["Use for wall-clock times with no date or zone."], dont: ["Do not use an hour cycle prop; the browser chooses the native presentation."] },
});
