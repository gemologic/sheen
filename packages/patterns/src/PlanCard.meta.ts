import { defineMeta } from "@gemologic/sheen/metadata";
import type { PlanCardProps } from "./PricingTable.tsx";

export default defineMeta<PlanCardProps>({
  name: "PlanCard", package: "@gemologic/sheen-patterns", category: "marketing", summary: "One pricing plan with a locale-formatted price, included features, and a call to action.",
  props: {
    name: { description: "Required nonempty plan name and accessible group name.", control: { kind: "text" } },
    description: { description: "Optional one-line plan summary.", control: { kind: "text" } },
    price: { description: "Finite nonnegative amount formatted with `currency` and the scoped locale. Required unless `priceLabel` is set." },
    currency: { description: "ISO 4217 currency code. Required with a numeric price.", control: { kind: "text" } },
    priceLabel: { description: "Text shown instead of a numeric price, such as \"Custom\" or \"Free\".", control: { kind: "text" } },
    periodSuffix: { description: "Billing period after a numeric price, such as \"/ month\".", control: { kind: "text" } },
    features: { description: "Nonempty included-feature lines rendered with decorative check marks." },
    highlighted: { description: "Marks the recommended plan with an accent boundary.", default: false, control: { kind: "boolean" } },
    badge: { description: "Optional short label beside the plan name, such as \"Most popular\".", control: { kind: "text" } },
    action: { description: "Required call to action. Use Link for signup URLs and Button for in-page checkout." },
    headingLevel: { description: "Semantic level of the plan name.", default: 3, control: { kind: "select", values: [2, 3, 4, 5, 6] } },
  },
  tokens: ["--sheen-color-bg-raised", "--sheen-color-border", "--sheen-color-accent", "--sheen-color-fg-muted", "--sheen-text-stat-size", "--sheen-elevation-raised"],
  a11y: { role: "group, heading, list", keyboard: ["Tab", "Shift+Tab"] },
  examples: [{
    title: "Standalone plan",
    imports: 'import { Link } from "@gemologic/sheen";',
    code: '<PlanCard name="Team" description="For growing teams." price={29} currency="USD" periodSuffix="/ month" features={["Unlimited projects", "Email support"]} action={<Link href="/signup?plan=team" variant="button">Start with Team</Link>} />',
  }],
  guidance: {
    do: ["Use PricingTable for a set of plans; use PlanCard alone for a single upsell.", "Keep feature lines short and parallel."],
    dont: ["Do not pass a preformatted price string as `priceLabel` for a numeric price.", "Do not put more than one primary action in a card."],
  },
});
