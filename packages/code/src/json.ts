import { viewerMaximumCharacters } from "./viewer-model.ts";

export interface JsonText {
  readonly text: string;
  readonly lines: readonly string[];
}

type JsonValue = null | boolean | number | string | readonly JsonValue[] | { readonly [key: string]: JsonValue };

export function stringifyViewerJson(value: unknown, indent: 2 | 4, sortKeys: boolean, maximumDepth: number): JsonText {
  if (maximumDepth < 1 || maximumDepth > 64 || !Number.isSafeInteger(maximumDepth)) throw new Error("JSONViewer maxDepth must be an integer from 1 to 64");
  const ancestors = new WeakSet<object>();
  let nodes = 0;
  const visit = (input: unknown, depth: number): JsonValue => {
    nodes += 1;
    if (nodes > 100_000) throw new Error("JSONViewer input exceeds 100000 values");
    if (depth > maximumDepth) throw new Error(`JSONViewer input exceeds depth ${maximumDepth}`);
    if (input === null || typeof input === "string" || typeof input === "boolean") return input;
    if (typeof input === "number") {
      if (!Number.isFinite(input)) throw new Error("JSONViewer numbers must be finite");
      return input;
    }
    if (typeof input !== "object") throw new Error("JSONViewer accepts only JSON values");
    if (ancestors.has(input)) throw new Error("JSONViewer input contains a cycle");
    ancestors.add(input);
    let result: JsonValue;
    if (Array.isArray(input)) result = Object.freeze(input.map(item => visit(item, depth + 1)));
    else {
      const object: Record<string, JsonValue> = {};
      const entries = Object.entries(input);
      if (sortKeys) entries.sort(([left], [right]) => left.localeCompare(right, "en-US"));
      for (const [key, item] of entries) object[key] = visit(item, depth + 1);
      result = Object.freeze(object);
    }
    ancestors.delete(input);
    return result;
  };
  const text = JSON.stringify(visit(value, 0), null, indent);
  if (text.length > viewerMaximumCharacters) throw new Error(`JSONViewer output exceeds ${viewerMaximumCharacters} characters`);
  return Object.freeze({ text, lines: Object.freeze(text.split("\n")) });
}
