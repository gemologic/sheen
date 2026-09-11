import { expect, test } from "vitest";
import { createPanePositionCache } from "./pane-position-cache.ts";

test("the shipped default retains only the 256 newest pairs", () => {
  const cache = createPanePositionCache();
  for (let index = 0; index < 257; index++) cache.set(String(index), "main", { top: index, left: 0 });
  expect(cache.size()).toBe(256);
  expect(cache.get("0", "main")).toBeUndefined();
  expect(cache.get("1", "main")?.top).toBe(1);
  expect(cache.get("256", "main")?.top).toBe(256);
});

test("least recently used pane/location pairs are evicted, including dynamic pane IDs", () => {
  const cache = createPanePositionCache(2);
  cache.set("a", "main", { top: 10, left: 0 });
  cache.set("a", "sidebar", { top: 20, left: 0 });
  expect(cache.get("a", "main")?.top).toBe(10);
  cache.set("a", "dynamic", { top: 30, left: 0 });
  expect(cache.get("a", "sidebar")).toBeUndefined();
  expect(cache.get("a", "main")?.top).toBe(10);
  expect(cache.size()).toBe(2);
  for (let index = 0; index < 1000; index++) cache.set(String(index), `pane-${index}`, { top: index, left: 0 });
  expect(cache.size()).toBe(2);
  expect(cache.get("999", "pane-999")?.top).toBe(999);
});

test("updates refresh recency without consuming capacity and positions are immutable snapshots", () => {
  const cache = createPanePositionCache(2);
  const position = { top: 12.5, left: -6.25 };
  cache.set("a", "main", position);
  position.top = 99;
  expect(cache.get("a", "main")).toEqual({ top: 12.5, left: -6.25 });
  expect(Object.isFrozen(cache.get("a", "main"))).toBe(true);
  cache.set("b", "main", position);
  cache.set("a", "main", { top: 42, left: 0 });
  cache.set("c", "main", position);
  expect(cache.get("b", "main")).toBeUndefined();
  expect(cache.get("a", "main")?.top).toBe(42);
});

test("pair keys cannot collide through delimiter text", () => {
  const cache = createPanePositionCache();
  cache.set("a:b", "c", { top: 1, left: 0 });
  cache.set("a", "b:c", { top: 2, left: 0 });
  expect(cache.get("a:b", "c")?.top).toBe(1);
  expect(cache.get("a", "b:c")?.top).toBe(2);
});

test("invalid capacity and non-finite offsets fail without changing stored positions", () => {
  for (const capacity of [0, -1, 1.5, Infinity, NaN]) expect(() => createPanePositionCache(capacity)).toThrow("capacity");
  const cache = createPanePositionCache();
  cache.set("a", "main", { top: 1, left: 0 });
  expect(() => cache.set("a", "main", { top: NaN, left: 0 })).toThrow("finite");
  expect(() => cache.set("a", "main", { top: 0, left: Infinity })).toThrow("finite");
  expect(cache.get("a", "main")?.top).toBe(1);
});
