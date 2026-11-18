import { defineMeta } from "@gemologic/sheen/metadata";
import type { SiteFooterProps } from "./SiteFooter.tsx";

export default defineMeta<SiteFooterProps>({
  name: "SiteFooter", package: "@gemologic/sheen-patterns", category: "marketing", summary: "A public-site content footer with brand blurb, labelled link columns, and a legal row.",
  props: {
    brand: { description: "Optional product identity above the description." },
    description: { description: "Optional short product or company blurb." },
    columns: { description: "Link columns with unique stable `id`, nonempty `title`, and native `links`. Each column is a navigation landmark named by its heading." },
    legal: { description: "Optional copyright or company text in the legal row." },
    legalLinks: { description: "Optional privacy, terms, and similar links in their own navigation landmark." },
    legalLabel: { description: "Accessible name of the legal-links navigation landmark.", default: "Legal", control: { kind: "text" } },
    headingLevel: { description: "Semantic level of the column headings.", default: 2, control: { kind: "select", values: [2, 3, 4, 5, 6] } },
  },
  tokens: ["--sheen-color-bg", "--sheen-color-border-subtle", "--sheen-color-fg-muted", "--sheen-text-ui-sm-size", "--sheen-space-section"],
  a11y: { role: "contentinfo, navigation, heading, list", keyboard: ["Tab", "Shift+Tab"] },
  examples: [{
    title: "Product site footer",
    code: '<SiteFooter brand={<strong>Northstar</strong>} columns={[{ id: "product", title: "Product", links: [{ href: "/features", label: "Features" }, { href: "/pricing", label: "Pricing" }] }, { id: "company", title: "Company", links: [{ href: "/about", label: "About" }, { href: "/careers", label: "Careers" }] }]} legal={<span>© 2026 Northstar, Inc.</span>} legalLinks={[{ href: "/privacy", label: "Privacy" }, { href: "/terms", label: "Terms" }]} />',
  }],
  guidance: {
    do: ["Render one SiteFooter per page outside the main landmark.", "Keep column titles short and distinct."],
    dont: ["Do not use SiteFooter inside AppShell; use StatusBar for application status.", "Do not put forms other than a short newsletter signup in the footer."],
  },
});
