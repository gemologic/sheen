import { defineMeta } from "../metadata.ts";
import type { LinkProps } from "./Link.tsx";

export default defineMeta<LinkProps>({
  name: "Link", package: "@gemologic/sheen", category: "primitives", summary: "Navigates to a native anchor destination, with text, quiet, or button styling.",
  props: {
    href: { description: "Required destination. Native target, download, rel, and modified-click behavior are preserved." },
    variant: { description: "Text link, quiet link (foreground color, underline on hover and focus; only where layout already marks links, such as table cells, lists, and navigation), or button appearance. All retain link semantics.", default: "text", control: { kind: "select", values: ["text", "quiet", "button"] } },
    appearance: { description: "Button treatment when variant is button, matching Button's variant.", default: "outline", control: { kind: "select", values: ["solid", "soft", "outline", "ghost", "link"] } },
    tone: { description: "Button tone when variant is button.", default: "neutral", control: { kind: "select", values: ["neutral", "accent", "danger", "success"] } },
    size: { description: "Button size when variant is button.", default: "md", control: { kind: "select", values: ["xs", "sm", "md", "lg"] } },
  },
  tokens: ["--sheen-color-accent-fg", "--sheen-color-focus-ring", "--sheen-color-focus-ring-offset", "--sheen-control-h-md"],
  a11y: { role: "link", keyboard: ["Tab", "Shift+Tab", "Enter"] },
  examples: [{ title: "Destination", code: '<Link href="/orders">Orders</Link>' }, { title: "Button-styled destination", code: '<Link href="/orders/new" variant="button">New order</Link>' }],
  guidance: { do: ["Use Button for actions that do not change the URL.", "Provide visible text or an accessible name.", "Let the app router handle navigation through its normal anchor integration."], dont: ["Do not put interactive controls inside links.", "Do not treat aria-disabled as disabling native navigation; render unavailable content without a destination instead.", "Do not use Space to emulate button activation."] },
});
