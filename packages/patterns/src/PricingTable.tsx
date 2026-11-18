import { Badge, Card, Heading, SegmentedControl, cn, useTheme } from "@gemologic/sheen";
import { For, Show, children, createMemo, createSignal, createUniqueId, splitProps } from "solid-js";
import type { JSX } from "solid-js";
import { SectionIntro, keyedRecords, nextHeadingLevel, requireText } from "./marketing-section.tsx";
import type { MarketingHeadingLevel, MarketingSectionLevel } from "./marketing-section.tsx";

export interface PlanCardProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children"> {
  name: string;
  description?: string | undefined;
  price?: number;
  currency?: string;
  priceLabel?: string;
  periodSuffix?: string;
  features: readonly string[];
  highlighted?: boolean;
  badge?: string | undefined;
  action: JSX.Element;
  headingLevel?: 2 | 3 | 4 | 5 | 6;
}

/** One plan: name, locale-formatted price, included features, and a call to action. */
export function PlanCard(props: PlanCardProps): JSX.Element {
  const [local, others] = splitProps(props, ["name", "description", "price", "currency", "priceLabel", "periodSuffix", "features", "highlighted", "badge", "action", "headingLevel", "class"]);
  const theme = useTheme();
  const headingId = `sheen-plan-card-${createUniqueId()}`;
  const name = createMemo(() => requireText(local.name, "PlanCard requires a nonempty name"));
  const price = createMemo(() => {
    if (local.priceLabel !== undefined) return { label: requireText(local.priceLabel, "PlanCard priceLabel must be nonempty"), formatted: false };
    const amount = local.price;
    const currency = local.currency;
    if (amount === undefined || !Number.isFinite(amount) || amount < 0) throw new Error(`PlanCard ${local.name} requires a finite nonnegative price or a priceLabel`);
    if (currency === undefined) throw new Error(`PlanCard ${local.name} requires a currency for a numeric price`);
    const formatter = new Intl.NumberFormat(theme.state().locale, { style: "currency", currency, trailingZeroDisplay: "stripIfInteger" });
    return { label: formatter.format(amount), formatted: true };
  });
  const features = createMemo(() => {
    const list = local.features;
    for (const feature of list) requireText(feature, "PlanCard features must be nonempty");
    return list;
  });
  const action = children(() => local.action);
  return <Card {...others} role="group" aria-labelledby={headingId} class={cn("sheen-plan-card", local.class)} data-highlighted={local.highlighted ?? false}>
    <div class="sheen-plan-card-header">
      <Heading id={headingId} level={local.headingLevel ?? 3} size="h3">{name()}</Heading>
      <Show when={local.badge}>{badge => <Badge class="sheen-plan-card-badge" tone="accent">{badge()}</Badge>}</Show>
    </div>
    <Show when={local.description}>{description => <p class="sheen-plan-card-description">{description()}</p>}</Show>
    <p class="sheen-plan-card-price" data-formatted={price().formatted}>
      <span class="sheen-plan-card-amount">{price().label}</span>
      <Show when={price().formatted && local.periodSuffix}>{suffix => <span class="sheen-plan-card-period">{suffix()}</span>}</Show>
    </p>
    <div class="sheen-plan-card-action">{action()}</div>
    <ul class="sheen-plan-card-features">
      <For each={features()}>{feature => <li>{feature}</li>}</For>
    </ul>
  </Card>;
}

export interface PricingPeriod {
  readonly value: string;
  readonly label: string;
  readonly suffix: string;
}

export interface PricingPlan {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly prices?: Readonly<Record<string, number>>;
  readonly priceLabel?: string;
  readonly features: readonly string[];
  readonly highlighted?: boolean;
  readonly badge?: string;
  readonly action: JSX.Element;
}

export interface PricingTableProps extends Omit<JSX.HTMLAttributes<HTMLElement>, "title" | "children"> {
  title: string;
  eyebrow?: string;
  description?: JSX.Element;
  plans: readonly PricingPlan[];
  currency: string;
  periods: readonly PricingPeriod[];
  period?: string;
  defaultPeriod?: string;
  onPeriodChange?: (period: string) => void;
  periodLabel?: string;
  headingLevel?: MarketingSectionLevel;
}

/** A pricing section with an optional billing-period toggle and a responsive row of plan cards. */
export function PricingTable(props: PricingTableProps): JSX.Element {
  const [local, others] = splitProps(props, ["title", "eyebrow", "description", "plans", "currency", "periods", "period", "defaultPeriod", "onPeriodChange", "periodLabel", "headingLevel", "class"]);
  const id = createUniqueId();
  const headingId = `sheen-pricing-table-${id}`;
  const level = () => local.headingLevel ?? 2;
  const title = createMemo(() => requireText(local.title, "PricingTable requires a nonempty title"));
  const periods = createMemo(() => {
    const list = local.periods;
    if (list.length === 0) throw new Error("PricingTable requires at least one billing period");
    const values = new Set<string>();
    for (const period of list) {
      requireText(period.value, "PricingTable period values must be nonempty");
      requireText(period.label, "PricingTable period labels must be nonempty");
      if (values.has(period.value)) throw new Error(`PricingTable duplicate period: ${period.value}`);
      values.add(period.value);
    }
    return list;
  });
  const [draft, setDraft] = createSignal(local.defaultPeriod);
  const active = createMemo(() => {
    const requested = local.period ?? draft();
    const match = periods().find(period => period.value === requested) ?? periods()[0];
    if (!match) throw new Error("PricingTable requires at least one billing period");
    return match;
  });
  const plans = keyedRecords(() => local.plans, "PricingTable");
  const change = (next: string | null): void => {
    if (next === null || next === active().value) return;
    if (local.period === undefined) setDraft(next);
    local.onPeriodChange?.(next);
  };
  const planLevel = (): MarketingHeadingLevel => nextHeadingLevel(level());
  return <section {...others} aria-labelledby={headingId} class={cn("sheen-pricing-table sheen-marketing-section", local.class)}>
    <div class="sheen-marketing-container sheen-marketing-stack">
      <SectionIntro id={headingId} title={title()} level={level()} size="h2" eyebrow={local.eyebrow} description={local.description} />
      <Show when={periods().length > 1}>
        <SegmentedControl class="sheen-pricing-table-periods" name={`sheen-pricing-period-${id}`} label={local.periodLabel ?? "Billing period"}
          options={periods().map(period => ({ value: period.value, label: period.label }))} value={active().value} onValueChange={change} />
      </Show>
      <ul class="sheen-pricing-table-plans">
        <For each={plans.ids()}>{planId => <Show when={plans.get(planId)}>{plan => <li>
          <PlanCard name={plan().name} features={plan().features} action={plan().action} headingLevel={planCardLevel(planLevel())}
            description={plan().description} badge={plan().badge} highlighted={plan().highlighted ?? false} {...planPrice(plan(), active(), local.currency)} />
        </li>}</Show>}</For>
      </ul>
    </div>
  </section>;
}

function planCardLevel(level: MarketingHeadingLevel): NonNullable<PlanCardProps["headingLevel"]> {
  return level === 1 ? 2 : level;
}

function planPrice(plan: PricingPlan, period: PricingPeriod, currency: string): Pick<PlanCardProps, "price" | "currency" | "priceLabel" | "periodSuffix"> {
  if (plan.priceLabel !== undefined) return { priceLabel: plan.priceLabel };
  const price = plan.prices?.[period.value];
  if (price === undefined) throw new Error(`PricingTable plan ${plan.id} has no price for period ${period.value}`);
  return { price, currency, periodSuffix: period.suffix };
}
