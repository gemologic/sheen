import { describe, expect, it } from "vitest";
import { renderToString } from "solid-js/web";
import { ThemeProvider, ThemeScope } from "@gemologic/sheen";
import { TimeSeries } from "./TimeSeries.tsx";
import { defineSeries } from "./chart-types.ts";
import type { ChartData, TimeSeriesProps, TimeSeriesUPlotOptions } from "./chart-types.ts";

const series = defineSeries([
  { key: "p50", label: "p50", color: "chart-1" },
  { key: "p99", label: "p99", color: "chart-3" },
]);

const data: ChartData = {
  t: new Float64Array([Date.UTC(2024, 0, 1), Date.UTC(2024, 0, 1, 0, 1), Date.UTC(2024, 0, 1, 0, 2)]),
  p50: new Float64Array([18, 16, 15]),
  p99: new Float64Array([42, Number.NaN, 34]),
};

const common = {
  label: "API latency",
  summary: "Latency declined; one p99 sample is missing.",
  xLabel: "Time",
  series,
  data,
  x: { type: "time", tz: "UTC" },
  y: { format: "duration" },
  height: 220,
} satisfies TimeSeriesProps;

describe("TimeSeries", () => {
  it("server-renders a complete sized fallback with explicit gaps and the native table", () => {
    const html = renderToString(() => <ThemeProvider><ThemeScope theme="slate" locale="en-US"><TimeSeries {...common} /></ThemeScope></ThemeProvider>);
    expect(html).toContain("<figure");
    expect(html).toContain("API latency");
    expect(html).toContain("Latency declined; one p99 sample is missing.");
    expect(html).toContain('style="height:220px"');
    expect(html).toContain("sheen-time-series-fallback");
    expect(html).toContain('data-series="p99"');
    expect(html.match(/data-series="p99"[^>]*d="[^"]*M/gu)).toHaveLength(1);
    expect(html).toContain("sheen-chart-data");
    expect(html).toContain("Missing value");
    expect(html).not.toContain('data-enhanced="true"');
    expect(html).not.toContain('class="uplot"');
  });

  it("renders deterministic empty content and rejects invalid public input", () => {
    const empty = { t: new Float64Array(), p50: new Float64Array(), p99: new Float64Array() };
    const html = renderToString(() => <ThemeProvider><TimeSeries {...common} data={empty} empty={<p>No chart samples</p>} /></ThemeProvider>);
    expect(html).toContain("No chart samples");
    expect(html).not.toContain("sheen-chart-fallback-line");
    expect(() => renderToString(() => <ThemeProvider><TimeSeries {...common} height={0} /></ThemeProvider>)).toThrow("positive finite");
    expect(() => renderToString(() => <ThemeProvider><TimeSeries {...common} summary=" " /></ThemeProvider>)).toThrow("summary");
  });

  it("types the unsafe seam while reserving lifecycle-owned options", () => {
    const options = { pxAlign: true, padding: [8, 8, 8, 8] } satisfies TimeSeriesUPlotOptions;
    expect(options.pxAlign).toBe(true);
    const invalid = {
      // @ts-expect-error Width belongs to the Sheen lifecycle.
      width: 100,
    } satisfies TimeSeriesUPlotOptions;
    expect(invalid.width).toBe(100);
  });
});
