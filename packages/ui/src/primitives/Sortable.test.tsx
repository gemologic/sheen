import { describe, expect, it } from "vitest";
import { renderToString } from "solid-js/web";
import { ThemeProvider } from "../theme/ThemeProvider.tsx";
import { Board } from "./Board.tsx";
import { SortableList } from "./SortableList.tsx";
import { dropIndex, formatMessage, keyIntent, moveId, resolveSortableMessages } from "./sortable-core.ts";

const items = [{ id: "a", label: "Alpha" }, { id: "b", label: "Beta", disabled: true }, { id: "c", label: "Gamma" }];

describe("sortable order model", () => {
  it("moves ids to a final index and resolves pointer drops relative to the source", () => {
    expect(moveId(["a", "b", "c", "d"], "a", 2)).toEqual(["b", "c", "a", "d"]);
    expect(moveId(["a", "b", "c"], "c", -4)).toEqual(["c", "a", "b"]);
    expect(dropIndex(0, 2, "before")).toBe(1);
    expect(dropIndex(0, 2, "after")).toBe(2);
    expect(dropIndex(3, 1, "after")).toBe(2);
    expect(dropIndex(1, 1, "before")).toBe(1);
  });

  it("mirrors horizontal arrows in right-to-left scopes", () => {
    expect(keyIntent("ArrowLeft", false)).toEqual({ kind: "step", axis: "horizontal", delta: -1 });
    expect(keyIntent("ArrowLeft", true)).toEqual({ kind: "step", axis: "horizontal", delta: 1 });
    expect(keyIntent("Enter", true)).toEqual({ kind: "toggle" });
    expect(keyIntent("a", false)).toBeUndefined();
  });

  it("layers scoped theme translations under per-instance overrides", () => {
    const messages = resolveSortableMessages({ sortableHandle: "Réordonner {label}", sortableLifted: 4 }, { sortableDropped: "Posé" });
    expect(messages.sortableHandle).toBe("Réordonner {label}");
    expect(messages.sortableLifted).toBe("Picked up {label}. Position {position} of {count}.");
    expect(messages.sortableDropped).toBe("Posé");
    expect(formatMessage(messages.sortableHandle, { label: "Alpha" })).toBe("Réordonner Alpha");
  });
});

describe("SortableList server contract", () => {
  it("renders every item in owner order with instructions, handles, and disabled state", () => {
    const html = renderToString(() => <ThemeProvider hydration="cookie"><SortableList label="Tasks" handle items={items} onReorder={() => {}}>{item => <span>{item().label}</span>}</SortableList></ThemeProvider>);
    expect(html.indexOf("Alpha")).toBeLessThan(html.indexOf("Beta"));
    expect(html.indexOf("Beta")).toBeLessThan(html.indexOf("Gamma"));
    expect(html.match(/class="sheen-sortable-item"/g)).toHaveLength(3);
    expect(html).toContain('aria-label="Reorder Alpha"');
    expect(html).toContain('aria-label="Tasks"');
    expect(html).toContain("Press Space or Enter to pick up.");
    expect(html.match(/<button[^>]*disabled/g)).toHaveLength(1);
  });

  it("makes whole items focusable without handles, and rejects duplicate ids", () => {
    const html = renderToString(() => <ThemeProvider hydration="cookie"><SortableList label="Tasks" orientation="horizontal" items={items} onReorder={() => {}}>{item => item().label}</SortableList></ThemeProvider>);
    expect(html).toContain('data-orientation="horizontal"');
    expect(html.match(/tabindex="0"/g)).toHaveLength(2);
    expect(html).toContain('aria-disabled="true"');
    expect(() => renderToString(() => <ThemeProvider hydration="cookie"><SortableList label="Tasks" items={[items[0], items[0]].flatMap(item => item ? [item] : [])} onReorder={() => {}}>{item => item().label}</SortableList></ThemeProvider>)).toThrow('duplicate id "a"');
  });
});

describe("Board server contract", () => {
  it("renders columns, cards, counts, column handles, and an empty-column drop zone", () => {
    const columns = [
      { id: "todo", label: "To do", cards: [{ id: "one", label: "First" }, { id: "two", label: "Second" }] },
      { id: "empty", label: "Review", cards: [] },
    ];
    const html = renderToString(() => <ThemeProvider hydration="cookie"><Board label="Sprint" columns={columns} onMove={() => {}} onColumnReorder={() => {}}>{card => <span>{card().label}</span>}</Board></ThemeProvider>);
    expect(html.match(/class="sheen-board-column"/g)).toHaveLength(2);
    expect(html.indexOf("First")).toBeLessThan(html.indexOf("Second"));
    expect(html).toContain('aria-label="2 cards"');
    expect(html).toContain("No cards");
    expect(html).toContain('aria-label="Reorder column To do"');
    expect(html).toContain('aria-label="Sprint"');
  });

  it("renders a custom column header slot with the live count and rejects duplicate card ids across columns", () => {
    const columns = [{ id: "todo", label: "To do", cards: [{ id: "one", label: "First" }] }];
    const html = renderToString(() => <ThemeProvider hydration="cookie"><Board label="Sprint" columns={columns} onMove={() => {}} columnHeader={(column, count) => <strong>{`${column().label} (${count()})`}</strong>}>{card => card().label}</Board></ThemeProvider>);
    expect(html).toMatch(/<strong[^>]*>To do \(1\)<\/strong>/u);
    expect(html).not.toContain("sheen-board-column-handle");
    const duplicate = [...columns, { id: "done", label: "Done", cards: [{ id: "one", label: "Again" }] }];
    expect(() => renderToString(() => <ThemeProvider hydration="cookie"><Board label="Sprint" columns={duplicate} onMove={() => {}}>{card => card().label}</Board></ThemeProvider>)).toThrow('Board cards: duplicate id "one"');
  });
});
