import { defineMeta } from "../../ui/src/metadata.ts";
import type { FilterBarProps } from "./FilterBar.tsx";

interface ExampleRow { readonly id: string; readonly name: string; readonly status: string }

export default defineMeta<FilterBarProps<ExampleRow>>({
  name: "FilterBar", package: "@gemologic/sheen-table", category: "data", summary: "Edits the accepted serializable filter AST through removable condition chips and typed draft popovers.",
  props: {
    columns: { description: "Opaque sheen columns whose filter declarations supply labels, types, enum options, and validation." },
    value: { description: "Accepted immutable filter AST. Nested and/or/not structure is preserved during leaf edits." },
    onChange: { description: "Receives one validated immutable AST when a draft is applied or a chip is removed." },
    facets: { description: "Optional accepted enum counts by column and option, typically from the complete client view or server response." },
    disabled: { description: "Prevents apply, add, and remove intent while retaining visible accepted chips and draft inspection.", default: false },
    class: { description: "Additional class merged onto the labeled filter region." },
    dateEditor: { description: "Optional isolated date selector adapter; omission preserves the native date-input fallback and table bundle boundary." },
  },
  tokens: ["--sheen-color-bg-raised", "--sheen-color-border-control", "--sheen-color-focus-ring"],
  a11y: { role: "group, dialog, searchbox, button, checkbox", keyboard: ["Tab", "Shift+Tab", "Enter", "Space", "Escape"] },
  examples: [{
    title: "Accepted enum filter",
    setup: `const columns = defineColumns<{ readonly id: string; readonly name: string; readonly status: string }>([
  { id: "name", header: "Name", accessor: row => row.name, filter: { type: "text" } },
  { id: "status", header: "Status", accessor: row => row.status, filter: { type: "enum", options: ["open", "closed"], faceted: true } },
]);
const [filter, setFilter] = createSignal<FilterNode>({ kind: "enum", column: "status", operator: "in", values: ["open"] });`,
    imports: 'import { createSignal } from "solid-js";\nimport type { FilterNode } from "@gemologic/sheen-table";',
    code: '<FilterBar columns={columns} value={filter()} onChange={setFilter} facets={{ status: { open: 12, closed: 4 } }} />',
  }],
  guidance: {
    do: ["Keep the accepted AST controlled by the same owner as table state.", "Use enum facets from the complete transformed result, not the visible page.", "Apply editor drafts atomically and retain accepted rows during delegated revalidation."],
    dont: ["Do not flatten imported nested logic into a misleading conjunction.", "Do not dispatch server requests on each draft keystroke.", "Do not interpret native date values in the browser's local time zone."],
  },
});
