import { expect, test } from "vitest";
import { createRoot, createSignal } from "solid-js";
import { createUnsavedChangesRegistry, useUnsavedChanges } from "./unsaved-changes.ts";

test("registrations have independent identities and idempotent removal", () => {
  createRoot(dispose => {
    const registry = createUnsavedChangesRegistry();
    const [dirty, setDirty] = createSignal(false);
    const first = registry.register(dirty);
    const second = registry.register(dirty);
    expect(registry.dirty()).toBe(false);
    setDirty(true);
    expect(registry.dirty()).toBe(true);
    first(); first();
    expect(registry.dirty()).toBe(true);
    second();
    expect(registry.dirty()).toBe(false);
    dispose();
  });
});

test("dirty registration outside the shell fails explicitly", () => {
  expect(() => useUnsavedChanges(() => true)).toThrow("inside AppShell");
});
