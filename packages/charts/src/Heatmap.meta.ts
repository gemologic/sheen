import { defineMeta } from "../../ui/src/metadata.ts";
import type { HeatmapProps } from "./chart-types.ts";

export default defineMeta<HeatmapProps>({
  name: "Heatmap", package: "@gemologic/sheen-charts", category: "data", summary: "Shows a bounded categorical x by y matrix with a five-step single-hue sequential scale, a visible scale key, and a native matrix table.",
  props: {
    label: { description: "Required visible and accessible chart name." }, summary: { description: "Required narrative interpretation." },
    xLabel: { description: "Required horizontal category axis label." }, yLabel: { description: "Required vertical category axis and table row-header label." },
    valueLabel: { description: "Required label for the measured value in the scale key and tooltip." },
    data: { description: "Unique x and y category labels plus row-major Float64 values of length x × y; NaN is a hatched missing cell." },
    color: { description: "Single chart token for the sequential hue; steps mix it with transparency so they read on any surface.", default: "chart-1" },
    domain: { description: "Optional ascending color-scale domain; defaults to the finite data extent and clamps outliers to the end steps." },
    format: { description: "Value formatting for the scale key, tooltip, and table.", default: "number" },
    height: { description: "Reserved SVG height, at least 160 CSS pixels." }, legend: { description: "Whether the sequential scale key is shown.", default: true, control: { kind: "boolean" } },
    tooltip: { description: "Whether single-tab-stop pointer and two-dimensional keyboard cell inspection is enabled.", default: true }, empty: { description: "Optional content when the matrix has no cells." },
    loading: { description: "Marks retained accepted content busy.", default: false }, table: { description: "Native-table disclosure label and bounded page size." }, class: { description: "Optional class appended to the figure." },
  },
  tokens: ["--sheen-chart-1", "--sheen-chart-grid", "--sheen-chart-axis", "--sheen-color-fg", "--sheen-color-fg-muted"],
  a11y: { role: "labeled SVG image with visible narrative, scale key, and native matrix table disclosure", keyboard: ["Focus the plot and use the Arrow keys to move between cells, Home/End for row edges, and Escape to clear.", "Use the native view-as-table disclosure for every exact cell value."] },
  examples: [{ title: "Errors by weekday and hour", setup: "const errorGrid = { x: ['00', '06', '12', '18'], y: ['Mon', 'Tue', 'Wed'], values: new Float64Array([2, 4, 9, 5, 1, 3, 12, 6, 2, Number.NaN, 8, 4]) };", code: '<Heatmap label="Errors by weekday and hour" summary="Errors peak around midday; one Wednesday bucket was not collected." xLabel="Hour (UTC)" yLabel="Day" valueLabel="Errors" data={errorGrid} height={220} />' }],
  guidance: { do: ["Use one hue for magnitude and keep missing cells as NaN.", "Set an explicit domain when several heatmaps must be compared."], dont: ["Do not use categorical or status colors for magnitude.", "Do not exceed 2,000 cells; aggregate first."] },
});
