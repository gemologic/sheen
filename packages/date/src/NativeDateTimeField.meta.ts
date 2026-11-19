import { defineMeta } from "@gemologic/sheen/metadata";
import type { NativeDateTimeFieldProps } from "./native.tsx";

export default defineMeta<NativeDateTimeFieldProps>({
  name: "NativeDateTimeField", package: "@gemologic/sheen-date", category: "date and time", summary: "A lightweight native datetime-local input that enters wall time in an explicit IANA zone and commits a DateTime instant.",
  props: {
    label: { description: "Required visible field label." }, value: { description: "App-owned Sheen DateTime instant, or null; displayed as wall time in timeZone." }, defaultValue: { description: "Initial uncontrolled instant, restored on form reset." },
    onValueChange: { description: "Receives exact or explicitly disambiguated instants and clearing." }, onResolution: { description: "Observes every exact, ambiguous, or nonexistent wall-time resolution." },
    timeZone: { description: "Required IANA zone in which the wall time is entered, displayed, and resolved. Never inferred from the browser." },
    disambiguation: { description: "Policy for repeated or skipped local times; reject keeps the previous value and offers both instants.", default: "reject", control: { kind: "select", values: ["reject", "earlier", "later", "compatible"] } },
    granularity: { description: "Smallest native segment; second sets step=1.", default: "minute", control: { kind: "select", values: ["minute", "second"] } },
    locale: { description: "Explicit BCP 47 locale for the DST choice labels, defaulting to theme context." },
    minValue: { description: "Minimum valid instant, applied as native min wall time in timeZone." }, maxValue: { description: "Maximum valid instant, applied as native max wall time in timeZone." },
    name: { description: "Form field name for the ISO instant with bracketed IANA zone." }, form: { description: "Optional external form owner." }, description: { description: "Associated supporting text." },
    error: { description: "Associated app validation error; marks the input invalid." }, required: { description: "Native required validation.", default: false },
    disabled: { description: "Disables editing and form projection.", default: false }, readOnly: { description: "Retains focus and the submitted value while rejecting edits.", default: false },
  },
  tokens: ["--sheen-color-border-control", "--sheen-color-bg-inset", "--sheen-color-danger-border", "--sheen-color-warning-border", "--sheen-color-focus-ring"],
  a11y: { role: "native datetime-local input, alert for DST choices", keyboard: ["Tab", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "numeric keys", "Enter", "Space"] },
  examples: [{ title: "Maintenance start", code: '<NativeDateTimeField label="Maintenance start" name="startsAt" timeZone={createTimeZone("America/New_York")} defaultValue={createDateTime(1788897600000, createTimeZone("UTC"))} />' }],
  guidance: { do: ["Pass the zone the user means; show it in the label or description.", "Keep reject when repeated or skipped local times must be chosen explicitly."], dont: ["Do not substitute the browser timezone or submit the zone-less native value."] },
});
