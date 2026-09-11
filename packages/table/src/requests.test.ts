import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createServer } from "node:http";
import { createTableRequests } from "./requests.ts";
import type { TableRequestOutcome } from "./requests.ts";
import type { TablePagination } from "./pagination.ts";

interface Query { pagination: TablePagination; key: string }
interface Result { rows: string[]; total: number }
let origin = "";
const arrivals: string[] = [];
const server = createServer((request, response) => {
  const parameters = new URL(request.url ?? "/", "http://localhost").searchParams;
  const key = parameters.get("key") ?? "";
  arrivals.push(key);
  setTimeout(() => {
    if (key.endsWith("reject")) { response.writeHead(503); response.end("Unavailable"); return; }
    response.setHeader("content-type", "application/json");
    if (key === "empty") { response.end(JSON.stringify({ rows: [], total: 0 })); return; }
    if (key === "clamp") { response.end(JSON.stringify({ rows: Number(parameters.get("page")) > 1 ? [] : ["last"], total: 3 })); return; }
    if (key === "moving") { response.end(JSON.stringify({ rows: [], total: Number(parameters.get("page")) * 2 })); return; }
    if (key === "truncated") { response.end(JSON.stringify({ rows: ["partial"], total: 2 })); return; }
    response.end(JSON.stringify({ rows: [key], total: 1 }));
  }, key.startsWith("slow") ? 100 : 5);
});
beforeAll(async () => {
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Expected TCP server");
  origin = `http://127.0.0.1:${address.port}`;
});
afterAll(async () => { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); });

async function fetchRows(state: Query, signal?: AbortSignal): Promise<Result> {
  const parameters = new URLSearchParams({ key: state.key, page: String(state.pagination === false ? 0 : state.pagination.pageIndex) });
  const response = await fetch(`${origin}/?${parameters}`, signal ? { signal } : {});
  if (!response.ok) throw new Error(`Request failed (${response.status})`);
  const data: unknown = await response.json();
  if (typeof data !== "object" || !data || !("rows" in data) || !Array.isArray(data.rows) || !data.rows.every(value => typeof value === "string") || !("total" in data) || typeof data.total !== "number") throw new Error("Invalid fixture response");
  return { rows: data.rows, total: data.total };
}

describe("real server table requests", () => {
  it("adopts validated initial results without dispatching and isolates initial query state", () => {
    let dispatched = 0;
    const state: Query = { pagination: false, key: "initial" };
    const result = { rows: ["initial"], total: 1 };
    const requests = createTableRequests<Query, Result>((state, signal) => { dispatched++; return fetchRows(state, signal); }, { state, result });
    state.key = "mutated";
    expect(requests.getSnapshot()).toMatchObject({ accepted: { state: { key: "initial" }, result }, requested: null, pending: false, error: null });
    expect(requests.getSnapshot().accepted?.result).toBe(result);
    expect(dispatched).toBe(0);
    requests.dispose();
  });
  it("rejects incomplete or out-of-range bootstraps and normalizes empty accepted pages", () => {
    expect(() => createTableRequests<Query, Result>(fetchRows, { state: { pagination: false, key: "initial" }, result: { rows: [], total: 1 } })).toThrow("complete");
    expect(() => createTableRequests<Query, Result>(fetchRows, { state: { pagination: { pageIndex: 8, pageSize: 2 }, key: "initial" }, result: { rows: [], total: 3 } })).toThrow("valid accepted page");
    const empty = createTableRequests<Query, Result>(fetchRows, { state: { pagination: { pageIndex: 8, pageSize: 2 }, key: "initial" }, result: { rows: [], total: 0 } });
    expect(empty.getSnapshot().accepted?.state.pagination).toEqual({ pageIndex: 0, pageSize: 2 });
    empty.dispose();
  });
  it("keeps clear atomic when an abort listener tries to restart old work", async () => {
    let restarted: Promise<TableRequestOutcome> | undefined;
    const requests = createTableRequests<Query, Result>((state, signal) => {
      if (state.key === "slow") signal.addEventListener("abort", () => { requests.clear(); restarted = requests.request({ pagination: false, key: "old-account" }); }, { once: true });
      return fetchRows(state, signal);
    });
    const slow = requests.request({ pagination: false, key: "slow" });
    requests.clear();
    expect(await slow).toBe("superseded");
    expect(restarted).toBeDefined();
    expect(await restarted).toBe("superseded");
    expect(requests.getSnapshot()).toEqual({ accepted: null, requested: null, pending: false, error: null });
    expect(await requests.request({ pagination: false, key: "new-account" })).toBe("accepted");
    requests.dispose();
  });
  it("keeps ownership of a newer request started by a supersession abort handler", async () => {
    let replacement: Promise<TableRequestOutcome> | undefined;
    let replacementSignal: AbortSignal | undefined;
    const requests = createTableRequests<Query, Result>((state, signal) => {
      if (state.key === "slow") signal.addEventListener("abort", () => { replacement = requests.request({ pagination: false, key: "replacement" }); }, { once: true });
      if (state.key === "replacement") replacementSignal = signal;
      return fetchRows(state, signal);
    });
    const slow = requests.request({ pagination: false, key: "slow" });
    expect(await requests.request({ pagination: false, key: "superseded-before-dispatch" })).toBe("superseded");
    expect(replacement).toBeDefined();
    requests.clear();
    expect(replacementSignal?.aborted).toBe(true);
    expect(await replacement).toBe("superseded");
    expect(await slow).toBe("superseded");
    expect(requests.getSnapshot().accepted).toBeNull();
    requests.dispose();
  });
  it("refetches a clamped page, settles empty results, and bounds moving totals", async () => {
    const pages: number[] = [];
    const requests = createTableRequests<Query, Result>((state, signal) => { pages.push(state.pagination === false ? 0 : state.pagination.pageIndex); return fetchRows(state, signal); });
    expect(await requests.request({ pagination: { pageIndex: 8, pageSize: 2 }, key: "clamp" })).toBe("accepted");
    expect(pages).toEqual([8, 1]);
    expect(requests.getSnapshot().accepted).toMatchObject({ state: { pagination: { pageIndex: 1, pageSize: 2 } }, result: { rows: ["last"] } });
    pages.length = 0;
    expect(await requests.request({ pagination: { pageIndex: 8, pageSize: 2 }, key: "empty" })).toBe("accepted");
    expect(pages).toEqual([8]);
    expect(requests.getSnapshot().accepted?.state.pagination).toEqual({ pageIndex: 0, pageSize: 2 });
    pages.length = 0;
    expect(await requests.request({ pagination: { pageIndex: 8, pageSize: 2 }, key: "moving" })).toBe("failed");
    expect(pages).toEqual([8, 7, 6, 5]);
    expect(requests.getSnapshot().error).toBeInstanceOf(Error);
    requests.dispose();
  });
  it("never publishes truncated continuous results", async () => {
    const requests = createTableRequests<Query, Result>(fetchRows);
    expect(await requests.request({ pagination: false, key: "truncated" })).toBe("failed");
    expect(requests.getSnapshot().accepted).toBeNull();
    requests.dispose();
  });
  it("does not publish errors from a superseded transport that ignored abort", async () => {
    const requests = createTableRequests<Query, Result>(state => fetchRows(state));
    const stale = requests.request({ pagination: false, key: "slow-reject" });
    expect(await requests.request({ pagination: false, key: "newer" })).toBe("accepted");
    expect(await stale).toBe("superseded");
    expect(requests.getSnapshot().error).toBeNull();
    expect(requests.getSnapshot().accepted?.result.rows).toEqual(["newer"]);
    requests.dispose();
  });
  it("discards late responses even when the transport ignores abort", async () => {
    const signals: AbortSignal[] = [];
    const requests = createTableRequests<Query, Result>((state, signal) => { signals.push(signal); return fetchRows(state); });
    const slow = requests.request({ pagination: false, key: "slow" });
    const fast = requests.request({ pagination: false, key: "fast" });
    expect(signals[0]?.aborted).toBe(true);
    expect(await fast).toBe("accepted");
    expect(await slow).toBe("superseded");
    expect(requests.getSnapshot().accepted?.result.rows).toEqual(["fast"]);
    expect(arrivals).toContain("slow");
    requests.dispose();
  });
  it("retains accepted rows during pending work and failure, then clears authorization-bound state", async () => {
    const requests = createTableRequests<Query, Result>(fetchRows);
    await requests.request({ pagination: false, key: "initial" });
    const accepted = requests.getSnapshot().accepted;
    const rejected = requests.request({ pagination: false, key: "reject" });
    expect(requests.getSnapshot()).toMatchObject({ accepted, pending: true });
    expect(await rejected).toBe("failed");
    expect(requests.getSnapshot().accepted).toBe(accepted);
    expect(await requests.retry()).toBe("failed");
    const slow = requests.request({ pagination: false, key: "slow" });
    requests.clear();
    expect(requests.getSnapshot().accepted).toBeNull();
    expect(await slow).toBe("superseded");
    requests.dispose();
    expect(await requests.request({ pagination: false, key: "never" })).toBe("disposed");
  });
});
