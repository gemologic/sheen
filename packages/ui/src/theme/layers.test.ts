import { expect, it } from "vitest";
import { createOverlayStack } from "./layers.ts";

it("orders layers per provider, restores the previous top, and cleans up out of order", () => {
  const first = createOverlayStack(), second = createOverlayStack();
  const removeOuter = first.register("outer"), removeInner = first.register("inner");
  expect(first.isTop("inner")).toBe(true);
  expect(first.zIndex("inner")).toBeGreaterThan(first.zIndex("outer"));
  second.register("separate");
  expect(first.isTop("inner")).toBe(true);
  removeInner();
  expect(first.isTop("outer")).toBe(true);
  first.register("next"); removeOuter();
  expect(first.isTop("next")).toBe(true);
  expect(second.isTop("separate")).toBe(true);
});
