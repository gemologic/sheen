import { describe, expect, it } from "vitest";
import { columnStateSchema, defineColumns, readColumnDefinitions } from "./columns.ts";
import type { SheenColumnInput } from "./columns.ts";

interface Row { readonly symbol: string; readonly pnl: number }

describe("opaque table columns", () => {
  it("copies explicit cell dependencies and rejects ambiguous declarations", () => {
    const dependencies: (keyof Row & string)[] = ["symbol"];
    const columns = defineColumns<Row>([{ id: "pnl", header: "P&L", accessor: row => row.pnl, cellDependencies: dependencies, cell: (value, row) => `${row.symbol}: ${value}` }]);
    dependencies.push("pnl");
    expect(readColumnDefinitions(columns)[0]?.cellDependencies).toEqual(["symbol"]);
    expect(() => defineColumns<Row>([{ id: "pnl", header: "P&L", accessor: row => row.pnl, cellDependencies: [] }])).toThrow("noneditable custom cell");
    expect(() => defineColumns<Row>([{ id: "pnl", header: "P&L", accessor: row => row.pnl, cell: String, cellDependencies: ["symbol", "symbol"] }])).toThrow("unique");
    expect(() => defineColumns<Row>([{ id: "pnl", header: "P&L", accessor: row => row.pnl, cell: String, cellDependencies: [], editor: { type: "number" } }])).toThrow("noneditable custom cell");
    // @ts-expect-error dependency names belong to the row model
    defineColumns<Row>([{ id: "pnl", header: "P&L", accessor: row => row.pnl, cell: String, cellDependencies: ["missing"] }]);
  });
  it("normalizes sheen fields and projects state schema behind an opaque value", () => {
    const options = ["buy", "sell"];
    const unsafe = { enableHiding: false };
    const columns = defineColumns<Row>([
      { id: "symbol", header: "Symbol", accessor: row => row.symbol, width: 120, pin: "start", search: true, filter: { type: "enum", options, faceted: true }, editor: { type: "select", options }, __unsafe_tanstack: unsafe },
      { id: "pnl", header: "P&L", accessor: row => row.pnl, width: "content", minWidth: 80, maxWidth: 160, numeric: true, search: row => `pnl ${row.pnl}`, aggregate: "sum", editor: { type: "number", nullable: true } },
      { id: "actions", header: "Actions", cell: (_value, row) => row.symbol },
    ]);
    options.push("mutated");
    unsafe.enableHiding = true;
    expect(Object.keys(columns)).toEqual([]);
    expect(Object.isFrozen(columns)).toBe(true);
    const definitions = readColumnDefinitions(columns);
    expect(Object.isFrozen(definitions)).toBe(true);
    expect(definitions).toMatchObject([
      { id: "symbol", width: 120, pin: "start", align: "start", visible: true, sensitive: false, editor: { type: "select", options: ["buy", "sell"], nullable: false }, filter: { id: "symbol", type: "enum", options: ["buy", "sell"] }, faceted: true, sort: { id: "symbol", type: "text" }, unsafeTanStack: { enableHiding: false } },
      { id: "pnl", width: "content", minWidth: 80, maxWidth: 160, numeric: true, align: "end", editor: { type: "number", nullable: true }, aggregate: "sum", sort: { id: "pnl", type: "number" } },
      { id: "actions", accessor: null, search: null, sensitive: false, editor: null, filter: null, sort: null },
    ]);
    expect(definitions[0]?.accessor?.({ symbol: "ABC", pnl: 3 })).toBe("ABC");
    expect(definitions[0]?.search?.({ symbol: "ABC", pnl: 3 })).toBe("ABC");
    expect(definitions[1]?.search?.({ symbol: "ABC", pnl: 3 })).toBe("pnl 3");
    expect(columnStateSchema(columns)).toEqual({ columns: ["symbol", "pnl", "actions"], filterColumns: [{ id: "symbol", type: "enum", options: ["buy", "sell"] }], sortColumns: [{ id: "symbol", type: "text" }, { id: "pnl", type: "number" }] });
  });

  it("rejects invalid identities, dimensions, filters, aggregates, and unknown fields", () => {
    expect(() => defineColumns<Row>([])).toThrow("at least one");
    expect(() => defineColumns<Row>([
      { id: "same", header: "One", accessor: row => row.symbol },
      { id: "same", header: "Two", accessor: row => row.pnl },
    ])).toThrow("unique");
    expect(() => defineColumns<Row>([{ id: " spaced ", header: "Bad", accessor: row => row.symbol }])).toThrow("trimmed");
    expect(() => defineColumns<Row>([{ id: "bad", header: "Bad", accessor: row => row.symbol, width: 40, minWidth: 50 }])).toThrow("within");
    expect(() => defineColumns<Row>([{ id: "bad", header: "Bad", accessor: row => row.symbol, width: "content", pin: "start" }])).toThrow("numeric when initially pinned");
    expect(() => defineColumns<Row>([{ id: "bad", header: "Bad", accessor: row => row.symbol, filter: { type: "enum", options: ["x", "x"] } }])).toThrow("unique");
    expect(() => defineColumns<Row>([{ id: "bad", header: "Bad", accessor: row => row.symbol, editor: { type: "select", options: ["x", "x"] } }])).toThrow("unique");
    expect(() => defineColumns<Row>([{ id: "bad", header: "Bad", accessor: row => row.symbol, visible: false, search: true }])).toThrow("initially hidden");
    expect(() => defineColumns<Row>([{ id: "bad", header: "Bad", accessor: row => row.symbol, sensitive: true, search: true }])).toThrow("sensitive");
    expect(() => defineColumns<Row>([
      // @ts-expect-error Display/action columns cannot participate in global search.
      { id: "actions", header: "Actions", cell: () => "action", search: true },
    ])).toThrow("cannot search");
    expect(() => defineColumns<Row>([{ id: "bad", header: "Bad", accessor: () => true, editor: { type: "boolean", nullable: true } }])).toThrow("cannot be nullable");
    expect(() => defineColumns<Row>([
      // @ts-expect-error Display columns cannot declare an editor.
      { id: "bad", header: "Bad", cell: () => "value", editor: { type: "text" } },
    ])).toThrow("accessor column");
    expect(() => defineColumns<Row>([{ id: "bad", header: "Bad", accessor: row => row.symbol, aggregate: "sum" }])).toThrow("numeric");
    expect(() => defineColumns<Row>([
      // @ts-expect-error Runtime input validation rejects upstream fields outside the escape hatch.
      { id: "bad", header: "Bad", accessor: row => row.symbol, enableSorting: false },
    ])).toThrow("unknown field enableSorting");
    const sparse = Array<SheenColumnInput<Row>>(1);
    expect(() => defineColumns(sparse)).toThrow("columns[0] must be an object");
  });

  it("rejects accessor values outside the serializable cell domain", () => {
    const objectValue = defineColumns<Row>([
      // @ts-expect-error Runtime validation still protects JavaScript consumers and unsafe callers.
      { id: "bad", header: "Bad", accessor: () => ({ nested: true }) },
    ]);
    expect(() => readColumnDefinitions(objectValue)[0]?.accessor?.({ symbol: "ABC", pnl: 3 })).toThrow("unsupported");
    const nonfinite = defineColumns<Row>([{ id: "bad", header: "Bad", accessor: () => Number.NaN }]);
    expect(() => readColumnDefinitions(nonfinite)[0]?.accessor?.({ symbol: "ABC", pnl: 3 })).toThrow("nonfinite");
    const invalidProjection = defineColumns<Row>([
      // @ts-expect-error Runtime validation protects JavaScript callers with invalid search projections.
      { id: "bad-search", header: "Bad search", accessor: row => row.symbol, search: () => ({ nested: true }) },
    ]);
    expect(() => readColumnDefinitions(invalidProjection)[0]?.search?.({ symbol: "ABC", pnl: 3 })).toThrow("unsupported search value");
  });
});
