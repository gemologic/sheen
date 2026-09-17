import { Index, Show, children, createMemo } from "solid-js";
import type { JSX } from "solid-js";
import { NumberText } from "@gemologic/sheen";
import type { StatGroupProps, StatProps, StatTrend } from "./chart-types.ts";

function className(base: string, extra: string | undefined): string {
  return extra ? `${base} ${extra}` : base;
}

function validateStat(stat: StatProps): StatProps {
  if (!stat.label?.trim()) throw new Error("Stat requires a nonempty label");
  if ((typeof stat.value !== "string" && typeof stat.value !== "number") || (typeof stat.value === "string" && !stat.value.trim())) throw new Error("Stat value must be nonempty text or a finite number");
  if (typeof stat.value === "number" && !Number.isFinite(stat.value)) throw new Error("Stat numeric values must be finite");
  if (stat.format !== undefined && typeof stat.value !== "number") throw new Error("Stat format requires a numeric value");
  if (stat.trend !== undefined && stat.trend !== "up" && stat.trend !== "down" && stat.trend !== "flat") throw new Error("Stat trend is invalid");
  if (stat.trend !== undefined && !stat.trendLabel?.trim()) throw new Error("Stat trends require a nonempty trendLabel");
  if (stat.trend === undefined && stat.trendLabel !== undefined) throw new Error("Stat trendLabel requires a trend");
  if (stat.valence !== undefined && stat.valence !== "positive" && stat.valence !== "negative" && stat.valence !== "neutral") throw new Error("Stat valence is invalid");
  if (stat.trend === undefined && stat.valence !== undefined) throw new Error("Stat valence requires a trend");
  return stat;
}

function trendSymbol(trend: StatTrend): string {
  if (trend === "up") return "↗";
  if (trend === "down") return "↘";
  return "→";
}

function StatContent(props: { readonly stat: StatProps }): JSX.Element {
  const stat = createMemo(() => validateStat(props.stat));
  const visual = children(() => stat().visual);
  const numberFormat = createMemo(() => {
    const format = stat().format;
    return format === undefined ? {} : { format };
  });
  return <>
    <dt class="sheen-stat-label">{stat().label}</dt>
    <dd class="sheen-stat-value"><Show when={typeof stat().value === "number" && stat().format !== undefined} fallback={stat().value}>
      <NumberText value={Number(stat().value)} {...numberFormat()} />
    </Show></dd>
    <Show when={stat().trend}>{trend => <dd class="sheen-stat-trend" data-trend={trend()} data-valence={stat().valence ?? "neutral"}>
      <span aria-hidden="true">{trendSymbol(trend())}</span><span>{stat().trendLabel}</span>
    </dd>}</Show>
    <Show when={visual()}>{content => <dd class="sheen-stat-visual">{content()}</dd>}</Show>
  </>;
}

export function Stat(props: StatProps): JSX.Element {
  return <dl class={className("sheen-stat", props.class)}><StatContent stat={props} /></dl>;
}

function validateGroup(props: StatGroupProps): readonly StatProps[] {
  if (!props.label?.trim()) throw new Error("StatGroup requires a nonempty label");
  const stats = props.stats;
  if (!Array.isArray(stats) || stats.length === 0) throw new Error("StatGroup requires at least one stat");
  for (const stat of stats) validateStat(stat);
  return stats;
}

export function StatGroup(props: StatGroupProps): JSX.Element {
  const items = createMemo(() => validateGroup(props));
  return <section class={className("sheen-stat-group", props.class)} role="group" aria-label={props.label}>
    <Index each={items()}>{item => <Stat {...item()} class={className("sheen-stat-group-item", item().class)} />}</Index>
  </section>;
}
