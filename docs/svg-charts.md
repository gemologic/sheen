# SVG charts

Import `LineChart`, `AreaChart`, `BarChart`, `DonutChart`, `ScatterChart`, `Heatmap`, `Histogram`, and `Gauge` from `@gemologic/sheen-charts/charts-svg`. The dedicated entry contains the bounded SVG vocabulary and its `d3-scale`/`d3-shape` implementation. It does not retain uPlot, and every export tree-shakes independently. Isolated consumer qualification measures the line/area/bar import plus shared chart CSS at 30,642 gzip bytes against a 35,000-byte gate, and gates each newer chart as a single-component import plus chart CSS:

| Import | Engine retained | Measured | Gate |
| --- | --- | ---: | ---: |
| `DonutChart` | `d3-shape` | 16,447 | 20,000 |
| `ScatterChart` | `d3-scale` | 23,239 | 28,000 |
| `Heatmap` | none | 13,074 | 16,000 |
| `Histogram` | `d3-scale` | 25,000 | 30,000 |
| `Gauge` | `d3-shape` | 10,373 | 13,000 |

`LineChart` and `AreaChart` consume the time-indexed columnar contract. A `NaN` creates a real path break. Area fills terminate at the same boundary. Stacked areas accumulate positive and negative values independently instead of allowing one sign to cancel the other. Linear and step curves are supported. Horizontal grid lines are the default, and annotations use a separate non-color tone marker.

`BarChart` consumes `ChartCategoricalData`, with ordered unique category labels and one typed value column per declared series. Grouped and stacked arrangements work in vertical and horizontal layouts. Stacks maintain separate positive and negative accumulators around a visible zero baseline. A missing value creates no bar and remains an explicit localized missing value in the native table.

## Parts of a whole

`DonutChart` takes one `ChartSeries` per part and a `Float64Array` of values in series order, drawn clockwise from twelve o'clock in declaration order. Values must be non-negative; `NaN` draws no slice and remains a missing value in the table. At most eight parts are accepted, matching the categorical token ceiling; fold a long tail into an Other part, and prefer `BarChart` when readers must compare close values. `innerRadius` is a fraction of the outer radius from 0 to 0.85 (default 0.62); 0 renders a pie with no center slot. The donut hole shows the visible total and `valueLabel` by default, and `center` replaces it. Slices are separated by a fixed 2-pixel geometric gap rather than a surface-colored stroke, so they read on any surface. Legend toggles hide parts and recompute the geometry, center total, and tooltip share from the visible parts; the native table keeps every part with its share of the complete total.

## Scatter

`ScatterChart` takes per-series `x`, `y`, and optional `size` `Float64Array` columns of equal length. Neither axis is a time column, so x values need not be ordered. A `NaN` x or y omits that point from the plot but keeps it in the table. Each series receives a distinct point shape (circle, square, triangle, diamond) as a non-color encoding, and the legend shows the same shape. The optional `size` option names the channel, formats it, and maps values to a marker radius range (default 3 to 14 pixels) on a square-root scale so marker area is proportional to the value. Size columns are required for every series when the option is set and rejected otherwise. Pointer inspection picks the nearest visible point within 24 pixels; Left and Right step through visible points in ascending x order.

## Heatmap

`Heatmap` takes unique `x` and `y` category labels and row-major `values` where `values[yIndex * x.length + xIndex]` is a cell. Color is one sequential hue from a chart token (`chart-1` by default) quantized into five equal-interval classes over `domain`, which defaults to the finite data extent; values outside an explicit domain clamp to the end classes. Each class mixes the hue with transparency (14% to 100%) so lightness stays monotonic against whatever surface the chart sits on, in both modes, without a new token ramp. `NaN` cells render as a dashed empty cell and a visible missing-value key entry. The scale key labels each class boundary. Keyboard inspection is two-dimensional: Arrow keys move between cells, Home and End reach row edges, and Escape clears. The native table is the matrix itself, with y categories as row headers.

## Histogram

`Histogram` bins raw `Float64Array` observations with the exported `binValues(values, bins)` and renders the counts through the `BarChart` geometry, inspection, and table with near-adjacent bars. Binning is deterministic: a numeric `bins` requests approximately that many equal-width bins on nice boundaries covering the data extent (`d3-scale` `nice` and `ticks`); the default count is Sturges' rule, `ceil(log2(n) + 1)` over finite values. Explicit strictly increasing edges are used exactly. Every bin is half-open `[start, end)` except the last, which also includes its upper edge. `NaN` values are never counted, and finite values outside explicit edges are excluded; `binValues` reports both counts so the summary can state them. Constant data produces one bin labeled by its value. Bin labels must stay unique after formatting.

## Gauge

`Gauge` shows one bounded reading on a 240-degree arc with the exact formatted value as visible text. `min` and `max` are required. `thresholds` are strictly ascending in-range band starts, each with a `success`, `warning`, or `danger` tone and a visible label. With the default `thresholdDirection="ascending"` a band applies at or above its value; `descending` applies it at or below its value for readings where lower is worse. The track tints each band, the fill takes the active band's tone (or `color` when none is active), and the band label is shown beneath the value, so state never depends on color alone. Out-of-range readings clamp the arc and `aria-valuenow` but keep their exact text; `NaN` renders an empty arc and localized missing-value text. The root exposes `role="meter"` with `aria-valuetext` that includes the band label. A gauge is not interactive and has no table, because the value and band are already text.

## Limits and lifecycle

The SVG renderer rejects workloads over 2,000 potential marks. Larger time-series workloads belong in `TimeSeries`; applications must aggregate or choose a different approved vocabulary for larger categorical workloads. The chart height is required and reserved in server markup. Server coordinates start at a deterministic 640-pixel reference width. After hydration, a `ResizeObserver` coalesces measurements through `requestAnimationFrame` and updates the view box to the actual CSS width, so text is not stretched. Figure, SVG, path, bar, disclosure, table, and surviving row identities remain stable through resize and accepted refreshes.

Every full chart has a required label and narrative summary, exposes the plot as an accessible image, and composes a bounded native-table disclosure. The table includes every declared series, preserves `NaN` as a visible em dash plus localized missing-value text, and paginates only the accepted in-memory snapshot. Loading marks retained charts and tables busy; it never replaces them with a skeleton or blank state.

Inspection is a separate retained overlay, not part of the path, bar, slice, point, or cell geometry. Pointer movement updates one DOM tooltip and either a continuous crosshair or categorical inspection band without replacing chart nodes. The plot is one keyboard tab stop: Left and Right inspect adjacent samples or categories, Home and End jump to the boundaries, and Escape clears inspection. A polite offscreen status announces the same localized values. Legend buttons expose pressed state, update geometry without replacing it, and never remove a hidden series from the native table. Setting `tooltip={false}` removes the inspection tab stop and handlers while retaining the table alternative.

Local Chromium qualification covers line and area gaps, responsive grouped/stacked/horizontal bars, pointer and keyboard inspection, retained tooltip overlays, legend toggles, native data output, twenty sampled refresh frames, failed-refresh retention, delayed hydration, phone-to-desktop resize identity, axe, and a reviewed dark visual baseline. Chrome DevTools reports Lighthouse accessibility 100, best practices 100, no console warnings or errors, 77 ms local LCP, and zero layout shift. These are local Chromium results, not WebKit, physical Safari, Firefox, hosted CI, or manual assistive-technology proof.

That browser qualification covers `LineChart`, `AreaChart`, and `BarChart`. `DonutChart`, `ScatterChart`, `Heatmap`, `Histogram`, `Gauge`, and `BarSparkline` currently have server-render unit coverage (marks, gaps, tables, keyboard attributes, validation, binning, and meter semantics) and a reviewed static dark/light server render; their Loupe fixture and Chromium interaction, refresh, and hydration spec are not yet landed.

The newer charts add three optional scoped messages with English defaults: `chartGridKeyboardInstructions` (heatmap keyboard help), `chartSeriesColumn` (scatter table row header), and `chartShareColumn` (donut table and tooltip share label).
