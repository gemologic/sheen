import { createSignal } from "solid-js";
import { QueryBuilder } from "./QueryBuilder.tsx";
import type { QueryBuilderProps } from "./QueryBuilder.tsx";
import type { FilterNode } from "./filter.ts";
import metadata from "./QueryBuilder.meta.ts";

const columns: QueryBuilderProps["columns"] = [
  { id: "name", label: "Name", type: "text" },
  { id: "status", label: "Status", type: "enum", options: ["active", "paused", "closed"] },
  { id: "balance", label: "Balance", type: "number" },
  { id: "created", label: "Created", type: "date" },
];
const initial: FilterNode = { kind: "and", children: [{ kind: "enum", column: "status", operator: "in", values: ["active"] }] };

export const controls = metadata.props;
export default function QueryBuilderDemo(props: Partial<QueryBuilderProps>) {
  const [filter, setFilter] = createSignal(props.value ?? initial);
  return <QueryBuilder {...props} columns={props.columns ?? columns} value={filter()} onChange={value => { setFilter(value); props.onChange?.(value); }} />;
}
