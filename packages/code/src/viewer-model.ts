export interface ViewerTextRow {
  readonly id: string;
  readonly text: string;
  readonly prefix?: string;
  readonly label?: string;
  readonly kind?: string;
  readonly oldLine?: number;
  readonly newLine?: number;
}

export interface ViewerWindow {
  readonly start: number;
  readonly end: number;
  readonly offsetBefore: number;
  readonly offsetAfter: number;
}

export const viewerMaximumCharacters = 10_000_000;
export const viewerMaximumRows = 1_000_000;

export function validateViewerRows(rows: readonly ViewerTextRow[]): readonly ViewerTextRow[] {
  if (rows.length > viewerMaximumRows) throw new Error(`Viewer input exceeds ${viewerMaximumRows} rows`);
  const ids = new Set<string>();
  let characters = 0;
  for (const row of rows) {
    if (!row.id.trim() || ids.has(row.id)) throw new Error("Viewer rows require unique nonempty IDs");
    ids.add(row.id);
    characters += row.text.length + (row.prefix?.length ?? 0);
    if (characters > viewerMaximumCharacters) throw new Error(`Viewer input exceeds ${viewerMaximumCharacters} characters`);
  }
  return rows;
}

export function filterViewerRows(rows: readonly ViewerTextRow[], query: string, locale: string): readonly ViewerTextRow[] {
  const normalized = query.trim().toLocaleLowerCase(locale);
  if (!normalized) return rows;
  return rows.filter(row => `${row.prefix ?? ""}${row.text}`.toLocaleLowerCase(locale).includes(normalized));
}

export function viewerWindow(total: number, scrollTop: number, viewportHeight: number, rowHeight: number, overscan = 4): ViewerWindow {
  if (!Number.isSafeInteger(total) || total < 0) throw new Error("Viewer row count must be a nonnegative integer");
  if (![scrollTop, viewportHeight, rowHeight].every(value => Number.isFinite(value)) || scrollTop < 0 || viewportHeight <= 0 || rowHeight <= 0) throw new Error("Viewer geometry must be positive and finite");
  if (!Number.isSafeInteger(overscan) || overscan < 0 || overscan > 100) throw new Error("Viewer overscan must be an integer from 0 to 100");
  const visibleStart = Math.floor(scrollTop / rowHeight);
  const start = Math.max(0, Math.min(total, visibleStart - overscan));
  const count = Math.ceil(viewportHeight / rowHeight) + overscan * 2;
  const end = Math.min(total, start + count);
  return Object.freeze({ start, end, offsetBefore: start * rowHeight, offsetAfter: Math.max(0, (total - end) * rowHeight) });
}
