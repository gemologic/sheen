import { defineMeta } from "../metadata.ts";
import type { TooltipTriggerProps } from "./TooltipTrigger.tsx";
export default defineMeta<TooltipTriggerProps>({
  name: "TooltipTrigger", package: "@gemologic/sheen", category: "overlays", summary: "Hover/focus help attached to an existing focusable element without rendering another control.",
  props: {
    content: { description: "Noninteractive supporting text; never a replacement for the element's accessible name." },
    shortcut: { description: "Display-only shortcut hint rendered as Kbd; it does not register a binding." },
    tooltipDisabled: { description: "Disables only the help layer. Set it when the element is disabled, because disabled controls do not open help.", default: false },
    placement: { description: "Preferred side, with viewport collision handling.", default: "top", control: { kind: "select", values: ["top", "bottom", "left", "right"] } },
    openDelay: { description: "Hover opening delay in milliseconds; keyboard focus opens immediately.", default: 500 },
    closeDelay: { description: "Pointer departure delay in milliseconds, preserving a hoverable path to the content.", default: 100 },
    "aria-describedby": { description: "Existing description IDs, merged with the tooltip content ID in the supplied bindings." },
    children: { description: "Render exactly one focusable element and spread the supplied ref and aria-describedby bindings on it. Compose an own ref by calling the binding's ref; the element keeps its own event handlers." },
  },
  tokens: ["--sheen-color-bg-raised", "--sheen-elevation-raised", "--sheen-duration-fast"],
  a11y: { role: "tooltip", keyboard: ["Tab", "Shift+Tab", "Escape"] },
  examples: [
    { title: "Existing button", code: '<TooltipTrigger content="Archive the selected rows">{trigger => <Button {...trigger} variant="outline">Archive</Button>}</TooltipTrigger>' },
    { title: "Native element", code: '<TooltipTrigger content="Copied values stay local" shortcut="mod+c">{trigger => <button type="button" {...trigger}>Copy</button>}</TooltipTrigger>' },
    { title: "Switch or checkbox", code: '<TooltipTrigger content="Allows destructive actions for this session">{trigger => <Switch label="Danger mode" inputRef={trigger.ref} aria-describedby={trigger["aria-describedby"]} />}</TooltipTrigger>' },
  ],
  guidance: { do: ["Use for an element that already exists, such as an app button or a third-party control, instead of nesting it inside Tooltip."], dont: ["Do not render more than one element from the bindings or attach help to a non-focusable element.", "Do not put interactive content in the tooltip; use Popover."] },
});
