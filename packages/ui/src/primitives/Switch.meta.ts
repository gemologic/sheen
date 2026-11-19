import { defineMeta } from "../metadata.ts";
import type { SwitchProps } from "./Switch.tsx";

export default defineMeta<SwitchProps>({
  name: "Switch", package: "@gemologic/sheen", category: "forms", summary: "A labeled binary setting with native form participation and switch semantics.",
  props: {
    id: { description: "Root container ID used to derive internal IDs." },
    ref: { description: "Root container reference; inputRef targets the native input." },
    onPointerDown: { description: "Native root pointer-down handler composed with focus behavior." },
    label: { description: "Visible label, unchanged between on and off. Supply exactly one of label, aria-label, or aria-labelledby.", control: { kind: "text" } },
    "aria-label": { description: "Accessible name on the native input when no visible label fits." },
    "aria-labelledby": { description: "ID of existing visible text that names the native input." },
    "aria-describedby": { description: "Extra description IDs on the native input, merged with description and error. With TooltipTrigger, pass its aria-describedby here and its ref as inputRef." },
    description: { description: "Associated supporting instructions." },
    error: { description: "Associated error marking the control invalid without moving focus." },
    checked: { description: "App-owned state, retained on reset unless the app changes it.", control: { kind: "boolean" } },
    defaultChecked: { description: "Initial uncontrolled state restored on uncanceled reset.", default: false },
    onCheckedChange: { description: "Receives the requested boolean state, not a DOM event." },
    disabled: { description: "Prevents changes, keyboard focus, and form submission.", default: false },
    readOnly: { description: "Prevents changes while retaining focus and submission.", default: false },
    required: { description: "Requires the switch to be on for native form validation.", default: false },
    name: { description: "Native form name; empty or omitted names are not submitted." },
    form: { description: "External owning form ID, forwarded to the native input." },
    value: { description: "Value submitted when on.", default: "on" },
    inputRef: { description: "Receives the native input." },
  },
  tokens: ["--sheen-color-accent", "--sheen-color-border-control", "--sheen-color-focus-ring", "--sheen-icon-size-md"],
  a11y: { role: "switch", keyboard: ["Tab", "Shift+Tab", "Space"] },
  examples: [
    { title: "Live updates", code: '<Switch label="Live updates" defaultChecked description="Refresh this view automatically." />' },
    { title: "Row setting", code: '<Switch aria-label="Enable alerts for Production" defaultChecked />' },
  ],
  guidance: { do: ["Use a stable label describing the setting, not its current value."], dont: ["Do not use mixed state; a switch is strictly on or off."] },
});
