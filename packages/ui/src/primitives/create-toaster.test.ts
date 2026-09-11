import { createRoot } from "solid-js";
import { describe, expect, it } from "vitest";
import { createToaster } from "./create-toaster.ts";

const owned = () => createRoot(dispose => ({ dispose, controller: createToaster() }));
const pending = () => {
  let resolve: () => void = () => {};
  let reject: (error: unknown) => void = () => {};
  const promise = new Promise<void>((accept, fail) => { resolve = accept; reject = fail; });
  return { promise, resolve, reject };
};

describe("owner-scoped notification controller", () => {
  it("requires an owner and isolates controllers and their handles", () => {
    expect(() => createToaster()).toThrow("Solid owner");
    const first = owned();
    const second = owned();
    try {
      const id = first.controller.show({ title: "First" });
      second.controller.show({ title: "Second" });
      expect(second.controller.dismiss(id)).toBe(false);
      expect(second.controller.update(id, { title: "Wrong scope" })).toBe(false);
      first.dispose();
      expect(first.controller.notifications()).toEqual([]);
      expect(second.controller.notifications().map(item => item.options.title)).toEqual(["Second"]);
      expect(() => first.controller.show({ title: "Too late" })).toThrow("disposed");
    } finally { first.dispose(); second.dispose(); }
  });

  it("snapshots options, defaults to polite, and keeps actions and warnings persistent", () => {
    const root = owned();
    try {
      const action = { label: "Undo", errorMessage: "Undo failed", run: () => {} };
      const options = { title: "Saved", action };
      root.controller.show(options);
      options.title = "Mutated";
      action.label = "Mutated";
      const notification = root.controller.notifications()[0];
      expect(notification?.options.title).toBe("Saved");
      expect(notification?.options.action?.label).toBe("Undo");
      expect(notification?.options.duration).toBe(null);
      expect(notification?.options.priority).toBe("polite");
      expect(Object.isFrozen(root.controller.notifications())).toBe(true);
      expect(Object.isFrozen(notification)).toBe(true);
      expect(Object.isFrozen(notification?.options.action)).toBe(true);
      root.controller.show({ title: "Warning", tone: "warning" });
      root.controller.show({ title: "Error", tone: "danger" });
      root.controller.show({ title: "Complete", tone: "success" });
      expect(root.controller.notifications().map(item => item.options.duration)).toEqual([null, null, null, 5000]);
    } finally { root.dispose(); }
  });

  it("validates lifetime and readable text before changing existing state", () => {
    const root = owned();
    try {
      const id = root.controller.show({ title: "Valid", duration: null });
      for (const duration of [0, -1, NaN, Infinity, 2_147_483_648]) {
        expect(() => root.controller.update(id, { title: "Invalid", duration })).toThrow("duration");
      }
      expect(() => root.controller.show({ title: " " })).toThrow("title");
      expect(() => root.controller.show({ title: "Action", action: { label: "Undo", run: () => {}, errorMessage: "" } })).toThrow("error message");
      expect(root.controller.notifications()[0]?.options.title).toBe("Valid");
    } finally { root.dispose(); }
  });

  it("runs an action once while pending and dismisses only after success", async () => {
    const root = owned();
    const operation = pending();
    let calls = 0;
    try {
      const id = root.controller.show({ title: "Saved", action: { label: "Undo", errorMessage: "Undo failed", run: () => { calls += 1; return operation.promise; } } });
      const result = root.controller.runAction(id);
      expect(root.controller.notifications()[0]?.state).toBe("pending");
      await expect(root.controller.runAction(id)).resolves.toEqual({ status: "ignored" });
      expect(calls).toBe(1);
      operation.resolve();
      await expect(result).resolves.toEqual({ status: "succeeded" });
      expect(root.controller.notifications()).toEqual([]);
    } finally { root.dispose(); }
  });

  it("retains failures for explicit retry and never retries automatically", async () => {
    const root = owned();
    const failure = new Error("Transport rejected");
    let calls = 0;
    try {
      const id = root.controller.show({ title: "Saved", action: { label: "Undo", errorMessage: "Try again", run: () => { calls += 1; if (calls === 1) throw failure; } } });
      await expect(root.controller.runAction(id)).resolves.toEqual({ status: "failed", error: failure });
      expect(root.controller.notifications()[0]?.state).toBe("failed");
      expect(root.controller.notifications()[0]?.error).toBe(failure);
      expect(calls).toBe(1);
      await expect(root.controller.runAction(id)).resolves.toEqual({ status: "succeeded" });
      expect(calls).toBe(2);
    } finally { root.dispose(); }
  });

  for (const disposition of ["resolve", "reject"]) {
    it(`ignores a stale ${disposition} after update, including when the replacement action is pending`, async () => {
      const root = owned();
      const old = pending();
      const replacement = pending();
      try {
        const id = root.controller.show({ title: "Old", action: { label: "Undo", errorMessage: "Old error", run: () => old.promise } });
        const first = root.controller.runAction(id);
        root.controller.update(id, { title: "New", action: { label: "Retry", errorMessage: "New error", run: () => replacement.promise } });
        const second = root.controller.runAction(id);
        if (disposition === "resolve") old.resolve(); else old.reject(new Error("Stale"));
        await expect(first).resolves.toEqual({ status: "ignored" });
        expect(root.controller.notifications()[0]?.options.title).toBe("New");
        expect(root.controller.notifications()[0]?.state).toBe("pending");
        replacement.resolve();
        await expect(second).resolves.toEqual({ status: "succeeded" });
      } finally { root.dispose(); }
    });
  }

  for (const cleanup of ["dismiss", "clear", "dispose"]) {
    it(`ignores an in-flight rejection after ${cleanup} without reviving its notification`, async () => {
      const root = owned();
      const operation = pending();
      try {
        const id = root.controller.show({ title: "Pending", action: { label: "Retry", errorMessage: "Failed", run: () => operation.promise } });
        const result = root.controller.runAction(id);
        if (cleanup === "dismiss") root.controller.dismiss(id);
        else if (cleanup === "clear") root.controller.clear();
        else root.dispose();
        operation.reject(new Error("Too late"));
        await expect(result).resolves.toEqual({ status: "ignored" });
        expect(root.controller.notifications()).toEqual([]);
        await expect(root.controller.runAction(id)).resolves.toEqual({ status: "ignored" });
      } finally { root.dispose(); }
    });
  }

  it("replaces the entire message and does not carry an obsolete action or error forward", async () => {
    const root = owned();
    try {
      const id = root.controller.show({ title: "Old", description: "Old description", action: { label: "Retry", errorMessage: "Failed", run: () => Promise.reject("offline") } });
      await root.controller.runAction(id);
      root.controller.update(id, { title: "New" });
      expect(root.controller.notifications()[0]?.options.action).toBeUndefined();
      expect(root.controller.notifications()[0]?.options.description).toBeUndefined();
      expect(root.controller.notifications()[0]?.error).toBeUndefined();
      expect(root.controller.notifications()[0]?.state).toBe("idle");
      await expect(root.controller.runAction(id)).resolves.toEqual({ status: "ignored" });
    } finally { root.dispose(); }
  });
});
