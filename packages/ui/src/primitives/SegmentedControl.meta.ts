import { defineMeta } from "../metadata.ts";
import type { SegmentedControlProps } from "./SegmentedControl.tsx";

export default defineMeta<SegmentedControlProps>({
  name: "SegmentedControl", package: "@gemologic/sheen", category: "forms", summary: "A compact single-selection control with native radio submission and bounded overflow.",
  props: {
    id: { description: "Root fieldset ID used to derive stable relationships." }, ref: { description: "Native root fieldset reference." },
    name: { description: "Required nonempty native radio-group name." }, label: { description: "Required visible group legend." }, options: { description: "Ordered unique values with nonempty labels and optional disabled state." },
    value: { description: "App-owned selection, or null for no selection." }, defaultValue: { description: "Captured uncontrolled selection restored on uncanceled form reset." }, onValueChange: { description: "Receives requested committed selection changes." },
    description: { description: "Supporting instructions associated with the group." }, error: { description: "Associated error and invalid state." }, readOnly: { description: "Keeps the group focusable and submitted while rejecting changes.", default: false }, required: { description: "Requires one enabled selection for native validation.", default: false },
    orientation: { description: "Visual and keyboard orientation.", default: "horizontal", control: { kind: "select", values: ["horizontal", "vertical"] } }, size: { description: "Compact or standard segment height.", default: "sm", control: { kind: "select", values: ["sm", "md"] } }, overflowBehavior: { description: "Scrolls one line by default or wraps when the app permits height growth.", default: "scroll", control: { kind: "select", values: ["scroll", "wrap"] } },
  },
  tokens: ["--sheen-color-bg-inset", "--sheen-color-bg-hover", "--sheen-color-accent-subtle", "--sheen-color-accent-fg", "--sheen-color-focus-ring"],
  a11y: { role: "radiogroup and native radio", keyboard: ["Tab", "Shift+Tab", "Arrow keys", "Home", "End", "Space"] },
  examples: [{ title: "Report period", code: '<SegmentedControl label="Report period" name="period" options={[{ value: "day", label: "Day" }, { value: "week", label: "Week" }, { value: "month", label: "Month" }]} defaultValue="week" />' }],
  guidance: { do: ["Use for a short set of mutually exclusive peer views or modes."], dont: ["Do not use segments for independent toggles or a long searchable taxonomy."] },
});
