import { defineMeta } from "../metadata.ts";
import type { LinkTooltipProps } from "./LinkTooltip.tsx";
export default defineMeta<LinkTooltipProps>({
  name: "LinkTooltip", package: "@gemologic/sheen", category: "overlays", summary: "A native destination anchor with scoped hover/focus help.",
  props: {
    href: { description: "Required native destination. Modified clicks and target/rel retain browser behavior." },
    content: { description: "Noninteractive supporting text. The anchor still needs visible text or an accessible name." },
    tooltipDisabled: { description: "Disables only the help layer, without disabling or replacing the anchor." },
    placement: { description: "Preferred side with collision handling, default top." },
    openDelay: { description: "Hover opening delay in milliseconds, default 500." },
    closeDelay: { description: "Pointer departure delay in milliseconds, default 100." },
  },
  tokens: ["--sheen-color-bg-raised", "--sheen-color-focus-ring"],
  a11y: { role: "link, tooltip", keyboard: ["Tab", "Shift+Tab", "Enter", "Escape"] },
  examples: [{ title: "Destination help", code: '<LinkTooltip href="/orders" content="Browse orders">Orders</LinkTooltip>' }],
  guidance: { do: ["Use under ThemeProvider; overlay inherits its scope.", "Provide a native accessible link name even when the tooltip is disabled."], dont: ["Do not put buttons or other interactive controls inside the link or tooltip."] },
});
