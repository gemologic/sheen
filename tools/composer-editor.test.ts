import { describe, expect, it } from "vitest";
import { defaultComposerDocument } from "../apps/loupe/src/composer/fixtures.ts";
import { addComposerNode, commitComposerHistory, composerHistoryLimit, configureComposerNode, createComposerHistory, duplicateComposerNode, findComposerNode, moveComposerNode, readComposerDraft, redoComposerHistory, removeComposerDraft, removeComposerNode, setComposerPlacement, setComposerPreset, undoComposerHistory, writeComposerDraft } from "../apps/loupe/src/composer/editor.ts";
import type { ComposerDraftStorage } from "../apps/loupe/src/composer/editor.ts";

function memoryStorage(initial?: string): ComposerDraftStorage & { readonly values: Map<string, string> } {
  const values = new Map<string, string>();
  if (initial !== undefined) values.set("draft", initial);
  return { values, get: key => values.get(key) ?? null, set: (key, value) => { values.set(key, value); }, remove: key => { values.delete(key); } };
}

describe("Composer edits", () => {
  it("shares one validated path for add, move, configure, duplicate, and remove", () => {
    const added = addComposerNode(defaultComposerDocument, { region: "toolbar", index: 1 }, { type: "component", id: "toolbar-copy", component: "Text", props: { children: "Review queue", tone: "muted" }, children: [] });
    expect(findComposerNode(added, "toolbar-copy")?.region).toBe("toolbar");
    const configured = configureComposerNode(added, "toolbar-copy", { children: "Review queue · 8", numeric: true });
    expect(findComposerNode(configured, "toolbar-copy")?.node).toMatchObject({ props: { children: "Review queue · 8", numeric: true } });
    const moved = moveComposerNode(configured, "toolbar-copy", { region: "details-panel", index: 0 });
    expect(findComposerNode(moved, "toolbar-copy")?.region).toBe("details-panel");
    const duplicated = duplicateComposerNode(moved, "toolbar-copy");
    expect(findComposerNode(duplicated, "toolbar-copy-copy-2")?.region).toBe("details-panel");
    expect(findComposerNode(removeComposerNode(duplicated, "toolbar-copy"), "toolbar-copy")).toBeUndefined();
  });

  it("moves semantic chrome zones and resets all placements with a preset", () => {
    const moved = setComposerPlacement(defaultComposerDocument, "account", "sidebar-footer");
    expect(findComposerNode(moved, "placement-account")).toMatchObject({ region: "sidebar", node: { target: "sidebar-footer" } });
    const horizontal = setComposerPreset(moved, "horizontal");
    expect(horizontal.preset).toBe("horizontal");
    expect(findComposerNode(horizontal, "placement-primary-navigation")).toMatchObject({ region: "topbar", node: { target: "topbar-center" } });
  });

  it("rejects invalid operations without publishing partial state", () => {
    expect(() => removeComposerNode(defaultComposerDocument, "placement-account")).toThrow("cannot be removed");
    expect(() => moveComposerNode(defaultComposerDocument, "records", { region: "toolbar", index: 0 })).toThrow("DataTable is not allowed in toolbar");
    expect(() => configureComposerNode(defaultComposerDocument, "records", { style: "color:red" })).toThrow("not an editable safe prop");
  });

  it("preserves before-target semantics when moving forward within one parent", () => {
    const moved = moveComposerNode(defaultComposerDocument, "latency-card", { region: "main-grid", parentId: "dashboard-grid", index: 2 });
    const grid = findComposerNode(moved, "dashboard-grid")?.node;
    expect(grid?.type).toBe("component");
    if (grid?.type !== "component") return;
    expect(grid.children.map(node => node.id)).toEqual(["activity-card", "latency-card", "query", "records"]);
  });
});

describe("Composer history and drafts", () => {
  it("uses one deterministic history for structural and prop edits", () => {
    const initial = createComposerHistory(defaultComposerDocument);
    const changed = configureComposerNode(initial.present, "page-header", { title: "Deployments" });
    const committed = commitComposerHistory(initial, changed);
    expect(committed.past).toHaveLength(1);
    expect(undoComposerHistory(committed).present.title).toBe(defaultComposerDocument.title);
    expect(redoComposerHistory(undoComposerHistory(committed)).present).toEqual(changed);
    expect(commitComposerHistory(committed, committed.present)).toBe(committed);
  });

  it("bounds retained undo snapshots during long editing sessions", () => {
    let history = createComposerHistory(defaultComposerDocument);
    for (let index = 0; index < composerHistoryLimit + 25; index++) {
      history = commitComposerHistory(history, configureComposerNode(history.present, "page-header", { title: `Deployment revision ${index}` }));
    }
    expect(history.past).toHaveLength(composerHistoryLimit);
    for (let index = 0; index < composerHistoryLimit; index++) history = undoComposerHistory(history);
    expect(history.past).toHaveLength(0);
    expect(history.future).toHaveLength(composerHistoryLimit);
    expect(undoComposerHistory(history)).toBe(history);
  });

  it("recovers, migrates, clears, and reports unavailable or corrupt storage", () => {
    const storage = memoryStorage();
    expect(writeComposerDraft(storage, "draft", defaultComposerDocument)).toEqual({ ok: true });
    expect(readComposerDraft(storage, "draft")).toMatchObject({ kind: "ready", document: defaultComposerDocument });
    expect(removeComposerDraft(storage, "draft")).toEqual({ ok: true });
    expect(readComposerDraft(storage, "draft")).toEqual({ kind: "empty" });

    const corrupt = memoryStorage("{not json");
    expect(readComposerDraft(corrupt, "draft").kind).toBe("corrupt");
    const unavailable: ComposerDraftStorage = { get: () => { throw new Error("blocked"); }, set: () => { throw new Error("blocked"); }, remove: () => { throw new Error("blocked"); } };
    expect(readComposerDraft(unavailable, "draft")).toEqual({ kind: "unavailable", message: "blocked" });
    expect(writeComposerDraft(unavailable, "draft", defaultComposerDocument)).toEqual({ ok: false, message: "blocked" });
    expect(removeComposerDraft(unavailable, "draft")).toEqual({ ok: false, message: "blocked" });
  });
});
