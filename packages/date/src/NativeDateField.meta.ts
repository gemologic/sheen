import { defineMeta } from "@gemologic/sheen/metadata";
import type { NativeDateFieldProps } from "./native.tsx";

export default defineMeta<NativeDateFieldProps>({
  name: "NativeDateField", package: "@gemologic/sheen-date", category: "date and time", summary: "A lightweight Sheen-styled native date input with a CalendarDate value and an ISO form projection.",
  props: {
    label: { description: "Required visible field label." }, value: { description: "App-owned Sheen CalendarDate, or null." }, defaultValue: { description: "Initial uncontrolled value, restored on form reset." },
    onValueChange: { description: "Receives complete valid dates and explicit clearing; partial native input is never published." },
    minValue: { description: "Minimum valid date, applied as the native min." }, maxValue: { description: "Maximum valid date, applied as the native max." },
    name: { description: "Form field name for the YYYY-MM-DD projection." }, form: { description: "Optional external form owner." }, description: { description: "Associated supporting text." },
    error: { description: "Associated app validation error; marks the input invalid." }, required: { description: "Native required validation.", default: false },
    disabled: { description: "Disables editing and form projection.", default: false }, readOnly: { description: "Retains focus and the submitted value while rejecting edits.", default: false },
  },
  tokens: ["--sheen-color-border-control", "--sheen-color-bg-inset", "--sheen-color-danger-border", "--sheen-color-focus-ring"],
  a11y: { role: "native date input", keyboard: ["Tab", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "numeric keys", "Alt+ArrowDown"] },
  examples: [{ title: "Invoice date", code: '<NativeDateField label="Invoice date" name="invoiceDate" defaultValue={createCalendarDate(2026, 9, 8)} />' }],
  guidance: { do: ["Use when bundle size matters more than locale-ordered segments, calendars, or presets.", "Submit the ISO projection rather than reading the rendered value."], dont: ["Do not expect a locale or calendar prop; the browser formats native date inputs."] },
});
