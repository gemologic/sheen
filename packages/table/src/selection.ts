import { parseFilter } from "./filter.ts";
import type { FilterColumn, FilterNode } from "./filter.ts";

export type BulkSelection =
  | { readonly kind: "ids"; readonly ids: readonly string[] }
  | { readonly kind: "query"; readonly filter: FilterNode; readonly excluded: readonly string[] };

function validatedIds(ids: readonly string[]): Set<string> {
  const result = new Set<string>();
  for (const id of ids) {
    if (typeof id !== "string" || !id.trim() || result.has(id)) throw new Error("Loaded selection IDs must be unique nonempty strings");
    result.add(id);
  }
  return result;
}

/** Owns selection IDs only. The app owns authorization, matching rows, and bulk execution. */
export function createTableSelection(initialFilter: FilterNode, columns: readonly FilterColumn[]) {
  let filter = parseFilter(initialFilter, columns);
  let filterKey = JSON.stringify(filter);
  let loaded = new Set<string>();
  let explicit = new Set<string>();
  let excluded = new Set<string>();
  let inverted = false;
  function clear() { explicit = new Set(); excluded = new Set(); inverted = false; }
  function setSelected(id: string, selected: boolean) {
    if (!loaded.has(id)) throw new Error(`Selection changes require a loaded matching row: ${id}`);
    if (inverted) { if (selected) excluded.delete(id); else excluded.add(id); }
    else { if (selected) explicit.add(id); else explicit.delete(id); }
  }
  return {
    /** Supply only IDs from the accepted matching page/view, not pending-query placeholders. */
    setLoadedIds(ids: readonly string[]) { loaded = validatedIds(ids); },
    setSelected,
    selectLoaded(selected = true) { for (const id of loaded) setSelected(id, selected); },
    selectRange(anchor: string, target: string, selected = true) {
      if (!loaded.has(anchor) || !loaded.has(target)) throw new Error("Selection range endpoints must belong to the loaded matching view");
      const ids = [...loaded];
      const start = ids.indexOf(anchor);
      const end = ids.indexOf(target);
      for (const id of ids.slice(Math.min(start, end), Math.max(start, end) + 1)) setSelected(id, selected);
    },
    selectAllMatching() { explicit = new Set(); excluded = new Set(); inverted = true; },
    isSelected(id: string) { return inverted ? loaded.has(id) && !excluded.has(id) : explicit.has(id); },
    getPayload(): BulkSelection {
      return inverted
        ? Object.freeze({ kind: "query", filter, excluded: Object.freeze([...excluded]) })
        : Object.freeze({ kind: "ids", ids: Object.freeze([...explicit]) });
    },
    /** Filter changes clear selection and loaded-row eligibility. Reapplying identical state does not. */
    setFilter(value: FilterNode) {
      const next = parseFilter(value, columns);
      const key = JSON.stringify(next);
      if (key !== filterKey) { clear(); loaded = new Set(); }
      filter = next;
      filterKey = key;
    },
    clear,
    /** Clear both payload and eligibility when an account/permission boundary changes. */
    reset() { clear(); loaded = new Set(); },
  };
}
