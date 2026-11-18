import { createSignal } from "solid-js";
import { Board } from "./Board.tsx";
import type { BoardColumn, BoardMove, BoardProps } from "./Board.tsx";
import type { SortableReorder } from "./sortable-core.ts";
import metadata from "./Board.meta.ts";

export const controls = metadata.props;

function applyMove(columns: readonly BoardColumn[], move: BoardMove): BoardColumn[] {
  const card = columns.flatMap(column => column.cards).find(candidate => candidate.id === move.id);
  if (!card) return [...columns];
  return columns.map(column => {
    const cards = column.cards.filter(candidate => candidate.id !== move.id);
    if (column.id === move.toColumn) cards.splice(move.index, 0, card);
    return { ...column, cards };
  });
}

export default function BoardDemo(props: Partial<Omit<BoardProps<BoardColumn>, "columns" | "children">>) {
  const [columns, setColumns] = createSignal<readonly BoardColumn[]>([
    { id: "todo", label: "To do", cards: [{ id: "audit", label: "Audit log export" }, { id: "retry", label: "Webhook retries" }] },
    { id: "doing", label: "In progress", cards: [{ id: "quiet", label: "Quiet audit log" }] },
    { id: "done", label: "Done", cards: [] },
  ]);
  const reorder = (event: SortableReorder) => { setColumns(current => event.ids.flatMap(id => current.filter(column => column.id === id))); props.onColumnReorder?.(event); };
  return <Board label="Sprint board" {...props} columns={columns()} onMove={move => { setColumns(current => applyMove(current, move)); props.onMove?.(move); }} onColumnReorder={reorder}>
    {card => <span>{card().label}</span>}
  </Board>;
}
