import { describe, expect, it } from "vitest";
import { renderToString } from "solid-js/web";
import { ThemeProvider, ThemeScope } from "@gemologic/sheen";
import { DataTable } from "./DataTable.tsx";
import type { DataTableAction } from "./DataTable.tsx";
import { defineColumns } from "./columns.ts";

interface Row { readonly id: string; readonly name: string; readonly amount: number }
interface TreeRow extends Row { readonly children?: readonly TreeRow[]; readonly remote?: boolean }

const columns = defineColumns<Row>([
  { id: "name", header: "Name", accessor: row => row.name, search: true },
  { id: "amount", header: "Amount", accessor: row => row.amount, numeric: true },
]);
const projectedSearchColumns = defineColumns<Row>([
  { id: "name", header: "Name", accessor: row => row.name, search: row => `ledger ${row.amount}` },
  { id: "amount", header: "Amount", accessor: row => row.amount, numeric: true },
]);
const pinnedColumns = defineColumns<Row>([
  { id: "name", header: "Name", accessor: row => row.name, width: 160, minWidth: 100, maxWidth: 300, pin: "start" },
  { id: "amount", header: "Amount", accessor: row => row.amount, width: 120, numeric: true },
]);
const aggregateColumns = defineColumns<Row>([
  { id: "name", header: "Name", accessor: row => row.name },
  { id: "amount", header: "Amount", accessor: row => row.amount, numeric: true, aggregate: "sum" },
]);
const treeColumns = defineColumns<TreeRow>([
  { id: "name", header: "Name", accessor: row => row.name },
  { id: "amount", header: "Amount", accessor: row => row.amount, numeric: true },
]);
const editableColumns = defineColumns<Row>([
  { id: "name", header: "Name", accessor: row => row.name, editor: { type: "text", validate: value => typeof value === "string" && value.trim() ? null : "Name is required" } },
  { id: "amount", header: "Amount", accessor: row => row.amount, numeric: true, editor: { type: "number" } },
]);
const chromeColumns = defineColumns<Row>([
  { id: "name", header: "Name", accessor: row => row.name, filter: { type: "text" }, footer: "Total" },
  { id: "amount", header: "Amount", accessor: row => row.amount, numeric: true, footer: values => values.reduce((sum, row) => sum + row.amount, 0) },
]);
const rows = Array.from({ length: 40 }, (_, index): Row => ({ id: `row-${index}`, name: `Row ${index}`, amount: index }));

describe("DataTable SSR", () => {
  it("adopts a refresh key without transport or incomplete server content", () => {
    let calls = 0;
    const initialResult = { rows: rows.slice(0, 10), total: rows.length };
    const html = renderToString(() => <ThemeProvider><DataTable mode="server" columns={columns}
      getRowId={row => row.id} caption="Revalidated rows" pagination={{ pageIndex: 0, pageSize: 10 }}
      initialResult={initialResult} refreshKey={7} onStateChange={async () => { calls++; return initialResult; }} /></ThemeProvider>);
    expect(calls).toBe(0);
    expect(html.match(/data-row-id="row-/gu)).toHaveLength(10);
  });
  it("uses Studio density geometry in the server virtual range before measuring the DOM", () => {
    for (const [density, height] of [["compact", 36], ["comfortable", 40], ["spacious", 48]] satisfies readonly (readonly ["compact" | "comfortable" | "spacious", number])[]) {
      const html = renderToString(() => <ThemeProvider><ThemeScope theme="studio"><DataTable data={rows} columns={columns} getRowId={row => row.id} caption="Studio rows" density={density} pagination={false} /></ThemeScope></ThemeProvider>);
      expect(html).toContain(`translateY(${height}px)`);
    }
  });
  it("summarizes accepted constraints with full-query counts even without filter controls", () => {
    const defined = defineColumns<{ id: string; status: string }>([
      { id: "id", header: "ID", accessor: row => row.id },
      { id: "status", header: "Status", accessor: row => row.status, filter: { type: "enum", options: ["Active", "Paused"] } },
    ]);
    const page = [{ id: "one", status: "Active" }, { id: "two", status: "Active" }];
    const render = (constrained: boolean, total: number) => renderToString(() => <ThemeProvider><DataTable mode="server" columns={defined} getRowId={row => row.id} caption="Constrained accounts" pagination={{ pageIndex: 0, pageSize: 2 }}
      summarizeColumns={["status"]} search={false} filterBar={false} initialResult={{ rows: total === 0 ? [] : page, total }} onStateChange={async () => ({ rows: page, total })}
      initialState={{ filter: constrained ? { kind: "enum", column: "status", operator: "in", values: ["Active"] } : { kind: "and", children: [] } }} /></ThemeProvider>);
    expect(render(true, 8)).toContain("Status: Active · 8 matching results");
    expect(render(true, 8)).not.toMatch(/<th[^>]+data-column="status"/u);
    expect(render(true, 0)).toContain("Status: Active · 0 matching results");
    expect(render(false, 8)).toMatch(/<th[^>]+data-column="status"/u);
    expect(render(false, 8)).not.toContain("sheen-data-table-constraint\"");
    expect(() => renderToString(() => <ThemeProvider><DataTable columns={columns} data={rows} getRowId={row => row.id} caption="Invalid summary" summarizeColumns={["amount"]} /></ThemeProvider>)).toThrow("filterable");
  });
  it("renders configured explicit-column search and keeps opt-out independent from accepted state", () => {
    const html = renderToString(() => <ThemeProvider><DataTable data={rows} columns={columns} getRowId={row => row.id} caption="Searchable rows" pagination={false}
      search={{ label: "Find rows", placeholder: "Name or identifier", debounce: 80, shortcut: "mod+f", exactMatch: true }} initialState={{ search: "Row 1" }} /></ThemeProvider>);
    expect(html).toContain('type="search"');
    expect(html).toContain('value="Row 1"');
    expect(html).toContain("Find rows");
    expect(html).toContain('placeholder="Name or identifier"');
    expect(html).toContain("Search match mode: Smart");
    expect(html).toContain('role="toolbar" aria-label="Searchable rows table controls"');
    expect(html).toContain("13 results");
    const disabled = renderToString(() => <ThemeProvider><DataTable data={rows} columns={columns} getRowId={row => row.id} caption="No search" pagination={false} search={false} /></ThemeProvider>);
    expect(disabled).not.toContain('type="search"');
    const retained = renderToString(() => <ThemeProvider><DataTable data={rows} columns={columns} getRowId={row => row.id} caption="Externally searched rows" pagination={false} search={false} initialState={{ search: "Row 1" }} /></ThemeProvider>);
    expect(retained).not.toContain('type="search"');
    expect(retained).toContain("13 results");
    expect(() => renderToString(() => <ThemeProvider><DataTable data={rows} columns={pinnedColumns} getRowId={row => row.id} caption="Missing search columns" pagination={false} search={{}} /></ThemeProvider>)).toThrow("searchable column");
    expect(() => renderToString(() => <ThemeProvider><DataTable data={rows} columns={columns} getRowId={row => row.id} caption="Invalid debounce" pagination={false} search={{ debounce: -1 }} /></ThemeProvider>)).toThrow("debounce");
    expect(() => renderToString(() => <ThemeProvider>
      {/* @ts-expect-error Runtime validation protects JavaScript and unchecked consumers. */}
      <DataTable data={rows} columns={columns} getRowId={row => row.id} caption="Invalid exact mode" pagination={false} search={{ exactMatch: "yes" }} />
    </ThemeProvider>)).toThrow("exactMatch");
    const projected = renderToString(() => <ThemeProvider><DataTable data={rows} columns={projectedSearchColumns} getRowId={row => row.id} caption="Projected search" pagination={false} initialState={{ search: "ledger 39" }} /></ThemeProvider>);
    expect(projected).toContain('data-row-id="row-39"');
    expect(projected).not.toContain('data-row-id="row-38"');
  });

  it("describes multi-sort priority while exposing aria-sort only on the primary column", () => {
    const html = renderToString(() => <ThemeProvider><DataTable data={rows} columns={columns} getRowId={row => row.id} caption="Multi-sorted rows" pagination={false}
      initialState={{ sorting: [{ column: "name", direction: "asc" }, { column: "amount", direction: "desc" }] }} /></ThemeProvider>);
    expect(html.match(/aria-sort=/gu)).toHaveLength(1);
    expect(html).toContain('data-column="name" data-sort-direction="asc" data-sort-priority="1"');
    expect(html).toContain('data-column="amount" data-sort-direction="desc" data-sort-priority="2"');
    expect(html).toContain("ascending, priority 1 of 2");
    expect(html).toContain("descending, priority 2 of 2");
  });

  it("renders contextual, framed, and integrated presentations from one table engine", () => {
    const contextual = renderToString(() => <ThemeProvider><DataTable data={rows} columns={columns} getRowId={row => row.id} caption="Contextual rows" pagination={false} /></ThemeProvider>);
    const framed = renderToString(() => <ThemeProvider><DataTable variant="framed" data={rows} columns={columns} getRowId={row => row.id} caption="Framed rows" pagination={false} /></ThemeProvider>);
    const integrated = renderToString(() => <ThemeProvider><DataTable variant="integrated" data={rows} columns={columns} getRowId={row => row.id} caption="Integrated rows" pagination={false} /></ThemeProvider>);
    expect(contextual.match(/^<section[^>]*>/u)?.[0]).not.toContain("data-variant=");
    expect(framed.match(/^<section[^>]*>/u)?.[0]).toContain('data-variant="framed"');
    expect(integrated.match(/^<section[^>]*>/u)?.[0]).toContain('data-variant="integrated"');
    expect(integrated).toContain("--sheen-data-table-initial-viewport-height:400px");
    expect(() => renderToString(() => <ThemeProvider>
      {/* @ts-expect-error Runtime validation protects JavaScript and unchecked consumers. */}
      <DataTable variant="floating" data={rows} columns={columns} getRowId={row => row.id} caption="Invalid rows" pagination={false} />
    </ThemeProvider>)).toThrow("variant must be integrated or framed");
  });

  it("can compact table chrome without compacting its application scope", () => {
    const compact = renderToString(() => <ThemeProvider><DataTable density="compact" data={rows} columns={columns} getRowId={row => row.id} caption="Compact rows" pagination={false} /></ThemeProvider>);
    const comfortable = renderToString(() => <ThemeProvider><DataTable density="comfortable" data={rows} columns={columns} getRowId={row => row.id} caption="Comfortable rows" pagination={false} /></ThemeProvider>);
    expect(compact.match(/^<section[^>]*>/u)?.[0]).toContain('data-sheen-density="compact"');
    expect(compact.match(/data-row-id=/gu)?.length ?? 0).toBeGreaterThan(comfortable.match(/data-row-id=/gu)?.length ?? 0);
    expect(() => renderToString(() => <ThemeProvider>
      {/* @ts-expect-error Runtime validation protects JavaScript and unchecked consumers. */}
      <DataTable density="dense" data={rows} columns={columns} getRowId={row => row.id} caption="Invalid density" pagination={false} />
    </ThemeProvider>)).toThrow("density must be compact, comfortable, or spacious");
  });

  it("renders a deterministic virtualized continuous window without pagination controls", () => {
    const html = renderToString(() => <ThemeProvider><DataTable data={rows} columns={columns} getRowId={row => row.id} caption="Continuous rows" pagination={false} initialViewportHeight={120} /></ThemeProvider>);
    expect(html).toContain("Continuous rows");
    expect(html).toContain('aria-rowcount="41"');
    expect(html).toContain('aria-colcount="2"');
    expect(html).toContain('<thead><tr aria-rowindex="1"');
    expect(html).toContain('data-row-id="row-0" data-index="0" aria-rowindex="2"');
    expect(html).not.toContain('class="sheen-pagination');
    expect(html).toContain('block-size:var(--sheen-table-row-h)');
    expect(html.match(/data-row-id=/g)?.length).toBeGreaterThan(3);
    expect(html.match(/data-row-id=/g)?.length).toBeLessThan(rows.length);
  });

  it("server-renders bounded continuous phone cards without changing the desktop data contract", () => {
    const actions: readonly DataTableAction<Row>[] = [{ id: "archive", label: "Archive", onSelect: () => {} }];
    const html = renderToString(() => <ThemeProvider><DataTable data={rows} columns={columns} getRowId={row => row.id} caption="Mobile accounts" pagination={false}
      mobileLayout={{ pageSize: 5, titleColumn: "name" }} selection={{ mode: "multiple", onChange: () => {} }} actions={actions} initialViewportHeight={120} /></ThemeProvider>);
    expect(html).toContain('data-mobile-layout=""');
    expect(html).toContain('role="list" aria-label="Mobile accounts, card view"');
    expect(html.match(/data-mobile-row-id=/g)).toHaveLength(5);
    expect(html).toContain('data-mobile-row-id="row-0"');
    expect(html).not.toContain('data-mobile-row-id="row-5"');
    expect(html).toContain("Actions for row row-0");
    expect(html).toContain("sheen-data-table-mobile-pagination");
    expect(html).toContain('aria-rowcount="41"');
  });

  it("uses the accepted numbered page directly for phone cards and validates bounded options", () => {
    const html = renderToString(() => <ThemeProvider><DataTable data={rows} columns={columns} getRowId={row => row.id} caption="Mobile page" pagination={{ pageIndex: 1, pageSize: 10 }}
      mobileLayout={{ pageSize: 3, titleColumn: "name" }} initialViewportHeight={120} /></ThemeProvider>);
    expect(html.match(/data-mobile-row-id=/g)).toHaveLength(10);
    expect(html).toContain('data-mobile-row-id="row-10"');
    expect(html).toContain('data-mobile-row-id="row-19"');
    expect(html).not.toContain("sheen-data-table-mobile-pagination");
    expect(() => renderToString(() => <ThemeProvider><DataTable data={rows} columns={columns} getRowId={row => row.id} caption="Too many cards" pagination={false} mobileLayout={{ pageSize: 101 }} /></ThemeProvider>)).toThrow("1 to 100");
    expect(() => renderToString(() => <ThemeProvider><DataTable data={rows} columns={columns} getRowId={row => row.id} caption="Missing title" pagination={false} mobileLayout={{ titleColumn: "missing" }} /></ThemeProvider>)).toThrow("Unknown mobileLayout title column");
  });

  it("renders measured variable rows without a fixed block size", () => {
    const html = renderToString(() => <ThemeProvider><DataTable data={rows} columns={columns} getRowId={row => row.id} caption="Variable rows" pagination={false} variableRowHeight initialViewportHeight={120} /></ThemeProvider>);
    expect(html).toContain("data-variable-height");
    expect(html).toContain('min-block-size:var(--sheen-table-row-h)');
    expect(html).not.toMatch(/;block-size:var\(--sheen-table-row-h\)/);
  });

  it("renders only the accepted client page and its controlled navigation", () => {
    const html = renderToString(() => <ThemeProvider><DataTable data={rows} columns={columns} getRowId={row => row.id} caption="Paged rows" pagination={{ pageIndex: 1, pageSize: 10 }} initialViewportHeight={400} /></ThemeProvider>);
    expect(html).toContain('aria-rowcount="41"');
    expect(html).toContain('data-row-id="row-10" data-index="0" aria-rowindex="12"');
    expect(html).toContain('class="sheen-pagination');
    expect(html).toContain('data-row-id="row-10"');
    expect(html).not.toContain('data-row-id="row-0"');
  });

  it("rejects incomplete continuous server initial results", () => {
    expect(() => renderToString(() => <ThemeProvider><DataTable mode="server" pagination={false} columns={columns} getRowId={row => row.id} caption="Server rows" initialResult={{ rows: rows.slice(0, 1), total: 2 }} onStateChange={async () => ({ rows: [], total: 0 })} /></ThemeProvider>)).toThrow("must be complete");
  });

  it("renders deterministic column controls and logical pinned offsets on the server", () => {
    const html = renderToString(() => <ThemeProvider><DataTable data={rows} columns={pinnedColumns} getRowId={row => row.id} caption="Pinned rows" pagination={false} initialViewportHeight={120} /></ThemeProvider>);
    expect(html).toContain(">Columns</button>");
    expect(html).toContain("40 results");
    expect(html).toContain('role="separator"');
    expect(html).toContain('aria-label="Resize Name"');
    expect(html).toContain('data-pin="start"');
    expect(html).toContain('inset-inline-start:0px');
    const tableId = html.match(/<table[^>]*id="([^"]+)"/)?.[1];
    expect(tableId).toBeTruthy();
    expect(html).toContain(`aria-controls="${tableId}"`);
  });

  it("validates restored column bounds and can explicitly hide column controls", () => {
    expect(() => renderToString(() => <ThemeProvider><DataTable data={rows} columns={pinnedColumns} getRowId={row => row.id} caption="Invalid width" pagination={false}
      initialState={{ columns: [{ id: "name", visible: true, width: 20, pin: "start" }, { id: "amount", visible: true, width: null, pin: false }] }} /></ThemeProvider>)).toThrow("within its column bounds");
    const html = renderToString(() => <ThemeProvider><DataTable data={rows} columns={columns} getRowId={row => row.id} caption="No controls" pagination={false} columnControls={false} /></ThemeProvider>);
    expect(html).not.toContain(">Columns</button>");
  });

  it("renders client export formats and gates server export on its adapter", () => {
    const client = renderToString(() => <ThemeProvider><DataTable data={rows} columns={columns} getRowId={row => row.id} caption="Exportable accounts" pagination={{ pageIndex: 1, pageSize: 10 }} export={{ formats: ["csv"], filename: "accounts" }} /></ThemeProvider>);
    expect(client).toContain(">Export</button>");
    const disabled = renderToString(() => <ThemeProvider><DataTable data={rows} columns={columns} getRowId={row => row.id} caption="Private accounts" pagination={false} export={false} /></ThemeProvider>);
    expect(disabled).not.toContain(">Export</button>");

    const initialResult = { rows: rows.slice(0, 10), total: rows.length };
    const unavailable = renderToString(() => <ThemeProvider><DataTable mode="server" columns={columns} getRowId={row => row.id} caption="Server without export" pagination={{ pageIndex: 0, pageSize: 10 }} initialResult={initialResult} onStateChange={async () => initialResult} /></ThemeProvider>);
    expect(unavailable).not.toContain(">Export</button>");
    let calls = 0;
    const available = renderToString(() => <ThemeProvider><DataTable mode="server" columns={columns} getRowId={row => row.id} caption="Server with export" pagination={{ pageIndex: 0, pageSize: 10 }} initialResult={initialResult} onStateChange={async () => initialResult}
      onExport={async () => { calls++; return new Blob(); }} /></ThemeProvider>);
    expect(available).toContain(">Export</button>");
    expect(calls).toBe(0);
  });

  it("rejects invalid export customization before rendering", () => {
    expect(() => renderToString(() => <ThemeProvider><DataTable data={rows} columns={columns} getRowId={row => row.id} caption="Rows" pagination={false} export={{ formats: [] }} /></ThemeProvider>)).toThrow("nonempty array");
    expect(() => renderToString(() => <ThemeProvider><DataTable data={rows} columns={columns} getRowId={row => row.id} caption="Rows" pagination={false} export={{ formats: ["csv", "csv"] }} /></ThemeProvider>)).toThrow("unique");
    expect(() => renderToString(() => <ThemeProvider><DataTable data={rows} columns={columns} getRowId={row => row.id} caption="Rows" pagination={false} export={{ filename: "../rows" }} /></ThemeProvider>)).toThrow("path separators");
    expect(() => renderToString(() => <ThemeProvider><DataTable data={rows} columns={columns} getRowId={row => row.id} caption="Rows" pagination={false} export={{ resetKey: Number.NaN }} /></ThemeProvider>)).toThrow("resetKey");
  });

  it("server-renders committed editable values as focusable spans without invoking commits", () => {
    let calls = 0;
    const html = renderToString(() => <ThemeProvider><DataTable data={rows.slice(0, 1)} columns={editableColumns} getRowId={row => row.id} caption="Editable rows" pagination={false}
      onCellCommit={async request => { calls++; return { kind: "accepted", value: request.value }; }} /></ThemeProvider>);
    expect(html).toContain('data-editable=""');
    expect(html).toContain('class="sheen-data-table-edit-rest"');
    expect(html).toContain('tabindex="0"');
    expect(html).not.toContain('class="sheen-data-table-editor');
    expect(calls).toBe(0);
  });

  it("rejects incomplete editable-column contracts and invalid reset keys", () => {
    expect(() => renderToString(() => <ThemeProvider><DataTable data={rows} columns={editableColumns} getRowId={row => row.id} caption="Missing commit" pagination={false} /></ThemeProvider>)).toThrow("require onCellCommit");
    expect(() => renderToString(() => <ThemeProvider><DataTable data={rows} columns={columns} getRowId={row => row.id} caption="Missing editor" pagination={false} onCellCommit={async request => ({ kind: "accepted", value: request.value })} /></ThemeProvider>)).toThrow("requires at least one");
    expect(() => renderToString(() => <ThemeProvider><DataTable data={rows} columns={editableColumns} getRowId={row => row.id} caption="Invalid reset" pagination={false} editResetKey={Number.NaN}
      onCellCommit={async request => ({ kind: "accepted", value: request.value })} /></ThemeProvider>)).toThrow("editResetKey");
  });

  it("renders sticky footer values from the complete client view rather than one page", () => {
    const html = renderToString(() => <ThemeProvider><DataTable data={rows} columns={chromeColumns} getRowId={row => row.id} caption="Account totals" pagination={{ pageIndex: 1, pageSize: 10 }} /></ThemeProvider>);
    expect(html).toContain("<tfoot ");
    expect(html).toContain(">Total</td>");
    expect(html).toContain(">780</td>");
    expect(html).toContain('aria-rowcount="42"');
    expect(html).toMatch(/<tfoot[^>]*><tr aria-rowindex="42"/u);
  });

  it("exposes logical column gaps and selectable row state without changing native table semantics", () => {
    const html = renderToString(() => <ThemeProvider><DataTable data={rows.slice(0, 2)} columns={chromeColumns} getRowId={row => row.id} caption="Accessible rows" pagination={false}
      initialState={{ columns: [{ id: "name", visible: false, width: null, pin: false }, { id: "amount", visible: true, width: null, pin: false }] }}
      selection={{ mode: "multiple", onChange: () => {} }} /></ThemeProvider>);
    expect(html).toContain('aria-colcount="3"');
    expect(html).toContain('scope="col" aria-colindex="1"');
    expect(html).toContain('scope="col" aria-colindex="3" data-column="amount"');
    expect(html).toMatch(/data-row-id="row-0"[^>]*data-index="0"[^>]*aria-rowindex="2"[^>]*aria-selected="false"/u);
    expect(html).toContain('aria-colindex="3" data-column="amount"');
  });

  it("distinguishes empty, filtered no-results, and delayed cold-load markup", () => {
    const empty = renderToString(() => <ThemeProvider><DataTable data={[]} columns={chromeColumns} getRowId={row => row.id} caption="Empty accounts" pagination={false} /></ThemeProvider>);
    expect(empty).toContain('data-state="empty"');
    expect(empty).toContain('data-kind="empty"');
    expect(empty).not.toContain(">Clear filters</button>");

    const filtered = renderToString(() => <ThemeProvider><DataTable data={rows} columns={chromeColumns} getRowId={row => row.id} caption="Filtered accounts" pagination={false}
      initialState={{ filter: { kind: "text", column: "name", operator: "eq", value: "missing", caseSensitive: false } }} /></ThemeProvider>);
    expect(filtered).toContain('data-state="no-results"');
    expect(filtered).toContain('data-kind="no-results"');
    expect(filtered).toContain(">Clear filters</button>");

    const searched = renderToString(() => <ThemeProvider><DataTable data={rows} columns={columns} getRowId={row => row.id} caption="Searched accounts" pagination={false}
      initialState={{ search: "missing" }} /></ThemeProvider>);
    expect(searched).toContain('data-state="no-results"');
    expect(searched).toContain(">Clear search and filters</button>");

    const cold = renderToString(() => <ThemeProvider><DataTable mode="server" columns={chromeColumns} getRowId={row => row.id} caption="Cold accounts" pagination={false} onStateChange={async () => ({ rows: [], total: 0 })} /></ThemeProvider>);
    expect(cold).toContain('data-state="cold"');
    expect(cold).not.toContain('data-visible=""');
  });

  it("renders one row-action model without invoking actions during SSR and rejects ambiguous models", () => {
    let calls = 0;
    const actions: readonly DataTableAction<Row>[] = [{ id: "archive", label: "Archive", tone: "danger", onSelect: () => { calls++; } }];
    const html = renderToString(() => <ThemeProvider><DataTable data={rows.slice(0, 1)} columns={columns} getRowId={row => row.id} caption="Action accounts" pagination={false} actions={actions} /></ThemeProvider>);
    expect(html).toContain('data-row-id="row-0"');
    expect(html).not.toContain('data-disabled=""');
    expect(calls).toBe(0);
    expect(() => renderToString(() => <ThemeProvider><DataTable data={rows} columns={columns} getRowId={row => row.id} caption="Duplicate actions" pagination={false}
      actions={[{ id: "archive", label: "Archive", onSelect: () => {} }, { id: "archive", label: "Again", onSelect: () => {} }]} /></ThemeProvider>)).toThrow("unique nonempty");
  });

  it("server-renders multiple-selection controls without publishing synthetic intent", () => {
    const changes: unknown[] = [];
    const html = renderToString(() => <ThemeProvider><DataTable data={rows.slice(0, 2)} columns={pinnedColumns} getRowId={row => row.id} caption="Selectable rows" pagination={false}
      selection={{ mode: "multiple", getRowLabel: row => `Choose ${row.name}`, onChange: value => changes.push(value) }} /></ThemeProvider>);
    expect(html).toContain('data-selection="multiple"');
    expect(html).toContain(">Select all matching</button>");
    expect(html).toContain("Select this page");
    expect(html).toContain("Choose Row 0");
    expect(html).toContain("var(--sheen-table-selection-column, 2.75rem)");
    expect(html).toContain("calc(var(--sheen-table-selection-column, 2.75rem))");
    expect(changes).toEqual([]);
  });

  it("does not offer inverted selection when separate fuzzy-search criteria cannot fit the payload", () => {
    const html = renderToString(() => <ThemeProvider><DataTable data={rows} columns={columns} getRowId={row => row.id} caption="Searched rows" pagination={false}
      initialState={{ search: "Row 1" }} selection={{ mode: "multiple", resetKey: "account-a", onChange: () => {} }} /></ThemeProvider>);
    expect(html).not.toContain(">Select all matching</button>");
    expect(html).toContain("Select this page");
    expect(() => renderToString(() => <ThemeProvider><DataTable data={rows} columns={columns} getRowId={row => row.id} caption="Invalid reset" pagination={false}
      selection={{ mode: "multiple", resetKey: Number.NaN, onChange: () => {} }} /></ThemeProvider>)).toThrow("resetKey");
  });

  it("server-renders expanded client groups with full-view aggregates and treegrid metadata", () => {
    const groupedRows: readonly Row[] = [
      { id: "a", name: "Alpha", amount: 10 },
      { id: "b", name: "Beta", amount: 4 },
      { id: "c", name: "Alpha", amount: 20 },
    ];
    const html = renderToString(() => <ThemeProvider><DataTable data={groupedRows} columns={aggregateColumns} getRowId={row => row.id} caption="Grouped rows" pagination={false}
      grouping={{ by: "name" }} /></ThemeProvider>);
    expect(html).toContain('role="treegrid"');
    expect(html).toContain('aria-rowcount="-1" aria-colcount="2"');
    expect(html).toMatch(/data-group-id="group:name:string:&quot;Alpha&quot;"[^>]*data-index="0"[^>]*aria-rowindex="2"/u);
    expect(html).toContain('data-group-id="group:name:string:&quot;Alpha&quot;"');
    expect(html).toContain('aria-level="1"');
    expect(html).toContain('aria-level="2"');
    expect(html).toContain("Alpha");
    expect(html).toContain(">30</td>");
    expect(html.match(/data-row-id=/g)).toHaveLength(3);
  });

  it("server-renders delegated groups only from explicit full-group metadata", () => {
    const page: readonly Row[] = [{ id: "a", name: "Alpha", amount: 10 }, { id: "b", name: "Alpha", amount: 20 }];
    const initialResult = { rows: page, total: 20, groups: [{ value: "Alpha", rowIds: ["a", "b"], count: 12, aggregates: [{ column: "amount", value: 450 }] }] };
    const html = renderToString(() => <ThemeProvider><DataTable mode="server" columns={aggregateColumns} getRowId={row => row.id} caption="Delegated groups" pagination={{ pageIndex: 0, pageSize: 2 }}
      initialResult={initialResult} onStateChange={async () => initialResult} grouping={{ by: "name" }} /></ThemeProvider>);
    const textContent = html.replaceAll(/<!--[\s\S]*?-->/g, "");
    expect(html).toContain("Alpha");
    expect(textContent).toContain("(12)");
    expect(html).toContain(">450</td>");
    expect(() => renderToString(() => <ThemeProvider><DataTable mode="server" columns={aggregateColumns} getRowId={row => row.id} caption="Missing delegated groups" pagination={{ pageIndex: 0, pageSize: 2 }}
      initialResult={{ rows: page, total: 20 }} onStateChange={async () => ({ rows: page, total: 20 })} grouping={{ by: "name" }} /></ThemeProvider>)).toThrow("groups array");
  });

  it("server-renders known hierarchy without starting unloaded child requests", () => {
    let loads = 0;
    const treeRows: readonly TreeRow[] = [
      { id: "parent", name: "Parent", amount: 1, children: [{ id: "child", name: "Child", amount: 2 }] },
      { id: "remote", name: "Remote", amount: 3, remote: true },
    ];
    const html = renderToString(() => <ThemeProvider><DataTable data={treeRows} columns={treeColumns} getRowId={row => row.id} caption="Tree rows" pagination={false}
      hierarchy={{ getChildren: row => row.children, hasChildren: row => row.remote === true, onLoadChildren: async () => { loads++; return []; }, defaultExpanded: ["parent"] }} /></ThemeProvider>);
    expect(html).toContain('role="treegrid"');
    expect(html).toContain('data-row-id="parent"');
    expect(html).toContain('data-row-id="child"');
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('aria-level="2"');
    expect(loads).toBe(0);
  });

  it("rejects ambiguous grouping, paging, and async hierarchy contracts", () => {
    expect(() => renderToString(() => <ThemeProvider><DataTable data={rows} columns={aggregateColumns} getRowId={row => row.id} caption="Paged groups" pagination={{ pageIndex: 0, pageSize: 10 }} grouping={{ by: "name" }} /></ThemeProvider>)).toThrow("complete continuous");
    expect(() => renderToString(() => <ThemeProvider><DataTable data={rows} columns={aggregateColumns} getRowId={row => row.id} caption="Missing group" pagination={false} grouping={{ by: "missing" }} /></ThemeProvider>)).toThrow("accessor column");
    expect(() => renderToString(() => <ThemeProvider><DataTable data={rows} columns={aggregateColumns} getRowId={row => row.id} caption="Ambiguous" pagination={false} grouping={{ by: "name" }} hierarchy={{ getChildren: () => [] }} /></ThemeProvider>)).toThrow("separate presentation");
    expect(() => renderToString(() => <ThemeProvider><DataTable data={rows} columns={aggregateColumns} getRowId={row => row.id} caption="Unsafe loader" pagination={false} hierarchy={{ onLoadChildren: async () => [] }} /></ThemeProvider>)).toThrow("requires hasChildren");
  });
});
