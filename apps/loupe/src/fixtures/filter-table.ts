import type { FilterColumn } from "@gemologic/sheen-table";

export interface FilterFixtureRow {
  readonly id: string;
  readonly name: string;
  readonly status: "open" | "closed" | "pending";
  readonly amount: number;
  readonly created: number;
}

export const filterRows: readonly FilterFixtureRow[] = Object.freeze([
  Object.freeze({ id: "filter-a", name: "Alpha", status: "open", amount: 10, created: Date.UTC(2026, 8, 1) }),
  Object.freeze({ id: "filter-b", name: "Beta", status: "closed", amount: 20, created: Date.UTC(2026, 8, 2) }),
  Object.freeze({ id: "filter-c", name: "Alpine", status: "pending", amount: 30, created: Date.UTC(2026, 8, 3) }),
  Object.freeze({ id: "filter-d", name: "Gamma", status: "open", amount: 40, created: Date.UTC(2026, 8, 4) }),
]);

export const filterSchema: readonly FilterColumn[] = Object.freeze([
  Object.freeze({ id: "name", type: "text" }),
  Object.freeze({ id: "status", type: "enum", options: Object.freeze(["open", "closed", "pending"]) }),
  Object.freeze({ id: "amount", type: "number" }),
  Object.freeze({ id: "created", type: "date" }),
]);

export function filterValue(row: FilterFixtureRow, column: string): string | number {
  if (column === "name") return row.name;
  if (column === "status") return row.status;
  if (column === "amount") return row.amount;
  if (column === "created") return row.created;
  throw new Error(`Unknown filter fixture column: ${column}`);
}

