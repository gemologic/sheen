import { describe, expect, it } from "vitest";
import { selectClientRows } from "./selection-client.ts";
import type { ClientSelectionOptions } from "./selection-client.ts";
import { createClientExport } from "./export.ts";
import { createTableSelection } from "./selection.ts";
import type { FilterNode } from "./filter.ts";

interface Row { id: string; status: string }
const rows: Row[] = [{ id: "c", status: "open" }, { id: "a", status: "closed" }, { id: "b", status: "open" }];
const options: ClientSelectionOptions<Row> = { locale: "en-US", filterColumns: [{ id: "status", type: "enum", options: ["open", "closed"] }], getRowId: row => row.id, getValue: row => row.status };
const filter: FilterNode = { kind: "enum", column: "status", operator: "in", values: ["open"] };

describe("client selection resolution", () => {
  it("retains complete-view order rather than ID-selection order", () => {
    const result = selectClientRows(rows, { kind: "ids", ids: ["b", "c"] }, options);
    expect(result).toEqual([rows[0], rows[2]]);
    expect(result[0]).toBe(rows[0]);
    expect(selectClientRows(rows, { kind: "ids", ids: [] }, options)).toEqual([]);
  });
  it("re-evaluates captured query criteria and exclusions without broadening the supplied view", () => {
    const result = selectClientRows(rows, { kind: "query", filter, excluded: ["c"] }, options);
    expect(result).toEqual([rows[2]]);
    expect(selectClientRows(rows.slice(0, 2), { kind: "query", filter, excluded: ["c"] }, options)).toEqual([]);
  });
  it("exports selected rows beyond the loaded page with visible-column protection", () => {
    const selection = createTableSelection(filter, options.filterColumns);
    selection.setLoadedIds(["c"]);
    selection.selectLoaded();
    selection.setLoadedIds(["b"]);
    selection.selectLoaded();
    const selected = selectClientRows(rows, selection.getPayload(), options);
    const exported = createClientExport(selected, [
      { id: "id", header: "ID", value: row => row.id },
      { id: "status", header: "Status", visible: false, value: () => { throw new Error("Hidden column read"); } },
    ]);
    expect(exported.toCSV()).toBe('"ID"\r\n"c"\r\n"b"\r\n');
    expect(exported.toJSON()).toBe('[{"id":"c"},{"id":"b"}]');
  });
  it("rejects duplicate/invalid row IDs and invalid query references before returning results", () => {
    expect(() => selectClientRows([{ id: "a", status: "open" }, { id: "a", status: "open" }], { kind: "ids", ids: [] }, options)).toThrow("unique");
    expect(() => selectClientRows([{ id: "", status: "open" }], { kind: "ids", ids: [] }, options)).toThrow();
    expect(() => selectClientRows(rows, { kind: "ids", ids: [""] }, options)).toThrow("selection ID");
    expect(() => selectClientRows(rows, { kind: "query", filter: { kind: "empty", column: "missing" }, excluded: [] }, options)).toThrow();
  });
  it("omits no-longer-present explicit IDs without fetching them", () => {
    expect(selectClientRows(rows, { kind: "ids", ids: ["deleted", "b"] }, options)).toEqual([rows[2]]);
  });
});
