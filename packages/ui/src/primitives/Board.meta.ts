import { defineMeta } from "../metadata.ts";
import type { BoardColumn, BoardProps } from "./Board.tsx";

export default defineMeta<BoardProps<BoardColumn>>({
  name: "Board", package: "@gemologic/sheen", category: "data", summary: "A controlled Kanban board: cards move within and between columns by pointer or keyboard, columns optionally reorder, and empty columns stay drop zones. Import it from @gemologic/sheen/sortable with @gemologic/sheen/styles/sortable.css.",
  props: {
    ref: { description: "Root element reference." },
    columns: { description: "Owner-ordered columns { id, label, cards, disabled? }. Column ids and card ids are stable and unique across the board; card nodes are keyed by id within their column." },
    children: { description: "Renders one card from its accessor and its column accessor." },
    columnHeader: { description: "Replaces the default title and count badge inside each header. Receives the column and its live card count; the reorder handle stays Sheen-owned." },
    onMove: { description: "Receives { id, fromColumn, fromIndex, toColumn, index } after a card drop. index is final, measured after the card leaves its origin. Pass updated columns back to accept it." },
    onColumnReorder: { description: "Enables column reordering through a grip in each header and receives { id, fromIndex, toIndex, ids }." },
    label: { description: "Accessible name of the board group.", control: { kind: "text" } },
    handle: { description: "Render a grip button on each card that owns pointer and keyboard dragging. Without it the whole card drags and is the keyboard target.", default: false, control: { kind: "boolean" } },
    disabled: { description: "Prevents every card and column move. Disabled columns neither accept cards nor release theirs; disabled cards stay put.", default: false, control: { kind: "boolean" } },
    messages: { description: "Per-instance overrides for the board* and sortable* message keys. Scoped ThemeProvider messages with the same keys apply first." },
  },
  tokens: ["--sheen-color-bg-subtle", "--sheen-color-bg-raised", "--sheen-elevation-raised", "--sheen-elevation-overlay", "--sheen-color-accent", "--sheen-color-focus-ring", "--sheen-surface-radius"],
  a11y: {
    role: "group of column groups, each labelled by its header and containing a list of cards; visually hidden instructions and an assertive status region announce moves",
    keyboard: ["Space or Enter picks up the focused card", "ArrowUp/ArrowDown move the card within its column", "ArrowLeft/ArrowRight move it to the adjacent enabled column (mirrored in RTL)", "Home and End move it to the start or end of the column", "Space or Enter drops and calls onMove", "Escape or moving focus away cancels", "On a column grip, Space or Enter lifts and ArrowLeft/ArrowRight, Home, and End reorder columns"],
  },
  examples: [
    { title: "Sprint board", imports: 'import { createSignal } from "solid-js";\nimport type { BoardColumn } from "@gemologic/sheen/sortable";', setup: 'const [columns] = createSignal<readonly BoardColumn[]>([{ id: "todo", label: "To do", cards: [{ id: "c1", label: "Audit log export" }] }, { id: "done", label: "Done", cards: [] }]);', code: '<Board label="Sprint" columns={columns()} onMove={move => console.info(move)}>{card => <span>{card().label}</span>}</Board>' },
    { title: "Custom header and column reordering", code: '<Board label="Pipeline" columns={[{ id: "lead", label: "Leads", cards: [{ id: "acme", label: "Acme renewal" }] }]} onMove={() => {}} onColumnReorder={() => {}} columnHeader={(column, count) => <strong>{`${column().label} (${count()})`}</strong>}>{card => card().label}</Board>' },
  ],
  guidance: {
    do: ["Apply onMove to your own data and pass the updated columns back; reject by keeping the previous columns.", "Keep card ids stable across refreshes so focus and identity survive.", "Use columnHeader for WIP limits or actions, keeping the count visible."],
    dont: ["Do not walk remote pages to fill a column; give the board the complete bounded card set.", "Do not rely on drag alone; keyboard moves use the same onMove contract.", "Do not reuse a card id in two columns."],
  },
});
