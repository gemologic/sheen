# @gemologic/sheen-charts

Accessible SVG and canvas chart components for Sheen SolidJS applications. Time columns use increasing UTC epoch milliseconds, `NaN` renders a visible gap, and theme refresh redraws retained canvases without remounting.

## Install

```sh
pnpm add @gemologic/sheen-charts @gemologic/sheen @gemologic/sheen-tokens solid-js
```

Load `@gemologic/sheen-charts/styles.css` after the token and base UI styles.

## Use

Use `Sparkline` and `Stat` from `./svg`, accessible line/area/bar charts from `./charts-svg`, and the canvas `TimeSeries` from `./time-series`. Streaming helpers live in `./streaming`; importing an SVG-only entry does not retain uPlot.

Every visual chart exposes a native data-table alternative. Time columns are strictly increasing UTC epoch milliseconds in `Float64Array`; timezone changes formatting only. `NaN` breaks lines and area fills, while `undefined` is rejected. Canvas charts redraw from the shared token bridge and retain their DOM owner during theme changes and accepted refreshes.

See the [chart data contract](https://github.com/gemologic/sheen/blob/main/docs/chart-data.md), [display guide](https://github.com/gemologic/sheen/blob/main/docs/chart-display.md), and [streaming policy](https://github.com/gemologic/sheen/blob/main/docs/streaming-charts.md).
