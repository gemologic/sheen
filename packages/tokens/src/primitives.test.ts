import { expect, it } from "vitest";
import { colorRamp, primitives } from "./primitives.ts";
import { parseColor } from "./color.ts";

it("generates thirteen ordered OKLCH ramp stops and rejects invalid parameters", () => {
  const ramp = colorRamp(175, 0.11);
  expect(Object.keys(ramp)).toHaveLength(13);
  const lightness = Object.values(ramp).map(value => { const c = parseColor(value); return c.r + c.g + c.b; });
  for (let index = 1; index < lightness.length; index++) expect(lightness[index]).toBeLessThan(lightness[index - 1] ?? 0);
  expect(() => colorRamp(Number.NaN, 0.1)).toThrow();
  expect(() => colorRamp(175, -1)).toThrow();
});

it("includes color, sizing, radius, type, motion, shadow, and layer primitives", () => {
  for (const name of ["jade.500", "amber.500", "cyan.500", "rose.500", "violet.500", "gray.980", "size.96", "radius.full", "font-size.10", "shadow.5", "duration.fast", "ease.standard", "z.modal"]) expect(primitives[name]).toBeDefined();
  expect(primitives["size.96"]).toBe("384px");
});
