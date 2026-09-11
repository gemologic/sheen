import { describe, expect, it } from "vitest";
import { fitToolbarGroups } from "./toolbar-layout.ts";

describe("Toolbar width allocation", () => {
  it("does not reserve a menu trigger when every group fits, including exact boundaries", () => {
    expect(fitToolbarGroups([], 0, 48, 8)).toEqual({ visibleCount: 0, overflowCount: 0, requiredWidth: 0 });
    expect(fitToolbarGroups([100, 120, 80], 316, 48, 8)).toEqual({ visibleCount: 3, overflowCount: 0, requiredWidth: 316 });
  });
  it("reserves a trigger and overflows whole trailing groups without reordering", () => {
    expect(fitToolbarGroups([100, 120, 80], 300, 48, 8)).toEqual({ visibleCount: 2, overflowCount: 1, requiredWidth: 284 });
    expect(fitToolbarGroups([100, 120, 80], 283, 48, 8)).toEqual({ visibleCount: 1, overflowCount: 2, requiredWidth: 156 });
    expect(fitToolbarGroups([200, 10, 10], 150, 48, 8)).toEqual({ visibleCount: 0, overflowCount: 3, requiredWidth: 48 });
  });
  it("handles fractional CSS pixels without rounding a group outside the viewport", () => {
    expect(fitToolbarGroups([10.25, 10.25], 20.5, 4.5, 0)).toEqual({ visibleCount: 2, overflowCount: 0, requiredWidth: 20.5 });
    expect(fitToolbarGroups([10.25, 10.25], 20.49, 4.5, 0)).toEqual({ visibleCount: 1, overflowCount: 1, requiredWidth: 14.75 });
  });
  it("reports the minimum trigger width even when the allocated region is too narrow", () => {
    expect(fitToolbarGroups([100], 0, 48, 8)).toEqual({ visibleCount: 0, overflowCount: 1, requiredWidth: 48 });
    expect(fitToolbarGroups([100], 48, 48, 8)).toEqual({ visibleCount: 0, overflowCount: 1, requiredWidth: 48 });
  });
  it("rejects invalid measurements instead of hiding actions silently", () => {
    for (const invalid of [-1, NaN, Infinity, -Infinity]) {
      expect(() => fitToolbarGroups([invalid], 100, 48, 8)).toThrow("finite nonnegative");
      expect(() => fitToolbarGroups([100], invalid, 48, 8)).toThrow("finite nonnegative");
      expect(() => fitToolbarGroups([100], 100, invalid, 8)).toThrow("finite nonnegative");
      expect(() => fitToolbarGroups([100], 100, 48, invalid)).toThrow("finite nonnegative");
    }
    expect(() => fitToolbarGroups([Number.MAX_VALUE, Number.MAX_VALUE], 100, 48, 8)).toThrow("numeric range");
  });
  it("preserves partition, fit, maximality, and monotonicity across deterministic size sweeps", () => {
    const widths = [37.5, 81.25, 19.75, 102, 44];
    let previous = 0;
    for (let available = 0; available <= 500; available += 0.5) {
      const layout = fitToolbarGroups(widths, available, 42, 7.5);
      expect(layout.visibleCount + layout.overflowCount).toBe(widths.length);
      expect(layout.visibleCount).toBeGreaterThanOrEqual(previous);
      previous = layout.visibleCount;
      if (available >= 42) expect(layout.requiredWidth).toBeLessThanOrEqual(available);
      const next = widths[layout.visibleCount];
      if (layout.overflowCount > 1 && next !== undefined) expect(layout.requiredWidth + 7.5 + next).toBeGreaterThan(available);
    }
  });
});
