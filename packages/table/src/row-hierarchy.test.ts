import { createServer } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createRowHierarchy } from "./row-hierarchy.ts";

interface Row { readonly id: string; readonly children?: readonly Row[]; readonly remote?: boolean }
let base = "";
const attempts = new Map<string, number>();
const server = createServer((request, response) => {
  const url = new URL(request.url ?? "/", "http://localhost");
  const id = url.searchParams.get("id") ?? "missing";
  const attempt = (attempts.get(id) ?? 0) + 1;
  attempts.set(id, attempt);
  const fail = id === "retry" && attempt === 1;
  const delay = id === "stale" && attempt === 1 ? 50 : 5;
  setTimeout(() => {
    response.writeHead(fail ? 503 : 200, { "Content-Type": "application/json" });
    response.end(fail ? "failure" : JSON.stringify([{ id: `${id}-child-${attempt}` }]));
  }, delay);
});
beforeAll(async () => {
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Expected TCP address");
  base = `http://127.0.0.1:${address.port}`;
});
afterAll(async () => { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); });

async function loadChildren(row: Row, signal: AbortSignal, ignoreAbort = false): Promise<readonly Row[]> {
  const response = await fetch(`${base}/?${new URLSearchParams({ id: row.id })}`, ignoreAbort ? {} : { signal });
  if (!response.ok) throw new Error(`Child load failed (${response.status})`);
  const value: unknown = await response.json();
  if (!Array.isArray(value)) throw new Error("Invalid child response");
  const rows: Row[] = [];
  for (const child of value) {
    if (typeof child !== "object" || child === null || !("id" in child) || typeof child.id !== "string") throw new Error("Invalid child response");
    rows.push({ id: child.id });
  }
  return rows;
}

describe("row hierarchy ownership", () => {
  it("flattens expanded static children with stable structural metadata", async () => {
    const roots: readonly Row[] = [
      { id: "a", children: [{ id: "a-1" }, { id: "a-2", children: [{ id: "a-2-i" }] }] },
      { id: "b" },
    ];
    const hierarchy = createRowHierarchy<Row>({ getRowId: row => row.id, getChildren: row => row.children, defaultExpanded: ["a", "a-2"] });
    hierarchy.updateRoots(roots);
    expect(hierarchy.getSnapshot().map(row => ({ id: row.id, parent: row.parentId, depth: row.depth, position: row.position, size: row.setSize, expanded: row.expanded }))).toEqual([
      { id: "a", parent: null, depth: 1, position: 1, size: 2, expanded: true },
      { id: "a-1", parent: "a", depth: 2, position: 1, size: 2, expanded: false },
      { id: "a-2", parent: "a", depth: 2, position: 2, size: 2, expanded: true },
      { id: "a-2-i", parent: "a-2", depth: 3, position: 1, size: 1, expanded: false },
      { id: "b", parent: null, depth: 1, position: 2, size: 2, expanded: false },
    ]);
    expect(await hierarchy.setExpanded("a", false)).toBe("changed");
    expect(hierarchy.getSnapshot().map(row => row.id)).toEqual(["a", "b"]);
    expect(await hierarchy.setExpanded("a", true)).toBe("changed");
    expect(hierarchy.getSnapshot().map(row => row.id)).toEqual(["a", "a-1", "a-2", "a-2-i", "b"]);
    hierarchy.dispose();
  });

  it("retries real failed child requests and exposes the accepted subtree", async () => {
    attempts.delete("retry");
    const hierarchy = createRowHierarchy<Row>({ getRowId: row => row.id, canLoadChildren: row => row.remote === true, loadChildren });
    hierarchy.updateRoots([{ id: "retry", remote: true }]);
    const failed = hierarchy.setExpanded("retry", true);
    expect(hierarchy.getSnapshot()[0]).toMatchObject({ expanded: true, pending: true, error: null });
    expect(await failed).toBe("failed");
    expect(hierarchy.getSnapshot()[0]?.error).toBeInstanceOf(Error);
    expect(await hierarchy.retry("retry")).toBe("loaded");
    expect(hierarchy.getSnapshot().map(row => row.id)).toEqual(["retry", "retry-child-2"]);
    hierarchy.dispose();
  });

  it("discards an ignored-abort stale response after collapse and re-expansion", async () => {
    attempts.delete("stale");
    const hierarchy = createRowHierarchy<Row>({ getRowId: row => row.id, canLoadChildren: row => row.remote === true, loadChildren: (row, signal) => loadChildren(row, signal, true) });
    hierarchy.updateRoots([{ id: "stale", remote: true }]);
    const first = hierarchy.setExpanded("stale", true);
    expect(await hierarchy.setExpanded("stale", false)).toBe("changed");
    const second = hierarchy.setExpanded("stale", true);
    expect(await second).toBe("loaded");
    expect(await first).toBe("superseded");
    expect(hierarchy.getSnapshot().map(row => row.id)).toEqual(["stale", "stale-child-2"]);
    hierarchy.dispose();
  });

  it("rejects invalid refreshed or loaded trees without replacing accepted rows", async () => {
    const stable: Row = { id: "stable", children: [{ id: "child" }] };
    const hierarchy = createRowHierarchy<Row>({ getRowId: row => row.id, getChildren: row => row.children, defaultExpanded: true });
    hierarchy.updateRoots([stable]);
    expect(() => hierarchy.updateRoots([{ id: "duplicate", children: [{ id: "duplicate" }] }])).toThrow("Duplicate");
    expect(hierarchy.getSnapshot().map(row => row.id)).toEqual(["stable", "child"]);
    const changedId: Row = { id: "first" };
    hierarchy.updateRoots([changedId]);
    Object.defineProperty(changedId, "id", { value: "second" });
    expect(() => hierarchy.updateRoots([changedId])).toThrow("identity changed");
    hierarchy.dispose();
  });
});
