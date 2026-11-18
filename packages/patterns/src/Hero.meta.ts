import { defineMeta } from "@gemologic/sheen/metadata";
import type { HeroProps } from "./Hero.tsx";

export default defineMeta<HeroProps>({
  name: "Hero", package: "@gemologic/sheen-patterns", category: "marketing", summary: "The opening section of a public page with eyebrow, display heading, lead, actions, and optional media.",
  props: {
    title: { description: "Required nonempty page heading and accessible section name.", control: { kind: "text" } },
    eyebrow: { description: "Optional short kicker above the heading.", control: { kind: "text" } },
    lead: { description: "Optional supporting paragraph or paragraphs below the heading." },
    actions: { description: "Optional primary and secondary calls to action. Use Link for destinations and Button for in-page actions." },
    media: { description: "Optional screenshot, illustration, or live preview shown beside the copy on wide containers and below it on narrow ones." },
    headingLevel: { description: "Semantic heading level. Use 1 for the page's opening hero.", default: 1, control: { kind: "select", values: [1, 2] } },
    align: { description: "Copy alignment. Centered alignment suits heroes without media.", default: "start", control: { kind: "select", values: ["start", "center"] } },
  },
  tokens: ["--sheen-text-h1-size", "--sheen-text-body-size", "--sheen-color-fg-muted", "--sheen-color-accent", "--sheen-space-section", "--sheen-space-block-lg"],
  a11y: { role: "region (section labelled by its heading), heading", keyboard: ["Tab", "Shift+Tab"] },
  examples: [{
    title: "Product hero",
    imports: 'import { Link } from "@gemologic/sheen";',
    code: '<Hero eyebrow="Now in beta" title="Ship calm, dense interfaces faster" lead={<p>Accessible SolidJS components with server-complete markup.</p>} actions={<><Link href="/start" variant="button">Get started</Link><Link href="/docs">Read the docs</Link></>} />',
  }],
  guidance: {
    do: ["Keep the title short enough to scan in two lines.", "Give media its own accessible name or mark it decorative.", "Lead with one primary action and at most one secondary action."],
    dont: ["Do not animate hero content on mount.", "Do not hide the hero behind a client-only branch; it is the page's first content."],
  },
});
