import { describe, expect, it } from "vitest";
import { createRowIdentity } from "./row-identity.ts";

interface Row { id: string; value: number }

describe("stable table row identities", () => {
  it("resolves each row once while preserving row identity and order", () => {
    const rows = [{ id: "a", value: 1 }, { id: "b", value: 2 }];
    let calls = 0;
    const identity = createRowIdentity<Row>(row => { calls++; return row.id; });
    const result = identity.resolve(rows);
    expect(calls).toBe(2);
    expect(result.map(entry => entry.id)).toEqual(["a", "b"]);
    expect(result[0]?.row).toBe(rows[0]);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result[0])).toBe(true);
    expect(identity.resolve([{ id: "a", value: 3 }])[0]?.id).toBe("a");
  });

  it("rejects duplicate, empty, sparse, and changed IDs atomically", () => {
    const identity = createRowIdentity<Row>(row => row.id);
    expect(() => identity.resolve([{ id: "a", value: 1 }, { id: "a", value: 2 }])).toThrow("duplicates");
    expect(() => identity.resolve([{ id: "", value: 1 }])).toThrow("invalid stable ID");
    const sparse = Array<Row>(1);
    expect(() => identity.resolve(sparse)).toThrow("rows[0] must be an object");
    const row = { id: "stable", value: 1 };
    identity.resolve([row]);
    row.id = "changed";
    expect(() => identity.resolve([row])).toThrow("changed stable ID");
    identity.clear();
    expect(identity.resolve([row])[0]?.id).toBe("changed");
  });
});
