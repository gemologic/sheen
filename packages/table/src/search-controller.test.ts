import { describe, expect, it } from "vitest";
import { createDebouncedSearch } from "./search-controller.ts";
import type { SearchOutcome } from "./search-controller.ts";
import { searchClientRows } from "./search.ts";

describe("debounced client search", () => {
  it("adopts initial SSR results without evaluating or scheduling work", async () => {
    const result = [{ id: "server" }];
    const initial = { query: "server", result };
    const controller = createDebouncedSearch(() => { throw new Error("Initial data must not execute search"); }, 0, initial);
    initial.query = "changed";
    expect(controller.getSnapshot().accepted).toEqual({ query: "server", result });
    expect(controller.getSnapshot().accepted?.result).toBe(result);
    await new Promise(resolve => setTimeout(resolve, 5));
    expect(controller.getSnapshot().pending).toBe(false);
    expect(controller.getSnapshot().error).toBeNull();
    controller.dispose();
  });
  it("uses a trailing delay and settles superseded requests without evaluating them", async () => {
    const evaluated: string[] = [];
    const controller = createDebouncedSearch(query => { evaluated.push(query); return query; }, 20);
    const first = controller.request("a");
    const started = performance.now();
    const second = controller.request("ab");
    expect(await first).toBe("superseded");
    expect(evaluated).toEqual([]);
    expect(controller.getSnapshot().pending).toBe(true);
    expect(await second).toBe("accepted");
    expect(performance.now() - started).toBeGreaterThanOrEqual(15);
    expect(evaluated).toEqual(["ab"]);
    expect(controller.getSnapshot().accepted).toEqual({ query: "ab", result: "ab" });
    controller.dispose();
  });
  it("retains accepted identity while pending and failed, then retries an empty query", async () => {
    let reject = false;
    const controller = createDebouncedSearch(query => { if (reject) throw new Error("Search failed"); return { query }; }, 0);
    await controller.request("old");
    const accepted = controller.getSnapshot().accepted;
    reject = true;
    const pending = controller.request("");
    expect(controller.getSnapshot().accepted).toBe(accepted);
    expect(await pending).toBe("failed");
    expect(controller.getSnapshot().accepted).toBe(accepted);
    expect(controller.getSnapshot().error).toEqual(new Error("Search failed"));
    reject = false;
    expect(await controller.retry()).toBe("accepted");
    expect(controller.getSnapshot().accepted?.query).toBe("");
    expect(controller.getSnapshot().error).toBeNull();
    controller.dispose();
  });
  it("clears and disposes timers without evaluating or leaving promises unresolved", async () => {
    const controller = createDebouncedSearch(() => { throw new Error("Canceled work executed"); }, 20);
    const first = controller.request("first");
    controller.clear();
    expect(await first).toBe("cleared");
    expect(controller.getSnapshot()).toEqual({ accepted: null, requested: null, pending: false, error: null });
    const next = controller.request("next");
    controller.dispose();
    expect(await next).toBe("disposed");
    expect(await controller.request("later")).toBe("disposed");
    expect(await controller.retry()).toBe("disposed");
    await new Promise(resolve => setTimeout(resolve, 30));
    expect(controller.getSnapshot().error).toBeNull();
  });
  it("does not publish work superseded reentrantly during evaluation", async () => {
    let newer: Promise<SearchOutcome> | undefined;
    const controller = createDebouncedSearch(query => {
      if (query === "old") newer = controller.request("new");
      return query;
    }, 0);
    expect(await controller.request("old")).toBe("superseded");
    expect(await newer).toBe("accepted");
    expect(controller.getSnapshot().accepted?.result).toBe("new");
    controller.dispose();
  });
  it("evaluates the latest dataset and preserves real search row identities", async () => {
    let rows = [{ name: "old" }];
    const controller = createDebouncedSearch(query => searchClientRows(rows, query, { locale: "en-US", columns: ["name"], getValue: row => row.name }), 20);
    const pending = controller.request("new");
    rows = [{ name: "new" }];
    expect(await pending).toBe("accepted");
    expect(controller.getSnapshot().accepted?.result[0]?.row).toBe(rows[0]);
    controller.dispose();
  });
  it("rejects invalid timer delays", () => {
    for (const delay of [-1, 0.5, NaN, Infinity, 2147483648]) expect(() => createDebouncedSearch(query => query, delay)).toThrow("Search delay");
  });
  it("defaults to 120ms and suppresses a result cleared from its evaluator", async () => {
    const controller = createDebouncedSearch(() => { controller.clear(); return "obsolete"; });
    const started = performance.now();
    expect(await controller.request("query")).toBe("cleared");
    expect(performance.now() - started).toBeGreaterThanOrEqual(110);
    expect(controller.getSnapshot().accepted).toBeNull();
    controller.dispose();
  });
});
