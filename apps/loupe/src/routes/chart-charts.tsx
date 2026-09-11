import { createMemo, createSignal } from "solid-js";
import { Button, Checkbox, ThemeScope } from "@gemologic/sheen";
import { defineSeries } from "@gemologic/sheen-charts/core";
import { AreaChart, BarChart, LineChart } from "@gemologic/sheen-charts/charts-svg";

const t = new Float64Array([1, 2, 3, 4, 5, 6, 7, 8]);
const initialPrimary = new Float64Array([18, 22, 20, 25, 27, 24, 29, 31]);
const initialSecondary = new Float64Array([11, 13, Number.NaN, 16, 18, 17, 20, 22]);
const refreshedPrimary = new Float64Array([20, 24, 23, 28, 31, 29, 34, 36]);
const refreshedSecondary = new Float64Array([12, 15, Number.NaN, 18, 21, 20, 24, 26]);
const initialCategories = {
  categories: ["North", "South", "East", "West"],
  values: { current: new Float64Array([42, 36, 29, 51]), previous: new Float64Array([38, Number.NaN, 31, 46]) },
};
const refreshedCategories = {
  categories: initialCategories.categories,
  values: { current: new Float64Array([46, 39, 34, 56]), previous: new Float64Array([40, Number.NaN, 33, 49]) },
};
const initialMovement = {
  categories: initialCategories.categories,
  values: { current: new Float64Array([12, 8, -4, 16]), previous: new Float64Array([5, -3, -6, 7]) },
};
const refreshedMovement = {
  categories: initialCategories.categories,
  values: { current: new Float64Array([15, 10, -2, 19]), previous: new Float64Array([6, -2, -7, 9]) },
};
const continuousSeries = defineSeries([
  { key: "primary", label: "Primary", color: "chart-1" },
  { key: "secondary", label: "Secondary", color: "chart-3" },
]);
const categorySeries = defineSeries([
  { key: "current", label: "Current", color: "chart-2" },
  { key: "previous", label: "Previous", color: "chart-5" },
]);

export default function ChartGalleryFixture() {
  const [refreshed, setRefreshed] = createSignal(false);
  const [pending, setPending] = createSignal(false);
  const [reject, setReject] = createSignal(false);
  const [error, setError] = createSignal(false);
  const continuous = createMemo(() => ({ t, primary: refreshed() ? refreshedPrimary : initialPrimary, secondary: refreshed() ? refreshedSecondary : initialSecondary }));
  const categorical = createMemo(() => refreshed() ? refreshedCategories : initialCategories);
  const movement = createMemo(() => refreshed() ? refreshedMovement : initialMovement);

  async function refresh(): Promise<void> {
    if (pending()) return;
    setPending(true);
    setError(false);
    try {
      const response = await fetch("/api/optimistic", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ reject: reject() }) });
      if (!response.ok) throw new Error(`Chart refresh failed (${response.status})`);
      setRefreshed(true);
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  }

  return <main class="loupe-chart-gallery-page">
    <h1>SVG chart vocabulary</h1>
    <div class="actions"><Button disabled={pending()} onClick={() => void refresh()}>Refresh chart gallery</Button><Checkbox label="Reject next refresh" checked={reject()} onCheckedChange={setReject} /></div>
    <output class="loupe-chart-gallery-status" role="status" aria-live="polite">{pending() ? "Refreshing chart gallery" : error() ? "Refresh failed; accepted charts retained" : ""}</output>
    <ThemeScope theme="graphite" class="loupe-chart-gallery-scope">
      <section class="loupe-chart-gallery-grid">
        <LineChart label="Request rate" summary="Primary remains above secondary; one secondary sample is missing." xLabel="Interval" series={continuousSeries}
          data={continuous()} x={{ type: "number" }} height={240} annotations={[{ x: 5, label: "Deploy", tone: "accent" }]} loading={pending()} table={{ pageSize: 4 }} />
        <AreaChart label="Traffic composition" summary="Primary and secondary form the total, with one explicit gap." xLabel="Interval" series={continuousSeries}
          data={continuous()} x={{ type: "number" }} height={240} stacked loading={pending()} table={{ pageSize: 4 }} />
        <BarChart label="Regional revenue" summary="West leads current revenue; South lacks a prior value." categoryLabel="Region" valueLabel="Revenue" series={categorySeries}
          data={categorical()} y={{ format: { maximumFractionDigits: 0 } }} height={260} arrangement="grouped" loading={pending()} />
        <BarChart label="Regional movement" summary="Positive and negative contribution is stacked around zero." categoryLabel="Region" valueLabel="Change" series={categorySeries}
          data={movement()}
          y={{ format: { maximumFractionDigits: 0 } }} height={260} layout="horizontal" arrangement="stacked" loading={pending()} />
      </section>
    </ThemeScope>
  </main>;
}
