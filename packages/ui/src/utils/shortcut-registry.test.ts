import { describe, expect, it } from "vitest";
import { createShortcutRegistry } from "./shortcut-registry.ts";
import type { ShortcutInput } from "./shortcut-registry.ts";

const input = (key: string, overrides: Partial<ShortcutInput> = {}): ShortcutInput => ({ key, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, editing: false, ...overrides });

describe("shortcut registry", () => {
  it("omits development-only registrations from production dispatch and inventory", () => {
    for (const development of [false, true]) {
      let calls = 0;
      const registry = createShortcutRegistry({ platform: "other", development });
      const remove = registry.register({ keys: "mod+shift+d", scope: "global", label: "Cycle", group: "Application", developmentOnly: true, run: () => { calls++; } });
      expect(registry.snapshot().length).toBe(development ? 1 : 0);
      expect(registry.dispatch(input("D", { ctrlKey: true, shiftKey: true }), ["global"])).toBe(development);
      expect(calls).toBe(development ? 1 : 0);
      remove();
      remove();
      expect(registry.snapshot()).toEqual([]);
      expect(registry.dispatch(input("D", { ctrlKey: true, shiftKey: true }), ["global"])).toBe(false);
      registry.dispose();
    }
  });
  it("ignores incidental synchronous values returned through a void callback", async () => {
    const errors: unknown[] = [];
    const registry = createShortcutRegistry({ platform: "other", development: true, onError: error => errors.push(error) });
    const callback: () => void = () => 42;
    registry.register({ keys: "g", scope: "global", label: "Set state", group: "Actions", run: callback });
    expect(registry.dispatch(input("g"), ["global"])).toBe(true);
    await Promise.resolve();
    expect(errors).toEqual([]);
    registry.dispose();
  });
  it("publishes immutable binding changes with platform labels and restoration state", () => {
    const states: string[][] = [];
    const registry = createShortcutRegistry({ platform: "mac", development: false, warn: () => {}, onChange: bindings => {
      expect(Object.isFrozen(bindings)).toBe(true);
      for (const binding of bindings) expect(Object.isFrozen(binding)).toBe(true);
      states.push(bindings.map(binding => `${binding.label}:${binding.shadowed}:${binding.displayKeys}`));
    } });
    registry.register({ keys: "mod+k i", scope: "global", label: "First", group: "Navigation", run: () => {} });
    const remove = registry.register({ keys: "meta+k i", scope: "global", label: "Second", group: "Navigation", run: () => {} });
    remove(); remove();
    registry.dispose(); registry.dispose();
    expect(states).toEqual([["First:false:⌘+K → I"], ["First:true:⌘+K → I", "Second:false:⌘+K → I"], ["First:false:⌘+K → I"], []]);
  });
  it("disables character-only bindings without disabling modifier or non-character actions", () => {
    const registry = createShortcutRegistry({ platform: "other", development: true });
    const calls: string[] = [];
    for (const keys of ["g", "?", "shift+a", "é", "😀", "x i", "mod+b i", "alt+j", "F2", "z ctrl+i"]) {
      registry.register({ keys, scope: "global", label: keys, group: "Navigation", run: () => { calls.push(keys); } });
    }
    const disabled = (key: string, overrides: Partial<ShortcutInput> = {}) => input(key, { characterShortcuts: false, ...overrides });
    for (const key of ["g", "?", "é", "😀", "x", "i"]) expect(registry.dispatch(disabled(key), ["global"])).toBe(false);
    expect(registry.dispatch(disabled("A", { shiftKey: true }), ["global"])).toBe(false);
    registry.dispatch(disabled("b", { ctrlKey: true }), ["global"]);
    registry.dispatch(disabled("i"), ["global"]);
    registry.dispatch(disabled("j", { altKey: true }), ["global"]);
    registry.dispatch(disabled("F2"), ["global"]);
    registry.dispatch(disabled("z"), ["global"]);
    registry.dispatch(disabled("i", { ctrlKey: true }), ["global"]);
    expect(calls).toEqual(["mod+b i", "alt+j", "F2", "z ctrl+i"]);
    expect(registry.snapshot().filter(entry => entry.characterOnly).map(entry => entry.keys)).toEqual(["g", "?", "shift+a", "é", "😀", "x i"]);
    registry.dispose();
  });
  it("changing the character preference cancels an already-started sequence", () => {
    const registry = createShortcutRegistry({ platform: "other", development: true });
    let calls = 0;
    registry.register({ keys: "g i", scope: "global", label: "Inbox", group: "Navigation", run: () => { calls++; } });
    registry.dispatch(input("g"), ["global"]);
    expect(registry.dispatch(input("i", { characterShortcuts: false }), ["global"])).toBe(false);
    expect(registry.dispatch(input("i"), ["global"])).toBe(false);
    registry.dispatch(input("g"), ["global"]);
    registry.dispatch(input("i"), ["global"]);
    expect(calls).toBe(1);
    registry.dispose();
  });
  it("captures the inner scope, tolerates modifier presses, and clears immutable feedback on disposal", () => {
    const states: number[] = [];
    const registry = createShortcutRegistry({ platform: "other", development: true, onPending: candidates => {
      expect(Object.isFrozen(candidates)).toBe(true);
      for (const candidate of candidates) expect(Object.isFrozen(candidate)).toBe(true);
      states.push(candidates[0]?.completed ?? 0);
    } });
    const calls: string[] = [];
    for (const scope of ["global", "pane"]) registry.register({ keys: "g ctrl+i p", scope, label: scope, group: "Navigation", run: () => { calls.push(scope); } });
    registry.dispatch(input("g"), ["global", "pane"]);
    expect(registry.dispatch(input("Control", { ctrlKey: true }), ["global", "pane"])).toBe(false);
    registry.dispatch(input("i", { ctrlKey: true }), ["global", "pane"]);
    registry.dispatch(input("p"), ["global", "pane"]);
    expect(calls).toEqual(["pane"]);
    expect(states).toEqual([1, 0, 2, 0]);
    registry.dispatch(input("g"), ["global"]);
    registry.dispose();
    expect(states.slice(-2)).toEqual([1, 0]);
    expect(registry.dispatch(input("i", { ctrlKey: true }), ["global"])).toBe(false);
  });
  it("branches sequences, prevents prefixes, and restarts a mismatched stroke as a fresh shortcut", () => {
    const registry = createShortcutRegistry({ platform: "other", development: true });
    const calls: string[] = [];
    let prevented = 0;
    for (const keys of ["g i", "g p", "x"]) registry.register({ keys, scope: "global", label: keys, group: "Navigation", run: () => { calls.push(keys); } });
    expect(registry.dispatch(input("g"), ["global"], () => { prevented++; })).toBe(true);
    expect(calls).toEqual([]);
    expect(prevented).toBe(1);
    expect(registry.dispatch(input("p"), ["global"])).toBe(true);
    expect(calls).toEqual(["g p"]);
    registry.dispatch(input("g"), ["global"]);
    registry.dispatch(input("x"), ["global"]);
    expect(calls).toEqual(["g p", "x"]);
    registry.dispose();
  });
  it("expires pending candidates after one real second without executing an action", async () => {
    const states: number[] = [];
    const registry = createShortcutRegistry({ platform: "other", development: true, onPending: candidates => states.push(candidates.length) });
    let calls = 0;
    registry.register({ keys: "g i", scope: "global", label: "Inbox", group: "Navigation", run: () => { calls++; } });
    registry.dispatch(input("g"), ["global"]);
    expect(states).toEqual([1]);
    await new Promise<void>(resolve => setTimeout(resolve, 1050));
    expect(states).toEqual([1, 0]);
    expect(registry.dispatch(input("i"), ["global"])).toBe(false);
    expect(calls).toBe(0);
    registry.dispose();
  });
  it("cancels pending sequences on Escape, editing, scope changes, and owner cleanup", () => {
    const registry = createShortcutRegistry({ platform: "other", development: true });
    let calls = 0;
    const remove = registry.register({ keys: "g i", scope: "global", label: "Inbox", group: "Navigation", run: () => { calls++; } });
    for (const cancellation of [input("Escape"), input("a", { editing: true }), input("Process", { composing: true })]) {
      registry.dispatch(input("g"), ["global"]);
      registry.dispatch(cancellation, ["global"]);
      expect(registry.dispatch(input("i"), ["global"])).toBe(false);
    }
    registry.dispatch(input("g"), ["global"]);
    expect(registry.dispatch(input("i"), ["global", "pane"])).toBe(false);
    registry.dispatch(input("g"), ["global"]);
    remove();
    expect(registry.dispatch(input("i"), ["global"])).toBe(false);
    expect(calls).toBe(0);
    registry.dispose();
  });
  it("rejects prefix ambiguity in either order and resolves complete sequence collisions", () => {
    for (const pair of [["g", "g i"], ["g i", "g"]]) {
      const registry = createShortcutRegistry({ platform: "other", development: false, warn: () => {} });
      const first = pair[0];
      const second = pair[1];
      if (!first || !second) throw new Error("Missing fixture chord");
      registry.register({ keys: first, scope: "global", label: "First", group: "Navigation", run: () => {} });
      expect(() => registry.register({ keys: second, scope: "global", label: "Second", group: "Navigation", run: () => {} })).toThrow('"First" and "Second"');
      registry.dispose();
    }
    const calls: string[] = [];
    const registry = createShortcutRegistry({ platform: "mac", development: false, warn: () => {} });
    registry.register({ keys: "mod+k i", scope: "global", label: "First", group: "Navigation", run: () => { calls.push("first"); } });
    const remove = registry.register({ keys: "meta+k i", scope: "global", label: "Second", group: "Navigation", run: () => { calls.push("second"); } });
    registry.dispatch(input("k", { metaKey: true }), ["global"]);
    registry.dispatch(input("i"), ["global"]);
    remove();
    registry.dispatch(input("k", { metaKey: true }), ["global"]);
    registry.dispatch(input("i"), ["global"]);
    expect(calls).toEqual(["second", "first"]);
    registry.dispose();
  });
  it("prevents a recognized native action before invoking a failing callback", () => {
    const registry = createShortcutRegistry({ platform: "other", development: true });
    const order: string[] = [];
    registry.register({ keys: "g", scope: "global", label: "Fail", group: "Actions", run: () => { order.push("action"); throw new Error("failed"); } });
    expect(() => registry.dispatch(input("g"), ["global"], () => order.push("prevent"))).toThrow("failed");
    expect(order).toEqual(["prevent", "action"]);
  });
  it("normalizes platform modifiers and rejects same-scope aliases without losing the original", () => {
    const registry = createShortcutRegistry({ platform: "mac", development: true });
    let calls = 0;
    registry.register({ keys: "mod+k", scope: "global", label: "Palette", group: "Navigation", run: () => { calls++; } });
    expect(() => registry.register({ keys: "meta+K", scope: "global", label: "Other", group: "Navigation", run: () => {} })).toThrow('"Palette" and "Other"');
    expect(registry.dispatch(input("k", { ctrlKey: true }), ["global"])).toBe(false);
    expect(registry.dispatch(input("k", { metaKey: true }), ["global"])).toBe(true);
    expect(calls).toBe(1);
  });
  it("production last-wins registrations restore the older binding after idempotent cleanup", () => {
    const warnings: string[] = [];
    const calls: string[] = [];
    const registry = createShortcutRegistry({ platform: "other", development: false, warn: message => warnings.push(message) });
    const first = registry.register({ keys: "mod+k", scope: "global", label: "First", group: "Navigation", run: () => { calls.push("first"); } });
    const second = registry.register({ keys: "ctrl+k", scope: "global", label: "Second", group: "Navigation", run: () => { calls.push("second"); } });
    expect(warnings).toHaveLength(1);
    expect(registry.snapshot().map(entry => entry.shadowed)).toEqual([true, false]);
    registry.dispatch(input("k", { ctrlKey: true }), ["global"]);
    second(); second();
    registry.dispatch(input("k", { ctrlKey: true }), ["global"]);
    expect(calls).toEqual(["second", "first"]);
    first(); expect(registry.snapshot()).toEqual([]);
  });
  it("inner scopes shadow outer scopes and caller-supplied modal isolation excludes outer actions", () => {
    const calls: string[] = [];
    const registry = createShortcutRegistry({ platform: "other", development: true });
    for (const scope of ["global", "pane"]) registry.register({ keys: "g", scope, label: scope, group: "Navigation", run: () => { calls.push(scope); } });
    registry.dispatch(input("g"), ["global", "pane"]);
    expect(registry.dispatch(input("g"), ["dialog"])).toBe(false);
    registry.dispatch(input("g"), ["global"]);
    expect(calls).toEqual(["pane", "global"]);
  });
  it("protects browser shortcuts, editing, composition, and repeat events", () => {
    const registry = createShortcutRegistry({ platform: "other", development: true });
    for (const keys of ["mod+r", "ctrl+shift+t", "meta+w", "mod+l", "ctrl+ctrl+k", "mod", "g mod+r", "g esc"]) {
      expect(() => registry.register({ keys, scope: "global", label: keys, group: "Navigation", run: () => {} })).toThrow();
    }
    let calls = 0;
    registry.register({ keys: "?", scope: "global", label: "Help", group: "Navigation", run: () => { calls++; } });
    expect(registry.dispatch(input("?", { shiftKey: true, editing: true }), ["global"])).toBe(false);
    expect(registry.dispatch(input("?", { shiftKey: true, composing: true }), ["global"])).toBe(false);
    expect(registry.dispatch(input("?", { shiftKey: true, repeat: true }), ["global"])).toBe(false);
    expect(registry.dispatch(input("?", { shiftKey: true }), ["global"])).toBe(true);
    expect(calls).toBe(1);
    registry.dispose();
    expect(registry.dispatch(input("?", { shiftKey: true }), ["global"])).toBe(false);
    expect(() => registry.register({ keys: "g", scope: "global", label: "Go", group: "Navigation", run: () => {} })).toThrow("disposed");
  });
  it("executes only the current winning introspected registration", () => {
    const calls: string[] = [];
    const registry = createShortcutRegistry({ platform: "other", development: false, warn: () => {} });
    const removeFirst = registry.register({ keys: "mod+k", scope: "global", label: "First", group: "Navigation", run: () => { calls.push("first"); } });
    const firstId = registry.snapshot()[0]?.id;
    const removeSecond = registry.register({ keys: "ctrl+k", scope: "global", label: "Second", group: "Navigation", run: () => { calls.push("second"); } });
    const secondId = registry.snapshot().find(binding => binding.label === "Second")?.id;
    if (firstId === undefined || secondId === undefined) throw new Error("Missing shortcut fixture IDs");
    expect(registry.run(firstId)).toBe(false);
    expect(registry.run(secondId)).toBe(true);
    removeSecond();
    expect(registry.run(firstId)).toBe(true);
    removeFirst();
    expect(registry.run(firstId)).toBe(false);
    expect(calls).toEqual(["second", "first"]);
  });
});
