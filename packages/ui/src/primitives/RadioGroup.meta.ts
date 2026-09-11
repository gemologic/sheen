import { defineMeta } from "../metadata.ts";
import type { RadioGroupProps } from "./RadioGroup.tsx";

export default defineMeta<RadioGroupProps>({
  name: "RadioGroup", package: "@gemologic/sheen", category: "forms", summary: "A named native group of mutually exclusive choices.",
  props: {
    id: { description: "Root fieldset ID used to derive stable nested IDs." },
    ref: { description: "Native root fieldset reference." },
    name: { description: "Required nonempty native name; use a distinct name per group within its owning form." },
    label: { description: "Required visible group legend.", control: { kind: "text" } },
    options: { description: "Options with unique nonempty values, labels, optional descriptions and disabled flags." },
    value: { description: "App-owned selection; null explicitly selects nothing." },
    defaultValue: { description: "Captured uncontrolled selection restored on uncanceled form reset." },
    onValueChange: { description: "Receives requested selection changes, including null when reset clears an uncontrolled group." },
    description: { description: "Supporting instructions associated with the group and its inputs." },
    error: { description: "Associated group error and invalid state without automatic focus or announcements." },
    readOnly: { description: "Rejects changes while retaining focus and submitted values.", default: false },
    required: { description: "Requires one selection for native form validation.", default: false },
    orientation: { description: "Visual arrangement and ARIA orientation.", default: "vertical", control: { kind: "select", values: ["vertical", "horizontal"] } },
  },
  tokens: ["--sheen-color-border-control", "--sheen-color-accent", "--sheen-color-focus-ring", "--sheen-icon-size-md"],
  a11y: { role: "radiogroup", keyboard: ["Tab", "Shift+Tab", "Space", "Arrow keys"] },
  examples: [{ title: "Refresh cadence", code: '<RadioGroup label="Refresh cadence" name="cadence" options={[{ value: "live", label: "Live" }, { value: "manual", label: "Manual" }]} defaultValue="live" />' }],
  guidance: { do: ["Use a stable legend and unique native group name."], dont: ["Do not use radios for independent on/off choices or toolbar toggle groups."] },
});
