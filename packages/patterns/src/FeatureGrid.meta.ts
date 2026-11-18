import { defineMeta } from "@gemologic/sheen/metadata";
import type { FeatureGridProps } from "./FeatureGrid.tsx";

export default defineMeta<FeatureGridProps>({
  name: "FeatureGrid", package: "@gemologic/sheen-patterns", category: "marketing", summary: "A titled section of feature summaries in a responsive two- to four-column grid.",
  props: {
    title: { description: "Required nonempty section heading and accessible section name.", control: { kind: "text" } },
    eyebrow: { description: "Optional short kicker above the heading.", control: { kind: "text" } },
    description: { description: "Optional supporting copy below the heading." },
    items: { description: "Features with unique stable `id`, nonempty `title`, `description`, and optional decorative `icon`. IDs key DOM identity." },
    columns: { description: "Maximum columns on wide containers; the grid steps down to two and then one as the section narrows.", default: 3, control: { kind: "select", values: [2, 3, 4] } },
    headingLevel: { description: "Semantic level of the section heading; feature titles use the next level.", default: 2, control: { kind: "select", values: [2, 3, 4, 5] } },
  },
  tokens: ["--sheen-color-border", "--sheen-color-bg-subtle", "--sheen-color-fg-muted", "--sheen-control-h-lg", "--sheen-space-section", "--sheen-text-h4-size"],
  a11y: { role: "region, heading, list", keyboard: ["Tab", "Shift+Tab"] },
  examples: [{
    title: "Three features",
    code: '<FeatureGrid title="Built for real applications" items={[{ id: "ssr", title: "Server complete", description: "Every component renders its full markup on the server." }, { id: "a11y", title: "Accessible", description: "Keyboard paths and contrast are tested in a real browser." }, { id: "fast", title: "Fast", description: "Entries stay small so marketing pages do not pay for admin code." }]} />',
  }],
  guidance: {
    do: ["Keep each description to one or two sentences.", "Use icons from @gemologic/sheen-icons; they are decorative here."],
    dont: ["Do not use FeatureGrid for navigation cards; use links in a list instead.", "Do not mix items with and without icons."],
  },
});
