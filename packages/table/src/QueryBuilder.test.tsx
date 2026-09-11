import { describe, expect, it } from "vitest";
import { renderToString } from "solid-js/web";
import { ThemeProvider } from "@gemologic/sheen";
import { QueryBuilder } from "./QueryBuilder.tsx";
import type { FilterNode } from "./filter.ts";
import type { QueryBuilderColumn } from "./query-builder-state.ts";

const columns = [
  { id: "name", label: "Name", type: "text" },
  { id: "status", label: "Status", type: "enum", options: ["active", "paused"] },
  { id: "balance", label: "Balance", type: "number" },
  { id: "created", label: "Created", type: "date" },
] satisfies readonly QueryBuilderColumn[];
const filter: FilterNode = { kind: "and", children: [
  { kind: "text", column: "name", operator: "contains", value: "Acme", caseSensitive: false },
  { kind: "not", child: { kind: "enum", column: "status", operator: "in", values: ["paused"] } },
  { kind: "number", column: "balance", operator: "between", min: 100, max: 500 },
  { kind: "date", column: "created", operator: "gte", value: Date.UTC(2026, 0, 1) },
] };

describe("QueryBuilder SSR", () => {
  it("renders complete nested query content and keyboard actions without publishing", () => {
    const changes: FilterNode[] = [];
    const html = renderToString(() => <ThemeProvider><QueryBuilder columns={columns} value={filter} onChange={value => changes.push(value)} label="Account query" /></ThemeProvider>);
    const text = html.replaceAll(/<!--[\s\S]*?-->/g, "");
    expect(html).toContain('aria-label="Account query"');
    expect(html).toContain('data-query-path="0"');
    expect(html).toContain('data-query-path="1"');
    expect(text).toContain("Add rule");
    expect(text).toContain("Move before");
    expect(text).toContain("Include");
    expect(text).toContain("Acme");
    expect(text).toContain("2026-01-01");
    expect(changes).toEqual([]);
  });

  it("rejects a query referencing a missing column before rendering controls", () => {
    expect(() => renderToString(() => <ThemeProvider><QueryBuilder columns={columns} value={{ kind: "empty", column: "missing" }} onChange={() => {}} /></ThemeProvider>)).toThrow("unknown");
  });
});
