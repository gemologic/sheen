import { viewerMaximumCharacters } from "./viewer-model.ts";
import type { ViewerTextRow } from "./viewer-model.ts";

export interface DiffRows {
  readonly rows: readonly ViewerTextRow[];
  readonly unified: string;
}

function lines(value: string): readonly string[] {
  return value.split("\n");
}

function row(id: number, kind: "context" | "removed" | "added", text: string, oldLine: number | undefined, newLine: number | undefined): ViewerTextRow {
  const prefix = kind === "context" ? " " : kind === "removed" ? "-" : "+";
  const description = kind === "context" ? "Unchanged" : kind === "removed" ? "Removed" : "Added";
  return Object.freeze({ id: `diff-${id}`, kind, text, prefix, ...(oldLine === undefined ? {} : { oldLine }), ...(newLine === undefined ? {} : { newLine }), label: `${description}${oldLine === undefined ? "" : ` old line ${oldLine}`}${newLine === undefined ? "" : ` new line ${newLine}`}: ${text}` });
}

/** Exact LCS for ordinary files, with linear bounded fallback for pathological inputs. */
export function createDiffRows(oldText: string, newText: string, oldLabel: string, newLabel: string): DiffRows {
  if (oldText.length + newText.length > viewerMaximumCharacters) throw new Error(`DiffViewer input exceeds ${viewerMaximumCharacters} characters`);
  const before = lines(oldText);
  const after = lines(newText);
  const result: ViewerTextRow[] = [];
  let oldLine = 1;
  let newLine = 1;
  let id = 0;
  const append = (kind: "context" | "removed" | "added", text: string): void => {
    result.push(row(++id, kind, text, kind === "added" ? undefined : oldLine, kind === "removed" ? undefined : newLine));
    if (kind !== "added") oldLine += 1;
    if (kind !== "removed") newLine += 1;
  };

  const cells = (before.length + 1) * (after.length + 1);
  if (cells <= 250_000) {
    const width = after.length + 1;
    const matrix = new Uint32Array(cells);
    for (let left = before.length - 1; left >= 0; left -= 1) {
      for (let right = after.length - 1; right >= 0; right -= 1) {
        const index = left * width + right;
        matrix[index] = before[left] === after[right] ? (matrix[(left + 1) * width + right + 1] ?? 0) + 1
          : Math.max(matrix[(left + 1) * width + right] ?? 0, matrix[left * width + right + 1] ?? 0);
      }
    }
    let left = 0;
    let right = 0;
    while (left < before.length || right < after.length) {
      if (left < before.length && right < after.length && before[left] === after[right]) {
        append("context", before[left] ?? ""); left += 1; right += 1;
      } else if (left < before.length && (right >= after.length || (matrix[(left + 1) * width + right] ?? 0) >= (matrix[left * width + right + 1] ?? 0))) {
        append("removed", before[left] ?? ""); left += 1;
      } else {
        append("added", after[right] ?? ""); right += 1;
      }
    }
  } else {
    const count = Math.max(before.length, after.length);
    for (let index = 0; index < count; index += 1) {
      const previous = before[index];
      const next = after[index];
      if (previous === next && previous !== undefined) append("context", previous);
      else {
        if (previous !== undefined) append("removed", previous);
        if (next !== undefined) append("added", next);
      }
    }
  }
  const unified = [`--- ${oldLabel}`, `+++ ${newLabel}`, ...result.map(item => `${item.prefix ?? ""}${item.text}`)].join("\n");
  return Object.freeze({ rows: Object.freeze(result), unified });
}
