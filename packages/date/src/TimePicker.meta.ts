import { defineMeta } from "@gemologic/sheen/metadata";
import type { TimePickerProps } from "./TimePicker.tsx";

export default defineMeta<TimePickerProps>({
  name: "TimePicker", package: "@gemologic/sheen-date", category: "date and time", summary: "A contextual list of Sheen wall-clock values with deterministic interval generation.",
  props: {
    label: { description: "Required visible picker label." }, value: { description: "App-owned Sheen Time, or null." }, defaultValue: { description: "Initial uncontrolled selection." }, onValueChange: { description: "Receives selected Sheen Time values and clearing." }, options: { description: "Optional explicit labeled wall times; values must be unique." }, stepMinutes: { description: "Generated interval from 1 through 720 minutes when options are omitted.", default: 15 }, locale: { description: "Explicit BCP 47 label locale, defaulting to theme context." }, hourCycle: { description: "Explicit generated-label hour cycle.", control: { kind: "select", values: [12, 24] } }, name: { description: "Native form name for HH:mm:ss.SSS." }, form: { description: "Optional external form owner." }, placeholder: { description: "Empty-selection text." }, description: { description: "Associated instructions." }, error: { description: "Associated app validation error." }, required: { description: "Requires a selection.", default: false }, disabled: { description: "Disables interaction and projection.", default: false }, readOnly: { description: "Allows inspection while rejecting changes.", default: false },
  },
  tokens: ["--sheen-color-bg-raised", "--sheen-color-border-control", "--sheen-color-focus-ring"],
  a11y: { role: "button and listbox", keyboard: ["Tab", "Enter", "Space", "Arrow keys", "Home", "End", "Escape", "Typeahead"] },
  examples: [{ title: "Review slot", code: '<TimePicker label="Review slot" name="slot" stepMinutes={30} defaultValue={createTime(14, 30)} />' }],
  guidance: { do: ["Use explicit options when availability is not a uniform interval."], dont: ["Do not treat the selected wall time as an instant without a date and zone."] },
});
