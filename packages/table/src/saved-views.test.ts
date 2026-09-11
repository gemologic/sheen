import { createServer } from "node:http";
import type { IncomingMessage } from "node:http";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createSavedViews } from "./saved-views.ts";
import type { SavedViewRecord, SavedViewsAdapter } from "./saved-views.ts";
import type { TableState, TableStateSchema } from "./table-state.ts";

const schema: TableStateSchema = { columns: ["name"], filterColumns: [{ id: "name", type: "text" }], sortColumns: [{ id: "name", type: "text" }] };
const state: TableState = { search: "initial", filter: { kind: "and", children: [] }, sorting: [], pagination: false, columns: [{ id: "name", visible: true, width: null, pin: false }] };
const stores = new Map<string, Map<string, SavedViewRecord>>();
let base = "";

function body(request: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let value = "";
    request.setEncoding("utf8");
    request.on("data", (chunk: string) => { value += chunk; });
    request.on("end", () => resolve(value));
    request.on("error", reject);
  });
}
function parseRecord(value: unknown): SavedViewRecord {
  if (typeof value !== "object" || value === null || !("id" in value) || typeof value.id !== "string" || !("name" in value) || typeof value.name !== "string" || !("state" in value) || typeof value.state !== "string") throw new Error("Invalid saved view response");
  return { id: value.id, name: value.name, state: value.state };
}
const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", "http://localhost");
  const session = url.searchParams.get("session") ?? "";
  const operation = url.searchParams.get("operation");
  const delay = Number(url.searchParams.get("delay") ?? "5");
  const store = stores.get(session) ?? new Map<string, SavedViewRecord>();
  stores.set(session, store);
  const listed = [...store.values()];
  const raw = await body(request);
  setTimeout(() => {
    if (url.searchParams.get("reject") === "true") { response.writeHead(503); response.end("Rejected"); return; }
    response.setHeader("content-type", "application/json");
    if (operation === "list") {
      const result = url.searchParams.get("corrupt") === "true" ? [...listed, { id: "old", name: "Old view", state: "{" }] : listed;
      response.end(JSON.stringify(result));
      return;
    }
    if (operation === "save") {
      let input: unknown;
      try { input = JSON.parse(raw); }
      catch { response.writeHead(400); response.end("Invalid JSON"); return; }
      if (typeof input !== "object" || input === null || !("id" in input) || (input.id !== null && typeof input.id !== "string") || !("name" in input) || typeof input.name !== "string" || !("state" in input) || typeof input.state !== "string") { response.writeHead(400); response.end("Invalid save"); return; }
      const id = input.id ?? `view-${store.size + 1}`;
      const saved = { id, name: input.name, state: input.state };
      store.set(id, saved);
      response.end(JSON.stringify(saved));
      return;
    }
    if (operation === "delete") {
      store.delete(raw);
      response.end("null");
      return;
    }
    response.writeHead(400);
    response.end("Invalid operation");
  }, delay);
});
beforeAll(async () => {
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Expected TCP address");
  base = `http://127.0.0.1:${address.port}`;
});
afterAll(async () => { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); });

interface Transport { reject: boolean; delay: number; ignoreAbort: boolean; corrupt: boolean }
function adapter(session: string, transport: () => Transport): SavedViewsAdapter {
  async function send(operation: string, body: string, signal: AbortSignal): Promise<Response> {
    const current = transport();
    const parameters = new URLSearchParams({ session, operation, reject: String(current.reject), delay: String(current.delay), corrupt: String(current.corrupt) });
    const response = await fetch(`${base}/?${parameters}`, { method: "POST", body, ...(current.ignoreAbort ? {} : { signal }) });
    if (!response.ok) throw new Error(`Saved view request failed (${response.status})`);
    return response;
  }
  return {
    async list(signal) {
      const response = await send("list", "", signal);
      const value: unknown = await response.json();
      if (!Array.isArray(value)) throw new Error("Invalid saved view list");
      return value.map(parseRecord);
    },
    async save(view, signal) { return parseRecord(await (await send("save", JSON.stringify(view), signal)).json()); },
    async delete(id, signal) { await send("delete", id, signal); },
  };
}

describe("saved view adapter ownership", () => {
  it("lists, saves, restores, updates, and deletes through real HTTP", async () => {
    const transport = { reject: false, delay: 5, ignoreAbort: false, corrupt: false };
    const controller = createSavedViews(adapter(randomUUID(), () => transport), schema);
    expect(await controller.list()).toBe("accepted");
    expect(controller.getSnapshot().accepted).toEqual([]);
    expect(await controller.save("My view", state)).toBe("accepted");
    expect(controller.getSnapshot().accepted?.map(view => [view.id, view.name])).toEqual([["view-1", "My view"]]);
    expect(controller.restore("view-1")).toEqual({ kind: "accepted", state });
    const changed = { ...state, search: "updated" };
    expect(await controller.save("Renamed", changed, "view-1")).toBe("accepted");
    expect(controller.getSnapshot().accepted).toHaveLength(1);
    expect(controller.restore("view-1")).toEqual({ kind: "accepted", state: changed });
    expect(await controller.delete("view-1")).toBe("accepted");
    expect(controller.getSnapshot().accepted).toEqual([]);
    controller.dispose();
  });

  it("retains the accepted list on failure and retries the exact operation", async () => {
    const transport = { reject: false, delay: 5, ignoreAbort: false, corrupt: false };
    const controller = createSavedViews(adapter(randomUUID(), () => transport), schema);
    await controller.save("Kept", state);
    const accepted = controller.getSnapshot().accepted;
    transport.reject = true;
    expect(await controller.delete("view-1")).toBe("failed");
    expect(controller.getSnapshot().accepted).toBe(accepted);
    expect(controller.getSnapshot().failed).toEqual({ kind: "delete", id: "view-1" });
    transport.reject = false;
    expect(await controller.retry()).toBe("accepted");
    expect(controller.getSnapshot().accepted).toEqual([]);
    controller.dispose();
  });

  it("keeps incompatible stored state visible but fails restoration closed", async () => {
    const transport = { reject: false, delay: 5, ignoreAbort: false, corrupt: true };
    const controller = createSavedViews(adapter(randomUUID(), () => transport), schema);
    expect(await controller.list()).toBe("accepted");
    expect(controller.getSnapshot().accepted?.map(view => view.id)).toEqual(["old"]);
    expect(controller.restore("old").kind).toBe("invalid");
    expect(controller.restore("missing")).toEqual({ kind: "missing" });
    controller.dispose();
  });

  it("discards stale ignored-abort lists after a newer save", async () => {
    const transport = { reject: false, delay: 50, ignoreAbort: true, corrupt: false };
    const controller = createSavedViews(adapter(randomUUID(), () => transport), schema);
    const stale = controller.list();
    transport.delay = 5;
    transport.ignoreAbort = false;
    expect(await controller.save("Latest", state)).toBe("accepted");
    expect(await stale).toBe("superseded");
    expect(controller.getSnapshot().accepted?.map(view => view.name)).toEqual(["Latest"]);
    controller.dispose();
  });

  it("clears pending work and rejects use after disposal", async () => {
    const transport = { reject: false, delay: 50, ignoreAbort: true, corrupt: false };
    const controller = createSavedViews(adapter(randomUUID(), () => transport), schema);
    const pending = controller.save("Late", state);
    controller.clear();
    expect(await pending).toBe("superseded");
    expect(controller.getSnapshot()).toEqual({ accepted: null, pending: null, failed: null, error: null });
    controller.dispose();
    expect(await controller.list()).toBe("disposed");
  });
});
