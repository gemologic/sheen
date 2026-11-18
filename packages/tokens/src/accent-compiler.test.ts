import { describe, expect, it } from "vitest";
import { buildAccent, defineAccent, validateAccent } from "./accent-compiler.ts";
import { accents } from "./accents.ts";
import { contrastRatio, oklchComponents, parseColor } from "./color.ts";
import { ThemeValidationError } from "./define.ts";
import { obsidian } from "./themes.ts";

function diagnostics(run: () => unknown): readonly string[] {
  try { run(); }
  catch (error) {
    if (error instanceof ThemeValidationError) return error.diagnostics;
    throw error;
  }
  throw new Error("Expected ThemeValidationError");
}

describe("custom accents", () => {
  it("derives both modes from one brand seed and passes every bundled theme", () => {
    for (const seed of ["#ff5a1f", "#0057ff", "#ffd400", "#e6007e", "#7c3aed"]) {
      const accent = defineAccent({ id: "brand", seed });
      expect(validateAccent(accent), seed).toEqual([]);
      const hue = oklchComponents(parseColor(seed)).h;
      for (const color of [accent.light, accent.dark]) expect(Math.abs(oklchComponents(parseColor(color)).h - hue), `${seed} -> ${color}`).toBeLessThan(8);
      expect(contrastRatio(accent.light, "#ffffff")).toBeGreaterThanOrEqual(7);
    }
  });

  it("keeps a seed verbatim in a mode where it already passes", () => {
    expect(defineAccent({ id: "ink", seed: "#111111" }).light).toBe("#111111");
    expect(defineAccent({ id: "sun", seed: "#ffd400" }).dark).toBe("#ffd400");
  });

  it("validates derivation only against the supplied themes", () => {
    const everywhere = defineAccent({ id: "brand", seed: "#ff5a1f" });
    const obsidianOnly = defineAccent({ id: "brand", seed: "#ff5a1f" }, { themes: [obsidian] });
    expect(oklchComponents(parseColor(obsidianOnly.light)).l).toBeGreaterThan(oklchComponents(parseColor(everywhere.light)).l);
    expect(validateAccent(obsidianOnly, { themes: [obsidian] })).toEqual([]);
    expect(validateAccent(obsidianOnly).some(message => message.startsWith("contrast/light: "))).toBe(true);
  });

  it("emits the same selector and token model as a bundled accent", () => {
    const copy = defineAccent({ id: "jade-copy", ...accents.jade });
    expect(buildAccent(copy)).toBe(buildAccent("jade").replaceAll('"jade"', '"jade-copy"'));
    expect(buildAccent(copy)).toContain("--sheen-color-focus-ring: #6ee7b7;");
  });

  it("reports explicit colors that fail contrast with theme, mode, pair, and ratio", () => {
    const failures = diagnostics(() => defineAccent({ id: "flat", light: "#ff5a1f", dark: "#ff5a1f" }));
    expect(failures).toContain("flat/obsidian/dark: color-accent-fg on color-bg-selected: 3.956:1 < 4.5:1");
    expect(failures.some(message => message.startsWith("flat/contrast/light: color-fg-on-accent on color-accent"))).toBe(true);
    expect(failures.some(message => message.includes("color-focus-ring"))).toBe(true);
  });

  it("rejects unsafe ids, reserved bundled names, and unusable colors before deriving", () => {
    expect(diagnostics(() => defineAccent({ id: 'x"]{}', seed: "#0057ff" }))).toEqual(['x"]{}: Invalid accent id: x"]{}']);
    expect(diagnostics(() => defineAccent({ id: "jade", seed: "#0057ff" }))).toEqual(["jade: Accent id jade is reserved by a bundled accent"]);
    expect(diagnostics(() => defineAccent({ id: "glass", seed: "#0057ff80" }))).toEqual(["glass: seed must be opaque: #0057ff80"]);
    expect(diagnostics(() => defineAccent({ id: "brand", light: "nope", dark: "#80acff" }))).toEqual(["brand: light: Unsupported concrete color: nope"]);
    expect(diagnostics(() => buildAccent({ ...accents.jade, id: "a b", label: "A b" }))).toEqual(["a b: Invalid accent id: a b"]);
  });
});
