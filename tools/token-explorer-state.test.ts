import { describe, expect, it } from "vitest";
import { obsidian } from "../packages/tokens/src/index.ts";
import {
  apcaMatrixScore,
  backgroundTokenNames,
  filterTokenCatalog,
  foregroundTokenNames,
  tokenCatalog,
  tokenPreviewKind,
  wcagMatrixScore,
} from "../apps/loupe/src/token-explorer-state.ts";

describe("Loupe token explorer state", () => {
  it("catalogs every primitive and semantic token and filters by manifest consumer", () => {
    expect(tokenCatalog.filter(item => item.tier === 1).length).toBeGreaterThan(100);
    expect(tokenCatalog.filter(item => item.tier === 2).length).toBeGreaterThan(100);
    expect(filterTokenCatalog("ListDetailLayout").some(item => item.cssName === "--sheen-color-bg-selected")).toBe(true);
    expect(filterTokenCatalog("gray.980")).toHaveLength(1);
  });

  it("builds the complete semantic foreground by background matrix", () => {
    expect(foregroundTokenNames).toContain("color-fg-muted");
    expect(foregroundTokenNames).toContain("color-danger-on");
    expect(backgroundTokenNames).toContain("color-bg-raised");
    expect(backgroundTokenNames).toContain("color-danger-subtle");
    const values = Object.fromEntries(Object.entries(obsidian.dark).map(([name, value]) => [`--sheen-${name}`, value]));
    expect(wcagMatrixScore(values, "color-fg", "color-bg")).toBeGreaterThan(7);
    expect(wcagMatrixScore(values, "color-fg-on-accent", "color-accent")).toBeGreaterThan(4.5);
    expect(apcaMatrixScore(values, "color-fg", "color-bg")).toBeLessThan(-75);
  });

  it("preserves APCA foreground and background polarity", () => {
    const darkOnLight = {
      "--sheen-color-bg": "#ffffff",
      "--sheen-color-fg": "#000000",
    };
    const lightOnDark = {
      "--sheen-color-bg": "#000000",
      "--sheen-color-fg": "#ffffff",
    };
    expect(apcaMatrixScore(darkOnLight, "color-fg", "color-bg")).toBeCloseTo(106.04, 1);
    expect(apcaMatrixScore(lightOnDark, "color-fg", "color-bg")).toBeCloseTo(-107.88, 1);
  });

  it("classifies color and non-color previews without browser CSS parsing", () => {
    expect(tokenPreviewKind("oklch(52% 0.12 250)")).toBe("color");
    expect(tokenPreviewKind("16px")).toBe("length");
    expect(tokenPreviewKind("cubic-bezier(0.2, 0, 0, 1)")).toBe("text");
  });
});
