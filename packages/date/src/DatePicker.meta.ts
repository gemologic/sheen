import { defineMeta } from "@gemologic/sheen/metadata";
import type { DatePickerProps } from "./DatePicker.tsx";

export default defineMeta<DatePickerProps>({
  name: "DatePicker", package: "@gemologic/sheen-date", category: "date and time", summary: "A typed date input with a responsive calendar mounted in the nearest theme portal.",
  props: {
    label: { description: "Required visible field label." }, value: { description: "App-owned Sheen CalendarDate, or null." }, defaultValue: { description: "Initial uncontrolled value." }, onValueChange: { description: "Receives complete valid dates and clearing." }, presets: { description: "Deterministic labeled Sheen date shortcuts." },
    minValue: { description: "Earliest selectable date." }, maxValue: { description: "Latest selectable date." }, isDateUnavailable: { description: "Marks dates unavailable with a Sheen value callback." }, defaultVisibleDate: { description: "Deterministic initially visible month." },
    locale: { description: "Explicit BCP 47 locale, defaulting to theme context." }, calendar: { description: "Optional presentation calendar identifier." }, name: { description: "Native form name for YYYY-MM-DD." }, form: { description: "Optional external form owner." },
    description: { description: "Associated instructions." }, error: { description: "Associated app validation error." }, placeholder: { description: "Text input placeholder." }, required: { description: "Marks the picker required.", default: false }, disabled: { description: "Disables input, trigger, and projection.", default: false }, readOnly: { description: "Allows inspection while rejecting changes.", default: false },
  },
  tokens: ["--sheen-color-bg-raised", "--sheen-color-border-control", "--sheen-color-focus-ring"],
  a11y: { role: "textbox and calendar dialog", keyboard: ["Tab", "Enter", "Space", "Escape", "Arrow keys", "PageUp", "PageDown", "Home", "End"] },
  examples: [{ title: "Settlement date", code: '<DatePicker label="Settlement date" name="settlesAt" defaultValue={createCalendarDate(2026, 9, 10)} defaultVisibleDate={createCalendarDate(2026, 9, 1)} />' }],
  guidance: { do: ["Keep the picker inside ThemeProvider so its overlay inherits the effective scope."], dont: ["Do not replace accepted content while date constraints refresh."] },
});
