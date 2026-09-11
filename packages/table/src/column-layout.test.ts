import { describe, expect, it } from "vitest";
import { canMoveColumn, moveColumn, orderColumnStates, placeColumn } from "./column-layout.ts";
import type { ColumnState } from "./table-state.ts";

const columns: readonly ColumnState[] = [
  { id: "middle-b", visible: true, width: null, pin: false },
  { id: "end-a", visible: true, width: 90, pin: "end" },
  { id: "start-a", visible: true, width: 100, pin: "start" },
  { id: "middle-a", visible: true, width: null, pin: false },
  { id: "start-b", visible: true, width: 110, pin: "start" },
];

describe("column layout", () => {
  it("orders logical pin regions without mutating persisted order", () => {
    expect(orderColumnStates(columns).map(column => column.id)).toEqual(["start-a", "start-b", "middle-b", "middle-a", "end-a"]);
    expect(columns[0]?.id).toBe("middle-b");
  });

  it("places dragged columns within one pin region and preserves object identities", () => {
    const after = placeColumn(columns, "middle-b", "middle-a", "after");
    expect(orderColumnStates(after).map(column => column.id)).toEqual(["start-a", "start-b", "middle-a", "middle-b", "end-a"]);
    expect(after.find(column => column.id === "middle-b")).toBe(columns[0]);
    expect(() => placeColumn(columns, "start-a", "middle-a", "before")).toThrow("pin regions");
    expect(() => placeColumn(columns, "missing", "middle-a", "before")).toThrow("unknown");
  });

  it("provides bounded logical one-step moves for keyboard controls", () => {
    const moved = moveColumn(columns, "start-b", "toward-start");
    expect(orderColumnStates(moved).map(column => column.id)).toEqual(["start-b", "start-a", "middle-b", "middle-a", "end-a"]);
    expect(canMoveColumn(moved, "start-b", "toward-start")).toBe(false);
    expect(canMoveColumn(columns, "end-a", "toward-end")).toBe(false);
    expect(() => moveColumn(columns, "missing", "toward-start")).toThrow("unknown");
  });
});
