import { describe, expect, it } from "vitest";
import { contrastRatio, parseColor, toHex, toOklch } from "./color.ts";

describe("color math", () => {
  it("matches black/white WCAG reference ratios", () => {
    expect(contrastRatio("#000", "#fff")).toBeCloseTo(21, 6);
    expect(contrastRatio("#fff", "#fff")).toBe(1);
    expect(contrastRatio("#767676", "#fff")).toBeGreaterThan(4.5);
    expect(contrastRatio("#777777", "#fff")).toBeLessThan(4.5);
  });
  it("composites transparent foregrounds before measuring", () => {
    expect(contrastRatio("#0000", "#fff")).toBe(1);
    expect(contrastRatio("#00000080", "#fff")).toBeCloseTo(contrastRatio("#7f7f7f", "#fff"), 6);
    expect(() => contrastRatio("#fff", "#0000")).toThrow("opaque");
  });
  it("round trips sRGB through OKLCH including alpha", () => {
    for (const value of ["#6ee7b7", "#141419", "#ffffff", "#000000", "#aabbcc80"]) expect(toHex(parseColor(toOklch(value)))).toBe(value);
  });
  it("uses premultiplied alpha in OKLab color mixes", () => {
    expect(toHex(parseColor("color-mix(in oklab, #ffffff 4%, transparent)"))).toBe("#ffffff0a");
    expect(toHex(parseColor("color-mix(in oklab, #000000 50%, #ffffff)"))).toBe("#636363");
  });
  it("rejects unsupported and invalid color input rather than skipping gates", () => {
    for (const value of ["red", "#zzzzzz", "oklch(200% 0 0)", "color-mix(in oklab, #fff 110%, #000)"]) expect(() => parseColor(value)).toThrow();
  });
});
