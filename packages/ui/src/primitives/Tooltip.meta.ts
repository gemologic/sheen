import { defineMeta } from "../metadata.ts";
import type { TooltipProps } from "./Tooltip.tsx";
import button from "./Button.meta.ts";
const { composer: inheritedComposer, ...buttonMetadata } = button;
void inheritedComposer;
export default defineMeta<TooltipProps>({
  ...buttonMetadata, name: "Tooltip", category: "overlays", summary: "An action button with hover/focus help and optional shortcut display.",
  props: { ...button.props,
    type: { description: "Native action, submission, or reset behavior.", default: "button", control: { kind: "select", values: ["button", "submit", "reset"] } },
    content: { description: "Noninteractive supporting text; never a replacement for the trigger's accessible name." },
    shortcut: { description: "A string displays a hint only; a typed shortcut action also registers the trigger and displays its platform-formatted binding." },
    placement: { description: "Preferred side, with viewport collision handling.", default: "top", control: { kind: "select", values: ["top", "bottom", "left", "right"] } },
    openDelay: { description: "Hover opening delay in milliseconds; keyboard focus opens immediately.", default: 500 },
    closeDelay: { description: "Pointer departure delay in milliseconds, preserving a hoverable path to the content.", default: 100 },
  },
  a11y: { role: "tooltip", keyboard: ["Tab", "Shift+Tab", "Escape", "Enter", "Space"] },
  tokens: [...button.tokens, "--sheen-color-bg-raised", "--sheen-elevation-raised", "--sheen-duration-fast"],
  examples: [{ title: "Save hint", code: '<Tooltip content="Save the workspace" shortcut={{ keys: "mod+s", scope: "global", label: "Save workspace", group: "Editing" }} variant="outline">Save</Tooltip>' }],
  guidance: { do: ["Provide a visible label or aria-label on the native trigger."], dont: ["Do not nest a button inside Tooltip or put interactive controls in its content."] },
});
