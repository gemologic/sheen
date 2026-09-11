import { defineMeta } from "@gemologic/sheen/metadata";
import type { TopNavProps } from "./TopNav.tsx";

export default defineMeta<TopNavProps>({
  name: "TopNav", package: "@gemologic/sheen-patterns", category: "application", summary: "Compact horizontal native navigation with active-route matching and roving keyboard focus.",
  props: {
    navigation: { description: "App-owned navigation tree. Nested links flatten in declaration order for the horizontal presentation." },
    pathname: { description: "Accepted local pathname used for most-specific exact or segment-prefix matching." },
    compact: { description: "Compact visual-density marker; behavior and landmark naming do not change.", default: true },
  },
  tokens: ["--sheen-color-bg-hover", "--sheen-color-bg-selected", "--sheen-color-focus-ring"],
  a11y: { role: "navigation, link", keyboard: ["Tab", "Shift+Tab", "ArrowLeft", "ArrowRight", "Home", "End", "Enter"] },
  examples: [{ title: "Primary top navigation", code: '<TopNav pathname="/orders" navigation={{ id: "primary", label: "Primary", items: [{ kind: "link", id: "orders", label: "Orders", href: "/orders" }] }} />' }],
  guidance: { do: ["Supply the accepted router pathname and stable item IDs."], dont: ["Do not use action callbacks for destinations."] },
});
