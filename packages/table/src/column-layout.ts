import type { ColumnState } from "./table-state.ts";

export type ColumnMoveDirection = "toward-start" | "toward-end";
export type ColumnDropPlacement = "before" | "after";

/** Resolve logical pin regions while retaining the user's order inside each region. */
export function orderColumnStates(columns: readonly ColumnState[]): readonly ColumnState[] {
  return [
    ...columns.filter(column => column.pin === "start"),
    ...columns.filter(column => column.pin === false),
    ...columns.filter(column => column.pin === "end"),
  ];
}

/** Reorder one column relative to another without allowing a drag to change pin regions. */
export function placeColumn(columns: readonly ColumnState[], sourceId: string, targetId: string, placement: ColumnDropPlacement): readonly ColumnState[] {
  if (sourceId === targetId) return columns;
  const source = columns.find(column => column.id === sourceId);
  const target = columns.find(column => column.id === targetId);
  if (!source || !target) throw new Error("Cannot reorder an unknown table column");
  if (source.pin !== target.pin) throw new Error("Cannot reorder columns across pin regions");
  const reordered = columns.filter(column => column.id !== sourceId);
  const targetIndex = reordered.findIndex(column => column.id === targetId);
  reordered.splice(targetIndex + (placement === "after" ? 1 : 0), 0, source);
  return reordered;
}

/** Keyboard/menu equivalent for a one-position logical drag. */
export function moveColumn(columns: readonly ColumnState[], id: string, direction: ColumnMoveDirection): readonly ColumnState[] {
  const ordered = orderColumnStates(columns);
  const index = ordered.findIndex(column => column.id === id);
  if (index < 0) throw new Error(`Cannot move unknown table column: ${id}`);
  const source = ordered[index];
  if (!source) throw new Error(`Cannot move unknown table column: ${id}`);
  const step = direction === "toward-start" ? -1 : 1;
  let candidate = index + step;
  while (candidate >= 0 && candidate < ordered.length) {
    const target = ordered[candidate];
    if (target?.pin === source.pin) return placeColumn(columns, id, target.id, direction === "toward-start" ? "before" : "after");
    candidate += step;
  }
  return columns;
}

export function canMoveColumn(columns: readonly ColumnState[], id: string, direction: ColumnMoveDirection): boolean {
  return moveColumn(columns, id, direction) !== columns;
}
