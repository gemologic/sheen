import { createComponent } from "solid-js";
import { QueryBuilder } from "@gemologic/sheen-table/query-builder";
import "@gemologic/sheen-table/styles.css";

const columns = [
  { id: "name", label: "Name", type: "text" },
  { id: "status", label: "Status", type: "enum", options: ["active", "paused"] },
];
const filter = { kind: "and", children: [{ kind: "enum", column: "status", operator: "in", values: ["active"] }] };

export function ConsumerQueryBuilder() {
  return createComponent(QueryBuilder, { columns, value: filter, onChange: () => undefined, label: "Installed query" });
}
