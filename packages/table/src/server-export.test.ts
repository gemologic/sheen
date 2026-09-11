import { createServer } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createServerExport } from "./server-export.ts";
import type { TableExportRequest } from "./server-export.ts";
import type { TableStateSchema } from "./table-state.ts";

const schema: TableStateSchema = { columns: ["name"], filterColumns: [{ id: "name", type: "text" }], sortColumns: [{ id: "name", type: "text" }] };
const value: TableExportRequest = { format: "csv", state: { search: "initial", filter: { kind: "and", children: [] }, sorting: [], pagination: false, columns: [{ id: "name", visible: true, width: null, pin: false }] }, selection: null };
let base = "";
const server = createServer((request, response) => {
  const url = new URL(request.url ?? "/", "http://localhost");
  setTimeout(() => { response.writeHead(url.searchParams.get("fail") === "true" ? 503 : 200, { "Content-Type": "text/plain" }); response.end(url.searchParams.get("query") ?? ""); }, url.searchParams.get("slow") === "true" ? 50 : 5);
});
beforeAll(async () => {
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Expected TCP address");
  base = `http://127.0.0.1:${address.port}`;
});
afterAll(async () => { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); });
async function artifact(query: string, fail = false, slow = false, signal?: AbortSignal) {
  const response = await fetch(`${base}/?${new URLSearchParams({ query, fail: String(fail), slow: String(slow) })}`, signal ? { signal } : {});
  if (!response.ok) throw new Error(`Export failed (${response.status})`);
  return response.text();
}

describe("server export ownership", () => {
  it("requires an app callback and guards duplicate submissions", async () => {
    const absent = createServerExport(schema);
    expect(absent.available).toBe(false);
    expect(await absent.request(value)).toBe("unavailable");
    let calls = 0;
    const controller = createServerExport(schema, (request, signal) => { calls++; return artifact(request.state.search, false, true, signal); });
    const pending = controller.request(value);
    expect(await controller.request(value)).toBe("busy");
    expect(await pending).toBe("accepted");
    expect(calls).toBe(1);
    controller.dispose();
  });
  it("captures immutable query and selection before awaiting the server", async () => {
    const ids = ["a"];
    const state = { ...value.state, search: "captured" };
    const controller = createServerExport(schema, async request => {
      expect(Object.isFrozen(request.state)).toBe(true);
      return artifact(request.state.search, false, true);
    });
    const pending = controller.request({ ...value, state, selection: { kind: "ids", ids } });
    state.search = "changed";
    ids.push("b");
    expect(await pending).toBe("accepted");
    expect(controller.getSnapshot().accepted?.artifact).toBe("captured");
    expect(controller.getSnapshot().accepted?.request.selection).toEqual({ kind: "ids", ids: ["a"] });
    controller.dispose();
  });
  it("retains successful artifacts on failure and retries the captured request", async () => {
    let fail = false;
    const controller = createServerExport(schema, (request, signal) => artifact(request.state.search, fail, false, signal));
    await controller.request(value);
    const accepted = controller.getSnapshot().accepted;
    fail = true;
    expect(await controller.request({ ...value, format: "json" })).toBe("failed");
    expect(controller.getSnapshot().accepted).toBe(accepted);
    fail = false;
    expect(await controller.retry()).toBe("accepted");
    expect(controller.getSnapshot().accepted?.request.format).toBe("json");
    controller.dispose();
  });
  it("discards ignored-abort results after clearing and after a newer export", async () => {
    const controller = createServerExport(schema, request => artifact(request.state.search, false, request.state.search === "initial"));
    const old = controller.request(value);
    controller.clear();
    expect(await controller.request({ ...value, state: { ...value.state, search: "new" } })).toBe("accepted");
    expect(await old).toBe("canceled");
    expect(controller.getSnapshot().accepted?.artifact).toBe("new");
    controller.dispose();
    expect(await controller.request(value)).toBe("disposed");
  });
  it("validates state and selection before invoking the adapter", async () => {
    let calls = 0;
    const controller = createServerExport(schema, request => { calls++; return artifact(request.state.search); });
    expect(await controller.request({ ...value, selection: { kind: "ids", ids: ["a", "a"] } })).toBe("failed");
    expect(calls).toBe(0);
    expect(controller.getSnapshot().requested).toBeNull();
    controller.dispose();
  });
});
