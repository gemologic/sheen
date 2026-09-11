import { describe, expect, it } from "vitest";
import { renderToString } from "solid-js/web";
import { Table, TableCaption, TableHead, TableBody, TableFoot, TableRow, TableHeaderCell, TableCell } from "./Table.tsx";

describe("styled table SSR", () => {
  it("preserves native nesting, header scopes, and cell associations", () => {
    const html = renderToString(() => <Table striped class="custom"><TableCaption>Orders</TableCaption><TableHead><TableRow><TableHeaderCell id="quantity" numeric>Quantity</TableHeaderCell></TableRow></TableHead><TableBody><TableRow><TableCell headers="quantity" numeric>1.25</TableCell></TableRow></TableBody><TableFoot><TableRow><TableHeaderCell scope="row">Total</TableHeaderCell></TableRow></TableFoot></Table>);
    for (const tag of ["table", "caption", "thead", "tbody", "tfoot", "tr", "th", "td"]) expect(html).toContain(`<${tag}`);
    expect(html).toContain('scope="col"');
    expect(html).toContain('scope="row"');
    expect(html).toContain('headers="quantity"');
    expect(html).toContain('data-striped="true"');
    expect(html).toContain('data-numeric="true"');
    expect(html).toContain("custom");
    expect(html).not.toMatch(/role="grid"|tabindex/);
  });
  it("forwards native spanning and visibility without adding a wrapper", () => {
    const html = renderToString(() => <Table aria-label="Summary"><TableBody><TableRow hidden><TableCell colSpan={2} rowSpan={3}>Combined</TableCell></TableRow></TableBody></Table>);
    expect(html).toMatch(/^<table\b/);
    expect(html).toContain('aria-label="Summary"');
    expect(html).toMatch(/colspan="2"/i);
    expect(html).toMatch(/rowspan="3"/i);
    expect(html).toMatch(/\bhidden(?:[ =>])/);
    expect(html).not.toContain("data-striped");
  });
});
