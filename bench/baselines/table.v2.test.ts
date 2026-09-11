import { describe, expect, it } from "vitest";
import { tableBenchmarkBaseline } from "./table.v2.ts";

describe("table benchmark baseline", () => {
  it("pins the expanded finite five-run gate instead of a placeholder", () => {
    expect(tableBenchmarkBaseline).toMatchObject({ schema: 2, runner: "ubuntu-24.04", playwright: "1.63.0", runs: 5, maximumRegression: 0.1 });
    expect(tableBenchmarkBaseline.history).toHaveLength(1);
    const latest = tableBenchmarkBaseline.history[0];
    expect(latest?.source).toContain("local five-run production capture");
    expect(latest?.recordedAt).toBe("2026-09-08");
    const normalized = latest?.normalized;
    if (!normalized) throw new Error("Missing table benchmark baseline");
    const values = [normalized.render, normalized.multiSort, normalized.search, normalized.filter, normalized.refresh];
    expect(values).toHaveLength(5);
    for (const value of values) expect(Number.isFinite(value) && value > 0 && value < 50).toBe(true);
  });
});
