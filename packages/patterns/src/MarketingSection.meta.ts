import { defineMeta } from "@gemologic/sheen/metadata";
import type { MarketingSectionProps } from "./MarketingSection.tsx";

export default defineMeta<MarketingSectionProps>({
  name: "MarketingSection", package: "@gemologic/sheen-patterns", category: "marketing", summary: "A titled public-page section that lays app-owned content on the shared marketing container and rhythm.",
  props: {
    title: { description: "Required nonempty section heading and accessible section name.", control: { kind: "text" } },
    eyebrow: { description: "Optional short kicker above the heading.", control: { kind: "text" } },
    description: { description: "Optional supporting copy below the heading." },
    columns: { description: "Maximum body columns on wide containers; three steps down to two, and every layout becomes one column on narrow containers.", default: 1, control: { kind: "select", values: [1, 2, 3] } },
    headingLevel: { description: "Semantic level of the section heading.", default: 2, control: { kind: "select", values: [2, 3, 4, 5] } },
  },
  tokens: ["--sheen-space-section", "--sheen-color-fg-muted", "--sheen-text-h2-size"],
  a11y: { role: "region, heading", keyboard: ["Tab", "Shift+Tab"] },
  examples: [{
    title: "Testimonials",
    code: '<MarketingSection title="What teams say" columns={2}><Testimonial quote={<p>We shipped our admin in a week.</p>} author="Ada Lovelace" /><Testimonial quote={<p>Dense without feeling cramped.</p>} author="Grace Hopper" /></MarketingSection>',
  }],
  guidance: {
    do: ["Use it for content without a dedicated section pattern, such as testimonials or a screenshot.", "Pass each grid cell as a direct child."],
    dont: ["Do not nest MarketingSection inside another section pattern.", "Do not use it inside AdminApp pages; use PageHeader and application layouts there."],
  },
});
