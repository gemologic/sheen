# Chart data contract

`@gemologic/sheen-charts/core` is the renderer-free data entry point. Time-indexed charts use one `Float64Array` named `t` plus one equal-length `Float64Array` for every declared series. `t` contains finite, strictly increasing UTC milliseconds since epoch. Values are finite numbers or `NaN`; `NaN` is the only gap sentinel and must never be coerced to zero or interpolated.

```ts
const series = defineSeries([
  { key: "p50", label: "p50", color: "chart-1" },
  { key: "p99", label: "p99", color: "chart-3" },
]);

const data = toColumnar(rows, {
  timestamp: row => row.recordedAtMs,
  series: [
    { key: "p50", label: "p50", color: "chart-1", value: row => row.p50 },
    { key: "p99", label: "p99", color: "chart-3", value: row => row.p99 },
  ],
});
```

`defineSeries` rejects empty definitions, duplicate or unsafe keys, the reserved `t` key, empty labels, colors outside the semantic chart/market/accent vocabulary, and unsupported non-color encodings. `encoding` accepts `solid`, `dashed`, `dotted`, or `dash-dot`; omitted encodings follow a deterministic four-style index cycle. Repeat a categorical color only with an explicit different encoding, especially after the eight-color palette is exhausted. Canvas, SVG fallback, bounded SVG charts, bar outlines, tooltips, and legends resolve the same encoding. `toColumnar` validates while converting and reports the row and series responsible for invalid input. `validateColumnar` applies the same boundary to externally constructed columns, including exact declared keys, typed-array types, lengths, timestamp order, and values. Neither API coerces strings, dates, `undefined`, or infinities.

Validation records immutable-column extrema and finite segments by typed-array identity. TimeSeries reuses that analysis for its bounded fallback and uPlot gap conversion rather than scanning the same 100,000-point columns repeatedly during render. Validate externally assembled snapshots when they enter the application boundary, before a measured render; renderer calls still validate the schema and populate the analysis when a caller has not done so.

The returned data object is frozen so column references cannot be replaced. JavaScript cannot freeze typed-array elements, so applications must still treat accepted columns as immutable. Streaming uses a separate preallocated owner rather than mutating an accepted snapshot behind a renderer.

Categorical charts use a separate `ChartCategoricalData` contract. `categories` is an ordered array of unique, nonempty labels. `values` contains one equal-length `Float64Array` for every declared series. Values remain finite or `NaN`, and undeclared or missing series columns are errors.

```ts
const categorySeries = defineSeries([
  { key: "current", label: "Current", color: "chart-2" },
  { key: "previous", label: "Previous", color: "chart-5" },
]);

const categorical = toCategorical(rows, {
  category: row => row.region,
  series: [
    { key: "current", label: "Current", color: "chart-2", value: row => row.current },
    { key: "previous", label: "Previous", color: "chart-5", value: row => row.previous },
  ],
});
```

`toCategorical` validates while converting row data. `validateCategorical` applies the same boundary to prebuilt columns. Categorical labels are not encoded into a fake numeric or timestamp axis, so their order, native table headings, and missing-value semantics remain explicit.

`ChartDataTable` applies the same `validateColumnar` boundary before rendering. Its bounded native pages preserve column identity and gap semantics instead of copying data into a second loose row model. See `docs/chart-display.md` for locale, timezone, missing-value, disclosure, and pagination behavior.
