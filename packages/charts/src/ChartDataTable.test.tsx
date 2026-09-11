import { describe, expect, it } from "vitest";
import { renderToString } from "solid-js/web";
import { ThemeProvider, ThemeScope } from "@gemologic/sheen";
import { ChartDataTable } from "./ChartDataTable.tsx";
import { defineSeries } from "./chart-types.ts";
import { createChartTableFormatters } from "./format.ts";
import type { ChartData, ChartDataTableProps } from "./chart-types.ts";

const series = defineSeries([
  { key: "latency", label: "p99 latency", color: "chart-3" },
  { key: "errors", label: "Error rate", color: "market-down" },
]);

function makeData(length: number): ChartData {
  const t = new Float64Array(length);
  const latency = new Float64Array(length);
  const errors = new Float64Array(length);
  for (let index = 0; index < length; index++) {
    t[index] = Date.UTC(2024, 0, 1, 0, index);
    latency[index] = index === 1 ? Number.NaN : index + 10;
    errors[index] = index / 100;
  }
  return { t, latency, errors };
}

describe("ChartDataTable", () => {
  it("server-renders a bounded native table with localized time, gaps, and pagination", () => {
    const data = makeData(5);
    const html = renderToString(() => <ThemeProvider><ThemeScope locale="de-DE" messages={{
      chartViewAsTable: "Daten als Tabelle", chartMissingValue: "Fehlender Wert", chartTablePagination: "Diagrammdatenseiten",
    }}><ChartDataTable label="API-Latenz" summary="Die Latenz sank; ein Messwert fehlt." xLabel="Zeit"
      series={series} data={data} x={{ type: "time", tz: "America/New_York" }} y={{ format: "duration" }} pageSize={2} /></ThemeScope></ThemeProvider>);
    const expectedTime = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "medium", timeZone: "America/New_York" }).format(data.t[0]);
    expect(html).toContain("<details");
    expect(html).toContain("Daten als Tabelle");
    expect(html).toContain("API-Latenz");
    expect(html).toContain('class="sheen-chart-data-scroll" tabindex="0" aria-label="API-Latenz"');
    expect(html).toContain(expectedTime);
    expect(html).toContain("Fehlender Wert");
    expect(html.match(/data-chart-row=/gu)).toHaveLength(2);
    expect(html).toContain('aria-label="Diagrammdatenseiten"');
    expect(html).toContain("Page 1 of 3");
  });

  it("renders a deterministic empty result without pagination", () => {
    const html = renderToString(() => <ThemeProvider><ChartDataTable label="Empty chart" summary="No samples are available." xLabel="Time"
      series={series} data={makeData(0)} x={{ type: "time" }} /></ThemeProvider>);
    expect(html).toContain("Nothing here yet");
    expect(html).not.toContain("sheen-chart-data-pagination");
    expect(html).toContain("<thead");
  });

  it("formats numeric domains and supported value roles through Intl", () => {
    const percent = createChartTableFormatters("en-US", { type: "number", format: { maximumFractionDigits: 1 } }, { format: "percent" });
    expect(percent.x(1.25)).toBe("1.3");
    expect(percent.value(0.125)).toBe("13%");
    const bytes = createChartTableFormatters("en-US", { type: "number" }, { format: "bytes" });
    expect(bytes.value(1024)).toContain("1,024");
  });

  it("rejects invalid descriptions, page bounds, axes, and columnar data", () => {
    const common = { label: "Chart", summary: "Summary", xLabel: "Time", series, data: makeData(2), x: { type: "time" } } satisfies ChartDataTableProps;
    expect(() => renderToString(() => <ThemeProvider><ChartDataTable {...common} summary=" " /></ThemeProvider>)).toThrow("summary");
    expect(() => renderToString(() => <ThemeProvider><ChartDataTable {...common} pageSize={201} /></ThemeProvider>)).toThrow("pageSize");
    expect(() => renderToString(() => <ThemeProvider><ChartDataTable {...common} x={{ type: "time", tz: "Mars/Olympus" }} /></ThemeProvider>)).toThrow("timezone");
    expect(() => renderToString(() => <ThemeProvider><ChartDataTable {...common} data={{ ...common.data, latency: new Float64Array([1]) }} /></ThemeProvider>)).toThrow("length");
    // @ts-expect-error Runtime validation also protects JavaScript consumers.
    expect(() => createChartTableFormatters("en-US", { type: "category" })).toThrow("time or number");
  });
});
