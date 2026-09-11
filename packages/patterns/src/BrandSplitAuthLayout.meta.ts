import { defineMeta } from "@gemologic/sheen/metadata";
import type { BrandSplitAuthLayoutProps } from "./AuthLayout.tsx";

export default defineMeta<BrandSplitAuthLayoutProps>({
  name: "BrandSplitAuthLayout", package: "@gemologic/sheen-patterns", category: "application", summary: "A branded two-pane authentication starter that collapses to the focused card without replacing content.",
  props: {
    ref: { description: "Native main-landmark reference." },
    brand: { description: "Persistent app-owned product identity above the authentication card." },
    title: { description: "Required visible page heading and accessible main-landmark name.", control: { kind: "text" } },
    description: { description: "Optional provider, organization, or next-step guidance below the heading." },
    children: { description: "App-owned authentication controls and live status." },
    footer: { description: "Optional support and legal destinations below the card." },
    headingLevel: { description: "Semantic heading level for the visible authentication title.", default: 1 },
    contentWidth: { description: "Bounded card width.", default: "md", control: { kind: "select", values: ["sm", "md"] } },
    aside: { description: "Required app-owned product context, illustration, or testimonial. It stays in the DOM and is visually hidden in the narrow focused presentation." },
    asideLabel: { description: "Required accessible name for the complementary brand region." },
    asidePosition: { description: "Logical start or end placement of the brand region.", default: "start", control: { kind: "select", values: ["start", "end"] } },
  },
  tokens: ["--sheen-color-bg", "--sheen-color-bg-raised", "--sheen-color-bg-subtle", "--sheen-color-border", "--sheen-color-accent-subtle", "--sheen-space-section", "--sheen-elevation-raised"],
  a11y: { role: "main, complementary, section, heading, footer", keyboard: ["Tab", "Shift+Tab"] },
  examples: [{ title: "Product context and SSO", imports: 'import { Button } from "@gemologic/sheen";', code: '<BrandSplitAuthLayout brand={<strong>Northstar</strong>} title="Sign in" description="Use your work account." asideLabel="Why teams use Northstar" aside={<blockquote>One calm workspace for every operation.</blockquote>}><Button variant="solid" tone="accent">Continue with SSO</Button></BrandSplitAuthLayout>' }],
  guidance: {
    do: ["Keep the brand region supportive and the authentication action visually dominant.", "Supply a concise aside label and meaningful text alternatives for informative artwork.", "Verify the CSS-only narrow presentation at 200 and 400 percent zoom."],
    dont: ["Do not put required authentication instructions only in the brand region because it is hidden on narrow screens.", "Do not autoplay media or animate layout content on mount.", "Do not reorder the form DOM to follow the aside's visual placement."],
  },
});
