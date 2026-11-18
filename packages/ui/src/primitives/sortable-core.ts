/** Shared, engine-free sortable model: messages, order math, keyboard intent, and pointer edge detection. */

export type SortableOrientation = "vertical" | "horizontal";
export type SortableEdge = "before" | "after";

export interface SortableItem {
  readonly id: string;
  /** Human-readable name used for the handle and for live-region announcements. */
  readonly label: string;
  /** Disabled items cannot be picked up. Other items still move around them. */
  readonly disabled?: boolean;
}

export interface SortableReorder {
  readonly id: string;
  readonly fromIndex: number;
  readonly toIndex: number;
  /** The complete proposed order. The owner accepts it by passing reordered items back. */
  readonly ids: readonly string[];
}

export const englishSortableMessages = Object.freeze({
  sortableInstructions: "Press Space or Enter to pick up. Use the arrow keys, Home, or End to move, Space or Enter to drop, and Escape to cancel.",
  sortableHandle: "Reorder {label}",
  sortableLifted: "Picked up {label}. Position {position} of {count}.",
  sortableMoved: "{label}, position {position} of {count}.",
  sortableDropped: "Dropped {label} at position {position} of {count}.",
  sortableCancelled: "Reorder cancelled. {label} returned to position {position} of {count}.",
  boardInstructions: "Press Space or Enter to pick up. Use the arrow keys to move within and between columns, Space or Enter to drop, and Escape to cancel.",
  boardCardHandle: "Move {label}",
  boardColumnHandle: "Reorder column {label}",
  boardLifted: "Picked up {label} in {column}. Position {position} of {count}.",
  boardMoved: "{label}, {column}, position {position} of {count}.",
  boardDropped: "Dropped {label} in {column}, position {position} of {count}.",
  boardCancelled: "Move cancelled. {label} returned to {column}, position {position} of {count}.",
  boardEmptyColumn: "No cards",
  boardCardCount: "{count} cards",
});

export type SortableMessages = Readonly<Record<keyof typeof englishSortableMessages, string>>;
type SortableMessageKey = keyof SortableMessages;

const messageKeys = Object.keys(englishSortableMessages).filter((key): key is SortableMessageKey => key in englishSortableMessages);

/**
 * Scoped theme messages supply provider-level translations under the same keys; per-instance overrides win.
 * Theme messages are read structurally so the sortable entry stays independent of the core message table.
 */
export function resolveSortableMessages(theme: object, overrides: Partial<SortableMessages> = {}): SortableMessages {
  const resolved: Record<string, string> = {};
  for (const key of messageKeys) {
    const override = overrides[key];
    const scoped: unknown = Reflect.get(theme, key);
    resolved[key] = typeof override === "string" ? override : typeof scoped === "string" ? scoped : englishSortableMessages[key];
  }
  return Object.freeze({ ...englishSortableMessages, ...resolved });
}

export function formatMessage(template: string, values: Readonly<Record<string, string>>): string {
  return template.replace(/\{(\w+)\}/gu, (match, name: string) => values[name] ?? match);
}

export function validateIds(ids: readonly string[], owner: string): void {
  const seen = new Set<string>();
  for (const id of ids) {
    if (!id) throw new Error(`${owner}: ids must be nonempty`);
    if (seen.has(id)) throw new Error(`${owner}: duplicate id ${JSON.stringify(id)}`);
    seen.add(id);
  }
}

/** Moves `id` so it ends at `toIndex` of the result. Out-of-range targets clamp. */
export function moveId(ids: readonly string[], id: string, toIndex: number): string[] {
  const next = ids.filter(candidate => candidate !== id);
  if (next.length === ids.length) return [...ids];
  next.splice(Math.max(0, Math.min(next.length, toIndex)), 0, id);
  return next;
}

/** Final index of a source dropped on `edge` of `targetIndex`, measured in the list without the source. */
export function dropIndex(fromIndex: number, targetIndex: number, edge: SortableEdge): number {
  const insertion = edge === "after" ? targetIndex + 1 : targetIndex;
  return fromIndex >= 0 && insertion > fromIndex ? insertion - 1 : insertion;
}

export type KeyIntent =
  | { readonly kind: "toggle" }
  | { readonly kind: "cancel" }
  | { readonly kind: "step"; readonly axis: SortableOrientation; readonly delta: -1 | 1 }
  | { readonly kind: "edge"; readonly to: "start" | "end" };

/** Arrow keys follow reading direction: in RTL, ArrowLeft moves toward the end. */
export function keyIntent(key: string, rtl: boolean): KeyIntent | undefined {
  switch (key) {
    case " ": case "Enter": return { kind: "toggle" };
    case "Escape": return { kind: "cancel" };
    case "ArrowUp": return { kind: "step", axis: "vertical", delta: -1 };
    case "ArrowDown": return { kind: "step", axis: "vertical", delta: 1 };
    case "ArrowLeft": return { kind: "step", axis: "horizontal", delta: rtl ? 1 : -1 };
    case "ArrowRight": return { kind: "step", axis: "horizontal", delta: rtl ? -1 : 1 };
    case "Home": return { kind: "edge", to: "start" };
    case "End": return { kind: "edge", to: "end" };
    default: return undefined;
  }
}

export function isRtl(element: Element): boolean {
  return element.ownerDocument.defaultView?.getComputedStyle(element).direction === "rtl";
}

/** Which half of `element` the pointer is over, in logical order for its axis and writing direction. */
export function closestEdge(element: Element, input: { readonly clientX: number; readonly clientY: number }, orientation: SortableOrientation): SortableEdge {
  const rect = element.getBoundingClientRect();
  if (orientation === "vertical") return input.clientY < rect.top + rect.height / 2 ? "before" : "after";
  const left = input.clientX < rect.left + rect.width / 2;
  return left !== isRtl(element) ? "before" : "after";
}

export function stringField(data: Readonly<Record<string | symbol, unknown>>, key: string): string | undefined {
  const value = data[key];
  return typeof value === "string" ? value : undefined;
}

export function edgeField(data: Readonly<Record<string | symbol, unknown>>): SortableEdge | undefined {
  const value = data.edge;
  return value === "before" || value === "after" ? value : undefined;
}

/** Every scrolling element from each start element up to, but excluding, the document; pointer drags auto-scroll them with the window. */
export function* scrollContainers(...elements: readonly HTMLElement[]): Generator<HTMLElement> {
  for (const element of elements) {
    const view = element.ownerDocument.defaultView;
    for (let current: HTMLElement | null = element; current && view; current = current.parentElement) {
      if (current === element.ownerDocument.body || current === element.ownerDocument.documentElement) break;
      const style = view.getComputedStyle(current);
      if (/auto|scroll/u.test(`${style.overflowX} ${style.overflowY}`)) yield current;
    }
  }
}
