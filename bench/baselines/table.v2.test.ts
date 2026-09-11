import { describe, expect, it } from "vitest";
import { compatibleTableBenchmarkHistory, tableBenchmarkBaseline } from "./table.v2.ts";

describe("table benchmark baseline", () => {
  it("pins the expanded finite five-run gate instead of a placeholder", () => {
    expect(tableBenchmarkBaseline).toMatchObject({ schema: 2, runner: "ubuntu-24.04", playwright: "1.63.0", runs: 5, maximumRegression: 0.1 });
    expect(tableBenchmarkBaseline.history).toHaveLength(3);
    const latest = tableBenchmarkBaseline.history.at(-1);
    expect(latest?.source).toContain("GitHub Actions five-run production capture");
    expect(latest?.recordedAt).toBe("2026-09-11");
    expect(latest?.version).toBe(4);
    const normalized = latest?.normalized;
    if (!normalized) throw new Error("Missing table benchmark baseline");
    const values = [normalized.render, normalized.multiSort, normalized.search, normalized.filter, normalized.refresh];
    expect(values).toHaveLength(5);
    for (const value of values) expect(Number.isFinite(value) && value > 0 && value < 50).toBe(true);
  });

  it("compares only baselines captured on the current CPU family", () => {
    expect(compatibleTableBenchmarkHistory("AMD EPYC 7763 64-Core Processor").map(entry => entry.version)).toEqual([3]);
    expect(compatibleTableBenchmarkHistory("AMD EPYC 9V74 96-Core Processor").map(entry => entry.version)).toEqual([4]);
    expect(compatibleTableBenchmarkHistory("AMD EPYC 9V45 96-Core Processor").map(entry => entry.version)).toEqual([4]);
    expect(compatibleTableBenchmarkHistory("AMD Ryzen Threadripper 9960X 24-Cores").map(entry => entry.version)).toEqual([2]);
    expect(() => compatibleTableBenchmarkHistory("unknown runner")).toThrow("No table benchmark baseline matches CPU model");
  });
});
