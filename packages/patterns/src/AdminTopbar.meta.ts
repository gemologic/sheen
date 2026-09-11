import { defineMeta } from "@gemologic/sheen/metadata";
import type { AdminTopbarProps } from "./AdminTopbar.tsx";

export default defineMeta<AdminTopbarProps>({
  name: "AdminTopbar", package: "@gemologic/sheen-patterns", category: "application", summary: "A compact, named application control region with deterministic start, center, and end zones.",
  props: {
    label: { description: "Accessible region name.", default: "Application controls" },
    start: { description: "Start-aligned semantic chrome, resolved once." },
    center: { description: "Center semantic chrome with bounded horizontal overflow." },
    end: { description: "End-aligned semantic action chrome, resolved once." },
  },
  tokens: ["--sheen-color-bg-raised", "--sheen-color-border", "--sheen-space-inline-sm"],
  a11y: { role: "region", keyboard: ["Tab", "Shift+Tab"] },
  examples: [{ title: "Application controls", code: '<AdminTopbar start={<strong>Northstar</strong>} center={<span>Orders</span>} end={<button type="button">Create</button>} />' }],
  guidance: { do: ["Use AdminApp placement resolution for production shell chrome."], dont: ["Do not duplicate a semantic control in more than one zone."] },
});
