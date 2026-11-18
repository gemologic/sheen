import { defineMeta } from "@gemologic/sheen/metadata";
import type { CtaBandProps } from "./CtaBand.tsx";

export default defineMeta<CtaBandProps>({
  name: "CtaBand", package: "@gemologic/sheen-patterns", category: "marketing", summary: "A closing call-to-action panel with heading, supporting copy, and actions.",
  props: {
    title: { description: "Required nonempty heading and accessible section name.", control: { kind: "text" } },
    eyebrow: { description: "Optional short kicker above the heading.", control: { kind: "text" } },
    description: { description: "Optional supporting copy below the heading." },
    actions: { description: "Required calls to action. Use Link for destinations and Button for in-page actions." },
    headingLevel: { description: "Semantic heading level.", default: 2, control: { kind: "select", values: [2, 3, 4, 5, 6] } },
  },
  tokens: ["--sheen-color-bg-raised", "--sheen-color-border", "--sheen-color-accent", "--sheen-elevation-raised", "--sheen-space-section"],
  a11y: { role: "region, heading", keyboard: ["Tab", "Shift+Tab"] },
  examples: [{
    title: "Closing call to action",
    imports: 'import { Link } from "@gemologic/sheen";',
    code: '<CtaBand title="Start building today" description={<p>Free for open-source projects.</p>} actions={<Link href="/start" variant="button">Get started</Link>} />',
  }],
  guidance: {
    do: ["Use one CtaBand near the end of a page.", "Repeat the hero's primary action rather than inventing a new one."],
    dont: ["Do not stack several CtaBands.", "Do not use it for alerts or status; use Callout or Alert."],
  },
});
