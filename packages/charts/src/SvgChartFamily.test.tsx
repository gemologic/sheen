import { describe, expect, it } from "vitest";
import { renderToString } from "solid-js/web";
import { ThemeProvider, ThemeScope } from "@gemologic/sheen";
import { BarSparkline, barSparklinePath } from "./BarSparkline.tsx";
import { DonutChart } from "./DonutChart.tsx";
import { Gauge } from "./Gauge.tsx";
import { Heatmap, heatmapStep } from "./Heatmap.tsx";
import { Histogram, binValues } from "./Histogram.tsx";
import { ScatterChart } from "./ScatterChart.tsx";
import { defineSeries } from "./chart-types.ts";

const parts = defineSeries([
  { key: "hot", label: "Hot", color: "chart-1" },
  { key: "warm", label: "Warm", color: "chart-2" },
  { key: "cold", label: "Cold", color: "chart-3" },
]);

describe("DonutChart", () => {
  it("renders SSR-complete slices, a center total, swatch legend, and a share table with missing parts", () => {
    const html = renderToString(() => <ThemeProvider><ThemeScope locale="de-DE"><DonutChart label="Storage" summary="Hot leads." categoryLabel="Tier" valueLabel="Terabytes"
      series={parts} values={new Float64Array([60, 40, Number.NaN])} height={240} /></ThemeScope></ThemeProvider>);
    expect(html).toContain("sheen-donut-chart");
    expect(html).toContain('data-shape="donut"');
    expect(html.match(/data-part-index=/gu)).toHaveLength(3);
    expect(html).toMatch(/data-part-index="2"[^>]*data-hidden="true"[^>]*d=""/u);
    expect(html).toContain('class="sheen-donut-total">100<');
    expect(html).toContain('data-shape="square"');
    expect(html).toMatch(/>60\s%</u);
    expect(html).toContain("Missing value");
    expect(html).toContain('aria-keyshortcuts="ArrowLeft ArrowRight Home End Escape"');
  });

  it("renders a pie without a center slot and rejects invalid parts", () => {
    const pie = renderToString(() => <ThemeProvider><DonutChart label="Storage" summary="Pie." categoryLabel="Tier" valueLabel="TB"
      series={parts} values={new Float64Array([1, 2, 3])} innerRadius={0} height={200} /></ThemeProvider>);
    expect(pie).toContain('data-shape="pie"');
    expect(pie).not.toContain("sheen-donut-center");
    expect(() => renderToString(() => <ThemeProvider><DonutChart label="S" summary="S." categoryLabel="T" valueLabel="V"
      series={parts} values={new Float64Array([1, -2, 3])} height={200} /></ThemeProvider>)).toThrow("non-negative");
    expect(() => renderToString(() => <ThemeProvider><DonutChart label="S" summary="S." categoryLabel="T" valueLabel="V"
      series={parts} values={new Float64Array([1, 2])} height={200} /></ThemeProvider>)).toThrow("length must equal");
  });
});

describe("ScatterChart", () => {
  const series = defineSeries([{ key: "east", label: "East", color: "chart-1" }, { key: "west", label: "West", color: "chart-4" }]);
  it("draws shape-encoded points, omits NaN coordinates, and lists every point in the table", () => {
    const html = renderToString(() => <ThemeProvider><ScatterChart label="Load" summary="Latency rises with load." xLabel="Requests" yLabel="Latency" series={series}
      data={{ east: { x: new Float64Array([1, 2]), y: new Float64Array([3, 4]), size: new Float64Array([1, 9]) }, west: { x: new Float64Array([Number.NaN, 5]), y: new Float64Array([1, 2]), size: new Float64Array([4, Number.NaN]) } }}
      size={{ label: "Hosts" }} height={240} /></ThemeProvider>);
    expect(html).toContain("sheen-scatter-chart");
    expect(html.match(/data-shape="circle"/gu)?.length).toBeGreaterThanOrEqual(2);
    expect(html).toContain('data-shape="square"');
    expect(html).toMatch(/data-series-index="1" data-row="0"[^>]*data-hidden="true"[^>]*d=""/u);
    expect(html.match(/data-chart-row=/gu)).toHaveLength(4);
    expect(html).toContain("Hosts");
  });

  it("requires size columns to match the size option", () => {
    expect(() => renderToString(() => <ThemeProvider><ScatterChart label="L" summary="S." xLabel="X" yLabel="Y" series={series}
      data={{ east: { x: new Float64Array([1]), y: new Float64Array([1]) }, west: { x: new Float64Array([1]), y: new Float64Array([1]) } }} size={{ label: "Hosts" }} height={240} /></ThemeProvider>)).toThrow("requires a size column");
    expect(() => renderToString(() => <ThemeProvider><ScatterChart label="L" summary="S." xLabel="X" yLabel="Y" series={series}
      data={{ east: { x: new Float64Array([1, 2]), y: new Float64Array([1]) }, west: { x: new Float64Array([1]), y: new Float64Array([1]) } }} height={240} /></ThemeProvider>)).toThrow("length must equal");
  });
});

describe("Heatmap", () => {
  it("assigns equal-interval sequential steps and keeps NaN cells as hatched missing values", () => {
    expect([0, 1.9, 2, 9.99, 10, 12, -4].map(value => heatmapStep(value, [0, 10]))).toEqual([0, 0, 1, 4, 4, 4, 0]);
    const html = renderToString(() => <ThemeProvider><Heatmap label="Errors" summary="Midday peak." xLabel="Hour" yLabel="Day" valueLabel="Errors"
      data={{ x: ["00", "12"], y: ["Mon", "Tue"], values: new Float64Array([0, 10, Number.NaN, 5]) }} height={200} /></ThemeProvider>);
    expect(html.match(/class="sheen-chart-mark sheen-heatmap-cell"/gu)).toHaveLength(4);
    expect(html).toContain('data-step="missing"');
    expect(html).toContain('data-x="12" data-y="Mon" data-value="10"');
    expect(html).toContain("sheen-heatmap-scale");
    expect(html).toContain("ArrowUp ArrowDown");
    expect(html).toContain("Use the Arrow keys");
    expect(() => renderToString(() => <ThemeProvider><Heatmap label="E" summary="S." xLabel="X" yLabel="Y" valueLabel="V"
      data={{ x: ["a"], y: ["b"], values: new Float64Array([1, 2]) }} height={200} /></ThemeProvider>)).toThrow("x length × y length");
  });
});

describe("Histogram", () => {
  it("bins deterministically on nice edges with a closed last bin and reports excluded values", () => {
    const values = new Float64Array([0, 1, 9.99, 10, 19, 20, Number.NaN]);
    const binning = binValues(values, 2);
    expect([...binning.edges]).toEqual([0, 10, 20]);
    expect([...binning.counts]).toEqual([3, 3]);
    expect(binning.missing).toBe(1);
    expect(binValues(values, 2)).toEqual(binning);
    const explicit = binValues(values, [5, 10, 15]);
    expect([...explicit.counts]).toEqual([1, 1]);
    expect(explicit.outside).toBe(4);
    expect([...binValues(new Float64Array([4, 4])).counts]).toEqual([2]);
    expect(() => binValues(values, [3, 3])).toThrow("strictly increasing");
    expect(() => binValues(values, 0)).toThrow("bin count");
  });

  it("renders adjacent bars labeled by bin range with an integer count table", () => {
    const html = renderToString(() => <ThemeProvider><Histogram label="Response times" summary="Most are fast." valueLabel="Milliseconds" countLabel="Requests"
      values={new Float64Array([1, 2, 12, 15, 18])} bins={2} height={220} /></ThemeProvider>);
    expect(html).toContain("sheen-histogram");
    expect(html).toContain('data-category="0–10"');
    expect(html).toContain('data-category="10–20"');
    expect(html).not.toContain('class="sheen-chart-legend"');
    expect(html).toContain("Requests");
  });
});

describe("BarSparkline", () => {
  it("anchors bars at zero and leaves NaN slots empty", () => {
    const path = barSparklinePath(new Float64Array([2, Number.NaN, -2]), 30, 20);
    expect(path.match(/M/gu)).toHaveLength(2);
    expect(path).toBe("M1 0h8V10h-8ZM21 10h8V20h-8Z");
    const html = renderToString(() => <BarSparkline values={new Float64Array([1, 3])} label="Deploys" color="chart-2" />);
    expect(html).toContain('data-variant="bar"');
    expect(html).toContain('aria-label="Deploys"');
    expect(() => barSparklinePath(new Float64Array([Number.POSITIVE_INFINITY]), 10, 10)).toThrow("finite or NaN");
  });
});

describe("Gauge", () => {
  const thresholds = [{ value: 70, tone: "warning", label: "High" }, { value: 90, tone: "danger", label: "Critical" }] satisfies Parameters<typeof Gauge>[0]["thresholds"];
  it("exposes a meter with the active band label and clamps out-of-range arcs", () => {
    const html = renderToString(() => <ThemeProvider><Gauge label="Disk" value={95} min={0} max={100} thresholds={thresholds} /></ThemeProvider>);
    expect(html).toContain('role="meter"');
    expect(html).toContain('aria-valuenow="95"');
    expect(html).toContain('aria-valuetext="95, Critical"');
    expect(html).toContain('data-tone="danger"');
    expect(html).toContain("sheen-gauge-band");
    const over = renderToString(() => <ThemeProvider><Gauge label="Disk" value={120} min={0} max={100} /></ThemeProvider>);
    expect(over).toContain('aria-valuenow="100"');
    expect(over).toContain(">120<");
  });

  it("supports descending thresholds and missing readings", () => {
    const low = renderToString(() => <ThemeProvider><Gauge label="Battery" value={8} min={0} max={100} thresholdDirection="descending"
      thresholds={[{ value: 10, tone: "danger", label: "Critical" }, { value: 25, tone: "warning", label: "Low" }]} /></ThemeProvider>);
    expect(low).toContain('aria-valuetext="8, Critical"');
    const missing = renderToString(() => <ThemeProvider><Gauge label="Battery" value={Number.NaN} min={0} max={100} /></ThemeProvider>);
    expect(missing).toContain('aria-valuetext="Missing value"');
    expect(missing).toContain("data-missing");
    expect(() => renderToString(() => <ThemeProvider><Gauge label="B" value={1} min={0} max={100} thresholds={[{ value: 50, tone: "warning", label: "A" }, { value: 40, tone: "danger", label: "B" }]} /></ThemeProvider>)).toThrow("strictly ascending");
  });
});
