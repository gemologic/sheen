import { defineMeta } from "../metadata.ts";
import type { TableFootProps } from "./Table.tsx";

export default defineMeta<TableFootProps>({
  "name": "TableFoot",
  "package": "@gemologic/sheen",
  "category": "data-display",
  "summary": "Native tfoot semantics and token styling for bounded, non-virtualized tables.",
  "props": {},
  "tokens": [
    "--sheen-table-row-h",
    "--sheen-color-fg",
    "--sheen-color-fg-muted",
    "--sheen-color-border",
    "--sheen-color-bg-subtle"
  ],
  "a11y": {
    "role": "native tfoot",
    "keyboard": [
      "Native controls within cells retain their tab order; static rows are not focus stops."
    ]
  },
  "examples": [
    {
      "title": "Small order table",
      "code": "<Table><TableCaption>Orders</TableCaption><TableHead><TableRow><TableHeaderCell>Symbol</TableHeaderCell><TableHeaderCell numeric>Quantity</TableHeaderCell></TableRow></TableHead><TableBody><TableRow><TableHeaderCell scope=\"row\">BTC</TableHeaderCell><TableCell numeric>1.25</TableCell></TableRow></TableBody></Table>"
    }
  ],
  "guidance": {
    "do": [
      "Supply a caption or explicit accessible table name. Use header cells with scope=col or scope=row.",
      "Keep native table nesting and explicit TableBody for deterministic server markup."
    ],
    "dont": [
      "Do not use this primitive for unbounded datasets. DataTable owns virtualization, pagination, and grid interaction.",
      "Do not make static rows keyboard focus stops or apply grid roles without implementing grid behavior."
    ]
  }
});
