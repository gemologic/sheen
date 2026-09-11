import { createRoot } from "solid-js";
import { describe, expect, it } from "vitest";
import { useStreamingSeries } from "./useStreamingSeries.ts";
import { defineSeries } from "./chart-types.ts";

const series = defineSeries([{ key: "value", label: "Value", color: "chart-1" }]);

describe("useStreamingSeries", () => {
  it("builds an immutable bounded initial snapshot during SSR", () => {
    createRoot(dispose => {
      const stream = useStreamingSeries({
        capacity: 3,
        interval: 0,
        series,
        initial: {
          t: new Float64Array([1, 2, 3, 4]),
          value: new Float64Array([10, 20, Number.NaN, 40]),
        },
      });
      expect([...stream.data().t]).toEqual([2, 3, 4]);
      expect([...(stream.data().value ?? [])].map(value => Number.isNaN(value) ? "gap" : value)).toEqual([20, "gap", 40]);
      expect(stream.size()).toBe(3);
      expect(stream.dropped()).toBe(0);
      expect(stream.rejected()).toBe(0);
      dispose();
    });
  });

  it("validates owner-independent configuration before allocating work", () => {
    createRoot(dispose => {
      expect(() => useStreamingSeries({ capacity: 2, interval: -1, series })).toThrow("finite nonnegative");
      dispose();
    });
  });

  it("validates and accounts for columnar batches without per-row public objects", () => {
    createRoot(dispose => {
      const stream = useStreamingSeries({
        capacity: 4,
        interval: 0,
        series,
        initial: { t: new Float64Array([1]), value: new Float64Array([10]) },
      });
      expect(stream.appendBatch({ t: new Float64Array([2, 3]), value: new Float64Array([20, 30]) })).toEqual({ accepted: 2, rejected: 0 });
      expect(stream.append(3, new Float64Array([31]))).toEqual({ kind: "rejected", reason: "out-of-order" });
      expect(stream.rejected()).toBe(1);
      expect(() => stream.appendBatch({ t: new Float64Array([4]), value: new Float64Array([40]), extra: new Float64Array([1]) })).toThrow("undeclared series");
      dispose();
      expect(() => stream.append(4, new Float64Array([40]))).toThrow("disposed streaming series");
    });
  });
});
