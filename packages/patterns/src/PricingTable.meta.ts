import { defineMeta } from "@gemologic/sheen/metadata";
import type { PricingTableProps } from "./PricingTable.tsx";

export default defineMeta<PricingTableProps>({
  name: "PricingTable", package: "@gemologic/sheen-patterns", category: "marketing", summary: "A pricing section with a billing-period SegmentedControl and responsive plan cards.",
  props: {
    title: { description: "Required nonempty section heading and accessible section name.", control: { kind: "text" } },
    eyebrow: { description: "Optional short kicker above the heading.", control: { kind: "text" } },
    description: { description: "Optional supporting copy below the heading." },
    plans: { description: "Plans with unique stable `id`, `name`, `features`, `action`, and either `prices` keyed by every period value or a `priceLabel` such as \"Custom\". `highlighted` and `badge` mark one recommended plan." },
    currency: { description: "ISO 4217 currency code used to format every numeric price with the scoped locale.", control: { kind: "text" } },
    periods: { description: "One or more billing periods with unique `value`, visible `label`, and price `suffix`. The toggle is shown only when there are two or more." },
    period: { description: "Controlled selected period value. Omit for uncontrolled state." },
    defaultPeriod: { description: "Initial uncontrolled period value. Defaults to the first period." },
    onPeriodChange: { description: "Receives the newly selected period value." },
    periodLabel: { description: "Visible legend of the billing-period toggle.", default: "Billing period", control: { kind: "text" } },
    headingLevel: { description: "Semantic level of the section heading; plan names use the next level.", default: 2, control: { kind: "select", values: [2, 3, 4, 5] } },
  },
  tokens: ["--sheen-color-accent", "--sheen-color-accent-fg", "--sheen-color-border-subtle", "--sheen-text-stat-size", "--sheen-space-inline-lg", "--sheen-elevation-raised"],
  a11y: { role: "region, radiogroup (billing period), group (each plan), list", keyboard: ["Tab", "Shift+Tab", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"] },
  examples: [{
    title: "Monthly and yearly plans",
    imports: 'import { Link } from "@gemologic/sheen";',
    code: '<PricingTable title="Pricing" currency="USD" periods={[{ value: "month", label: "Monthly", suffix: "/ month" }, { value: "year", label: "Yearly", suffix: "/ year" }]} plans={[{ id: "team", name: "Team", prices: { month: 29, year: 290 }, features: ["Unlimited projects", "Email support"], action: <Link href="/signup?plan=team" variant="button">Start with Team</Link> }, { id: "scale", name: "Scale", priceLabel: "Custom", highlighted: true, badge: "Popular", features: ["SSO", "Audit log"], action: <Link href="/contact" variant="button">Contact sales</Link> }]} />',
  }],
  guidance: {
    do: ["Highlight at most one plan.", "Keep feature lists parallel across plans so they compare line by line.", "Change prices only through the period toggle; plan cards keep their DOM identity."],
    dont: ["Do not format prices yourself; pass numbers and a currency.", "Do not use the toggle for anything other than billing period."],
  },
});
