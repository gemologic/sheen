import { createServer } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createCellEdit } from "./cell-edit.ts";
import type { CellCommitRequest, CellCommitResult } from "./cell-edit.ts";

let base = "";
const server = createServer((request, response) => {
  const url = new URL(request.url ?? "/", "http://localhost");
  const delay = Number(url.searchParams.get("delay") ?? "5");
  setTimeout(() => {
    if (url.searchParams.get("reject") === "true") {
      response.writeHead(503);
      response.end("Commit failed");
      return;
    }
    response.setHeader("content-type", "application/json");
    if (url.searchParams.get("conflict") === "true") response.end(JSON.stringify({ kind: "conflict", current: "server", detail: "version-mismatch" }));
    else response.end(JSON.stringify({ kind: "accepted", value: url.searchParams.get("value") ?? "" }));
  }, delay);
});
beforeAll(async () => {
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Expected TCP address");
  base = `http://127.0.0.1:${address.port}`;
});
afterAll(async () => { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); });

interface Transport { reject: boolean; conflict: boolean; delay: number; ignoreAbort: boolean }
function adapter(transport: () => Transport, calls: CellCommitRequest<string>[]) {
  return async (request: CellCommitRequest<string>, signal: AbortSignal): Promise<CellCommitResult<string, string>> => {
    calls.push(request);
    const current = transport();
    const parameters = new URLSearchParams({ value: request.value, reject: String(current.reject), conflict: String(current.conflict), delay: String(current.delay), commitId: String(request.commitId) });
    const response = await fetch(`${base}/?${parameters}`, current.ignoreAbort ? {} : { signal });
    if (!response.ok) throw new Error(`Commit failed (${response.status})`);
    const value: unknown = await response.json();
    if (typeof value !== "object" || value === null || !("kind" in value)) throw new Error("Invalid commit response");
    if (value.kind === "accepted" && "value" in value && typeof value.value === "string") return { kind: "accepted", value: value.value };
    if (value.kind === "conflict" && "current" in value && typeof value.current === "string" && "detail" in value && typeof value.detail === "string") return { kind: "conflict", current: value.current, detail: value.detail };
    throw new Error("Invalid commit response");
  };
}

describe("cell edit ownership", () => {
  it("keeps invalid drafts in edit mode without invoking transport", async () => {
    const calls: CellCommitRequest<string>[] = [];
    const controller = createCellEdit("old", adapter(() => ({ reject: false, conflict: false, delay: 5, ignoreAbort: false }), calls), { validate: value => value.trim() ? null : "Value is required" });
    expect(controller.begin()).toBe(true);
    expect(controller.begin()).toBe(false);
    controller.setDraft(" ");
    expect(await controller.commit()).toBe("invalid");
    expect(calls).toHaveLength(0);
    expect(controller.getSnapshot()).toMatchObject({ committed: "old", draft: { value: " " }, editing: true, pending: false, invalid: "Value is required" });
    controller.setDraft("new");
    expect(controller.getSnapshot().invalid).toBeNull();
    expect(await controller.commit()).toBe("accepted");
    expect(controller.getSnapshot()).toMatchObject({ committed: "new", draft: null, editing: false, pending: false });
    controller.dispose();
  });

  it("retains a failed draft and retries it with a new commit ID", async () => {
    const calls: CellCommitRequest<string>[] = [];
    let reject = true;
    const controller = createCellEdit("old", adapter(() => ({ reject, conflict: false, delay: 5, ignoreAbort: false }), calls));
    controller.begin();
    controller.setDraft("new");
    expect(await controller.commit()).toBe("failed");
    expect(controller.getSnapshot()).toMatchObject({ committed: "old", draft: { value: "new" }, editing: true, pending: false });
    expect(controller.getSnapshot().error).toBeInstanceOf(Error);
    reject = false;
    expect(await controller.retry()).toBe("accepted");
    expect(calls.map(call => call.commitId)).toEqual([1n, 2n]);
    expect(controller.getSnapshot()).toMatchObject({ committed: "new", draft: null, editing: false, error: null });
    controller.dispose();
  });

  it("does not let retry overwrite a newer draft", async () => {
    const calls: CellCommitRequest<string>[] = [];
    let reject = true;
    const controller = createCellEdit("old", adapter(() => ({ reject, conflict: false, delay: 5, ignoreAbort: false }), calls));
    controller.begin();
    controller.setDraft("failed");
    await controller.commit();
    controller.setDraft("newer");
    reject = false;
    expect(await controller.retry()).toBe("changed");
    expect(calls).toHaveLength(1);
    expect(await controller.commit()).toBe("accepted");
    expect(controller.getSnapshot().committed).toBe("newer");
    controller.dispose();
  });

  it("preserves dirty input and marks it stale when a refetch changes its base", () => {
    const calls: CellCommitRequest<string>[] = [];
    const controller = createCellEdit("old", adapter(() => ({ reject: false, conflict: false, delay: 5, ignoreAbort: false }), calls));
    controller.begin();
    controller.setDraft("local");
    expect(controller.acceptRefetch("old")).toBe(true);
    expect(controller.getSnapshot().stale).toBe(false);
    controller.acceptRefetch("remote");
    expect(controller.getSnapshot()).toMatchObject({ committed: "remote", draft: { value: "local" }, editing: true, stale: true });
    controller.discard();
    expect(controller.getSnapshot()).toMatchObject({ committed: "remote", draft: null, editing: false, stale: false });
    controller.dispose();
  });

  it("keeps explicit conflicts visible until a retry or discard", async () => {
    const calls: CellCommitRequest<string>[] = [];
    let conflict = true;
    const controller = createCellEdit("old", adapter(() => ({ reject: false, conflict, delay: 5, ignoreAbort: false }), calls));
    controller.begin();
    controller.setDraft("mine");
    expect(await controller.commit()).toBe("conflict");
    expect(controller.getSnapshot()).toMatchObject({ committed: "server", draft: { value: "mine" }, editing: true, stale: true, conflict: { commitId: 1n, attempted: "mine", current: "server", detail: "version-mismatch" } });
    controller.setDraft("revised");
    expect(controller.getSnapshot().conflict).not.toBeNull();
    expect(await controller.retry()).toBe("changed");
    conflict = false;
    expect(await controller.commit()).toBe("accepted");
    expect(controller.getSnapshot()).toMatchObject({ committed: "revised", editing: false, stale: false, conflict: null });
    controller.dispose();
  });

  it("discards ignored-abort completions after supersession and disposal", async () => {
    const calls: CellCommitRequest<string>[] = [];
    const controller = createCellEdit("old", adapter(() => ({ reject: false, conflict: false, delay: calls.length === 1 ? 50 : 5, ignoreAbort: true }), calls));
    controller.begin();
    controller.setDraft("first");
    const first = controller.commit();
    expect(await controller.commit()).toBe("busy");
    expect(calls).toHaveLength(1);
    controller.setDraft("second");
    const second = controller.commit();
    expect(await second).toBe("accepted");
    expect(await first).toBe("superseded");
    expect(controller.getSnapshot().committed).toBe("second");
    controller.begin();
    controller.setDraft("late");
    const late = controller.commit();
    controller.dispose();
    expect(await late).toBe("disposed");
    expect(controller.getSnapshot()).toMatchObject({ committed: "second", editing: false, pending: false });
    expect(controller.begin()).toBe(false);
  });
});
