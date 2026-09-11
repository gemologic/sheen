import { describe, expect, it } from "vitest";
import { optimistic } from "./optimistic.ts";

describe("app-owned optimistic operations", () => {
  it("applies synchronously, waits for commit, and returns its result without reverting", async () => {
    let value = "before";
    let finish: (value: string) => void = () => {};
    const committed = new Promise<string>(resolve => { finish = resolve; });
    const events: string[] = [];
    const result = optimistic(() => {
      events.push("apply");
      value = "draft";
      return () => { events.push("revert"); value = "before"; };
    }, () => { events.push("commit"); return committed; });
    expect(value).toBe("draft");
    expect(events).toEqual(["apply", "commit"]);
    finish("accepted");
    await expect(result).resolves.toBe("accepted");
    expect(value).toBe("draft");
    expect(events).toEqual(["apply", "commit"]);
  });

  it("does not commit when applying the local change fails", async () => {
    const failure = new Error("Cannot apply");
    let commits = 0;
    await expect(optimistic(() => { throw failure; }, () => { commits += 1; })).rejects.toBe(failure);
    expect(commits).toBe(0);
  });

  it("rolls back a synchronously thrown commit exactly once", async () => {
    const failure = new Error("Commit rejected");
    let value = 0;
    let reverts = 0;
    const result = optimistic(() => {
      value += 1;
      return () => { reverts += 1; value -= 1; };
    }, () => { throw failure; });
    await expect(result).rejects.toBe(failure);
    expect(value).toBe(0);
    expect(reverts).toBe(1);
  });

  it("waits for asynchronous rollback before rejecting with the original commit error", async () => {
    const failure = new Error("Offline");
    let finishRollback: () => void = () => {};
    const rollback = new Promise<void>(resolve => { finishRollback = resolve; });
    let reverting = false;
    let settled = false;
    const result = optimistic(() => () => { reverting = true; return rollback; }, () => Promise.reject(failure));
    const observed = result.catch(error => { settled = true; return error; });
    await Promise.resolve();
    expect(reverting).toBe(true);
    expect(settled).toBe(false);
    finishRollback();
    expect(await observed).toBe(failure);
  });

  it("preserves commit and rollback errors rather than masking either", async () => {
    const commitError = new Error("Server rejected");
    const revertError = new Error("Local rollback failed");
    const result = optimistic(() => () => Promise.reject(revertError), () => Promise.reject(commitError));
    const error: unknown = await result.catch((failure: unknown) => failure);
    expect(error).toBeInstanceOf(AggregateError);
    if (!(error instanceof AggregateError)) throw new Error("Expected both failures");
    expect(error.errors).toEqual([commitError, revertError]);
    expect(error.cause).toBe(commitError);
  });

  it("lets app-owned inverse operations preserve newer overlapping edits", async () => {
    let balance = 100;
    let rejectFirst: (error: Error) => void = () => {};
    const firstCommit = new Promise<void>((_resolve, reject) => { rejectFirst = reject; });
    const first = optimistic(() => {
      balance -= 10;
      return () => { balance += 10; };
    }, () => firstCommit);
    const failure = new Error("First operation rejected");
    const rejected = expect(first).rejects.toBe(failure);
    await optimistic(() => {
      balance += 25;
      return () => { balance -= 25; };
    }, () => "accepted");
    rejectFirst(failure);
    await rejected;
    expect(balance).toBe(125);
  });

  it("does not invent an undo or cancel operation after success", async () => {
    let reverts = 0;
    await expect(optimistic(() => () => { reverts += 1; }, () => 42)).resolves.toBe(42);
    expect(reverts).toBe(0);
  });
});
