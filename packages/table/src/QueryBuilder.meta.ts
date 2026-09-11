import { defineMeta } from "../../ui/src/metadata.ts";
import type { QueryBuilderProps } from "./QueryBuilder.tsx";

export default defineMeta<QueryBuilderProps>({
  name: "QueryBuilder", package: "@gemologic/sheen-table", category: "data", summary: "Builds nested, typed, serializable table filters with complete keyboard alternatives to structural editing.",
  props: {
    columns: { description: "Typed query columns with user-facing labels and closed enum options." },
    value: { description: "Controlled immutable filter AST shared with DataTable, URL state, and saved views." },
    onChange: { description: "Receives a validated immutable AST after each complete editor operation." },
    label: { description: "Accessible region label.", default: "Query builder", control: { kind: "text" } },
    disabled: { description: "Retains the visible query while preventing edits.", default: false, control: { kind: "boolean" } },
    class: { description: "Additional class merged onto the labeled query region." },
  },
  tokens: ["--sheen-color-bg", "--sheen-color-border-control", "--sheen-color-focus-ring"],
  a11y: { role: "region, group, button, listbox, checkbox, spinbutton, status", keyboard: ["Tab", "Shift+Tab", "Enter", "Space", "Escape", "ArrowUp", "ArrowDown"] },
  examples: [{
    title: "Nested account query",
    setup: `const queryColumns = [
  { id: "name", label: "Name", type: "text" },
  { id: "status", label: "Status", type: "enum", options: ["active", "paused"] },
] satisfies readonly QueryBuilderColumn[];
const [filter, setFilter] = createSignal<FilterNode>({ kind: "and", children: [
  { kind: "text", column: "name", operator: "contains", value: "Acme", caseSensitive: false },
] });`,
    imports: 'import { createSignal } from "solid-js";\nimport type { FilterNode, QueryBuilderColumn } from "@gemologic/sheen-table/core";',
    code: '<QueryBuilder columns={queryColumns} value={filter()} onChange={setFilter} label="Account query" />',
  }],
  composer: { allowedParentRegions: ["toolbar", "main-grid", "details-panel"], acceptedChildRegions: [], editableSafeProps: ["label", "disabled"], fixtureFactory: "query-filter", codeGenerationAdapter: "query-builder" },
  guidance: {
    do: ["Control the builder and DataTable from the same accepted filter state.", "Serialize only through serializeFilter and validate URL or saved-view input with deserializeFilter.", "Offer move buttons even when a product later adds drag reordering."],
    dont: ["Do not dispatch remote requests from partial input drafts.", "Do not encode executable predicates or CSS in persisted query state.", "Do not flatten nested and, or, or not nodes for display."],
  },
});
