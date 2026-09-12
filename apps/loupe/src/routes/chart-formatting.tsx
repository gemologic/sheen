import { createSignal } from "solid-js";
import { Button, ThemeScope, useDateFormatter, useNumberFormatter } from "@gemologic/sheen";
import { defineSeries } from "@gemologic/sheen-charts/core";
import type { ChartTimeAxis } from "@gemologic/sheen-charts/core";
import { AreaChart, BarChart, LineChart } from "@gemologic/sheen-charts/charts-svg";
import { TimeSeries } from "@gemologic/sheen-charts/time-series";

const timestamp = Date.UTC(2026, 8, 1, 12);
const data = Object.freeze({ t: new Float64Array([timestamp, timestamp + 60_000]), amount: new Float64Array([12_345.5, 23_456.7]) });
const categories = Object.freeze({ categories: Object.freeze(["North", "South"]), values: Object.freeze({ amount: data.amount }) });
const series = defineSeries([{ key: "amount", label: "Amount", color: "chart-1" }]);
const x = Object.freeze({ type: "time", tz: "UTC" }) satisfies ChartTimeAxis;

function FormatterOutputs() {
  const number = useNumberFormatter();
  const date = useDateFormatter({ dateStyle: "medium", timeStyle: "medium", timeZone: "UTC" });
  return <div>
    <output aria-label="Formatted amount">{number().format(12_345.5)}</output>
    <output aria-label="Formatted timestamp">{date().format(timestamp)}</output>
  </div>;
}

export default function ChartFormattingFixture() {
  const [locale, setLocale] = createSignal("en-US");
  const [accent, setAccent] = createSignal<"jade" | "violet">("jade");
  return <main>
    <h1>Locale-stable chart formatting</h1>
    <Button onClick={() => setAccent(value => value === "jade" ? "violet" : "jade")}>Toggle formatting accent</Button>
    <Button onClick={() => setLocale(value => value === "en-US" ? "de-DE" : "en-US")}>Toggle formatting locale</Button>
    <ThemeScope theme="graphite" mode="dark" locale={locale()} accent={accent()} class="loupe-chart-formatting-scope">
      <FormatterOutputs />
      <TimeSeries label="Canvas amount" summary="Two deterministic samples." xLabel="Time" series={series} data={data} x={x} height={160} table={{ pageSize: 2 }} />
      <LineChart label="Line amount" summary="Two deterministic samples." xLabel="Time" series={series} data={data} x={x} height={160} table={{ pageSize: 2 }} />
      <AreaChart label="Area amount" summary="Two deterministic samples." xLabel="Time" series={series} data={data} x={x} height={160} table={{ pageSize: 2 }} />
      <BarChart label="Regional amount" summary="Two deterministic categories." categoryLabel="Region" valueLabel="Amount" series={series} data={categories} height={160} table={{ pageSize: 2 }} />
    </ThemeScope>
  </main>;
}
