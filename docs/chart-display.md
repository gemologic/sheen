# Dependency-free chart display

Import small inline displays from `@gemologic/sheen-charts/svg`. This entry has no uPlot or d3 runtime and remains separately budgeted from full chart renderers.

`Sparkline` accepts only a `Float64Array`, a required accessible label, a semantic color token name, and optional positive finite intrinsic dimensions. It normalizes finite values into one inline SVG path. `NaN` closes the current path segment, so the following finite value begins with a new move command; empty and all-gap inputs retain the sized SVG with an empty path. Infinities and non-typed-array values fail instead of being coerced.

`Stat` renders a native term/definition pair. A directional trend requires visible `trendLabel` text; the arrow is hidden from accessibility APIs and color is supplementary. `StatGroup` requires at least one stat and supplies a labeled grouping surface. Numeric figures use tabular roles, and the group inherits market/text/surface tokens from its actual `ThemeScope`.

## Native data alternative

`ChartDataTable` is exported from `@gemologic/sheen-charts/table` and the package root. It requires a table label, narrative summary, domain-column label, series definitions, columnar data, and the same axis formatting used by the chart. A native `details`/`summary` disclosure works before JavaScript and keeps its table mounted through hydration and refresh. Future full chart components require `label`, `summary`, and `xLabel`, and compose this alternative by default rather than making accessibility opt-in.

The table mounts 50 rows per page by default, accepts a page size from 1 through 200, and paginates only the accepted in-memory snapshot. This keeps the 100k-point chart case from creating 100k DOM rows. It includes every declared series, including a visually hidden series, because the alternative describes the complete accepted dataset.

Formatting always uses the locale from the effective `ThemeProvider` or `ThemeScope`. Time axes default to UTC and accept an explicit IANA timezone for display only. A `duration` value is milliseconds, `percent` expects a fractional value such as `0.18`, `bytes` is formatted as a byte unit, and an `Intl.NumberFormatOptions` object is passed through directly. `NaN` renders as an em dash for sighted users and localized “Missing value” text for assistive technology. `chartViewAsTable`, `chartMissingValue`, and `chartTablePagination` may be supplied through scoped provider messages; English package defaults remain tree-shakeable.

The installed-consumer checks gate a minified `Sparkline` JavaScript import below 1,000 gzip bytes after removing bundler-generated region comments. The current result is 997 bytes. The complete SVG entry plus its stylesheet is 2,630 gzip bytes against the 20,000-byte SVG-only budget. The dedicated table entry plus chart CSS is 5,621 gzip bytes against the same ceiling. Both retained module graphs reject uPlot and d3.

Loupe’s `/chart-svg` fixture uses a real delayed endpoint. Accepted paths, stat roots, the disclosure, the table, and visible row nodes remain mounted and nonblank through refresh; a rejected refresh keeps the exact accepted path and values. Dark SSR produces the complete sized SVG/stat/table markup. The fixture opens the native disclosure while scripts are blocked, then delayed hydration preserves its open state and exact nodes. Five Chromium cases pass, including localized pagination/gaps and a reviewed dark visual baseline; WebKit remains a release qualification boundary.
