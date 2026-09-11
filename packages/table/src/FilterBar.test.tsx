import { describe, expect, it } from "vitest";
import { renderToString } from "solid-js/web";
import { ThemeProvider } from "@gemologic/sheen";
import { FilterBar } from "./FilterBar.tsx";
import { DataTable } from "./DataTable.tsx";
import { defineColumns } from "./columns.ts";
import type { FilterNode } from "./filter.ts";

interface Row { readonly id: string; readonly name: string; readonly status: string; readonly amount: number; readonly created: number }

const columns = defineColumns<Row>([
  { id: "name", header: "Name", accessor: row => row.name, filter: { type: "text" } },
  { id: "status", header: "Status", accessor: row => row.status, filter: { type: "enum", options: ["open", "closed"], faceted: true } },
  { id: "amount", header: "Amount", accessor: row => row.amount, numeric: true, filter: { type: "number" } },
  { id: "created", header: "Created", accessor: row => row.created, filter: { type: "date" } },
]);
const filter: FilterNode = {
  kind: "and",
  children: [
    { kind: "text", column: "name", operator: "contains", value: "Alpha", caseSensitive: false },
    { kind: "not", child: { kind: "enum", column: "status", operator: "in", values: ["closed"] } },
  ],
};
const rows: readonly Row[] = [
  { id: "a", name: "Alpha", status: "open", amount: 10, created: Date.UTC(2026, 8, 1) },
  { id: "b", name: "Beta", status: "closed", amount: 20, created: Date.UTC(2026, 8, 2) },
];

describe("FilterBar SSR", () => {
  it("renders accepted chips, localized summaries, removal controls, and one add trigger without publishing intent", () => {
    const changes: FilterNode[] = [];
    const html = renderToString(() => <ThemeProvider><FilterBar columns={columns} value={filter} facets={{ status: { open: 1, closed: 1 } }} onChange={value => changes.push(value)} /></ThemeProvider>);
    const text = html.replaceAll(/<!--[\s\S]*?-->/g, "");
    expect(text).toContain("Name contains Alpha");
    expect(text).toContain("Not: Status is any of closed");
    expect(html.match(/class="sheen-filter-remove"/g)).toHaveLength(2);
    expect(text).toContain("+ Filter");
    expect(changes).toEqual([]);
  });

  it("integrates only configured filters into DataTable and evaluates the accepted client AST", () => {
    const html = renderToString(() => <ThemeProvider><DataTable data={rows} columns={columns} getRowId={row => row.id} caption="Filtered rows" pagination={false} initialState={{ filter }} /></ThemeProvider>);
    expect(html).toContain('aria-label="Filters"');
    expect(html).toContain('data-row-id="a"');
    expect(html).not.toContain('data-row-id="b"');
    const withoutBar = renderToString(() => <ThemeProvider><DataTable data={rows} columns={columns} getRowId={row => row.id} caption="Filtered rows" pagination={false} initialState={{ filter }} filterBar={false} /></ThemeProvider>);
    expect(withoutBar).not.toContain('aria-label="Filters"');
  });

  it("rejects non-sheen columns and AST references that are not filterable", () => {
    const plainColumns = defineColumns<Row>([{ id: "name", header: "Name", accessor: row => row.name }]);
    expect(() => renderToString(() => <ThemeProvider><FilterBar columns={plainColumns} value={{ kind: "and", children: [] }} onChange={() => {}} /></ThemeProvider>)).toThrow("filterable column");
    expect(() => renderToString(() => <ThemeProvider><FilterBar columns={columns} value={{ kind: "empty", column: "missing" }} onChange={() => {}} /></ThemeProvider>)).toThrow("unknown");
  });
});

