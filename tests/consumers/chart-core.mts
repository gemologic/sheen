import assert from "node:assert/strict";
import { defineSeries, toColumnar, validateColumnar } from "@gemologic/sheen-charts/core";

const series = defineSeries([
  { key: "latency", label: "Latency", color: "chart-1" },
  { key: "errors", label: "Errors", color: "market-down" },
]);

const data = toColumnar([
  { at: 1_700_000_000_000, latency: 12, errors: 0 },
  { at: 1_700_000_001_000, latency: Number.NaN, errors: 1 },
], {
  timestamp: row => row.at,
  series: [
    { key: "latency", label: "Latency", color: "chart-1", value: row => row.latency },
    { key: "errors", label: "Errors", color: "market-down", value: row => row.errors },
  ],
});

assert.deepEqual([...data.t], [1_700_000_000_000, 1_700_000_001_000]);
assert.deepEqual([...data.latency ?? []], [12, Number.NaN]);
assert.equal(validateColumnar(data, series), data);
process.stdout.write("Isolated chart columnar exports passed\n");
