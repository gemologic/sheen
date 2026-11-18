---
"@gemologic/sheen-charts": minor
---

Add `DonutChart` (with pie via `innerRadius={0}`), `ScatterChart`, `Heatmap`, `Histogram` with the deterministic `binValues` helper, `Gauge`, and `BarSparkline`. The SVG charts share the existing figure, summary, legend, inspection, and native-table contracts; `BarSparkline` is a separate component so line-only `Sparkline` consumers keep their bundle size.
