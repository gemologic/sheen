import { describe, expect, it } from "vitest";
import { countHostileMenuItems, createHostileChartData, createHostileMenu, createHostileRows, hostileChartSample, hostileChartSeries, hostileLongText, hostileMenuDepth, hostileMultilingualText, hostileZeroWidthText } from "../apps/loupe/src/hostile-fixture.ts";

describe("hostile gallery fixtures", () => {
  it("pins the pathological text and deterministic 100k-row boundary", () => {
    const rows = createHostileRows();
    expect(rows).toHaveLength(100_000);
    expect(hostileLongText).toHaveLength(500);
    expect(rows[0]?.account).toBe(hostileLongText);
    expect(rows[1]?.account).toBe(hostileZeroWidthText);
    expect(rows[2]?.account).toBe(hostileMultilingualText);
    expect(rows.at(-1)?.id).toBe("hostile-row-100000");
  });

  it("pins exactly 200 records behind seven submenu levels", () => {
    const selected: string[] = [];
    const items = createHostileMenu(id => selected.push(id));
    expect(countHostileMenuItems(items)).toBe(200);
    expect(hostileMenuDepth(items)).toBe(7);
    let cursor = items;
    for (let depth = 1; depth <= 7; depth += 1) {
      const item = cursor[0];
      expect(item?.kind).toBe("submenu");
      if (item?.kind !== "submenu") throw new Error(`Expected hostile submenu at depth ${depth}`);
      cursor = item.items;
    }
    const first = cursor[0];
    expect(first?.kind).toBe("action");
    if (first?.kind !== "action") throw new Error("Expected hostile leaf action");
    first.onSelect();
    expect(selected).toEqual(["hostile-action-1"]);
  });

  it("pins twelve valid series and explicit non-color encodings after the eight-color palette", () => {
    expect(hostileChartSeries).toHaveLength(12);
    expect(new Set(hostileChartSeries.map(series => series.color)).size).toBe(8);
    expect(hostileChartSeries.slice(8).map(series => series.encoding)).toEqual(["dashed", "dotted", "dash-dot", "dashed"]);
    const data = createHostileChartData();
    expect(data.t).toHaveLength(64);
    expect(Object.keys(data)).toHaveLength(13);
    expect(hostileChartSample(64)).toHaveLength(12);
  });
});
