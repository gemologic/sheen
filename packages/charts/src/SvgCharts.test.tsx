import { describe, expect, it } from "vitest";
import { renderToString } from "solid-js/web";
import { ThemeProvider, ThemeScope } from "@gemologic/sheen";
import { AreaChart, LineChart } from "./ContinuousSvgChart.tsx";
import { BarChart } from "./BarChart.tsx";
import { defineSeries } from "./chart-types.ts";

const series = defineSeries([
  { key: "primary", label: "Primary", color: "chart-1" },
  { key: "secondary", label: "Secondary", color: "chart-3" },
]);
const continuous = {
  t: new Float64Array([1, 2, 3, 4]),
  primary: new Float64Array([2, 4, 3, 5]),
  secondary: new Float64Array([1, Number.NaN, 2, 3]),
};
const categorical = {
  categories: ["North", "South", "West"],
  values: { primary: new Float64Array([2, 4, -3]), secondary: new Float64Array([1, Number.NaN, -2]) },
};

describe("SVG charts", () => {
  it("renders localized line paths with a real NaN break, annotations, legend, and native table", () => {
    const html = renderToString(() => <ThemeProvider><ThemeScope locale="de-DE" messages={{ chartMissingValue: "Fehlender Wert" }}><LineChart label="Latency" summary="One sample is missing." xLabel="Minute"
      series={series} data={continuous} x={{ type: "number" }} y={{ format: "duration" }} height={240} annotations={[{ x: 3, label: "Deploy", tone: "warning" }]} /></ThemeScope></ThemeProvider>);
    expect(html).toContain("sheen-line-chart");
    expect(html).toContain('data-series="secondary"');
    expect(html.match(/data-series="secondary"[\s\S]*?class="sheen-chart-series-line"[^>]*d="[^"]*M[^"]*M/u)).toHaveLength(1);
    expect(html).toContain("Deploy");
    expect(html).toContain("sheen-chart-legend");
    expect(html).toContain("sheen-chart-data");
    expect(html).toContain("Fehlender Wert");
    expect(html).toContain('aria-keyshortcuts="ArrowLeft ArrowRight Home End Escape"');
    expect(html).toContain("Use Left and Right Arrow");
    expect(html).toContain('class="sheen-chart-tooltip" hidden');
  });

  it("terminates area fills at gaps and stacks positive and negative values separately", () => {
    const html = renderToString(() => <ThemeProvider><AreaChart label="Traffic" summary="Traffic by interval." xLabel="Interval"
      series={series} data={continuous} x={{ type: "number" }} height={240} stacked /></ThemeProvider>);
    expect(html).toContain("sheen-area-chart");
    expect(html).toContain("sheen-chart-series-area");
    expect(html.match(/class="sheen-chart-series-area"[^>]*d="[^"]*M[^"]*M/u)).toHaveLength(1);
  });

  it("renders grouped, stacked, and horizontal bars from explicit category labels", () => {
    const grouped = renderToString(() => <ThemeProvider><BarChart label="Revenue" summary="Revenue by region." categoryLabel="Region" valueLabel="Revenue"
      series={series} data={categorical} height={260} /></ThemeProvider>);
    expect(grouped).toContain('data-arrangement="grouped"');
    expect(grouped.match(/data-category=/gu)).toHaveLength(5);
    expect(grouped).toContain('data-category="West" data-value="-3"');
    expect(grouped).toContain("Missing value");
    const horizontal = renderToString(() => <ThemeProvider><BarChart label="Revenue" summary="Revenue by region." categoryLabel="Region" valueLabel="Revenue"
      series={series} data={categorical} height={260} layout="horizontal" arrangement="stacked" /></ThemeProvider>);
    expect(horizontal).toContain('data-layout="horizontal"');
    expect(horizontal).toContain('data-arrangement="stacked"');
    expect(horizontal).toContain("rotate(-90");
    expect(horizontal).toContain('tabindex="0"');
  });

  it("removes the inspection tab stop when tooltips are disabled", () => {
    const html = renderToString(() => <ThemeProvider><LineChart label="Latency" summary="No inspection." xLabel="Minute"
      series={series} data={continuous} x={{ type: "number" }} height={240} tooltip={false} /></ThemeProvider>);
    expect(html).not.toContain("aria-keyshortcuts");
    expect(html).not.toMatch(/<svg[^>]*tabindex/u);
  });

  it("rejects unsafe SVG workloads and invalid dimensions", () => {
    const categories = Array.from({ length: 1_001 }, (_, index) => `Category ${index}`);
    const values = new Float64Array(categories.length);
    expect(() => renderToString(() => <ThemeProvider><BarChart label="Large" summary="Too large." categoryLabel="Category" valueLabel="Value"
      series={series} data={{ categories, values: { primary: values, secondary: values } }} height={260} /></ThemeProvider>)).toThrow("2000 SVG marks");
    expect(() => renderToString(() => <ThemeProvider><LineChart label="Short" summary="Short." xLabel="X" series={series} data={continuous} x={{ type: "number" }} height={100} /></ThemeProvider>)).toThrow("at least 120");
  });
});
