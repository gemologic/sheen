import { defineMeta } from "@gemologic/sheen/metadata";
import type { DateFieldProps } from "./DateField.tsx";

export default defineMeta<DateFieldProps>({
  name: "DateField", package: "@gemologic/sheen-date", category: "date and time", summary: "A locale-ordered segmented date editor with an ISO form projection.",
  props: {
    label: { description: "Required visible field label." }, value: { description: "App-owned Sheen CalendarDate, or null." }, defaultValue: { description: "Initial uncontrolled value." },
    onValueChange: { description: "Receives complete valid dates and explicit clearing." }, placeholderValue: { description: "Deterministic values shown behind empty segments." },
    minValue: { description: "Minimum valid date." }, maxValue: { description: "Maximum valid date." }, isDateUnavailable: { description: "Marks committed dates invalid using Sheen values." },
    locale: { description: "Explicit BCP 47 locale, defaulting to theme context." }, calendar: { description: "Optional presentation calendar identifier." },
    name: { description: "Native form field name for YYYY-MM-DD." }, form: { description: "Optional external form owner." }, description: { description: "Associated supporting text." },
    error: { description: "Associated app validation error." }, required: { description: "Marks the segmented editor required.", default: false }, disabled: { description: "Disables editing and form projection.", default: false }, readOnly: { description: "Retains focus while rejecting edits.", default: false },
  },
  tokens: ["--sheen-color-border-control", "--sheen-color-bg-inset", "--sheen-color-focus-ring"],
  a11y: { role: "group of spinbuttons", keyboard: ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", "numeric keys"] },
  examples: [{ title: "Invoice date", code: '<DateField label="Invoice date" name="invoiceDate" defaultValue={createCalendarDate(2026, 9, 8)} />' }],
  guidance: { do: ["Submit the documented ISO projection instead of reading rendered segments."], dont: ["Do not pass JavaScript Date objects."] },
});
