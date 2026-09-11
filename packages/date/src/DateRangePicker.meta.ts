import { defineMeta } from "@gemologic/sheen/metadata";
import type { DateRangePickerProps } from "./DatePicker.tsx";

export default defineMeta<DateRangePickerProps>({
  name: "DateRangePicker", package: "@gemologic/sheen-date", category: "date and time", summary: "A two-ended date picker that keeps its incomplete range draft while accepted state refreshes.",
  props: {
    label: { description: "Required visible range label." }, value: { description: "App-owned ordered Sheen DateRange, or null." }, defaultValue: { description: "Initial uncontrolled accepted range." }, onValueChange: { description: "Receives only complete ordered ranges or explicit clearing." }, presets: { description: "Deterministic labeled Sheen range shortcuts." }, endLabel: { description: "Accessible label for the second endpoint, defaulting to the range label plus end." },
    minValue: { description: "Earliest selectable endpoint." }, maxValue: { description: "Latest selectable endpoint." }, isDateUnavailable: { description: "Marks endpoint dates unavailable." }, defaultVisibleDate: { description: "Deterministic initially visible month." }, locale: { description: "Explicit BCP 47 locale, defaulting to theme context." }, calendar: { description: "Optional presentation calendar identifier." },
    name: { description: "Native form name for the start/end ISO interval." }, form: { description: "Optional external form owner." }, description: { description: "Associated instructions." }, error: { description: "Associated app validation error." }, placeholder: { description: "Empty endpoint placeholder." }, required: { description: "Marks both endpoints required.", default: false }, disabled: { description: "Disables interaction and projection.", default: false }, readOnly: { description: "Allows inspection while rejecting changes.", default: false },
  },
  tokens: ["--sheen-color-bg-raised", "--sheen-color-border-control", "--sheen-color-focus-ring"],
  a11y: { role: "two textboxes and calendar dialog", keyboard: ["Tab", "Enter", "Space", "Escape", "Arrow keys", "PageUp", "PageDown", "Home", "End"] },
  examples: [{ title: "Report window", code: '<DateRangePicker label="Report window" name="window" defaultValue={createDateRange(createCalendarDate(2026, 9, 1), createCalendarDate(2026, 9, 8))} />' }],
  guidance: { do: ["Treat a one-ended calendar interaction as a draft, not an accepted range."], dont: ["Do not infer missing endpoints or submit two unrelated fields."] },
});
