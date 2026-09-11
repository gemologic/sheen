import { describe, expect, it } from "vitest";
import { createStreamingBuffer } from "./streaming-buffer.ts";

const values = (first: number, second: number) => new Float64Array([first, second]);

describe("streaming ring buffer", () => {
  it("retains the newest capacity and counts only samples overwritten before presentation", () => {
    const buffer = createStreamingBuffer(3, ["primary", "secondary"]);
    for (let timestamp = 1; timestamp <= 5; timestamp++) expect(buffer.append(timestamp, values(timestamp, timestamp * 10))).toBe(true);
    expect(buffer.size()).toBe(3);
    expect(buffer.dropped()).toBe(2);
    const first = buffer.snapshot();
    expect([...first.t]).toEqual([3, 4, 5]);
    expect([...(first.primary ?? [])]).toEqual([3, 4, 5]);
    expect([...(first.secondary ?? [])]).toEqual([30, 40, 50]);

    expect(buffer.append(6, values(6, 60))).toBe(true);
    expect(buffer.dropped()).toBe(2);
    expect([...buffer.snapshot().t]).toEqual([4, 5, 6]);

    for (let timestamp = 7; timestamp <= 10; timestamp++) buffer.append(timestamp, values(timestamp, timestamp * 10));
    expect(buffer.dropped()).toBe(3);
    expect([...buffer.snapshot().t]).toEqual([8, 9, 10]);
  });

  it("rejects unordered timestamps separately and preserves NaN gaps", () => {
    const buffer = createStreamingBuffer(4, ["value"]);
    expect(buffer.append(100, new Float64Array([1]))).toBe(true);
    expect(buffer.append(100, new Float64Array([2]))).toBe(false);
    expect(buffer.append(99, new Float64Array([3]))).toBe(false);
    expect(buffer.append(101, new Float64Array([Number.NaN]))).toBe(true);
    expect(buffer.rejected()).toBe(2);
    expect(buffer.dropped()).toBe(0);
    const snapshot = buffer.snapshot();
    expect([...snapshot.t]).toEqual([100, 101]);
    expect(Number.isNaN(snapshot.value?.[1] ?? 0)).toBe(true);
  });

  it("validates dimensions and clears storage without conflating counters", () => {
    expect(() => createStreamingBuffer(0, ["value"])).toThrow("positive safe integer");
    expect(() => createStreamingBuffer(2, ["value", "value"])).toThrow("unique nonempty identifiers");
    const buffer = createStreamingBuffer(2, ["value"]);
    expect(() => buffer.append(Number.POSITIVE_INFINITY, new Float64Array([1]))).toThrow("valid UTC milliseconds");
    expect(() => buffer.append(1, new Float64Array([1, 2]))).toThrow("with 1 entries");
    expect(() => buffer.append(1, new Float64Array([Number.POSITIVE_INFINITY]))).toThrow("finite or NaN");
    buffer.append(1, new Float64Array([1]));
    buffer.append(2, new Float64Array([2]));
    buffer.append(3, new Float64Array([3]));
    expect(buffer.dropped()).toBe(1);
    buffer.clear();
    expect(buffer.snapshot().t).toHaveLength(0);
    expect(buffer.dropped()).toBe(1);
    buffer.resetCounters();
    expect(buffer.dropped()).toBe(0);
  });
});
