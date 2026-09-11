import { defineMeta } from "../metadata.ts";
import type { LinkProps } from "./Link.tsx";

export default defineMeta<LinkProps>({
  name: "Link", package: "@gemologic/sheen", category: "primitives", summary: "Navigates to a native anchor destination, with text or quiet button styling.",
  props: {
    href: { description: "Required destination. Native target, download, rel, and modified-click behavior are preserved." },
    variant: { description: "Text link or quiet medium button appearance; both retain link semantics.", default: "text", control: { kind: "select", values: ["text", "button"] } },
  },
  tokens: ["--sheen-color-accent-fg", "--sheen-color-focus-ring", "--sheen-color-focus-ring-offset", "--sheen-control-h-md"],
  a11y: { role: "link", keyboard: ["Tab", "Shift+Tab", "Enter"] },
  examples: [{ title: "Destination", code: '<Link href="/orders">Orders</Link>' }, { title: "Button-styled destination", code: '<Link href="/orders/new" variant="button">New order</Link>' }],
  guidance: { do: ["Use Button for actions that do not change the URL.", "Provide visible text or an accessible name.", "Let the app router handle navigation through its normal anchor integration."], dont: ["Do not put interactive controls inside links.", "Do not treat aria-disabled as disabling native navigation; render unavailable content without a destination instead.", "Do not use Space to emulate button activation."] },
});
